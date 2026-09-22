import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuthRoute = request.url.includes('/api/Auth/');
  const authorization = auth.authorizationHeader;
  const authorized = !isAuthRoute && authorization ? request.clone({ setHeaders: { Authorization: authorization } }) : request;
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthRoute || !auth.tokens?.refreshToken || request.url.includes('/api/Auth/Refresh')) {
        if (error.status === 401 && !isAuthRoute) { auth.clearSession(); void router.navigate(['/login']); }
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap(response => response.flag && response.data && auth.authorizationHeader
          ? next(request.clone({ setHeaders: { Authorization: auth.authorizationHeader } }))
          : throwError(() => error)),
        catchError(refreshError => { auth.clearSession(); void router.navigate(['/login']); return throwError(() => refreshError); }),
      );
    }),
  );
};
