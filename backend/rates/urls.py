from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="health"),

    # Rates
    path("rates/", views.list_rates, name="list_rates"),                        # GET ?date=
    path("rates/latest/", views.latest_rates, name="latest_rates"),
    path("rates/range/", views.rates_range, name="rates_range"),                # GET ?date_from=&date_to
    path("rates/summary/", views.rates_summary, name="rates_summary"),          # GET ?period=year|quarter|month|day

    # Currencies (aliasy do powyższych)
    path("currencies/", views.list_currencies, name="list_currencies"),         # GET lista kodów
    path("currencies/latest/", views.latest_rates, name="currencies_latest"),   # alias do najnowszych kursów
    path("currencies/fetch/", views.fetch_currencies, name="fetch_currencies"), # POST pobierz z NBP (csrf_exempt)
    path("currencies/fetch-range/", views.fetch_currencies_range, name="fetch_currencies_range"),  # POST ?date_from=&date_to=
    path("currencies/<date_str>/", views.rates_by_date, name="rates_by_date"),  # GET konkretna data
]