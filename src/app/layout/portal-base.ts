import { DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChartType } from 'angular-google-charts';
import { ApiService, ReportKind } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PatientSearchService } from '../core/patient-search.service';
import { AppointmentDetail, CallHistoryRecord, DailyCallSummary, DrawerItem, HourCallRate, ModMedPatient, MonthlyCallSummary, MonthlyIntentSummary, ReportRecord } from '../core/models';
import { finalize, forkJoin } from 'rxjs';

export type PageKey = 'dashboard' | 'appointments' | 'appointment-requests'
  | 'cancel-appointment-report' | 'medical-staff-report' | 'book-appointment-report' | 'reschedule-appointment-report'
  | 'after-hour-report' | 'voicemail-report' | 'nursing-report' | 'reports' | 'settings';
export type AppointmentSortColumn = 'appointmentType' | 'reasonText' | 'description' | 'startTime' | 'status' | 'createdAt';
export interface NavItem { key: PageKey; label: string; icon: string; section: string; }

const SECTION_LABELS: Record<string, string> = {
  MAIN: 'Summary',
  'CALL MANAGEMENT': 'Call Reports',
  REPORTING: 'Patient Reports',
  SYSTEM: 'Practice Settings',
};

const REPORT_KINDS: Partial<Record<PageKey, ReportKind>> = {
  'cancel-appointment-report': 'cancel-appointment',
  'medical-staff-report': 'medical-staff',
  'book-appointment-report': 'book-appointment',
  'reschedule-appointment-report': 'reschedule-appointment',
  'after-hour-report': 'after-hour',
  'voicemail-report': 'voicemail',
  'nursing-report': 'nursing',
};

