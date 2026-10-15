import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faClipboardList,
  faHammer,
  faIdCard,
  faMoneyBillWave,
  faRoute,
  faUserLock,
} from '@fortawesome/free-solid-svg-icons';

// หน้าแสดงส่วนที่เตรียมไว้แล้ว แต่ยังรอ Web API ฝั่ง backend
@Component({
  selector: 'app-coming-soon',
  imports: [RouterModule, FontAwesomeModule],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
})
export class ComingSoon {
  faHammer = faHammer;

  // รายการส่วนที่กำลังจะทำต่อ
  features = signal([
    {
      icon: faRoute,
      title: 'วางเส้นทางส่งของไรเดอร์',
      detail: 'จัดออเดอร์วันนี้เป็นรอบส่ง เรียงจุดส่งจากร้านออกไป และแสดงเส้นทางบนแผนที่',
    },
    {
      icon: faClipboardList,
      title: 'ใบงานไรเดอร์',
      detail: 'ไรเดอร์เปิดดูรายการที่ต้องส่ง ที่อยู่ จำนวนกล่อง และกดยืนยันว่าส่งแล้ว',
    },
    {
      icon: faIdCard,
      title: 'จัดการไรเดอร์',
      detail: 'เจ้าของร้านเพิ่ม แก้ไข หรือปิดบัญชีไรเดอร์ได้',
    },
    {
      icon: faMoneyBillWave,
      title: 'ค่าไรเดอร์และกำไรสุทธิ',
      detail: 'คิดค่าส่งของแต่ละรอบ แล้วหักออกจากกำไรในหน้าออเดอร์',
    },
    {
      icon: faUserLock,
      title: 'เข้าสู่ระบบ',
      detail: 'แยกสิทธิ์เจ้าของร้านกับไรเดอร์ แต่ละคนเห็นเฉพาะหน้าของตัวเอง',
    },
  ]);
}
