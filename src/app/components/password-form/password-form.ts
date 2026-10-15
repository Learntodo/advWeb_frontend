import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Auth } from '../../services/auth';
import { Notify } from '../../services/notify';

// ฟอร์มเปลี่ยนรหัสผ่านของตัวเอง (แสดงเป็นกล่อง modal) เปิดจากเมนูผู้ใช้ใน header
@Component({
  selector: 'app-password-form',
  imports: [FormsModule, FontAwesomeModule],
  templateUrl: './password-form.html',
  styleUrl: './password-form.css',
})
export class PasswordForm {
  auth = inject(Auth);
  notify = inject(Notify);

  closed = output(); // กดปิด หรือบันทึกสำเร็จ

  faXmark = faXmark;

  oldPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  errorMessage = signal('');
  saving = signal(false);

  // ตรวจข้อมูลก่อนบันทึก ถ้าผิดจะคืนข้อความบอกว่าผิดอะไร ถ้าถูกคืน ''
  validate(): string {
    if (this.oldPassword() === '') return 'กรุณากรอกรหัสผ่านเดิม';
    if (this.newPassword().length < 6) return 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว';
    if (this.newPassword() !== this.confirmPassword()) return 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน';
    return '';
  }

  async save() {
    const error = this.validate();
    this.errorMessage.set(error);
    if (error !== '') {
      return;
    }
    this.saving.set(true);
    try {
      await this.auth.changePassword({ old_password: this.oldPassword(), new_password: this.newPassword() });
      this.notify.success('เปลี่ยนรหัสผ่านแล้ว');
      this.closed.emit();
    } catch (err: any) {
      if (err?.error?.error) {
        this.errorMessage.set(err.error.error);
      } else {
        this.notify.apiError(err, 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    }
    this.saving.set(false);
  }
}
