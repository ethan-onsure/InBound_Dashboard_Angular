import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, BookingRequest, CallHistoryRecord, PagewiseModel, ReportRecord } from './models';
import { APP_CONFIG } from './app-config';

export type ReportKind = 'cancel-appointment' | 'medical-staff' | 'book-appointment' | 'reschedule-appointment' | 'after-hour' | 'voicemail' | 'nursing';

const REPORT_PATHS: Record<ReportKind, string> = {
  'cancel-appointment': 'AppointmentCancel/GetCancelAppointmentReport',
  'medical-staff': 'MedicalStaff/GetMedicalStaffReport',
  'book-appointment': 'BookAppointment/GetBookAppointmentReport',
  'reschedule-appointment': 'RescheduleAppointment/GetRescheduleAppointmentReport',
  'after-hour': 'AfterHour/GetAfterHourReport',
  voicemail: 'VoiceMail/GetVoiceMailReport',
  nursing: 'Nursing/GetNursingReport',
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private page(body: PagewiseModel): PagewiseModel { return { pageNumber: body.pageNumber || 1, pageSize: body.pageSize || 10 }; }
  bookings(body: PagewiseModel): Observable<ApiResponse<BookingRequest[]>> { return this.http.post<ApiResponse<BookingRequest[]>>(`${APP_CONFIG.apiBaseUrl}/api/BookAppointment/GetBookAppointments`, this.page(body)); }
  callHistory(body: PagewiseModel): Observable<ApiResponse<CallHistoryRecord[]>> { return this.http.post<ApiResponse<CallHistoryRecord[]>>(`${APP_CONFIG.apiBaseUrl}/api/Appointment/GetCallHistory`, this.page(body)); }
  report(kind: ReportKind): Observable<ApiResponse<ReportRecord[]>> { return this.http.post<ApiResponse<ReportRecord[]>>(`${APP_CONFIG.apiBaseUrl}/api/${REPORT_PATHS[kind]}`, {}); }
}
