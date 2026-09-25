export interface ApiResponse<T> { flag: boolean; status: number; msg: string; data: T | null; }
export interface PagewiseModel { pageNumber: number; pageSize: number; }
export interface AuthTokens { accessToken: string; tokenType: string; expiresAtUtc: string; refreshToken: string; }
export interface BookingRequest { id: number; session_Id: string | null; account_id: string | null; practitioner_id: string | null; location_id: string | null; preferred_Date: string | null; practitioner_Name: string | null; location_Name: string | null; appointment_type: string | null; reason: string | null; status: boolean | null; createdAt: string | null; modifiedAt: string | null; totalCount: number; }
export interface CallHistoryRecord { session_id: string; createdAt: string | null; duration: number | null; mobile: string | null; status: string | null; transcript: string | null; audio_path: string | null; }
export interface ConversationTurn { bot?: string; user?: string; timestamp?: string; }
export interface ReportRecord {
  sessionId: string; mobile: string | null; name: string | null; dob: string | null; reason: string | null;
  appointmentDate?: string | null; currentAppointmentDate?: string | null; preferredDate?: string | null;
  lastUpdate: string | null; status: string | null; isRead: boolean | number | null; transcript: string | null;
  recording: string | null; modifiedBy: string | null; createdOn: string;
}
export interface DrawerItem { session_id: string; caller_phone: string | null; account_id: string | null; createdAt: string | null; transcript: string | null; audio_path: string | null; }
