import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { PortalComponent } from './layout/portal.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: PortalComponent, canActivate: [authGuard] },
  { path: 'appointments', component: PortalComponent, canActivate: [authGuard] },
  { path: 'appointment-requests', component: PortalComponent, canActivate: [authGuard] },
  { path: 'calls', component: PortalComponent, canActivate: [authGuard] },
  { path: 'cancellations', component: PortalComponent, canActivate: [authGuard] },
  { path: 'inquiries', component: PortalComponent, canActivate: [authGuard] },
  { path: 'reschedules', component: PortalComponent, canActivate: [authGuard] },
  { path: 'reports', component: PortalComponent, canActivate: [authGuard] },
  { path: 'settings', component: PortalComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
