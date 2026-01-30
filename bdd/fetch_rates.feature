Feature: Pobieranie kursów walut z NBP
  Aby mieć aktualne kursy
  jako użytkownik aplikacji
  chcę pobrać kursy dla wybranego zakresu dat

  Scenario: Pobranie kursów dla zakresu dat
    Given baza jest pusta
    When wywołam POST /currencies/fetch z datami 2026-01-01 do 2026-01-05
    Then otrzymam status 200
    And w bazie są kursy dla dat 2026-01-01 do 2026-01-05
