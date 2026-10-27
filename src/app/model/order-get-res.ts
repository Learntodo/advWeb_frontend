// สถานะของออเดอร์ (ตรงกับ enum ในฐานข้อมูล)
export type OrderStatus = 'pending' | 'delivering' | 'delivered' | 'cancelled';

// ข้อมูลออเดอร์ (ตาราง orders)
export interface Order {
  id: number;
  customer_id: number;
  quantity: number;
  unit_price: number; // ราคาต่อกล่อง
  total_price: number; // ราคารวม = จำนวนกล่อง x ราคาต่อกล่อง
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
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
