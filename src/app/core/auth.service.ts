import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { ApiResponse, AuthTokens } from './models';
import { APP_CONFIG } from './app-config';

const TOKEN_KEY = 'inbound_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private refreshRequest$: Observable<ApiResponse<AuthTokens>> | null = null;

  get tokens(): AuthTokens | null {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    try { return JSON.parse(stored) as AuthTokens; } catch { this.clearSession(); return null; }
  }

  get isAuthenticated(): boolean { return !!this.tokens?.accessToken; }
  get username(): string { return localStorage.getItem('inbound_user') || 'Operations user'; }
  get authorizationHeader(): string | null {
    const tokens = this.tokens;
    return tokens?.accessToken ? `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}` : null;
  }

  login(username: string, password: string, remember: boolean): Observable<ApiResponse<AuthTokens>> {
    return this.http.post<ApiResponse<AuthTokens>>(`${APP_CONFIG.apiBaseUrl}/api/Auth/Login`, { username, password }).pipe(
      tap(response => {
        if (response.flag && response.data) {
          localStorage.setItem(TOKEN_KEY, JSON.stringify(this.normalizeTokens(response.data)));
          localStorage.setItem('inbound_user', username);
          if (!remember) sessionStorage.setItem('inbound_session', 'active');
        }
      }),
    );
  }

  refresh(): Observable<ApiResponse<AuthTokens>> {
    if (this.refreshRequest$) return this.refreshRequest$;
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token is available.'));
    }
    this.refreshRequest$ = this.http.post<ApiResponse<AuthTokens>>(`${APP_CONFIG.apiBaseUrl}/api/Auth/Refresh`, { refreshToken }).pipe(
      tap(response => {
        if (response.flag && response.data) {
          localStorage.setItem(TOKEN_KEY, JSON.stringify(this.normalizeTokens(response.data)));
        }
      }),
      finalize(() => this.refreshRequest$ = null),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest$;
  }

  private normalizeTokens(tokens: AuthTokens): AuthTokens {
    return {
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType || 'Bearer',
      expiresAtUtc: tokens.expiresAtUtc,
      refreshToken: tokens.refreshToken,
    };
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('inbound_user');
    sessionStorage.removeItem('inbound_session');
  }

  logout(): void { this.clearSession(); void this.router.navigate(['/login']); }
}
