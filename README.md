# FX Rates Dashboard

A web application for fetching, storing, and visualizing exchange rates from the National Bank of Poland (NBP) API. Built with Angular frontend, Django REST Framework backend, and Docker containerization.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technologies](#technologies)
4. [Features](#features)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [API Endpoints](#api-endpoints)
8. [Testing](#testing)
9. [Screenshots](#screenshots)

---

## Overview

FX Rates Dashboard enables users to:

- Fetch average exchange rates from the NBP API (Table A) for a specific date or date range
- Store fetched rates in a relational database (SQLite)
- Display rates in tables grouped by year, quarter, month, or day
- Visualize data on an interactive line chart (Chart.js)
- Filter currencies using a multi-select dropdown with search
- Automatically refresh views when parameters change (date range, period, currency filter)

The application runs in Docker containers and can be started with a single `docker compose up` command.

---

## Architecture

```

┌─────────────────────┐     HTTP     ┌─────────────────────┐     SQL      ┌────────────┐
│   Frontend (Angular)│ ◄──────────► │  Backend (Django)   │ ◄──────────► │  SQLite    │
│   nginx :80         │   REST API   │  gunicorn :8000     │    ORM       │  db.sqlite3│
└─────────────────────┘              └─────────────────────┘              └────────────┘
                                              │
                                              │ HTTP
                                              ▼
                                     ┌─────────────────┐
                                     │   API NBP       │
                                     │   api.nbp.pl    │
                                     └─────────────────┘
```


- **Frontend** – Angular app served by nginx (port 80)
- **Backend** – Django REST Framework served by gunicorn (port 8000)
- **Database** – SQLite (file-based, inside backend container)
- **External API** – NBP API (https://api.nbp.pl)

---

## Technologies

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | Angular 19, TypeScript, SCSS        |
| Backend        | Python 3.12, Django 5, DRF          |
| Database       | SQLite                              |
| Charts         | Chart.js 4.4                        |
| Containerization | Docker, Docker Compose            |
| HTTP Server    | nginx (frontend), gunicorn (backend)|
| Frontend Tests | Jasmine + Karma                     |
| Backend Tests  | Django TestCase (unittest)          |
| API            | NBP API – Table A (average rates)   |

---

## Features

### Data Fetching

- **Fetch rates from NBP (Pobierz kursy z NBP)** – fetches exchange rates from the NBP API for a selected date, date range, or the latest available data, and saves them to the database
- **Bulk fetching** – for date ranges, the app iterates over each day and fetches data from NBP (skipping weekends/holidays when API returns 404)

### Data Display

- **Show latest rates (Pokaż najnowsze kursy)** – displays the most recent rates from the database
- **Show rates for selected range (Pokaż kursy z wybranego zakresu dat)** – displays rates grouped by date for the selected date range
- **Show summary (Pokaż podsumowanie)** – displays average rates grouped by selected period:
  - **Year** – header e.g. "2024"
  - **Quarter** – header e.g. "2024 Q2"
  - **Month** – header e.g. "2024-01"
  - **Day** – full date

### Currency Filtering

- Multi-select dropdown with checkboxes
- Search by currency code (e.g. "USD") or name (e.g. "dolar")
- "Clear selection" button at the bottom of the expanded list, visible only when at least one currency is selected

### Chart

- "Show chart" / "Show table" ("Pokaż wykres" / "Pokaż tabelę") button toggles between table and line chart views
- Line chart (Chart.js) with a separate line for each currency
- Random colors for each currency, legend below the chart
- Chart respects currency filter and date range

### Automatic Refresh

- Changing date range automatically refreshes summary/chart
- Changing period (year/quarter/month/day) automatically refreshes summary/chart
- Changing currency filter automatically refreshes summary/chart

---

## Project Structure

```
fx-rates-dashboard/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── fx_backend/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── rates/
│       ├── models.py          # ExchangeRate model
│       ├── serializers.py     # DRF serializer
│       ├── views.py           # API endpoints
│       ├── urls.py            # URL routing
│       └── tests.py           # Unit tests
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.html
│   │   └── app/
│   │       ├── app.ts         # Main component
│   │       ├── app.html       # HTML template
│   │       ├── app.scss       # Styles
│   │       ├── app.spec.ts    # Unit tests
│   │       └── services/
│   │           └── rates.service.ts  # HTTP service
```

---

## Getting Started

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Git

### Steps

1. **Clone the repository:**

```bash
git clone https://github.com/DawidSmyla/fx-rates-dashboard.git
cd fx-rates-dashboard
```

2. **Start the application:**

```bash
docker compose up --build
```

3. **Access the application:**

| Service  | URL                            |
|----------|--------------------------------|
| Frontend | http://localhost:80             |
| Backend  | http://localhost:8000/api/      |
| Health   | http://localhost:8000/api/health/ |

4. **Stop the application:**

```bash
docker compose down
```

5. **Rebuild without cache (after changes):**

```bash
docker compose build --no-cache
docker compose up
```

---

## API Endpoints

### Read Data from Database

| Method | Endpoint                     | Description                                   |
|--------|------------------------------|-----------------------------------------------|
| GET    | `/api/rates/`                | Rates for date (param `date`) or latest       |
| GET    | `/api/rates/latest/`         | Latest rates from database                    |
| GET    | `/api/rates/range/`          | Rates for date range (`date_from`, `date_to`) |
| GET    | `/api/rates/summary/`        | Summary by period (`period`, optional `date_from`, `date_to`) |
| GET    | `/api/currencies/`           | List of available currencies in database      |

### Fetch Data from NBP

| Method | Endpoint                       | Description                                   |
|--------|--------------------------------|-----------------------------------------------|
| POST   | `/api/currencies/fetch/`       | Fetch rates from NBP for date (param `date`) or latest |
| POST   | `/api/currencies/fetch-range/` | Fetch rates from NBP for date range           |

### Examples

```bash
# Latest rates
curl http://localhost:8000/api/rates/latest/

# Rates for specific date
curl http://localhost:8000/api/rates/?date=2024-01-15

# Monthly summary for 2024
curl "http://localhost:8000/api/rates/summary/?period=month&date_from=2024-01-01&date_to=2024-12-31"

# Fetch rates from NBP for January 2024
curl -X POST "http://localhost:8000/api/currencies/fetch-range/?date_from=2024-01-01&date_to=2024-01-31"
```

---

## Testing

### Backend Tests (Django TestCase)

```bash
docker compose exec backend python manage.py test
```

| Test | Description |
|------|-------------|
| `test_health_endpoint` | Verifies `/api/health/` returns status 200 |
| `test_list_rates_empty` | Verifies response when database is empty |
| `test_list_rates_with_data` | Verifies correct response with data |
| `test_list_currencies` | Verifies currency list |
| `test_rates_range` | Verifies date range response |
| `test_rates_range_missing_params` | Verifies validation for missing params |
| `test_fetch_currencies` | Verifies NBP fetch with mock |
| `test_rates_summary` | Verifies summary aggregation by period |

### Frontend Tests (Jasmine + Karma)

```bash
cd frontend
npm install
npx ng test
```

| Test | Description |
|------|-------------|
| `should create the app` | Verifies component creation |
| `should have correct title` | Verifies app title |
| `should filter rates by selected currencies` | Verifies currency filtering |
| `should return all rates when no currencies selected` | Verifies no filter returns all |
| `should format period key for year` | Verifies year formatting |
| `should format period key for month` | Verifies month formatting |

### Test Results

All tests pass successfully:

- Backend: 8 tests – OK
- Frontend: 6 tests – OK

---

## Screenshots

1. Initial view after launch <img width="1904" height="949" alt="image" src="https://github.com/user-attachments/assets/06f3055f-2957-4639-b13b-c65ef16e425b" />

2. Fetched exchange rates – table view <img width="2551" height="1349" alt="image" src="https://github.com/user-attachments/assets/af748c7d-2c6a-4e9f-8b99-8fb309a89950" />

3. Monthly summary with currency filter <img width="2551" height="1347" alt="image" src="https://github.com/user-attachments/assets/88c6dcac-b3e0-474f-86d8-5bae0dff17db" />

4. Line chart for selected currencies <img width="1915" height="965" alt="image" src="https://github.com/user-attachments/assets/323431b3-2e31-4882-a490-47ab8cb82975" />

5. Multi-select dropdown with search <img width="1915" height="967" alt="image" src="https://github.com/user-attachments/assets/c776ff8d-bd62-43d3-a2ab-3ad62b2cbf4a" />

6. Docker containers running <img width="1658" height="140" alt="image" src="https://github.com/user-attachments/assets/a4d51887-d860-4f44-93bc-0b05cf2be1f0" />








