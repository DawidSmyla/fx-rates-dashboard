from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("rates/", views.list_rates, name="list_rates"),
    path("rates/latest/", views.latest_rates, name="latest_rates"),
]