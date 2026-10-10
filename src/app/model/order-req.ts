import { OrderStatus } from './order-get-res';

// body ของ POST /orders (เพิ่มออเดอร์ทีละ 1 รายการ)
// ฟิลด์ที่มี ? ไม่ต้องส่งก็ได้ backend จะใช้ค่าเริ่มต้น: ที่อยู่/พิกัดของลูกค้า, ส่งวันนี้, กล่องละ 65 บาท
export interface OrderPostRequest {
  customer_id: number;
  quantity: number; // 1-3 กล่อง
  unit_price?: number;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_date?: string; // รูปแบบ YYYY-MM-DD
  note?: string | null;
}

// body ของ PUT /orders/{id} ส่งเฉพาะฟิลด์ที่จะแก้ (เปลี่ยนลูกค้าไม่ได้)
export interface OrderPutRequest {
  quantity?: number;
  unit_price?: number;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_date?: string;
  status?: OrderStatus;
  note?: string | null;
}
