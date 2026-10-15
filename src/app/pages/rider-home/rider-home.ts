import { Component, inject } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClipboardList, faMotorcycle, faPhone } from '@fortawesome/free-solid-svg-icons';
import { Auth } from '../../services/auth';

// หน้าแรกของไรเดอร์ (เปิดผ่านมือถือ) แสดงข้อมูลของตัวเอง และที่สำหรับใบงานของวันนี้
@Component({
  selector: 'app-rider-home',
  imports: [FontAwesomeModule],
  templateUrl: './rider-home.html',
  styleUrl: './rider-home.css',
})
export class RiderHome {
  auth = inject(Auth);

  faPhone = faPhone;
  faMotorcycle = faMotorcycle;
  faClipboardList = faClipboardList;
}
