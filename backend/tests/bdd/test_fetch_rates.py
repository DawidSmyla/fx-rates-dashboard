from pathlib import Path
from decimal import Decimal
import pytest
from pytest_bdd import scenarios, given, when, then, parsers
from rest_framework.test import APIClient
from rates.models import ExchangeRate

# BASE_DIR = Path(__file__).resolve().parents[3]  # fx-rates-dashboard
BASE_DIR = Path(__file__).resolve().parents[2]    # app
FEATURE_FILE = BASE_DIR / "bdd" / "fetch_rates.feature"

scenarios(FEATURE_FILE)


def _parse_table(table: str):
    lines = [ln.strip() for ln in table.strip().splitlines() if ln.strip()]
    rows = []
    for ln in lines:
        parts = [p.strip() for p in ln.strip("|").split("|")]
        rows.append(parts)
    return rows


@given('Zakładając, że walutą bazową jest "PLN"')
def base_currency():
    return "PLN"


@given(parsers.parse("Zakładając, że istnieją następujące kursy walut:\n{table}"))
def create_rates(table):
    rows = _parse_table(table)
    headers = [h.lower() for h in rows[0]]
    for row in rows[1:]:
        data = dict(zip(headers, row))
        ExchangeRate.objects.create(
            code=data["code"],
            currency=data["currency"],
            rate=Decimal(data["rate"]),
            effective_date=data["effective_date"],
        )


@given("Zakładając, że nie ma żadnych kursów")
def no_rates():
    ExchangeRate.objects.all().delete()


@when("Kiedy wysyłam GET /api/rates/latest")
def call_latest(client):
    return client.get("/api/rates/latest/")


@then(parsers.parse("Wtedy kod odpowiedzi to {status:d}"))
def check_status(call_latest, status):
    assert call_latest.status_code == status


@then(parsers.parse('Oraz pole base w odpowiedzi to "{base}"'))
def check_base(call_latest, base):
    assert call_latest.json()["base"] == base


@then(parsers.parse('Oraz pole date w odpowiedzi to "{date_str}"'))
def check_date(call_latest, date_str):
    assert call_latest.json()["date"] == date_str


@then(parsers.parse("Oraz odpowiedź zawiera kursy:\n{table}"))
def check_rates(call_latest, table):
    expected_rows = _parse_table(table)
    headers = [h.lower() for h in expected_rows[0]]
    expected = [dict(zip(headers, row)) for row in expected_rows[1:]]
    got = call_latest.json()["rates"]
    got_sorted = sorted(got, key=lambda x: x["code"])
    exp_sorted = sorted(expected, key=lambda x: x["code"])
    assert got_sorted == exp_sorted


@then(parsers.parse('Oraz odpowiedź zawiera błąd "{msg}"'))
def check_error(call_latest, msg):
    assert call_latest.json().get("error") == msg


@pytest.fixture
def client(db):
    return APIClient()