import { Component, ChangeDetectorRef, HostListener } from '@angular/core';
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
  availableCurrencies: { code: string; currency: string }[] = [];
  searchQuery = '';
  selectedCurrencies: string[] = [];
  dropdownOpen = false;
  showChart = false;
  chartColors: Record<string, string> = {};
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

  get filterDisplayText(): string {
    if (this.selectedCurrencies.length === 0) return 'Wybierz waluty';
    return this.selectedCurrencies.sort().join(', ');
  }

  get filteredDropdownItems(): { code: string; currency: string }[] {
    if (!this.searchQuery) return this.availableCurrencies;
    const q = this.searchQuery.toLowerCase();
    return this.availableCurrencies.filter(c =>
      c.code.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q)
    );
  }

  filterRates(rates: any[]): any[] {
    if (this.selectedCurrencies.length === 0) return rates;
    return rates.filter((r: any) =>
      this.selectedCurrencies.includes(r.code)
    );
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
  
  loadCurrencies() {
    if (this.availableCurrencies.length > 0) return;
    this.rates.getCurrencies().subscribe({
      next: (res) => {
        this.availableCurrencies = res.currencies
          .map((c: any) => ({ code: c.code, currency: c.currency }))
          .sort((a: any, b: any) => a.code.localeCompare(b.code));
        this.cdr.detectChanges();
      },
    });
  }

  toggleDropdown() {
    this.loadCurrencies();
    this.dropdownOpen = !this.dropdownOpen;
  }

    toggleChart() {
    this.showChart = !this.showChart;
    if (this.showChart) {
      setTimeout(() => this.renderChart(), 100);
    }
  }

  private getColorForCode(code: string): string {
    if (!this.chartColors[code]) {
      const r = Math.floor(Math.random() * 180 + 50);
      const g = Math.floor(Math.random() * 180 + 50);
      const b = Math.floor(Math.random() * 180 + 50);
      this.chartColors[code] = `rgb(${r}, ${g}, ${b})`;
    }
    return this.chartColors[code];
  }

  private renderChart() {
    const canvas = document.getElementById('summaryChart') as HTMLCanvasElement;
    if (!canvas || !this.summaryData) return;

    const existingChart = (window as any).__fxChart;
    if (existingChart) existingChart.destroy();

    const labels = Object.keys(this.summaryData.data).sort();
    const formattedLabels = labels.map((l: string) => this.formatPeriodKey(l));

    const allCodes = new Set<string>();
    for (const key of labels) {
      for (const r of this.summaryData.data[key]) {
        allCodes.add(r.code);
      }
    }

    const codesToShow = this.selectedCurrencies.length > 0
      ? [...allCodes].filter(c => this.selectedCurrencies.includes(c))
      : [...allCodes];

    const Chart = (window as any).Chart;
    if (!Chart) return;

    const datasets = codesToShow.sort().map(code => {
      const color = this.getColorForCode(code);
      const data = labels.map(label => {
        const entry = this.summaryData.data[label]?.find((r: any) => r.code === code);
        return entry ? parseFloat(entry.rate) : null;
      });
      return {
        label: code,
        data,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
      };
    });

    (window as any).__fxChart = new Chart(canvas, {
      type: 'line',
      data: { labels: formattedLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: { color: '#f5f5f5', font: { size: 12 }, padding: 16 },
          },
        },
        scales: {
          x: {
            ticks: { color: '#aaa', maxRotation: 45 },
            grid: { color: '#333' },
          },
          y: {
            ticks: { color: '#aaa' },
            grid: { color: '#333' },
          },
        },
      },
    });

    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.dropdownOpen = false;
    }
  }

  toggleCurrency(code: string) {
    const idx = this.selectedCurrencies.indexOf(code);
    if (idx === -1) {
      this.selectedCurrencies.push(code);
    } else {
      this.selectedCurrencies.splice(idx, 1);
    }
  }

  clearCurrencySelection() {
    this.selectedCurrencies = [];
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