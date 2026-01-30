from django.http import JsonResponse
from django.db.models import Max
from .models import ExchangeRate
from .serializers import ExchangeRateSerializer

def health(request):
    return JsonResponse({"status": "ok"})

def latest_rates(request):
    latest_date = ExchangeRate.objects.aggregate(Max("effective_date"))["effective_date__max"]
    if not latest_date:
        return JsonResponse({"error": "no rates available"}, status=404)

    qs = ExchangeRate.objects.filter(effective_date=latest_date).order_by("code")
    data = ExchangeRateSerializer(qs, many=True).data
    return JsonResponse(
        {
            "base": "PLN",
            "date": latest_date.isoformat(),
            "rates": data,
        }
    )