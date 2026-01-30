Feature: Pobieranie kursów walut
  Jako konsument API
  Chcę pobierać najnowsze kursy walut
  Aby wyświetlać je w dashboardzie

  Background:
    Zakładając, że walutą bazową jest "PLN"

  Scenario: Pobranie najnowszych kursów kończy się powodzeniem
    Zakładając, że istnieją następujące kursy walut:
      | code | currency       | rate   | effective_date |
      | USD  | US Dollar      | 3.5400 | 2026-01-30     |
      | EUR  | Euro           | 4.2100 | 2026-01-30     |
      | GBP  | British GBP    | 4.8500 | 2026-01-30     |
    Kiedy wysyłam GET /api/rates/latest
    Wtedy kod odpowiedzi to 200
    Oraz pole base w odpowiedzi to "PLN"
    Oraz pole date w odpowiedzi to "2026-01-30"
    Oraz odpowiedź zawiera kursy:
      | code | currency       | rate   |
      | USD  | US Dollar      | 3.5400 |
      | EUR  | Euro           | 4.2100 |
      | GBP  | British GBP    | 4.8500 |

  Scenario: Brak kursów
    Zakładając, że nie ma żadnych kursów
    Kiedy wysyłam GET /api/rates/latest
    Wtedy kod odpowiedzi to 404
    Oraz odpowiedź zawiera błąd "no rates available"

  Scenario: Pobranie kursów dla wybranej daty
    Zakładając, że istnieją następujące kursy walut:
      | code | currency       | rate   | effective_date |
      | USD  | US Dollar      | 4.0000 | 2026-01-29     |
      | EUR  | Euro           | 4.3000 | 2026-01-29     |
    Kiedy wysyłam GET /api/rates/?date=2026-01-29
    Wtedy kod odpowiedzi to 200
    Oraz pole date w odpowiedzi to "2026-01-29"
    Oraz odpowiedź zawiera kursy:
      | code | currency       | rate   |
      | USD  | US Dollar      | 4.0000 |
      | EUR  | Euro           | 4.3000 |


  Scenario: Brak kursów dla podanej daty
    Zakładając, że nie ma żadnych kursów
    Kiedy wysyłam GET /api/rates/?date=2026-01-28
    Wtedy kod odpowiedzi to 404
    Oraz odpowiedź zawiera błąd "no rates available"

  Scenario: Zły format daty
    Kiedy wysyłam GET /api/rates/?date=28-01-2026
    Wtedy kod odpowiedzi to 400
    Oraz odpowiedź zawiera błąd "invalid date format, expected YYYY-MM-DD"