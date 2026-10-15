import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { Api } from '../config/api';
import { LoginRequest, LoginResponse, PasswordRequest, UserInfo } from '../model/auth';
import { AffectedResponse } from '../model/api-res';

// Service กลางของระบบ login: เก็บตั๋ว (token) และข้อมูลผู้ใช้ไว้ใน localStorage
// ปิดเบราว์เซอร์แล้วเปิดใหม่ก็ยัง login อยู่ จนกว่าตั๋วจะหมดอายุ (12 ชม.) หรือกดออกจากระบบ
@Injectable({
  providedIn: 'root',
})
export class Auth {
  http = inject(HttpClient);
  router = inject(Router);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  token = signal<string | null>(localStorage.getItem('token'));
  user = signal<UserInfo | null>(JSON.parse(localStorage.getItem('user') || 'null'));
  isOwner = computed(() => this.user()?.role === 'owner');
  isRider = computed(() => this.user()?.role === 'rider');

  // POST /auth/login เข้าสู่ระบบ แล้วเก็บตั๋วไว้
  public async login(data: LoginRequest) {
    const url = `${this.apiEndpoint}/auth/login`;
    const response = (await lastValueFrom(this.http.post(url, data))) as LoginResponse;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.token.set(response.token);
    this.user.set(response.user);
    return response.user;
  }

  // PUT /auth/password เปลี่ยนรหัสผ่านของตัวเอง
  public async changePassword(data: PasswordRequest) {
    const url = `${this.apiEndpoint}/auth/password`;
    const response = await lastValueFrom(this.http.put(url, data));
    return response as AffectedResponse;
  }

  // ออกจากระบบ: ลบตั๋วทิ้ง แล้วกลับไปหน้า login
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  // หน้าแรกของแต่ละบทบาท: เจ้าของร้าน = ภาพรวม, ไรเดอร์ = หน้าไรเดอร์
  homePath(): string {
    return this.isRider() ? '/rider' : '/';
  }
}
