/// <reference types="jasmine" />

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app';
import { RatesService } from './services/rates.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let ratesServiceSpy: jasmine.SpyObj<RatesService>;

  beforeEach(async () => {
    ratesServiceSpy = jasmine.createSpyObj('RatesService', [
      'fetch', 'fetchRange', 'getLatest', 'getByDate', 'getByDateRange', 'getSummary', 'getCurrencies'
    ]);
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: RatesService, useValue: ratesServiceSpy }]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Przeglądaj kursy walut');
  });

  // ===== Test: Pobierz kursy z NBP (bez dat) =====
  it('should call rates.fetch() when fetchFromNbp() is called without dates', () => {
    ratesServiceSpy.fetch.and.returnValue(of({ created: 1, updated: 0, date: '2024-01-15' }));
    app.dateFrom = '';
    app.dateTo = '';
    app.fetchFromNbp();
    expect(app.loading).toBe(false);
    expect(ratesServiceSpy.fetch).toHaveBeenCalledWith();
    expect(app.message).toContain('Pobrano');
  });

  // ===== Test: Pobierz kursy z NBP (zakres dat) =====
  it('should call rates.fetchRange() when fetchFromNbp() is called with date range', () => {
    ratesServiceSpy.fetchRange.and.returnValue(of({
      created: 5, updated: 0, fetched_dates_count: 3,
      date_from: '2024-01-10', date_to: '2024-01-15'
    }));
    app.dateFrom = '2024-01-10';
    app.dateTo = '2024-01-15';
    app.fetchFromNbp();
    expect(app.loading).toBe(false);
    expect(ratesServiceSpy.fetchRange).toHaveBeenCalledWith('2024-01-10', '2024-01-15');
    expect(app.message).toContain('Pobrano');
  });

  // ===== Test: Pobierz kursy z NBP (jedna data) =====
  it('should call rates.fetch(date) when fetchFromNbp() is called with only dateFrom', () => {
    ratesServiceSpy.fetch.and.returnValue(of({ created: 1, updated: 0, date: '2024-01-15' }));
    app.dateFrom = '2024-01-15';
    app.dateTo = '';
    app.fetchFromNbp();
    expect(ratesServiceSpy.fetch).toHaveBeenCalledWith('2024-01-15');
  });

  // ===== Test: Brak komunikatu daty =====
  it('should set message if loadByDateRange called without any date', () => {
    app.dateFrom = '';
    app.dateTo = '';
    app.loadByDateRange();
    expect(app.message).toBe('Podaj co najmniej jedną datę (od lub do)');
  });

  // ===== Test: Pokaż kursy z zakresu dat =====
  it('should call getByDateRange when loadByDateRange is called with both dates', () => {
    const mockResponse = {
      base: 'PLN', date_from: '2024-01-10', date_to: '2024-01-15',
      dates: { '2024-01-10': [{ code: 'USD', currency: 'US Dollar', rate: '3.54' }] }
    };
    ratesServiceSpy.getByDateRange.and.returnValue(of(mockResponse));
    app.dateFrom = '2024-01-10';
    app.dateTo = '2024-01-15';
    app.loadByDateRange();
    expect(app.rangeData).toEqual(mockResponse);
    expect(app.loading).toBe(false);
  });

  // ===== Test: Pokaż kursy z jednej daty =====
  it('should call getByDate when loadByDateRange is called with only dateFrom', () => {
    const mockResponse = { base: 'PLN', date: '2024-01-15', rates: [] };
    ratesServiceSpy.getByDate.and.returnValue(of(mockResponse));
    app.dateFrom = '2024-01-15';
    app.dateTo = '';
    app.loadByDateRange();
    expect(app.latestData).toEqual(mockResponse);
    expect(app.loading).toBe(false);
  });

  // ===== Test: Pokaż najnowsze =====
  it('should update latestData on loadLatest', () => {
    const mockResponse = { base: 'PLN', date: '2024-01-15', rates: [] };
    ratesServiceSpy.getLatest.and.returnValue(of(mockResponse));
    app.loadLatest();
    expect(app.latestData).toEqual(mockResponse);
    expect(app.loading).toBe(false);
  });

  // ===== Test: Pokaż podsumowanie =====
  it('should update summaryData on loadSummary', () => {
    const mockResponse = { base: 'PLN', period: 'month', data: {} };
    ratesServiceSpy.getSummary.and.returnValue(of(mockResponse));
    app.summaryPeriod = 'month';
    app.loadSummary();
    expect(app.summaryData).toEqual(mockResponse);
    expect(app.loading).toBe(false);
  });

  // ===== Test: Filtrowanie po kodzie waluty =====
  it('should filter rates by selected currencies', () => {
    const rates = [
      { code: 'USD', currency: 'US Dollar', rate: '3.54' },
      { code: 'EUR', currency: 'Euro', rate: '4.21' },
      { code: 'GBP', currency: 'British Pound', rate: '5.10' },
    ];
    app.selectedCurrencies = ['USD'];
    const filtered = app.filterRates(rates);
    expect(filtered.length).toBe(1);
    expect(filtered[0].code).toBe('USD');
  });

  it('should return all rates when no currencies selected', () => {
    const rates = [
      { code: 'USD', currency: 'US Dollar', rate: '3.54' },
      { code: 'EUR', currency: 'Euro', rate: '4.21' },
    ];
    app.selectedCurrencies = [];
    expect(app.filterRates(rates).length).toBe(2);
  });

  // ===== Test: rangeDateKeys getter =====
  it('should return sorted date keys from rangeData', () => {
    app.rangeData = {
      dates: {
        '2024-01-15': [],
        '2024-01-10': [],
        '2024-01-12': [],
      }
    };
    expect(app.rangeDateKeys).toEqual(['2024-01-10', '2024-01-12', '2024-01-15']);
  });

  it('should return empty array when rangeData is null', () => {
    app.rangeData = null;
    expect(app.rangeDateKeys).toEqual([]);
  });

  // ===== Test: clearResults czyści dane =====
  it('should clear all results when a new action is triggered', () => {
    app.latestData = { some: 'data' };
    app.rangeData = { some: 'data' };
    app.summaryData = { some: 'data' };
    app.message = 'stary komunikat';

    ratesServiceSpy.getLatest.and.returnValue(of({ base: 'PLN', date: '2024-01-15', rates: [] }));
    app.loadLatest();

    // Po loadLatest, rangeData i summaryData powinny być null
    expect(app.rangeData).toBeNull();
    expect(app.summaryData).toBeNull();
  });

  // ===== Test: Wyświetlanie tabeli kursów w DOM =====
  it('should render rates table when latestData is set', () => {
    app.latestData = {
      date: '2024-01-15',
      rates: [
        { code: 'USD', currency: 'US Dollar', rate: '3.54' },
        { code: 'EUR', currency: 'Euro', rate: '4.21' },
      ]
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.latest tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('USD');
    expect(rows[1].textContent).toContain('EUR');
  });

  it('should filter displayed rates in table', () => {
    app.latestData = {
      date: '2024-01-15',
      rates: [
        { code: 'USD', currency: 'US Dollar', rate: '3.54' },
        { code: 'EUR', currency: 'Euro', rate: '4.21' },
      ]
    };
    app.selectedCurrencies = ['EUR'];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.latest tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('EUR');
  });
});