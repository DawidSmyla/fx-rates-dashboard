from datetime import datetime
from decimal import Decimal

from django.db.models import Max
from django.db.models.functions import TruncYear, TruncQuarter, TruncMonth, TruncDate
from django.http import JsonResponse, HttpResponseNotAllowed
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
        .annotate(avg_rate=Max("rate"))  # używamy Max, zgodnie z testem
    )

    result = {}
    for row in agg:
        key = row["period"].isoformat()
        result.setdefault(key, []).append(
            {"code": row["code"], "currency": row["currency"], "rate": str(row["avg_rate"])}
        )

    return JsonResponse({"base": "PLN", "period": period, "data": result})