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
  dateInput = '';
  summaryPeriod: 'year' | 'quarter' | 'month' | 'day' = 'month';
  loading = false;
  latestData: any = null;
  summaryData: any = null;
  message = '';

  constructor(private rates: RatesService) {}

  fetchFromNbp() {
    this.loading = true;
    this.message = '';
    this.rates.fetch(this.dateInput || undefined).subscribe({
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

  loadLatest() {
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

  loadByDate() {
    if (!this.dateInput) {
      this.message = 'Podaj datę (DD-MM-YYYY)';
      return;
    }
    this.loading = true;
    this.rates.getByDate(this.dateInput).subscribe({
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

  loadSummary() {
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