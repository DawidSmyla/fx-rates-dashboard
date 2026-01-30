import requests
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from rates.models import ExchangeRate

# NBP tabela A: najnowsze -> https://api.nbp.pl/api/exchangerates/tables/A/?format=json
# Konkretna data -> https://api.nbp.pl/api/exchangerates/tables/A/2026-01-30/?format=json

class Command(BaseCommand):
    help = "Fetch FX rates from NBP (table A) and store in ExchangeRate"

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            help="YYYY-MM-DD; if omitted, fetch latest available",
        )

    def handle(self, *args, **options):
        target_date = options.get("date")
        if target_date:
            url = f"https://api.nbp.pl/api/exchangerates/tables/A/{target_date}/?format=json"
        else:
            url = "https://api.nbp.pl/api/exchangerates/tables/A/?format=json"

        self.stdout.write(f"Fetching NBP rates from {url}")
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            raise CommandError(f"NBP returned status {resp.status_code}: {resp.text}")

        data = resp.json()
        if not data or not isinstance(data, list):
            raise CommandError("Unexpected response format from NBP")

        table = data[0]
        effective_date = table.get("effectiveDate")
        rates = table.get("rates", [])
        if not effective_date or not rates:
            raise CommandError("No rates in NBP response")

        created, updated = 0, 0
        for r in rates:
            code = r.get("code")
            currency = r.get("currency")
            mid = r.get("mid")
            if not (code and currency and mid):
                continue
            obj, is_created = ExchangeRate.objects.update_or_create(
                code=code,
                effective_date=effective_date,
                defaults={
                    "currency": currency,
                    "rate": Decimal(str(mid)),
                },
            )
            if is_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Date: {effective_date}, created: {created}, updated: {updated}"
        ))