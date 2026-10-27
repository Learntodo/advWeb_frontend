import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLock, faPhone } from '@fortawesome/free-solid-svg-icons';
import { Auth } from '../../services/auth';
import { Notify } from '../../services/notify';

// หน้าเข้าสู่ระบบ ใช้ร่วมกันทั้งเจ้าของร้านและไรเดอร์ (เบอร์โทร + รหัสผ่าน)
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  auth = inject(Auth);
  notify = inject(Notify);
  router = inject(Router);

  faPhone = faPhone;
  faLock = faLock;

  phone = signal('');
  password = signal('');
  errorMessage = signal('');
  loading = signal(false);

  async login() {
    if (this.phone().trim() === '' || this.password() === '') {
      this.errorMessage.set('กรุณากรอกเบอร์โทรและรหัสผ่าน');
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      const user = await this.auth.login({ phone: this.phone().trim(), password: this.password() });
      this.notify.success(`ยินดีต้อนรับ ${user.first_name}`);
      // เจ้าของร้านไปหน้าแรก ไรเดอร์ไปหน้าไรเดอร์
      this.router.navigateByUrl(this.auth.homePath());
    } catch (err: any) {
      // 401 = เบอร์หรือรหัสผิด, 403 = บัญชีถูกปิดใช้งาน (backend ส่งข้อความมาใน error)
      if (err?.error?.error) {
        this.errorMessage.set(err.error.error);
      } else {
        this.notify.apiError(err, 'เข้าสู่ระบบไม่สำเร็จ');
      }
    }
    this.loading.set(false);
  }
}
