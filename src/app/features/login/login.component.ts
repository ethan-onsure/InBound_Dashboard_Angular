import { Component, inject } from '@angular/core';
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
  username = ''; password = ''; remember = true; showPassword = false; loading = false; error = '';
  submit(): void {
    this.error = '';
    if (!this.username.trim() || !this.password) { this.error = 'Enter your username and password to continue.'; return; }
    this.loading = true;
    this.auth.login(this.username.trim(), this.password, this.remember).pipe(finalize(() => this.loading = false)).subscribe({
      next: response => response.flag ? void this.router.navigate(['/dashboard']) : this.error = response.msg || 'We could not sign you in.',
      error: error => this.error = error.status === 401 ? 'Invalid username or password.' : 'Sign-in is temporarily unavailable. Please try again.',
    });
  }
}
