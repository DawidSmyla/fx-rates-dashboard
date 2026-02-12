from datetime import datetime, date as date_type, timedelta
from decimal import Decimal

from django.db.models import Max
from django.db.models.functions import TruncYear, TruncQuarter, TruncMonth, TruncDate
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt 
from .models import ExchangeRate
from .serializers import ExchangeRateSerializer
import requests


def health(request):
    return JsonResponse({"status": "ok"})


def _get_rates_for_date(date_param: str | None):
    if date_param:
        try:
            target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
        except ValueError:
            return None, JsonResponse({"error": "invalid date format, expected YYYY-MM-DD"}, status=400)
    else:
        target_date = ExchangeRate.objects.aggregate(Max("effective_date"))["effective_date__max"]

    if not target_date:
        return None, JsonResponse({"error": "no rates available"}, status=404)

    qs = ExchangeRate.objects.filter(effective_date=target_date).order_by("code")
    if not qs.exists():
        return None, JsonResponse({"error": "no rates available"}, status=404)

    data = ExchangeRateSerializer(qs, many=True).data
    return (target_date, data), None


def list_rates(request):
    result, error = _get_rates_for_date(request.GET.get("date"))
    if error:
        return error
    target_date, data = result
    return JsonResponse({"base": "PLN", "date": target_date.isoformat(), "rates": data})


def latest_rates(request):
    return list_rates(request)


def rates_by_date(request, date_str):
    request.GET._mutable = True
    request.GET["date"] = date_str
    return list_rates(request)


def list_currencies(request):
    qs = (
        ExchangeRate.objects.values("code", "currency")
        .distinct()
        .order_by("code")
    )
    return JsonResponse({"currencies": list(qs)})


def rates_range(request):
    """GET /api/rates/range/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Zwraca kursy walut z zakresu dat, pogrupowane po dacie.
    """
    date_from_str = request.GET.get("date_from")
    date_to_str = request.GET.get("date_to")

    if not date_from_str or not date_to_str:
        return JsonResponse(
            {"error": "Both date_from and date_to parameters are required (YYYY-MM-DD)"},
            status=400,
        )

    try:
        date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "invalid date_from format, expected YYYY-MM-DD"}, status=400)

    try:
        date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "invalid date_to format, expected YYYY-MM-DD"}, status=400)

    if date_from > date_to:
        return JsonResponse({"error": "date_from must be <= date_to"}, status=400)

    qs = (
        ExchangeRate.objects
        .filter(effective_date__gte=date_from, effective_date__lte=date_to)
        .order_by("effective_date", "code")
    )

    if not qs.exists():
        return JsonResponse({"error": "no rates available for this date range"}, status=404)

    # Grupowanie po dacie
    result = {}
    for rate in qs:
        key = rate.effective_date.isoformat()
        if key not in result:
            result[key] = []
        result[key].append({
            "code": rate.code,
            "currency": rate.currency,
            "rate": str(rate.rate),
        })

    return JsonResponse({
        "base": "PLN",
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "dates": result,
    })


@csrf_exempt
def fetch_currencies(request):

    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    date_param = request.GET.get("date")

    if date_param:
        url = f"https://api.nbp.pl/api/exchangerates/tables/A/{date_param}/?format=json"
    else:
        url = "https://api.nbp.pl/api/exchangerates/tables/A/?format=json"

    try:
        resp = requests.get(url, timeout=10)
    except requests.Timeout as exc:
        return JsonResponse({"error": f"NBP request timed out: {exc}"}, status=502)
    except requests.RequestException as exc:
        return JsonResponse({"error": f"NBP request failed: {exc}"}, status=502)

    if resp.status_code == 404:
        return JsonResponse({"error": f"NBP returned 404 for date={date_param or 'latest'}"}, status=404)
    if resp.status_code >= 500:
        return JsonResponse({"error": f"NBP returned {resp.status_code} (server error)"}, status=502)
    if resp.status_code != 200:
        return JsonResponse({"error": f"NBP returned status {resp.status_code}: {resp.text}"}, status=resp.status_code)

    try:
        data = resp.json()
    except ValueError as exc:
        return JsonResponse({"error": f"Cannot parse JSON from NBP: {exc}"}, status=502)

    if not data or not isinstance(data, list):
        return JsonResponse({"error": "Unexpected response format from NBP"}, status=502)

    table = data[0]
    effective_date = table.get("effectiveDate")
    rates = table.get("rates", [])
    if not effective_date or not rates:
        return JsonResponse({"error": "No rates in NBP response"}, status=502)

    created, updated = 0, 0
    for r in rates:
        code = r.get("code")
        currency = r.get("currency")
        mid = r.get("mid")
        if not (code and currency and mid):
            continue
        _, is_created = ExchangeRate.objects.update_or_create(
            code=code,
            effective_date=effective_date,
            defaults={"currency": currency, "rate": Decimal(str(mid))},
        )
        if is_created:
            created += 1
        else:
            updated += 1

    return JsonResponse(
        {"status": "ok", "date": effective_date, "created": created, "updated": updated},
        status=200,
    )


