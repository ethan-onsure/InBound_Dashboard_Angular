import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { PortalV2Component } from './layout/portal-v2.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'cancel-appointment-report' },
  { path: 'dashboard', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'appointments', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'appointment-requests', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'cancel-appointment-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'medical-staff-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'book-appointment-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'reschedule-appointment-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'after-hour-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'voicemail-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'nursing-report', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'reports', component: PortalV2Component, canActivate: [authGuard] },
  { path: 'settings', component: PortalV2Component, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
