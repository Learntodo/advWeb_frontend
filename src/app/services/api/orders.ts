import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../config/api';
import { OrderGetResponse, OrderNearbyResponse } from '../../model/order-get-res';
import { OrderPostRequest, OrderPutRequest } from '../../model/order-req';
import { AffectedResponse, InsertResponse } from '../../model/api-res';

// เรียก Web API /orders (HW-5 ข้อ 3)
@Injectable({
  providedIn: 'root',
})
export class Orders {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT;

  // 3.1 GET /orders แสดงออเดอร์ทั้งหมด พร้อมข้อมูลลูกค้าที่สั่ง
  public async getAll() {
    const url = `${this.apiEndpoint}/orders`;
    const response = await lastValueFrom(this.http.get(url));
    return response as OrderGetResponse[];
  }

  // GET /orders/{id} แสดงออเดอร์ 1 รายการ
  public async getOne(id: number) {
    const url = `${this.apiEndpoint}/orders/${id}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as OrderGetResponse;
  }

  // POST /orders เพิ่มออเดอร์ทีละ 1 รายการ
  public async add(order: OrderPostRequest) {
    const url = `${this.apiEndpoint}/orders`;
    const response = await lastValueFrom(this.http.post(url, order));
    return response as InsertResponse;
  }

  // PUT /orders/{id} แก้ไขออเดอร์ (ส่งเฉพาะฟิลด์ที่จะแก้)
  public async update(id: number, order: OrderPutRequest) {
    const url = `${this.apiEndpoint}/orders/${id}`;
    const response = await lastValueFrom(this.http.put(url, order));
    return response as AffectedResponse;
  }

  // 3.1.3 PATCH /orders/{id} เพิ่มหรือลดจำนวนกล่อง
  // change = 1 คือเพิ่ม 1 กล่อง, change = -1 คือลด 1 กล่อง
  public async changeQuantity(id: number, change: number) {
    const url = `${this.apiEndpoint}/orders/${id}`;
    const response = await lastValueFrom(this.http.patch(url, { change: change }));
    return response as AffectedResponse;
  }

  // DELETE /orders/{id} ลบออเดอร์ 1 รายการ
  public async delete(id: number) {
    const url = `${this.apiEndpoint}/orders/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response as AffectedResponse;
  }

  // 3.1 POST /orders/simulate จำลองออเดอร์ 20-30 รายการของวันนี้
  public async simulate() {
    const url = `${this.apiEndpoint}/orders/simulate`;
    const response = await lastValueFrom(this.http.post(url, {}));
    return response as AffectedResponse;
  }

  // 3.2 DELETE /orders/simulate ล้างออเดอร์ที่จำลองทั้งหมด
  public async clearSimulated() {
    const url = `${this.apiEndpoint}/orders/simulate`;
    const response = await lastValueFrom(this.http.delete(url));
    return response as AffectedResponse;
  }

  // 3.3 GET /orders/nearby?lat=..&lng=.. ออเดอร์ในระยะ 2 กม. จากพิกัด
  public async nearby(lat: number, lng: number) {
    const url = `${this.apiEndpoint}/orders/nearby`;
    const response = await lastValueFrom(
      this.http.get(url, {
        params: {
          lat: lat,
          lng: lng,
        },
      }),
    );
    return response as OrderNearbyResponse[];
  }
}
