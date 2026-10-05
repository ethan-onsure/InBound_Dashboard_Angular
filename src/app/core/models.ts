export interface ApiResponse<T> { flag: boolean; status: number; msg: string; data: T | null; }
export interface PagewiseModel { pageNumber: number; pageSize: number; }
export interface AuthTokens { accessToken: string; tokenType: string; expiresAtUtc: string; refreshToken: string; }
export interface CallHistoryRecord { session_id: string; createdAt: string | null; duration: number | null; mobile: string | null; status: string | null; transcript: string | null; audio_path: string | null; }
export interface ConversationTurn { bot?: string; user?: string; timestamp?: string; }
export interface ReportRecord {
  sessionId: string; mobile: string | null; name: string | null; dob: string | null; reason: string | null;
  appointmentDate?: string | null; currentAppointmentDate?: string | null; preferredDate?: string | null;
  lastUpdate: string | null; status: string | null; isRead: boolean | number | null; transcript: string | null;
  recording: string | null; modifiedBy: string | null; createdOn: string;
}
export interface DrawerItem { session_id: string; caller_phone: string | null; account_id: string | null; createdAt: string | null; transcript: string | null; audio_path: string | null; }
export interface DailyCallSummary { callDate: string; totalCalls: number; inProcessCount: number; handoffCount: number; completedCount: number; }
export interface MonthlyCallSummary { totalCalls: number; inProcessCount: number; handoffCount: number; completedCount: number; dailyBreakdown: DailyCallSummary[]; }
export interface MonthlyIntentSummary { cancel_Count: number; voiceMail_Count: number; afterHour_Count: number; reschedule_Count: number; book_Count: number; medicalStaff_Count: number; nursing_Count: number; }
export interface HourCallRate { timeSlot: string; callCount: number; }
export interface ModMedName { family: string | null; given: string[] | null; }
export interface ModMedTelecom { system: string | null; value: string | null; use: string | null; rank: number | null; }
export interface ModMedAddress { use: string | null; type: string | null; line: string[] | null; city: string | null; state: string | null; postalCode: string | null; country: string | null; }
export interface ModMedIdentifier { system: string | null; value: string | null; }
export interface ModMedPatient {
  id: number; identifier: ModMedIdentifier[]; active: boolean; name: ModMedName[]; telecom: ModMedTelecom[];
  gender: string | null; birthDate: string | null; address: ModMedAddress[];
}
export interface AppointmentDetail {
  appointmentId: number; appointmentType: string | null; reasonText: string | null; description: string | null;
  startTime: string | null; endTime: string | null; duration: string | null; createdAt: string | null;
  locationId: number | null; practitionerId: number | null; status: string | null; lastUpdated: string | null;
}
