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
    ratesServiceSpy = jasmine.createSpyObj('RatesService', ['fetch', 'getLatest', 'getByDate', 'getSummary']);
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

  it('should set loading=true and call rates.fetch() when fetchFromNbp() is called', () => {
    ratesServiceSpy.fetch.and.returnValue(of({ created: 1, updated: 0, date: '2024-01-15' }));
    app.dateInput = '2024-01-15';
    app.fetchFromNbp();
    expect(app.loading).toBe(false);
    expect(ratesServiceSpy.fetch).toHaveBeenCalledWith('2024-01-15');
    expect(app.message).toContain('Pobrano');
  });

  it('should set message if loadByDate called without date input', () => {
    app.dateInput = '';
    app.loadByDate();
    expect(app.message).toBe('Podaj datę (YYYY-MM-DD)');
  });

  it('should update latestData on loadLatest', () => {
    const mockResponse = { base: 'PLN', date: '2024-01-15', rates: [] };
    ratesServiceSpy.getLatest.and.returnValue(of(mockResponse));
    app.loadLatest();
    expect(app.latestData).toEqual(mockResponse);
    expect(app.loading).toBe(false);
  });
});