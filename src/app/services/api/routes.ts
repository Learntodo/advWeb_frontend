import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { JobSheet, PlanResponse, SavedPlanResponse, SavePlanResponse } from '../../model/route';
import { AffectedResponse } from '../../model/api-res';

// เรียก Web API /routes (จัดเส้นทาง เฉพาะเจ้าของร้าน) และ /jobs (ใบงานไรเดอร์)
@Injectable({
  providedIn: 'root',
})
export class DeliveryRoutes {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // POST /routes/plan คำนวณแผนเส้นทางครั้งละ 3 แบบ (seen = ชื่อแผนที่ดูไปแล้ว ระบบจะเสนอแบบอื่นที่ยังไม่เคยดู)
  public async plan(date: string, seen: string[]) {
    const url = `${this.apiEndpoint}/routes/plan`;
    const response = await lastValueFrom(this.http.post(url, { date: date, seen: seen }));
    return response as PlanResponse;
  }

  // POST /routes บันทึกแผนที่เลือก เป็นใบงานของวันนั้น (ส่งรหัสออเดอร์ของแต่ละเที่ยว เรียงตามลำดับส่ง)
  public async save(date: string, routes: number[][]) {
    const url = `${this.apiEndpoint}/routes`;
    const response = await lastValueFrom(this.http.post(url, { date: date, routes: routes }));
    return response as SavePlanResponse;
  }

  // GET /routes?date=.. ใบงานที่บันทึกไว้ของวันนั้น
  public async getSaved(date: string) {
    const url = `${this.apiEndpoint}/routes`;
    const response = await lastValueFrom(this.http.get(url, { params: { date: date } }));
    return response as SavedPlanResponse;
  }

  // DELETE /routes/{id} ยกเลิกใบงาน 1 เที่ยว (ออเดอร์กลับเป็น "รอส่ง")
  public async cancelRoute(id: number) {
    const url = `${this.apiEndpoint}/routes/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response as AffectedResponse;
  }

  // PUT /routes/{id} เปลี่ยนไรเดอร์ของใบงาน (ถ้าไรเดอร์คนนั้นถือใบงานที่ยังไม่เริ่มส่ง จะสลับกัน)
  public async changeRider(id: number, riderId: number) {
    const url = `${this.apiEndpoint}/routes/${id}`;
    const response = await lastValueFrom(this.http.put(url, { rider_id: riderId }));
    return response as AffectedResponse;
  }

  // GET /jobs?date=.. ใบงานของไรเดอร์ที่ login อยู่
  public async myJobs(date: string) {
    const url = `${this.apiEndpoint}/jobs`;
    const response = await lastValueFrom(this.http.get(url, { params: { date: date } }));
    return response as JobSheet[];
  }

  // PUT /jobs/{code}/stops/{orderId} ไรเดอร์กดว่าส่งถึงแล้ว (delivered = false คือกดผิด ย้อนกลับ)
  public async markDelivered(code: string, orderId: number, delivered: boolean) {
    const url = `${this.apiEndpoint}/jobs/${encodeURIComponent(code)}/stops/${orderId}`;
    const response = await lastValueFrom(this.http.put(url, { delivered: delivered }));
    return response as AffectedResponse;
  }

  // GET /jobs/{code} เปิดใบงานด้วยเลขใบงาน (ไม่ต้อง login)
  public async job(code: string) {
    const url = `${this.apiEndpoint}/jobs/${encodeURIComponent(code)}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as JobSheet;
  }
}
