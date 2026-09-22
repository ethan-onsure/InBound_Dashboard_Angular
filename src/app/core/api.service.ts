import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Appointment, BookingRequest, CallRecord, PagewiseModel, SessionRecord } from './models';
import { APP_CONFIG } from './app-config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private page(body: PagewiseModel): PagewiseModel { return { pageNumber: body.pageNumber || 1, pageSize: body.pageSize || 10 }; }
  calls(body: PagewiseModel): Observable<ApiResponse<CallRecord[]>> { return this.http.post<ApiResponse<CallRecord[]>>(`${APP_CONFIG.apiBaseUrl}/api/Product/GetCallsDetails`, this.page(body)); }
  sessions(kind: 'cancel' | 'inquiry' | 'reschedule', body: PagewiseModel): Observable<ApiResponse<SessionRecord[]>> {
    const endpoint = kind === 'cancel' ? 'GetCancelledSessions' : kind === 'inquiry' ? 'GetInquirySessions' : 'GetRescheduleSessions';
    return this.http.post<ApiResponse<SessionRecord[]>>(`${APP_CONFIG.apiBaseUrl}/api/Session/${endpoint}`, this.page(body));
  }
  bookings(body: PagewiseModel): Observable<ApiResponse<BookingRequest[]>> { return this.http.post<ApiResponse<BookingRequest[]>>(`${APP_CONFIG.apiBaseUrl}/api/BookAppointment/GetBookAppointments`, this.page(body)); }
  appointments(body: PagewiseModel): Observable<ApiResponse<Appointment[]>> { return this.http.post<ApiResponse<Appointment[]>>(`${APP_CONFIG.apiBaseUrl}/api/Appointment/GetAppointments`, this.page(body)); }
}
