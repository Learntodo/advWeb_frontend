import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { CustomerGetResponse, CustomerNearbyResponse } from '../../model/customer-get-res';
import { CustomerPostRequest } from '../../model/customer-post-req';
import { AffectedResponse, InsertResponse } from '../../model/api-res';

// เรียก Web API /customers (HW-5 ข้อ 2)
@Injectable({
  providedIn: 'root',
})
export class Customers {
  http = inject(HttpClient);
  // ใช้ inject() เพื่อดึง Api (ที่อยู่ backend) มาใช้งาน
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // 2.1 GET /customers แสดงข้อมูลลูกค้าทุกคน
  public async getAll() {
    const url = `${this.apiEndpoint}/customers`;
    const response = await lastValueFrom(this.http.get(url));
    return response as CustomerGetResponse[];
  }

  // 2.1 POST /customers เพิ่มลูกค้า
  public async add(customer: CustomerPostRequest) {
    const url = `${this.apiEndpoint}/customers`;
    const response = await lastValueFrom(this.http.post(url, customer));
    return response as InsertResponse;
  }

  // 2.1 PUT /customers/{id} แก้ไขข้อมูลลูกค้า (ส่งครบทุกฟิลด์)
  public async update(id: number, customer: CustomerPostRequest) {
    const url = `${this.apiEndpoint}/customers/${id}`;
    const response = await lastValueFrom(this.http.put(url, customer));
    return response as AffectedResponse;
  }

  // 2.1 DELETE /customers/{id} ลบลูกค้า (ลบไม่ได้ถ้ายังมีออเดอร์)
  public async delete(id: number) {
    const url = `${this.apiEndpoint}/customers/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response as AffectedResponse;
  }

  // 2.2 GET /customers/search?name=สม ค้นหาจากส่วนหนึ่งของชื่อ / นามสกุล
  public async searchByName(name: string) {
    const url = `${this.apiEndpoint}/customers/search`;
    const response = await lastValueFrom(
      this.http.get(url, {
        params: {
          name: name,
        },
      }),
    );
    return response as CustomerGetResponse[];
  }

  // 2.3 GET /customers/nearby?lat=..&lng=.. ลูกค้าในระยะ 1 กม. จากพิกัด
  public async nearby(lat: number, lng: number) {
    const url = `${this.apiEndpoint}/customers/nearby`;
    const response = await lastValueFrom(
      this.http.get(url, {
        params: {
          lat: lat,
          lng: lng,
        },
      }),
    );
    return response as CustomerNearbyResponse[];
  }
}
