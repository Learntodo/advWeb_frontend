import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// ข้อความแจ้งเตือน 1 อัน
export interface Message {
  id: number;
  type: 'success' | 'error';
  text: string;
}

// Service กลางสำหรับแสดงข้อความแจ้งเตือน (มุมขวาล่าง) ใช้ได้ทุกหน้า
// วิธีใช้: this.notify.success('บันทึกแล้ว') หรือ this.notify.error('ผิดพลาด')
@Injectable({
  providedIn: 'root',
})
export class Notify {
  messages = signal<Message[]>([]);
  nextId = 1;

  success(text: string) {
    this.show('success', text);
  }

  error(text: string) {
    this.show('error', text);
  }

  // แสดงข้อความ error ที่ได้จากการเรียก API
  apiError(err: unknown, title: string) {
    // status 0 = ติดต่อ backend ไม่ได้เลย (ยังไม่ได้รัน backend)
    if (err instanceof HttpErrorResponse && err.status === 0) {
      this.error('เชื่อมต่อ API ไม่ได้ ตรวจสอบว่ารัน backend แล้ว');
      return;
    }
    // backend ส่ง error กลับมาในรูปแบบ { "error": "..." }
    if (err instanceof HttpErrorResponse && err.error?.error) {
      this.error(`${title}: ${err.error.error} (${err.status})`);
      return;
    }
    this.error(title);
  }

  // เพิ่มข้อความ แล้วลบออกเองหลัง 4 วินาที
  show(type: 'success' | 'error', text: string) {
    const id = this.nextId;
    this.nextId = this.nextId + 1;
    this.messages.set([...this.messages(), { id: id, type: type, text: text }]);
    setTimeout(() => this.close(id), 4000);
  }

  close(id: number) {
    this.messages.set(this.messages().filter((m) => m.id !== id));
  }
}
