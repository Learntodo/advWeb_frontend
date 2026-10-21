import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { SimulateClearResponse, SimulateStatus } from '../../model/simulate';
import { AffectedResponse } from '../../model/api-res';

// เรียก Web API /simulate (ระบบจำลองข้อมูลสำหรับทดสอบ เฉพาะเจ้าของร้าน)
@Injectable({
  providedIn: 'root',
})
export class Simulate {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // GET /simulate?date=.. สรุปข้อมูลจำลอง สถานะออเดอร์ และเลขใบงานของวันนั้น
  public async status(date: string) {
    const url = `${this.apiEndpoint}/simulate`;
    const response = await lastValueFrom(this.http.get(url, { params: { date: date } }));
    return response as SimulateStatus;
  }

  // POST /simulate/customers สร้างลูกค้าจำลองในระยะ 3 กม. จากร้าน
  public async customers(count: number) {
    const url = `${this.apiEndpoint}/simulate/customers`;
    const response = await lastValueFrom(this.http.post(url, { count: count }));
    return response as AffectedResponse;
  }

  // POST /simulate/riders สร้างไรเดอร์จำลอง (รหัสผ่าน 123456)
  public async riders(count: number) {
    const url = `${this.apiEndpoint}/simulate/riders`;
    const response = await lastValueFrom(this.http.post(url, { count: count }));
    return response as AffectedResponse;
  }

  // POST /simulate/deliver จำลองไรเดอร์ส่งเสร็จ (กำลังส่ง -> ส่งแล้ว) ของวันนั้น
  public async deliver(date: string) {
    const url = `${this.apiEndpoint}/simulate/deliver`;
    const response = await lastValueFrom(this.http.post(url, { date: date }));
    return response as AffectedResponse;
  }

  // DELETE /simulate ล้างข้อมูลจำลองทั้งหมด
  public async clearAll() {
    const url = `${this.apiEndpoint}/simulate`;
    const response = await lastValueFrom(this.http.delete(url));
    return response as SimulateClearResponse;
  }
}
