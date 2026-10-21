import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClipboardList, faMotorcycle, faPhone } from '@fortawesome/free-solid-svg-icons';
import { Auth } from '../../services/auth';

// หน้าแรกของไรเดอร์ (เปิดผ่านมือถือ) แสดงข้อมูลของตัวเอง และที่สำหรับใบงานของวันนี้
@Component({
  selector: 'app-rider-home',
  imports: [FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './rider-home.html',
  styleUrl: './rider-home.css',
})
export class RiderHome {
  auth = inject(Auth);
  router = inject(Router);

  faPhone = faPhone;
  faMotorcycle = faMotorcycle;
  faClipboardList = faClipboardList;

  codeText = signal(''); // เลขใบงานที่พิมพ์
  errorMessage = signal('');

  // กรอกเลขใบงานแล้วกดเปิด -> ไปหน้าใบงาน /job?code=XXXXXXXX
  open() {
    const code = this.codeText().trim();
    if (code === '') {
      this.errorMessage.set('กรุณากรอกเลขใบงานที่ได้จากร้าน');
      return;
    }
    this.router.navigate(['/job'], { queryParams: { code: code } });
  }
}
