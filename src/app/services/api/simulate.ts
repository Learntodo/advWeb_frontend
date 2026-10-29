import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { AffectedResponse } from '../../model/api-res';

// เรียก Web API /simulate (จำลองลูกค้า / ไรเดอร์ สำหรับทดสอบ เฉพาะเจ้าของร้าน)
@Injectable({
  providedIn: 'root',
})
export class Simulate {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

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
}
