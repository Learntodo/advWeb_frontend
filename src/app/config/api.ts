import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  // ที่อยู่ของ Web API (backend) บน Vercel  (ถ้าจะทดสอบกับ backend ในเครื่อง ให้เปลี่ยนเป็น 'http://localhost:3000')
  public readonly API_ENDPOINT: string = 'https://avdwebapi.vercel.app';

  // บริการแผนที่ถนน OSRM (ฟรี จาก OpenStreetMap) ใช้วาดเส้นทางไรเดอร์ตามถนนจริง
  public readonly ROAD_API: string = 'https://router.project-osrm.org';

  // พิกัดร้าน (จุดเริ่มต้นออกส่ง) แถวมหาวิทยาลัยมหาสารคาม ใช้เป็นจุดกลางแผนที่และค่าเริ่มต้นของการค้นหาตามระยะ
  public readonly SHOP_LOCATION = { lat: 16.246, lng: 103.25 };

  // ราคาข้าวกล่อง และต้นทุนต่อกล่อง (ตามโจทย์โปรเจกต์)
  public readonly BOX_PRICE: number = 65;
  public readonly BOX_COST: number = 40;
}
