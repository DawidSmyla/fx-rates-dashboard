import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RatesService } from './services/rates.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  title = 'Przeglądaj kursy walut';

  // Pola dat – zakres
  dateFrom = '';
  dateTo = '';

  // Filtrowanie tabeli
  summaryPeriod: 'year' | 'quarter' | 'month' | 'day' = 'month';
  filterCode = ''; 

  // Stan
  loading = false;
  message = '';

  // Dane
  latestData: any = null;
  rangeData: any = null;
  summaryData: any = null;

  constructor(private rates: RatesService) {}


  get rangeDateKeys(): string[] {
    if (!this.rangeData?.dates) return [];
    return Object.keys(this.rangeData.dates).sort();
  }

  filterRates(rates: any[]): any[] {
    if (!this.filterCode) return rates;
    const query = this.filterCode.toUpperCase();
    return rates.filter((r: any) => r.code.toUpperCase().includes(query));
  }

  private clearResults() {
    this.message = '';
    this.latestData = null;
    this.rangeData = null;
    this.summaryData = null;
  }

  // ========== AKCJE PRZYCISKÓW ==========

  fetchFromNbp() {
    this.clearResults();
    this.loading = true;

    if (this.dateFrom && this.dateTo) {
      // Zakres dat – masowe pobieranie
      this.rates.fetchRange(this.dateFrom, this.dateTo).subscribe({
        next: (res) => {
          this.message = `Pobrano: ${res.created} nowych, ${res.updated} zaktualizowanych `
            + `(${res.fetched_dates_count} dni roboczych od ${res.date_from} do ${res.date_to})`;
          this.loading = false;
        },
        error: (err) => {
          this.message = `Błąd pobierania: ${err.error?.error || err.message}`;
          this.loading = false;
        },
      });
    } else if (this.dateFrom || this.dateTo) {
      // Jedna data podana
      const singleDate = this.dateFrom || this.dateTo;
      this.rates.fetch(singleDate).subscribe({
        next: (res) => {
          this.message = `Pobrano: ${res.created} nowych, ${res.updated} zaktualizowanych (data ${res.date})`;
          this.loading = false;
        },
        error: (err) => {
          this.message = `Błąd pobierania: ${err.error?.error || err.message}`;
          this.loading = false;
        },
      });
    } else {
      // Brak dat – pobierz najnowsze
      this.rates.fetch().subscribe({
        next: (res) => {
          this.message = `Pobrano: ${res.created} nowych, ${res.updated} zaktualizowanych (data ${res.date})`;
          this.loading = false;
        },
        error: (err) => {
          this.message = `Błąd pobierania: ${err.error?.error || err.message}`;
          this.loading = false;
        },
      });
    }
  }

  // Pokaż najnowsze kursy z bazy 
  loadLatest() {
    this.clearResults();
    this.loading = true;
    this.rates.getLatest().subscribe({
      next: (res) => {
        this.latestData = res;
        this.loading = false;
      },
      error: (err) => {
        this.message = `Błąd: ${err.error?.error || err.message}`;
        this.loading = false;
      },
    });
  }

  // Pokaż kursy z zakresu dat (lub jednej daty) z bazy 
  loadByDateRange() {
    this.clearResults();

    if (!this.dateFrom && !this.dateTo) {
      this.message = 'Podaj co najmniej jedną datę (od lub do)';
      return;
    }

    this.loading = true;

    if (this.dateFrom && this.dateTo) {
      // Zakres dat
      this.rates.getByDateRange(this.dateFrom, this.dateTo).subscribe({
        next: (res) => {
          this.rangeData = res;
          this.loading = false;
        },
        error: (err) => {
          this.message = `Błąd: ${err.error?.error || err.message}`;
          this.loading = false;
        },
      });
    } else {
      // Jedna data
      const singleDate = this.dateFrom || this.dateTo;
      this.rates.getByDate(singleDate).subscribe({
        next: (res) => {
          this.latestData = res;
          this.loading = false;
        },
        error: (err) => {
          this.message = `Błąd: ${err.error?.error || err.message}`;
          this.loading = false;
        },
      });
    }
  }

  loadSummary() {
    this.clearResults();
    this.loading = true;
    this.rates.getSummary(this.summaryPeriod).subscribe({
      next: (res) => {
        this.summaryData = res;
        this.loading = false;
      },
      error: (err) => {
        this.message = `Błąd: ${err.error?.error || err.message}`;
        this.loading = false;
      },
    });
  }
}