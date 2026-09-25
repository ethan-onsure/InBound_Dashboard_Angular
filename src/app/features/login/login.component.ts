import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  username = ''; password = ''; remember = true; showPassword = false; loading = signal(false); error = signal('');
  submit(): void {
    this.error.set('');
    if (!this.username.trim() || !this.password) { this.error.set('Enter your username and password to continue.'); return; }
    this.loading.set(true);
    this.auth.login(this.username.trim(), this.password, this.remember).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => response.flag ? void this.router.navigate(['/cancel-appointment-report']) : this.error.set(response.msg || 'We could not sign you in.'),
      error: error => this.error.set(
        error.status === 401 ? 'Invalid username or password.'
        : error.status === 0 ? 'Can’t reach the server. Check your connection and try again.'
        : 'Sign-in is temporarily unavailable. Please try again.'
      ),
    });
  }
}
