import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { RiderGetResponse, RiderPostRequest } from '../../model/rider';
import { AffectedResponse, InsertResponse } from '../../model/api-res';

// เรียก Web API /riders (เฉพาะเจ้าของร้าน)
@Injectable({
  providedIn: 'root',
})
export class Riders {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // GET /riders แสดงไรเดอร์ทุกคน
  public async getAll() {
    const url = `${this.apiEndpoint}/riders`;
    const response = await lastValueFrom(this.http.get(url));
    return response as RiderGetResponse[];
  }

  // POST /riders เพิ่มไรเดอร์
  public async add(rider: RiderPostRequest) {
    const url = `${this.apiEndpoint}/riders`;
    const response = await lastValueFrom(this.http.post(url, rider));
    return response as InsertResponse;
  }

  // PUT /riders/{id} แก้ไขข้อมูลไรเดอร์ (ส่งเฉพาะฟิลด์ที่จะแก้ได้)
  public async update(id: number, rider: Partial<RiderPostRequest>) {
    const url = `${this.apiEndpoint}/riders/${id}`;
    const response = await lastValueFrom(this.http.put(url, rider));
    return response as AffectedResponse;
  }

  // DELETE /riders/{id} ลบไรเดอร์
  public async delete(id: number) {
    const url = `${this.apiEndpoint}/riders/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response as AffectedResponse;
  }
}
