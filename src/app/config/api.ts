import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  // ที่อยู่ของ Web API (backend) ถ้า deploy แล้วให้เปลี่ยนเป็น URL ของ Render เช่น https://xxx.onrender.com
  public readonly API_ENDPOINT: string = 'http://localhost:3000';

  // พิกัดร้าน (จุดเริ่มต้นออกส่ง) แถวมหาวิทยาลัยมหาสารคาม ใช้เป็นจุดกลางแผนที่และค่าเริ่มต้นของการค้นหาตามระยะ
  public readonly SHOP_LOCATION = { lat: 16.246, lng: 103.25 };

  // ราคาข้าวกล่อง และต้นทุนต่อกล่อง (ตามโจทย์โปรเจกต์)
  public readonly BOX_PRICE: number = 65;
  public readonly BOX_COST: number = 40;
}
