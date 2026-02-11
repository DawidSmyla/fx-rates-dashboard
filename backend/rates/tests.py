from datetime import date
from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from rates.models import ExchangeRate
from django.urls import reverse


CODE_USD = "USD"
CODE_EUR = "EUR"

# dla zwiększenia czytelności (w mojej ocenie) wszystkie daty i kursy wrzucone jako stałe poniżej, 
# bo za dużo tych cyferek było

DATE_LATEST = date(2026, 1, 30)
DATE_OTHER = date(2026, 1, 29)
DATE_MID = date(2026, 1, 15)
DATE_BAD_FORMAT = "29-01-2026"
DATE_MONTH_KEY = date(DATE_LATEST.year, DATE_LATEST.month, 1).isoformat()

RATE_USD_LATEST = Decimal("3.54")
RATE_EUR_OTHER = Decimal("4.21")
RATE_USD_OTHER = Decimal("3.60")


@pytest.fixture
def client(db):
    return APIClient()


def test_list_rates_latest(client, db):
    ExchangeRate.objects.create(
        code=CODE_USD,
        currency="US Dollar",
        rate=RATE_USD_LATEST,
        effective_date=DATE_LATEST,
    )
    resp = client.get("/api/rates/")
    assert resp.status_code == 200
    assert resp.json()["date"] == DATE_LATEST.isoformat()


def test_list_rates_by_date_found(client, db):
    ExchangeRate.objects.create(
        code=CODE_EUR,
        currency="Euro",
        rate=RATE_EUR_OTHER,
        effective_date=DATE_OTHER,
    )
    resp = client.get(f"/api/rates/?date={DATE_OTHER.isoformat()}")
    assert resp.status_code == 200
    assert resp.json()["date"] == DATE_OTHER.isoformat()


def test_list_rates_by_date_not_found(client, db):
    resp = client.get(f"/api/rates/?date={DATE_OTHER.isoformat()}")
    assert resp.status_code == 404


def test_list_rates_bad_format(client, db):
    resp = client.get(f"/api/rates/?date={DATE_BAD_FORMAT}")
    assert resp.status_code == 400


def test_rates_by_date_path_alias(client, db):
    ExchangeRate.objects.create(
        code=CODE_USD,
        currency="US Dollar",
        rate=RATE_USD_LATEST,
        effective_date=DATE_LATEST,
    )
    resp = client.get(f"/api/currencies/{DATE_LATEST.isoformat()}/")
    assert resp.status_code == 200
    assert resp.json()["date"] == DATE_LATEST.isoformat()


def test_list_currencies(client, db):
    ExchangeRate.objects.create(
        code=CODE_USD,
        currency="US Dollar",
        rate=RATE_USD_LATEST,
        effective_date=DATE_LATEST,
    )
    ExchangeRate.objects.create(
        code=CODE_EUR,
        currency="Euro",
        rate=RATE_EUR_OTHER,
        effective_date=DATE_OTHER,
    )
    resp = client.get("/api/currencies/")
    assert resp.status_code == 200
    codes = {c["code"] for c in resp.json()["currencies"]}
    assert codes == {CODE_USD, CODE_EUR}


def test_rates_summary_month(client, db):
    ExchangeRate.objects.create(
        code=CODE_USD,
        currency="US Dollar",
        rate=RATE_USD_LATEST,
        effective_date=DATE_LATEST,
    )
    ExchangeRate.objects.create(
        code=CODE_USD,
        currency="US Dollar",
        rate=RATE_USD_OTHER,
        effective_date=DATE_MID,
    )
    resp = client.get("/api/rates/summary/?period=month")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert DATE_MONTH_KEY in data
    usd_rates = [r for r in data[DATE_MONTH_KEY] if r["code"] == CODE_USD]
    assert Decimal(usd_rates[0]["rate"]) in {RATE_USD_LATEST, RATE_USD_OTHER}  # max w agregacji


def test_rates_summary_bad_period(client, db):
    resp = client.get("/api/rates/summary/?period=week")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_currencies_latest_alias(client, db):
    ExchangeRate.objects.create(
        code=CODE_USD,
        currency="US Dollar",
        rate=RATE_USD_LATEST,
        effective_date=DATE_LATEST,
    )
    resp = client.get("/api/currencies/latest/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["date"] == DATE_LATEST.isoformat()
    codes = {r["code"] for r in body["rates"]}
    assert CODE_USD in codes

@pytest.mark.django_db
def test_currencies_date_alias(client, db):
    ExchangeRate.objects.create(
        code=CODE_EUR,
        currency="Euro",
        rate=RATE_EUR_OTHER,
        effective_date=DATE_OTHER,
    )
    resp = client.get(f"/api/currencies/{DATE_OTHER.isoformat()}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["date"] == DATE_OTHER.isoformat()
    codes = {r["code"] for r in body["rates"]}
    assert CODE_EUR in codes


@pytest.mark.django_db
def test_rates_range_returns_data(client, db):
    """Test: zakres dat zwraca kursy pogrupowane po dacie."""
    ExchangeRate.objects.create(
        code=CODE_USD, currency="US Dollar",
        rate=RATE_USD_LATEST, effective_date=DATE_LATEST,
    )
    ExchangeRate.objects.create(
        code=CODE_EUR, currency="Euro",
        rate=RATE_EUR_OTHER, effective_date=DATE_OTHER,
    )
    ExchangeRate.objects.create(
        code=CODE_USD, currency="US Dollar",
        rate=RATE_USD_OTHER, effective_date=DATE_MID,
    )
    resp = client.get(
        f"/api/rates/range/?date_from={DATE_MID.isoformat()}&date_to={DATE_LATEST.isoformat()}"
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["date_from"] == DATE_MID.isoformat()
    assert body["date_to"] == DATE_LATEST.isoformat()
    assert DATE_LATEST.isoformat() in body["dates"]
    assert DATE_OTHER.isoformat() in body["dates"]
    assert DATE_MID.isoformat() in body["dates"]


@pytest.mark.django_db
def test_rates_range_missing_params(client, db):
    """Test: brakujące parametry zwracają 400."""
    resp = client.get("/api/rates/range/")
    assert resp.status_code == 400

    resp = client.get(f"/api/rates/range/?date_from={DATE_MID.isoformat()}")
    assert resp.status_code == 400

    resp = client.get(f"/api/rates/range/?date_to={DATE_LATEST.isoformat()}")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_rates_range_bad_format(client, db):
    """Test: nieprawidłowy format daty zwraca 400."""
    resp = client.get("/api/rates/range/?date_from=29-01-2026&date_to=2026-01-30")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_rates_range_from_after_to(client, db):
    """Test: date_from > date_to zwraca 400."""
    resp = client.get(
        f"/api/rates/range/?date_from={DATE_LATEST.isoformat()}&date_to={DATE_MID.isoformat()}"
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_rates_range_no_data(client, db):
    """Test: brak danych w podanym zakresie zwraca 404."""
    resp = client.get("/api/rates/range/?date_from=2020-01-01&date_to=2020-01-31")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_rates_range_single_day(client, db):
    """Test: zakres jednego dnia zwraca poprawne dane."""
    ExchangeRate.objects.create(
        code=CODE_USD, currency="US Dollar",
        rate=RATE_USD_LATEST, effective_date=DATE_LATEST,
    )
    resp = client.get(
        f"/api/rates/range/?date_from={DATE_LATEST.isoformat()}&date_to={DATE_LATEST.isoformat()}"
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["dates"]) == 1
    assert DATE_LATEST.isoformat() in body["dates"]
    assert body["dates"][DATE_LATEST.isoformat()][0]["code"] == CODE_USD