import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AppointmentDetail, CallHistoryRecord, HourCallRate, ModMedPatient, MonthlyCallSummary, MonthlyIntentSummary, PagewiseModel, ReportRecord } from './models';
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

const FLAG_PATHS: Record<ReportKind, string> = {
  'cancel-appointment': 'Flag/UpdateAppointmentCancel_Flag',
  'medical-staff': 'Flag/UpdateMedicalStaffFlag',
  'book-appointment': 'Flag/UpdateBookAppointmentFlag',
  'reschedule-appointment': 'Flag/UpdateRescheduleAppointmentFlag',
  'after-hour': 'Flag/UpdateAfterHourFlag',
  voicemail: 'Flag/UpdateVoiceMailFlag',
  nursing: 'Flag/UpdateNursingFlag',
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private page(body: PagewiseModel): PagewiseModel { return { pageNumber: body.pageNumber || 1, pageSize: body.pageSize || 10 }; }
  callHistory(body: PagewiseModel): Observable<ApiResponse<CallHistoryRecord[]>> { return this.http.post<ApiResponse<CallHistoryRecord[]>>(`${APP_CONFIG.apiBaseUrl}/api/Appointment/GetCallHistory`, this.page(body)); }
  report(kind: ReportKind, startDate?: string, endDate?: string): Observable<ApiResponse<ReportRecord[]>> { return this.http.post<ApiResponse<ReportRecord[]>>(`${APP_CONFIG.apiBaseUrl}/api/${REPORT_PATHS[kind]}`, { StartDate: startDate || null, EndDate: endDate || null }); }
  updateReadFlag(kind: ReportKind, sessionId: string, isRead: boolean): Observable<ApiResponse<null>> { return this.http.post<ApiResponse<null>>(`${APP_CONFIG.apiBaseUrl}/api/${FLAG_PATHS[kind]}`, { sessionId, isRead }); }
  monthlyCallSummary(): Observable<ApiResponse<MonthlyCallSummary>> { return this.http.post<ApiResponse<MonthlyCallSummary>>(`${APP_CONFIG.apiBaseUrl}/api/Session/GetMonthlyCallSummary`, {}); }
  monthlyIntentSummary(): Observable<ApiResponse<MonthlyIntentSummary>> { return this.http.post<ApiResponse<MonthlyIntentSummary>>(`${APP_CONFIG.apiBaseUrl}/api/Session/GetMonthlyIntentSummary`, {}); }
  hourCallRate(): Observable<ApiResponse<HourCallRate[]>> { return this.http.post<ApiResponse<HourCallRate[]>>(`${APP_CONFIG.apiBaseUrl}/api/Session/GetHourCallRate`, {}); }
  patientByName(id: string): Observable<ApiResponse<ModMedPatient[]>> { return this.http.post<ApiResponse<ModMedPatient[]>>(`${APP_CONFIG.apiBaseUrl}/api/ModMed/GetPatientDetailsByName`, { id }); }
  patientByFamily(id: string): Observable<ApiResponse<ModMedPatient[]>> { return this.http.post<ApiResponse<ModMedPatient[]>>(`${APP_CONFIG.apiBaseUrl}/api/ModMed/GetPatientDetailsByFamily`, { id }); }
  patientByDob(id: string): Observable<ApiResponse<ModMedPatient[]>> { return this.http.post<ApiResponse<ModMedPatient[]>>(`${APP_CONFIG.apiBaseUrl}/api/ModMed/GetPatientDetailsByDOB`, { id }); }
  appointmentDetails(id: string): Observable<ApiResponse<AppointmentDetail[]>> { return this.http.post<ApiResponse<AppointmentDetail[]>>(`${APP_CONFIG.apiBaseUrl}/api/ModMed/GetAppointmentDetails`, { id }); }
  recording(sessionId: string): Observable<Blob> { return this.http.get(`${APP_CONFIG.apiBaseUrl}/api/Recording/${encodeURIComponent(sessionId)}`, { responseType: 'blob' }); }
}
