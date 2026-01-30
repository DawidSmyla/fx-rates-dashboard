from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("rates/", views.list_rates, name="list_rates"),                        # GET ?date=
    path("rates/latest/", views.latest_rates, name="latest_rates"),
    path("currencies/", views.list_currencies, name="list_currencies"),         # GET lista kodów
    path("currencies/<date_str>/", views.rates_by_date, name="rates_by_date"),  # GET konkretna data
    path("currencies/fetch/", views.fetch_currencies, name="fetch_currencies"), # POST pobierz z NBP
    path("rates/summary/", views.rates_summary, name="rates_summary"),          # GET ?period=year|quarter|month|day
]