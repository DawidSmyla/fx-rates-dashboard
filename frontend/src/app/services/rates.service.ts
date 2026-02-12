import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RatesService {
  private API_BASE = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getLatest(): Observable<any> {
    return this.http.get(`${this.API_BASE}/rates/latest/`);
  }

  getByDate(date: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/rates/`, { params: { date } });
  }

  getByDateRange(dateFrom: string, dateTo: string): Observable<any> {
    return this.http.get(`${this.API_BASE}/rates/range/`, {
      params: { date_from: dateFrom, date_to: dateTo },
    });
  }

  getCurrencies(): Observable<any> {
    return this.http.get(`${this.API_BASE}/currencies/`);
  }

  getSummary(period: 'year' | 'quarter' | 'month' | 'day', dateFrom?: string, dateTo?: string): Observable<any> {
    const params: any = { period };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return this.http.get(`${this.API_BASE}/rates/summary/`, { params });
  }

  fetch(date?: string): Observable<any> {
    const params: any = {};
    if (date) params.date = date;
    return this.http.post(`${this.API_BASE}/currencies/fetch/`, {}, { params });
  }

  fetchRange(dateFrom: string, dateTo: string): Observable<any> {
    return this.http.post(`${this.API_BASE}/currencies/fetch-range/`, {}, {
      params: { date_from: dateFrom, date_to: dateTo },
    });
  }
}