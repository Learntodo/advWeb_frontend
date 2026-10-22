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

  // เขตส่ง: ร้านส่งได้เฉพาะลูกค้าที่อยู่ห่างร้าน (เส้นตรง) ไม่เกิน 3 กม. (แสดงเป็นวงประบนแผนที่)
  public readonly MAX_KM: number = 3;
  public readonly DELIVERY_ZONE = { lat: 16.246, lng: 103.25, radiusKm: 3 };

  // ระยะเส้นตรง (กม.) จากร้านถึงพิกัดนี้ (สูตร Haversine)
  shopKm(point: { lat: number; lng: number }): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const shop = this.SHOP_LOCATION;
    const dLat = toRad(point.lat - shop.lat);
    const dLng = toRad(point.lng - shop.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(shop.lat)) * Math.cos(toRad(point.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
  }

  // ราคาข้าวกล่อง และต้นทุนต่อกล่อง (ตามโจทย์โปรเจกต์)
  public readonly BOX_PRICE: number = 65;
  public readonly BOX_COST: number = 40;
}
