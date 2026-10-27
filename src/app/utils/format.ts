// ฟังก์ชันช่วยแสดงผลข้อมูล ใช้ร่วมกันหลายหน้า
import { OrderStatus } from '../model/order-get-res';

// แสดงเป็นเงินบาท เช่น 1950 -> "1,950 ฿"
export function baht(value: string | number): string {
  return Number(value).toLocaleString('th-TH') + ' ฿';
}

// แปลงวันที่เป็นข้อความ "YYYY-MM-DD" ตามเวลาในเครื่อง
// ใช้กับ <input type="date"> และใช้เทียบว่าเป็นวันเดียวกันหรือไม่
export function toDateInput(value: string | Date): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// วันนี้ในรูปแบบ "YYYY-MM-DD"
export function today(): string {
  return toDateInput(new Date());
}

// แสดงวันที่แบบไทย เช่น "10 ต.ค. 69"
export function thaiDate(value: string): string {
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

// ลิงก์เปิด Google Maps เพื่อนำทางไปยังพิกัด
export function googleMapsLink(lat: string | number, lng: string | number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// ลิงก์เปิด Google Maps นำทางหลายจุดตามลำดับ (จุดแรก = ต้นทาง, จุดสุดท้าย = ปลายทาง, ที่เหลือ = จุดแวะ)
export function googleMapsRouteLink(points: { lat: number; lng: number }[]): string {
  const text = points.map((point) => `${point.lat},${point.lng}`);
  const origin = text[0];
  const destination = text[text.length - 1];
  const waypoints = text.slice(1, -1).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}`;
  if (waypoints !== '') {
    url = url + `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  return url;
}

// รายการสถานะทั้งหมดของออเดอร์ (ใช้วนลูปสร้างตัวเลือก)
export const statuses: OrderStatus[] = ['pending', 'delivering', 'delivered', 'cancelled'];

// ชื่อสถานะภาษาไทย
export const statusLabel = {
  pending: 'รอส่ง',
  delivering: 'กำลังส่ง',
  delivered: 'ส่งแล้ว',
  cancelled: 'ยกเลิก',
};

// สีป้ายสถานะ (class ของ DaisyUI)
export const statusBadge = {
  pending: 'badge-warning',
  delivering: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-ghost',
};

// สีหมุดบนแผนที่ตามสถานะ
export const statusColor = {
  pending: '#d97706',
  delivering: '#2563eb',
  delivered: '#16a34a',
  cancelled: '#78716c',
};
