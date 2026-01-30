from datetime import datetime
from django.http import JsonResponse
from django.db.models import Max
from .models import ExchangeRate
from .serializers import ExchangeRateSerializer

def health(request):
    return JsonResponse({"status": "ok"})

def list_rates(request):

    date_param = request.GET.get("date")

    if date_param:
        try:
            target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
        except ValueError:
            return JsonResponse({"error": "invalid date format, expected YYYY-MM-DD"}, status=400)
    else:
        target_date = ExchangeRate.objects.aggregate(Max("effective_date"))["effective_date__max"]

    if not target_date:
        return JsonResponse({"error": "no rates available"}, status=404)

    qs = ExchangeRate.objects.filter(effective_date=target_date).order_by("code")
    if not qs.exists():
        return JsonResponse({"error": "no rates available"}, status=404)

    data = ExchangeRateSerializer(qs, many=True).data
    return JsonResponse(
        {
            "base": "PLN",
            "date": target_date.isoformat(),
            "rates": data,
        }
    )

def latest_rates(request):
    return list_rates(request)