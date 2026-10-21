import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';
import { Api } from '../config/api';

// แนบตั๋ว JWT ไปกับทุกคำขอที่เรียก API ของร้าน (Header Authorization: Bearer <token>)
// คำขอไปเว็บอื่น (เช่น แผนที่ถนน OSRM) ไม่แนบตั๋ว กันตั๋วรั่วไปให้คนอื่น
// ถ้า backend ตอบ 401 (ตั๋วหมดอายุ / ไม่ถูกต้อง) ให้ออกจากระบบแล้วไปหน้า login
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const api = inject(Api);
  const token = auth.token();
  if (token && req.url.startsWith(api.API_ENDPOINT)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req).pipe(
    catchError((err) => {
      const isLogin = req.url.endsWith('/auth/login');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isLogin) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
