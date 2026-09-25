import { DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, ReportKind } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { BookingRequest, CallHistoryRecord, DrawerItem, ReportRecord } from '../core/models';
import { finalize } from 'rxjs';

export type PageKey = 'dashboard' | 'appointments' | 'appointment-requests'
  | 'cancel-appointment-report' | 'medical-staff-report' | 'book-appointment-report' | 'reschedule-appointment-report'
  | 'after-hour-report' | 'voicemail-report' | 'nursing-report' | 'reports' | 'settings';
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
  collapsed = signal(false); mobileOpen = signal(false); profileMenuOpen = signal(false); logoutConfirming = signal(false); current = signal<PageKey>('dashboard'); page = signal(1); readonly pageSize = 10; total = signal(0); loading = signal(false); error = signal(''); search = signal('');
  callHistory = signal<CallHistoryRecord[]>([]); bookings = signal<BookingRequest[]>([]); reports = signal<ReportRecord[]>([]); selectedSession = signal<DrawerItem | null>(null);
  userReportName = signal(''); userReportDob = signal(''); userReportSearched = signal(false);
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
  logout(): void { this.auth.logout(); }
  load(): void {
    this.loading.set(true); this.error.set('');
    const reportKind = REPORT_KINDS[this.current()];
    if (reportKind) {
      this.api.report(reportKind).pipe(finalize(() => this.loading.set(false))).subscribe({
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
    const body = { pageNumber: this.page(), pageSize: this.pageSize };
    this.api.bookings(body).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        if (!response.flag) {
          this.error.set(response.msg || 'The server could not load this queue.');
          return;
        }
        const data = Array.isArray(response.data) ? response.data : [];
        this.total.set((data[0] as { totalCount?: number } | undefined)?.totalCount || 0);
        this.bookings.set(data);
      },
      error: () => {
        this.error.set('We could not load this queue. Please retry.');
      },
    });
  }
  pageChange(page: number): void { this.page.set(page); this.load(); }
  // UI-only for now: no lookup endpoint is wired up yet, so this just reveals the layout shell.
  searchUserReport(): void { if (this.userReportName().trim() || this.userReportDob()) this.userReportSearched.set(true); }
  clearUserReport(): void { this.userReportSearched.set(false); this.userReportName.set(''); this.userReportDob.set(''); }
  formatDate(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date); }
  formatDateTime(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date); }
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
  // Flips isRead locally so the toggle and row highlight respond immediately. No update
  // endpoint exists yet to persist this — once one is provided, call it here too (optimistic
  // update, roll back on failure).
  toggleRead(item: ReportRecord): void {
    const next = !this.isReadValue(item);
    this.reports.update(list => list.map(r => r === item ? { ...r, isRead: next } : r));
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
