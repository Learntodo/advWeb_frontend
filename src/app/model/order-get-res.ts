// สถานะของออเดอร์ (ตรงกับ enum ในฐานข้อมูล)
export type OrderStatus = 'pending' | 'delivering' | 'delivered' | 'cancelled';

// ข้อมูลออเดอร์ (ตาราง orders)
// หมายเหตุ: ค่า DECIMAL (ราคา, พิกัด) ฐานข้อมูลส่งมาเป็น string ต้องแปลงด้วย Number() ก่อนใช้
export interface Order {
  id: number;
  customer_id: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  delivery_address: string;
  delivery_latitude: string;
  delivery_longitude: string;
  delivery_date: string;
  status: OrderStatus;
  is_simulated: number; // 1 = ออเดอร์จำลอง, 0 = ออเดอร์จริง
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ข้อมูลจาก GET /orders และ GET /orders/{id} (มีชื่อและเบอร์ลูกค้าที่สั่งมาด้วย)
export interface OrderGetResponse extends Order {
  first_name: string;
  last_name: string;
  phone: string;
}

// ข้อมูลจาก GET /orders/nearby (ไม่มีชื่อลูกค้า แต่มี distance_km)
export interface OrderNearbyResponse extends Order {
  distance_km: number;
}