export abstract class PortalBase {
  readonly Math = Math;
  readonly auth = inject(AuthService); protected readonly api = inject(ApiService); protected readonly router = inject(Router);
  private readonly patientSearch = inject(PatientSearchService);
  collapsed = signal(false); mobileOpen = signal(false); profileMenuOpen = signal(false); logoutConfirming = signal(false); current = signal<PageKey>('dashboard'); page = signal(1); readonly pageSize = 10; total = signal(0); loading = signal(false); error = signal(''); search = signal(''); reportStartDate = signal<Date | null>(null); reportEndDate = signal<Date | null>(null);
  callHistory = signal<CallHistoryRecord[]>([]); reports = signal<ReportRecord[]>([]); selectedSession = signal<DrawerItem | null>(null);
  // Proxy the same signal instances from PatientSearchService (a root singleton) so the
  // Patient Reports search state survives navigating away and back — this page component
  // gets destroyed/recreated on every route change since each tab is a distinct route.
  get userReportName() { return this.patientSearch.searchTerm; }
  get userReportSearched() { return this.patientSearch.searched; }
  get patientResults() { return this.patientSearch.results; }
  get selectedPatient() { return this.patientSearch.selected; }
  get patientSearchLoading() { return this.patientSearch.loading; }
  get patientSearchError() { return this.patientSearch.error; }
  get patientDropdownClosed() { return this.patientSearch.dropdownClosed; }
  get patientAppointments() { return this.patientSearch.appointments; }
  get patientAppointmentsLoading() { return this.patientSearch.appointmentsLoading; }
  get patientAppointmentsError() { return this.patientSearch.appointmentsError; }
  retryPatientAppointments(): void { this.patientSearch.retryAppointments(); }
  apptSortColumn = signal<AppointmentSortColumn>('startTime');
  apptSortDirection = signal<'asc' | 'desc'>('desc');
  private apptSortValue(item: AppointmentDetail, column: AppointmentSortColumn): string | number {
    if (column === 'startTime' || column === 'createdAt') {
      const time = item[column] ? new Date(item[column] as string).getTime() : 0;
      return Number.isNaN(time) ? 0 : time;
    }
    return (item[column] || '').toString().toLowerCase();
  }
  readonly sortedPatientAppointments = computed(() => {
    const column = this.apptSortColumn();
    const direction = this.apptSortDirection();
    const sign = direction === 'asc' ? 1 : -1;
    return [...this.patientAppointments()].sort((a, b) => {
      const av = this.apptSortValue(a, column);
      const bv = this.apptSortValue(b, column);
      return av < bv ? -sign : av > bv ? sign : 0;
    });
  });
  toggleApptSort(column: AppointmentSortColumn): void {
    if (this.apptSortColumn() === column) {
      this.apptSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.apptSortColumn.set(column);
      this.apptSortDirection.set('desc');
    }
  }
  private appointmentTime(item: AppointmentDetail): number {
    const time = item.startTime ? new Date(item.startTime).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  }
  readonly upcomingAppointments = computed(() => {
    const now = Date.now();
    return this.patientAppointments()
      .filter(item => this.appointmentTime(item) > now)
      .sort((a, b) => this.appointmentTime(a) - this.appointmentTime(b));
  });
  readonly pastAppointments = computed(() => {
    const now = Date.now();
    return this.patientAppointments()
      .filter(item => this.appointmentTime(item) > 0 && this.appointmentTime(item) <= now)
      .sort((a, b) => this.appointmentTime(b) - this.appointmentTime(a))
      .slice(0, 4);
  });
  monthlySummary = signal<MonthlyCallSummary | null>(null);
  monthlyIntentSummary = signal<MonthlyIntentSummary | null>(null);
  hourCallRates = signal<HourCallRate[]>([]);
  chartsLoading = signal(false);
  drawerPos = signal({ top: 0, left: 0, maxHeight: 560 });
  private drawerPosLocked = false;
  readonly now = signal(new Date());
  nav: NavItem[] = [
    { key:'dashboard',label:'Quick Access',icon:'▦',section:'MAIN' }, { key:'appointments',label:'Call History',icon:'◷',section:'MAIN' }, { key:'appointment-requests',label:'Statistics',icon:'⊞',section:'MAIN' },
    { key:'cancel-appointment-report',label:'Cancel Appointment Report',icon:'⊗',section:'CALL MANAGEMENT' }, { key:'medical-staff-report',label:'Medical Staff Report',icon:'⚕',section:'CALL MANAGEMENT' }, { key:'book-appointment-report',label:'Book Appointment Report',icon:'▧',section:'CALL MANAGEMENT' }, { key:'reschedule-appointment-report',label:'Reschedule Appointment Report',icon:'↺',section:'CALL MANAGEMENT' }, { key:'after-hour-report',label:'After Hour Report',icon:'☾',section:'CALL MANAGEMENT' }, { key:'voicemail-report',label:'Voicemail Report',icon:'✉',section:'CALL MANAGEMENT' }, { key:'nursing-report',label:'Nursing Report',icon:'✚',section:'CALL MANAGEMENT' },
    { key:'reports',label:'User Report',icon:'▥',section:'REPORTING' }, { key:'settings',label:'Settings',icon:'⚙',section:'SYSTEM' },
  ];
  readonly sectionOrder = ['MAIN', 'CALL MANAGEMENT', 'REPORTING', 'SYSTEM'];
  readonly title = computed(() => this.current() === 'dashboard' ? `${this.greeting(this.now())}, team` : this.nav.find(n => n.key === this.current())?.label || 'Operations');
  readonly subtitle = computed(() => this.current() === 'dashboard' ? 'Here’s what is happening across your patient access workflow today.' : 'Review and manage patient access activity.');
  readonly filteredReports = computed(() => this.reports().filter(item => `${item.sessionId} ${item.mobile} ${item.name}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly activeSection = computed(() => this.nav.find(n => n.key === this.current())?.section || 'MAIN');
  readonly isReportPage = computed(() => this.current() in REPORT_KINDS);
  readonly summaryBars = computed(() => {
    const summary = this.monthlySummary();
    if (!summary) return [];
    return [
      { label: 'In Process', value: summary.inProcessCount },
      { label: 'Handoff', value: summary.handoffCount },
      { label: 'Completed', value: summary.completedCount },
    ];
  });
  readonly pieChartType = ChartType.PieChart;
  readonly pieChartColumns = ['Status', 'Calls'];
  readonly pieChartOptions = {
    colors: ['#f4a53a', '#4338ca', '#16a34a'],
    pieHole: 0.4,
    legend: { position: 'bottom' },
    chartArea: { width: '90%', height: '78%' },
  };
  readonly pieChartRows = computed(() => this.summaryBars().map(b => [b.label, b.value]));
  readonly lineChartType = ChartType.Line;
  readonly lineChartColumns = computed(() => ['Day', 'In Process', 'Handoff', 'Completed']);
  readonly lineChartOptions = {
    colors: ['#f4a53a', '#4338ca', '#16a34a'],
    legend: { position: 'bottom' },
    hAxis: { title: 'Day of Month' },
    vAxis: { title: 'Calls', minValue: 0 },
    chartArea: { width: '85%', height: '68%' },
  };
  readonly lineChartRows = computed(() => {
    const days = this.monthlySummary()?.dailyBreakdown ?? [];
    if (!days.length) return [];
    const validDates = days.map(d => new Date(d.callDate)).filter(d => !Number.isNaN(d.getTime()));
    const ref = validDates[0] ?? this.now();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDay = new Map<number, DailyCallSummary>();
    for (const d of days) {
      const date = new Date(d.callDate);
      if (!Number.isNaN(date.getTime())) byDay.set(date.getDate(), d);
    }
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const entry = byDay.get(dayNum);
      return [dayNum, entry?.inProcessCount ?? 0, entry?.handoffCount ?? 0, entry?.completedCount ?? 0];
    });
  });
  readonly barChartType = ChartType.Bar;
  readonly barChartColumns = ['Intent', 'Count'];
  readonly barChartOptions = {
    colors: ['#4338ca'],
    legend: { position: 'none' },
    bars: 'horizontal',
    hAxis: { title: 'Calls', minValue: 0 },
    chartArea: { width: '70%', height: '80%' },
  };
  readonly barChartRows = computed(() => {
    const s = this.monthlyIntentSummary();
    if (!s) return [];
    return [
      ['Cancel', s.cancel_Count],
      ['Voicemail', s.voiceMail_Count],
      ['After Hour', s.afterHour_Count],
      ['Reschedule', s.reschedule_Count],
      ['Book', s.book_Count],
      ['Medical Staff', s.medicalStaff_Count],
      ['Nursing', s.nursing_Count],
    ];
  });
  readonly hourChartType = ChartType.ColumnChart;
  readonly hourChartColumns = ['Hour', 'Calls', { type: 'string', role: 'tooltip' }];
  readonly hourChartOptions = {
    colors: ['#4338ca'],
    legend: { position: 'none' },
    hAxis: { title: 'Hour of Day', slantedText: true, slantedTextAngle: 90, textStyle: { fontSize: 10 } },
    vAxis: { title: 'Calls', minValue: 0 },
    chartArea: { width: '90%', height: '56%' },
  };
  private hourRangeLabel(timeSlot: string): string {
    const [startRaw, endRaw] = timeSlot.split(' - ');
    const meridiem = (s: string) => s.match(/AM|PM/)?.[0] ?? '';
    const hourNum = (s: string) => s.replace(/\s?(AM|PM)/, '').replace(/^0/, '');
    const startMeridiem = meridiem(startRaw);
    const endMeridiem = meridiem(endRaw);
    return startMeridiem === endMeridiem
      ? `${hourNum(startRaw)}-${hourNum(endRaw)}${endMeridiem}`
      : `${hourNum(startRaw)}${startMeridiem}-${hourNum(endRaw)}${endMeridiem}`;
  }
  readonly hourChartRows = computed(() => this.hourCallRates().map(h => {
    const axisLabel = h.timeSlot.split(' - ')[0].replace(/^0/, '');
    const tooltip = `${this.hourRangeLabel(h.timeSlot)} Calls: ${h.callCount}`;
    return [axisLabel, h.callCount, tooltip];
  }));
  constructor() {
    const key = this.router.url.split('/')[1] as PageKey || 'dashboard';
    this.current.set(this.nav.some(item => item.key === key) ? key : 'dashboard');
    if (this.current() !== 'dashboard' && this.current() !== 'reports' && this.current() !== 'settings') this.load();
    const id = setInterval(() => this.now.set(new Date()), 30000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
  greeting(date: Date): string {
    const hours = date.getHours();
    if (hours >= 5 && hours < 12) return 'Good morning';
    if (hours >= 12 && hours < 17) return 'Good afternoon';
    return 'Good evening';
  }
  sectionLabel(section: string): string { return SECTION_LABELS[section] || section; }
  sectionItems(section: string): NavItem[] { return this.nav.filter(item => item.section === section); }
  navigate(key: PageKey): void { this.mobileOpen.set(false); void this.router.navigate(['/', key]); }
  toggleProfileMenu(): void {
    const next = !this.profileMenuOpen();
    this.profileMenuOpen.set(next);
    if (!next) this.logoutConfirming.set(false);
  }
  closeProfileMenu(): void { this.profileMenuOpen.set(false); this.logoutConfirming.set(false); }
  logout(): void { this.patientSearch.clear(); this.auth.logout(); }
  load(): void {
    this.loading.set(true); this.error.set('');
    const reportKind = REPORT_KINDS[this.current()];
    if (reportKind) {
      this.api.report(reportKind, this.isoDate(this.reportStartDate()), this.isoDate(this.reportEndDate())).pipe(finalize(() => this.loading.set(false))).subscribe({
        next: response => {
          if (!response.flag) { this.error.set(response.msg || 'The server could not load this report.'); return; }
          const data = Array.isArray(response.data) ? response.data : [];
          this.reports.set(data);
          this.total.set(data.length);
        },
        error: () => this.error.set('We could not load this report. Please retry.'),
      });
      return;
    }
    if (this.current() === 'appointments') {
      this.api.callHistory({ pageNumber: this.page(), pageSize: this.pageSize }).pipe(finalize(() => this.loading.set(false))).subscribe({
        next: response => {
          if (!response.flag) { this.error.set(response.msg || 'The server could not load call history.'); return; }
          const data = Array.isArray(response.data) ? response.data : [];
          this.callHistory.set(data);
          this.total.set(data.length);
        },
        error: () => this.error.set('We could not load call history. Please retry.'),
      });
      return;
    }
    if (this.current() === 'appointment-requests') {
      this.loading.set(false);
      this.total.set(0);
      this.chartsLoading.set(true);
      forkJoin({
        summary: this.api.monthlyCallSummary(),
        intent: this.api.monthlyIntentSummary(),
        hourly: this.api.hourCallRate(),
      }).pipe(finalize(() => this.chartsLoading.set(false))).subscribe({
        next: ({ summary, intent, hourly }) => {
          this.monthlySummary.set(summary.flag ? summary.data : null);
          this.monthlyIntentSummary.set(intent.flag ? intent.data : null);
          this.hourCallRates.set(hourly.flag && Array.isArray(hourly.data) ? hourly.data : []);
        },
        error: () => {
          this.monthlySummary.set(null);
          this.monthlyIntentSummary.set(null);
          this.hourCallRates.set([]);
        },
      });
    }
  }
  pageChange(page: number): void { this.page.set(page); this.load(); }
  private isoDate(date: Date | null): string { return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''; }
  applyReportDateFilter(): void { this.load(); }
  clearReportDateFilter(): void { this.reportStartDate.set(null); this.reportEndDate.set(null); this.load(); }
  readonly canExport = computed(() => this.current() === 'appointments' || this.isReportPage());
  private reportExportColumns(key: PageKey): { header: string; value: (item: ReportRecord) => string }[] {
    const mobile = { header: 'Mobile', value: (i: ReportRecord) => i.mobile || '—' };
    const patient = { header: 'Patient', value: (i: ReportRecord) => i.name || '—' };
    const reason = { header: 'Reason', value: (i: ReportRecord) => i.reason || '—' };
    const lastUpdate = { header: 'Last update', value: (i: ReportRecord) => this.formatDateTime(i.lastUpdate) };
    const created = { header: 'Created', value: (i: ReportRecord) => this.formatDateTime(i.createdOn) };
    const status = { header: 'Status', value: (i: ReportRecord) => this.readLabel(i) };
    switch (key) {
      case 'cancel-appointment-report': return [mobile, patient, { header: 'Date of birth', value: i => this.formatDate(i.dob) }, { header: 'Appointment date', value: i => this.formatDate(i.appointmentDate) }, lastUpdate, created, status];
      case 'medical-staff-report': return [mobile, patient, reason, lastUpdate, created, status];
      case 'book-appointment-report': return [mobile, patient, reason, { header: 'Preferred date', value: i => i.preferredDate || '—' }, lastUpdate, created, status];
      case 'reschedule-appointment-report': return [mobile, patient, { header: 'Current appointment', value: i => i.currentAppointmentDate || '—' }, { header: 'Preferred date', value: i => i.preferredDate || '—' }, lastUpdate, created, status];
      case 'after-hour-report': return [mobile, patient, reason, lastUpdate, created, status];
      case 'voicemail-report': return [mobile, patient, { header: 'Message', value: i => i.transcript || '—' }, lastUpdate, created, status];
      case 'nursing-report': return [mobile, patient, reason, lastUpdate, created, status];
      default: return [mobile, patient, lastUpdate, created, status];
    }
  }
  exporting = signal(false);
  async exportToExcel(): Promise<void> {
    const key = this.current();
    let header: string[];
    let rows: string[][];
    if (key === 'appointments') {
      header = ['Mobile', 'Status', 'Duration', 'Date & time'];
      rows = this.callHistory().map(item => [item.mobile || '—', item.status || '—', this.formatDuration(item.duration), this.formatDateTime(item.createdAt)]);
    } else if (this.isReportPage()) {
      const columns = this.reportExportColumns(key);
      header = columns.map(c => c.header);
      rows = this.filteredReports().map(item => columns.map(c => c.value(item)));
    } else {
      return;
    }
    this.exporting.set(true);
    try {
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
      XLSX.writeFile(workbook, `${key}-${this.isoDate(this.now())}.xlsx`);
    } finally {
      this.exporting.set(false);
    }
  }
  searchUserReport(): void { this.patientSearch.search(); }
  selectPatient(patient: ModMedPatient): void { this.patientSearch.selectPatient(patient); }
  backToPatientResults(): void { this.patientSearch.backToResults(); }
  closePatientDropdown(): void { this.patientSearch.closeDropdown(); }
  openPatientDropdown(): void { this.patientSearch.openDropdown(); }
  clearUserReport(): void { this.patientSearch.clear(); }
  patientDisplayName(patient: ModMedPatient | null): string {
    const n = patient?.name?.[0];
    if (!n) return '—';
    const given = (n.given || []).join(' ');
    return [n.family, given].filter(Boolean).join(', ') || '—';
  }
  patientMrn(patient: ModMedPatient | null): string { return patient?.identifier?.[0]?.value || '—'; }
  patientPms(patient: ModMedPatient | null): string { return patient?.identifier?.find(i => i.system === 'PMS')?.value || '—'; }
  patientPhone(patient: ModMedPatient | null): string {
    const mobile = patient?.telecom?.find(t => t.system === 'phone' && t.use === 'mobile');
    const anyPhone = patient?.telecom?.find(t => t.system === 'phone');
    return (mobile || anyPhone)?.value || '—';
  }
  patientEmail(patient: ModMedPatient | null): string {
    return patient?.telecom?.find(t => t.system === 'email')?.value || '—';
  }
  patientAddress(patient: ModMedPatient | null): string {
    const a = patient?.address?.[0];
    if (!a) return '—';
    const line = (a.line || []).join(', ');
    return [line, a.city, a.state, a.postalCode].filter(Boolean).join(', ') || '—';
  }
  patientPhoto(patient: ModMedPatient | null): string | null {
    const gender = patient?.gender?.toLowerCase();
    if (gender === 'male') return 'Genric_M.jpg';
    if (gender === 'female') return 'Genric_F.jpg';
    return null;
  }
  formatDate(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date); }
  formatDateTime(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date); }
  formatTime(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(date); }
  openSession(item: DrawerItem, button: HTMLElement): void {
    if (!this.drawerPosLocked) {
      const rect = button.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth * 0.92);
      const gap = 10;
      let left = rect.right - width;
      left = Math.min(Math.max(left, 12), window.innerWidth - width - 12);
      const top = rect.bottom + gap;
      const available = window.innerHeight - top - 12;
      const maxHeight = Math.max(Math.min(560, available), 240);
      this.drawerPos.set({ top, left, maxHeight });
      this.drawerPosLocked = true;
    }
    this.selectedSession.set(item);
  }
  selectCall(item: DrawerItem): void { this.selectedSession.set(item); }
  reportDrawerItem(item: ReportRecord): DrawerItem {
    return { session_id: item.sessionId, caller_phone: item.mobile, account_id: item.name, createdAt: item.createdOn, transcript: item.transcript, audio_path: item.recording };
  }
  callDrawerItem(item: CallHistoryRecord): DrawerItem {
    return { session_id: item.session_id, caller_phone: item.mobile, account_id: null, createdAt: item.createdAt, transcript: item.transcript, audio_path: item.audio_path };
  }
  formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }
  isReadValue(item: ReportRecord): boolean { return item.isRead === true || item.isRead === 1; }
  readLabel(item: ReportRecord): string { return this.isReadValue(item) ? 'Completed' : 'New'; }
  // Optimistic: flips isRead locally first so the toggle and row highlight respond
  // immediately, then persists via the per-report-kind flag endpoint. Rolls back on failure.
  toggleRead(item: ReportRecord): void {
    const reportKind = REPORT_KINDS[this.current()];
    if (!reportKind) return;
    const next = !this.isReadValue(item);
    this.reports.update(list => list.map(r => r.sessionId === item.sessionId ? { ...r, isRead: next } : r));
    this.api.updateReadFlag(reportKind, item.sessionId, next).subscribe({
      error: () => this.reports.update(list => list.map(r => r.sessionId === item.sessionId ? { ...r, isRead: !next } : r)),
    });
  }
  transcript(item: { transcript: string | null }): { speaker: 'AI'|'Patient'; text: string }[] {
    const raw = item.transcript || '';
    try {
      const turns = JSON.parse(raw) as Record<string, string>[];
      const result: { speaker: 'AI'|'Patient'; text: string }[] = [];
      turns.forEach(turn => {
        if (turn['bot']) result.push({ speaker: 'AI', text: turn['bot'] });
        else if (turn['user']) result.push({ speaker: 'Patient', text: turn['user'] });
      });
      return result;
    } catch { return raw.trim() ? [{ speaker: 'Patient', text: raw.trim() }] : []; }
  }
  // The API only returns a server-local filesystem path (audio_path/recording), not an
  // HTTP-fetchable URL, and there's no endpoint yet to stream it. Recording playback stays
  // disabled everywhere until a real URL is available here.
  audioUrl(_item: { audio_path: string | null }): string | null { return null; }
  hasAudio(item: { audio_path: string | null } | null): boolean { return !!item && !!this.audioUrl(item); }
  truncateSessionId(id: string): string { return id.length > 18 ? `${id.slice(0, 13)}...${id.slice(-4)}` : id; }
  formatRecordingMeta(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const datePart = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(date);
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const meridiem = hours24 < 12 ? 'am' : 'pm';
    return `${datePart} ${hours12}:${minutes} ${meridiem}`;
  }
}
