import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, forkJoin, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, AppointmentDetail, ModMedPatient } from './models';

// State lives here (not on the page component) so it survives navigating away from and
// back to the Patient Reports tab, since that route swap destroys/recreates the page
// component. Only an explicit Clear or logout resets it.
@Injectable({ providedIn: 'root' })
export class PatientSearchService {
  private readonly api = inject(ApiService);

  searchTerm = signal('');
  searched = signal(false);
  results = signal<ModMedPatient[]>([]);
  selected = signal<ModMedPatient | null>(null);
  loading = signal(false);
  error = signal('');
  dropdownClosed = signal(false);
  appointments = signal<AppointmentDetail[]>([]);
  appointmentsLoading = signal(false);
  appointmentsError = signal('');
  recentPatients = signal<ModMedPatient[]>(this.loadRecent());
  recentOpen = signal(false);
  private lastSearchedTerm: string | null = null;

  // Accepts common DOB formats (ISO yyyy-MM-dd, or MM/DD/YYYY, MM-DD-YYYY) typed into the
  // single search box and normalizes to yyyy-MM-dd for GetPatientDetailsByDOB. Anything else
  // is treated as a name/family-name search.
  private parseDob(raw: string): string | null {
    const value = raw.trim();
    let m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    return null;
  }
  private extractPatients(response: ApiResponse<ModMedPatient[]>): ModMedPatient[] {
    return response.flag && Array.isArray(response.data) ? response.data : [];
  }
  private mergePatients(a: ModMedPatient[], b: ModMedPatient[]): ModMedPatient[] {
    const byId = new Map<number, ModMedPatient>();
    [...a, ...b].forEach(p => byId.set(p.id, p));
    return Array.from(byId.values());
  }
  // Deliberately leaves `selected` untouched here: whatever patient is currently on screen
  // stays visible (behind the dropdown) until the user actually picks a new row, or the
  // search resolves to a single unambiguous match. Only Clear or logout wipes it.
  search(): void {
    const raw = this.searchTerm().trim();
    if (!raw) return;
    this.searched.set(true);
    this.dropdownClosed.set(false);
    // Same term as the last completed search and no error to retry: just reopen the
    // dropdown with the results already in memory instead of hitting the API again.
    if (raw === this.lastSearchedTerm && !this.error()) return;
    this.lastSearchedTerm = raw;
    this.results.set([]);
    this.error.set('');
    this.loading.set(true);
    const dob = this.parseDob(raw);
    const request$: Observable<ModMedPatient[]> = dob
      ? this.api.patientByDob(dob).pipe(map(r => this.extractPatients(r)))
      : forkJoin([this.api.patientByName(raw), this.api.patientByFamily(raw)]).pipe(
          map(([byName, byFamily]) => this.mergePatients(this.extractPatients(byName), this.extractPatients(byFamily))),
        );
    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: patients => {
        this.results.set(patients);
        if (patients.length === 1) this.selectPatient(patients[0]);
      },
      error: () => this.error.set('We could not search patients. Please retry.'),
    });
  }
  private loadAppointments(patient: ModMedPatient): void {
    this.appointmentsLoading.set(true);
    this.appointmentsError.set('');
    this.appointments.set([]);
    this.api.appointmentDetails(String(patient.id)).pipe(finalize(() => this.appointmentsLoading.set(false))).subscribe({
      next: response => {
        if (!response.flag) { this.appointmentsError.set(response.msg || 'We could not load appointment history.'); return; }
        this.appointments.set(Array.isArray(response.data) ? response.data : []);
      },
      error: () => this.appointmentsError.set('We could not load appointment history. Please retry.'),
    });
  }
  retryAppointments(): void { const patient = this.selected(); if (patient) this.loadAppointments(patient); }
  private loadRecent(): ModMedPatient[] {
    try {
      const parsed = JSON.parse(localStorage.getItem('inbound_recent_patients') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  private addRecent(patient: ModMedPatient): void {
    const next = [patient, ...this.recentPatients().filter(p => p.id !== patient.id)].slice(0, 10);
    this.recentPatients.set(next);
    try { localStorage.setItem('inbound_recent_patients', JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
  toggleRecent(): void { this.recentOpen.update(v => !v); }
  closeRecent(): void { this.recentOpen.set(false); }
  openRecent(patient: ModMedPatient): void { this.selectPatient(patient); this.closeRecent(); }
  selectPatient(patient: ModMedPatient): void { this.selected.set(patient); this.dropdownClosed.set(true); this.loadAppointments(patient); this.addRecent(patient); }
  backToResults(): void { this.dropdownClosed.set(false); }
  closeDropdown(): void { this.dropdownClosed.set(true); }
  openDropdown(): void { if (this.results().length) this.dropdownClosed.set(false); }
  clear(): void {
    this.searched.set(false);
    this.searchTerm.set('');
    this.results.set([]);
    this.selected.set(null);
    this.error.set('');
    this.dropdownClosed.set(false);
    this.lastSearchedTerm = null;
    this.appointments.set([]);
    this.appointmentsLoading.set(false);
    this.appointmentsError.set('');
  }
}