@csrf_exempt
def fetch_currencies_range(request):
    """POST /api/currencies/fetch-range/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Pobiera kursy z NBP dla każdego dnia roboczego w zakresie dat i zapisuje do bazy.
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    date_from_str = request.GET.get("date_from")
    date_to_str = request.GET.get("date_to")

    if not date_from_str or not date_to_str:
        return JsonResponse(
            {"error": "Both date_from and date_to parameters are required (YYYY-MM-DD)"},
            status=400,
        )

    try:
        date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "invalid date_from format, expected YYYY-MM-DD"}, status=400)

    try:
        date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "invalid date_to format, expected YYYY-MM-DD"}, status=400)

    if date_from > date_to:
        return JsonResponse({"error": "date_from must be <= date_to"}, status=400)

    total_created, total_updated, fetched_dates, errors = 0, 0, [], []

    current = date_from
    while current <= date_to:
        date_str = current.isoformat()
        url = f"https://api.nbp.pl/api/exchangerates/tables/A/{date_str}/?format=json"

        try:
            resp = requests.get(url, timeout=10)
        except requests.RequestException:
            errors.append(date_str)
            current += timedelta(days=1)
            continue

        if resp.status_code != 200:
            current += timedelta(days=1)
            continue

        try:
            data = resp.json()
        except ValueError:
            errors.append(date_str)
            current += timedelta(days=1)
            continue

        if not data or not isinstance(data, list):
            current += timedelta(days=1)
            continue

        table = data[0]
        effective_date = table.get("effectiveDate")
        rates = table.get("rates", [])

        if effective_date and rates:
            for r in rates:
                code = r.get("code")
                currency = r.get("currency")
                mid = r.get("mid")
                if not (code and currency and mid):
                    continue
                _, is_created = ExchangeRate.objects.update_or_create(
                    code=code,
                    effective_date=effective_date,
                    defaults={"currency": currency, "rate": Decimal(str(mid))},
                )
                if is_created:
                    total_created += 1
                else:
                    total_updated += 1
            fetched_dates.append(effective_date)

        current += timedelta(days=1)

    return JsonResponse({
        "status": "ok",
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "created": total_created,
        "updated": total_updated,
        "fetched_dates_count": len(fetched_dates),
        "errors": errors,
    })


def rates_summary(request):
    period = request.GET.get("period")
    if period not in {"year", "quarter", "month", "day"}:
        return JsonResponse({"error": "invalid period, expected one of: year, quarter, month, day"}, status=400)

    trunc_map = {
        "year": TruncYear("effective_date"),
        "quarter": TruncQuarter("effective_date"),
        "month": TruncMonth("effective_date"),
        "day": TruncDate("effective_date"),
    }
    trunc_expr = trunc_map[period]

    agg = (
        ExchangeRate.objects
        .annotate(period=trunc_expr)
        .values("period", "code", "currency")
        .order_by("period", "code")
        .annotate(avg_rate=Max("rate"))
    )

    result = {}
    for row in agg:
        key = row["period"].isoformat()
        result.setdefault(key, []).append(
            {"code": row["code"], "currency": row["currency"], "rate": str(row["avg_rate"])}
        )

    return JsonResponse({"base": "PLN", "period": period, "data": result})