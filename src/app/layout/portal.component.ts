import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ApiResponse, Appointment, BookingRequest, CallRecord, SessionRecord } from '../core/models';
import { Observable, finalize } from 'rxjs';

type PageKey = 'dashboard' | 'appointments' | 'appointment-requests' | 'calls' | 'cancellations' | 'inquiries' | 'reschedules' | 'reports' | 'settings';
interface NavItem { key: PageKey; label: string; icon: string; section: string; }

@Component({
  selector: 'app-portal',
  imports: [CommonModule, FormsModule],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.scss',
})
export class PortalComponent {
  readonly Math = Math;
  readonly auth = inject(AuthService); private readonly api = inject(ApiService); private readonly router = inject(Router);
  collapsed = signal(false); mobileOpen = signal(false); profileMenuOpen = signal(false); logoutConfirming = signal(false); current = signal<PageKey>('dashboard'); page = signal(1); readonly pageSize = 10; total = signal(0); loading = signal(false); error = signal(''); search = signal('');
  appointments = signal<Appointment[]>([]); bookings = signal<BookingRequest[]>([]); calls = signal<CallRecord[]>([]); sessions = signal<SessionRecord[]>([]); sessionKind: 'cancel'|'inquiry'|'reschedule' = 'cancel'; selectedSession = signal<SessionRecord | null>(null);
  drawerPos = signal({ top: 0, left: 0, maxHeight: 560 });
  private drawerPosLocked = false;
  nav: NavItem[] = [
    { key:'dashboard',label:'Dashboard',icon:'▦',section:'MAIN' }, { key:'appointments',label:'Appointments',icon:'◷',section:'MAIN' }, { key:'appointment-requests',label:'Appointment requests',icon:'⊞',section:'MAIN' },
    { key:'calls',label:'Patient calls',icon:'◉',section:'CALL MANAGEMENT' }, { key:'cancellations',label:'Cancellations',icon:'↗',section:'CALL MANAGEMENT' }, { key:'inquiries',label:'Inquiries',icon:'?',section:'CALL MANAGEMENT' }, { key:'reschedules',label:'Reschedule requests',icon:'↻',section:'CALL MANAGEMENT' },
    { key:'reports',label:'Reports',icon:'▥',section:'REPORTING' }, { key:'settings',label:'Settings',icon:'⚙',section:'SYSTEM' },
  ];
  readonly title = computed(() => this.current() === 'dashboard' ? 'Good morning, team' : this.nav.find(n => n.key === this.current())?.label || 'Operations');
  readonly subtitle = computed(() => this.current() === 'dashboard' ? 'Here’s what is happening across your patient access workflow today.' : 'Review and manage patient access activity.');
  readonly filteredCalls = computed(() => this.calls().filter(item => `${item.name} ${item.caller_phone}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly filteredSessions = computed(() => this.sessions().filter(item => `${item.session_id} ${item.caller_phone} ${item.account_id}`.toLowerCase().includes(this.search().toLowerCase())));
  constructor() {
    const key = this.router.url.split('/')[1] as PageKey || 'dashboard';
    this.current.set(this.nav.some(item => item.key === key) ? key : 'dashboard');
    if (this.current() !== 'dashboard' && this.current() !== 'reports' && this.current() !== 'settings') this.load();
  }
  navigate(key: PageKey): void { this.mobileOpen.set(false); void this.router.navigate(['/', key]); }
  toggleProfileMenu(): void {
    const next = !this.profileMenuOpen();
    this.profileMenuOpen.set(next);
    if (!next) this.logoutConfirming.set(false);
  }
  closeProfileMenu(): void { this.profileMenuOpen.set(false); this.logoutConfirming.set(false); }
  logout(): void { this.auth.logout(); }
  load(): void {
    this.loading.set(true); this.error.set(''); const body = { pageNumber: this.page(), pageSize: this.pageSize };
    const request = (this.current() === 'calls' ? this.api.calls(body) : this.current() === 'appointments' ? this.api.appointments(body) : this.current() === 'appointment-requests' ? this.api.bookings(body) : this.api.sessions(this.current() === 'cancellations' ? 'cancel' : this.current() === 'inquiries' ? 'inquiry' : 'reschedule', body)) as Observable<ApiResponse<unknown[]>>;
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        if (!response.flag) {
          this.error.set(response.msg || 'The server could not load this queue.');
          return;
        }
        const data = Array.isArray(response.data) ? response.data : [];
        this.total.set((data[0] as { totalCount?: number } | undefined)?.totalCount || 0);
        if (this.current() === 'calls') this.calls.set(data as CallRecord[]);
        else if (this.current() === 'appointments') this.appointments.set(data as Appointment[]);
        else if (this.current() === 'appointment-requests') this.bookings.set(data as BookingRequest[]);
        else this.sessions.set(data as SessionRecord[]);
      },
      error: () => {
        this.error.set('We could not load this queue. Please retry.');
      },
    });
  }
  pageChange(page: number): void { this.page.set(page); this.load(); }
  formatDate(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date); }
  formatDateTime(value: string | null | undefined): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date); }
  openSession(item: SessionRecord, button: HTMLElement): void {
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
  transcript(item: SessionRecord): { speaker: 'AI'|'Patient'; text: string }[] {
    try {
      const turns = JSON.parse(item.transcript || '[]') as Record<string, string>[];
      const result: { speaker: 'AI'|'Patient'; text: string }[] = [];
      turns.forEach(turn => {
        if (turn['bot']) result.push({ speaker: 'AI', text: turn['bot'] });
        else if (turn['user']) result.push({ speaker: 'Patient', text: turn['user'] });
      });
      return result;
    } catch { return []; }
  }
}
