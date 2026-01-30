# fx-rates-dashboard

Monorepo z backendem (Django REST Framework) i frontendem (Angular).
- backend/ — Django + DRF + Postgres
- frontend/ — Angular
- bdd/ — scenariusze BDD (Gherkin)
- docker-compose.yml — uruchamia DB, backend, frontend

## Uruchamianie (skrót)
- Lokalnie: backend `python manage.py runserver`, frontend `ng serve`
- Docker: `docker compose up --build`

## BDD
Scenariusze w katalogu `bdd/` w formacie Gherkin (Given/When/Then).
