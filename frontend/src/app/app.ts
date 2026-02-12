import { Component, ChangeDetectorRef } from '@angular/core';
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

  dateFrom = '';
  dateTo = '';

  summaryPeriod: 'year' | 'quarter' | 'month' | 'day' = 'month';
  filterCode = ''; 

  loading = false;
  message = '';

  latestData: any = null;
  rangeData: any = null;
  summaryData: any = null;

  constructor(private rates: RatesService, private cdr: ChangeDetectorRef) {}


  get rangeDateKeys(): string[] {
    if (!this.rangeData?.dates) return [];
    return Object.keys(this.rangeData.dates).sort();
  }

  filterRates(rates: any[]): any[] {
    if (!this.filterCode) return rates;
    const query = this.filterCode.toUpperCase();
    return rates.filter((r: any) => r.code.toUpperCase().includes(query));
  }

    get summaryTitle(): string {
    if (!this.summaryData) return '';
    const titles: Record<string, string> = {
      year: 'Średnie kursy walut dla poszczególnych lat',
      quarter: 'Średnie kursy walut dla poszczególnych kwartałów',
      month: 'Średnie kursy walut dla poszczególnych miesięcy',
      day: 'Kursy walut dla poszczególnych dni',
    };
    return titles[this.summaryData.period] || 'Podsumowanie';
  }

  formatPeriodKey(key: string): string {
    if (!this.summaryData) return key;
    const period = this.summaryData.period;
    if (period === 'year') return key.substring(0, 4);
    if (period === 'month') return key.substring(0, 7);
    if (period === 'quarter') {
      const month = parseInt(key.substring(5, 7), 10);
      const q = Math.ceil(month / 3);
      return `${key.substring(0, 4)} Q${q}`;
    }
    return key;
  }

  private clearResults() {
    this.message = '';
    this.latestData = null;
    this.rangeData = null;
    this.summaryData = null;
  }

    private done() {
    this.loading = false;
    this.cdr.detectChanges();
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
          this.done();
        },
        error: (err) => {
          this.message = `Błąd pobierania: ${err.error?.error || err.message}`;
          this.done();
        },
      });
    } else if (this.dateFrom || this.dateTo) {
      // Jedna data podana
      const singleDate = this.dateFrom || this.dateTo;
      this.rates.fetch(singleDate).subscribe({
        next: (res) => {
          this.message = `Pobrano: ${res.created} nowych, ${res.updated} zaktualizowanych (data ${res.date})`;
          this.done();
        },
        error: (err) => {
          this.message = `Błąd pobierania: ${err.error?.error || err.message}`;
          this.done();
        },
      });
    } else {
      // Brak dat – pobierz najnowsze
      this.rates.fetch().subscribe({
        next: (res) => {
          this.message = `Pobrano: ${res.created} nowych, ${res.updated} zaktualizowanych (data ${res.date})`;
          this.done();
        },
        error: (err) => {
          this.message = `Błąd pobierania: ${err.error?.error || err.message}`;
          this.done();
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
        this.done();
      },
      error: (err) => {
        this.message = `Błąd: ${err.error?.error || err.message}`;
        this.done();
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
          this.done();
        },
        error: (err) => {
          this.message = `Błąd: ${err.error?.error || err.message}`;
          this.done();
        },
      });
    } else {
      // Jedna data
      const singleDate = this.dateFrom || this.dateTo;
      this.rates.getByDate(singleDate).subscribe({
        next: (res) => {
          this.latestData = res;
          this.done();
        },
        error: (err) => {
          this.message = `Błąd: ${err.error?.error || err.message}`;
          this.done();
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
        this.done();
      },
      error: (err) => {
        this.message = `Błąd: ${err.error?.error || err.message}`;
        this.done();
      },
    });
  }
}