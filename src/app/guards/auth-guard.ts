import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// หน้าของเจ้าของร้าน: ยังไม่ login -> ไปหน้า login, เป็นไรเดอร์ -> ไปหน้าไรเดอร์
export const ownerGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.isOwner()) {
    return true;
  }
  return router.parseUrl(auth.isRider() ? '/rider' : '/login');
};

// หน้าของไรเดอร์: ยังไม่ login -> ไปหน้า login, เป็นเจ้าของร้าน -> ไปหน้าแรก
export const riderGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.isRider()) {
    return true;
  }
  return router.parseUrl(auth.isOwner() ? '/' : '/login');
};

// หน้า login: login อยู่แล้วไม่ต้องเข้า ให้ไปหน้าแรกของตัวเอง
export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.user() === null) {
    return true;
  }
  return router.parseUrl(auth.homePath());
};
