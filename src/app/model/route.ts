// จุดส่ง 1 จุดในเที่ยว
export interface RouteStop {
  seq: number; // จุดที่ 1, 2, 3
  order_id: number;
  customer_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  delivery_address: string;
  latitude: number;
  longitude: number;
  quantity: number;
  distance_km: number; // ระยะจากจุดก่อนหน้า (จุดแรก = จากร้าน)
  eta: string; // เวลาถึงโดยประมาณ เช่น "11:42" (มีความหมายเมื่อออกส่งแล้ว)
  minutes: number; // ถึงหลังออกจากร้านกี่นาที
  status?: 'pending' | 'delivering' | 'delivered' | 'cancelled'; // มีเมื่อบันทึกเป็นใบงานแล้ว
}

// ไรเดอร์ที่รับใบงาน
export interface RouteRider {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
}

// 1 เที่ยว = งานของไรเดอร์ 1 คน
export interface RouteInfo {
  route_no: number; // เที่ยวที่
  id?: number; // รหัสใบงาน (มีเมื่อบันทึกแล้ว)
  code?: string; // เลขใบงาน (มีเมื่อบันทึกแล้ว)
  rider?: RouteRider | null; // ไรเดอร์ที่รับใบงาน (มีเมื่อบันทึกแล้ว)
  start_time?: string; // เวลาที่กดออกส่ง (มีเมื่อบันทึกแล้ว)
  order_ids: number[];
  stops: RouteStop[];
  total_km: number;
  boxes: number;
  sales: number;
  food_cost: number;
  rider_cost: number;
  profit: number;
  finish_time: string;
  finish_minutes: number; // ถึงจุดสุดท้ายหลังออกจากร้านกี่นาที
  late_orders: number;
}

// แผนการส่งทั้งร้าน (ได้จาก POST /routes/plan และ GET /routes)
export interface PlanInfo {
  riders: number;
  orders: number;
  boxes: number;
  total_km: number;
  sales: number;
  food_cost: number;
  rider_cost: number;
  profit: number;
  finish_time: string;
  finish_minutes: number; // ส่งครบทุกจุดหลังออกจากร้านกี่นาที
  late_orders: number;
  routes: RouteInfo[];
}

// ผลลัพธ์จาก POST /routes/plan (เสนอ 3 แผน)
export interface PlanResponse {
  date: string;
  road_distance: boolean; // true = ระยะตามถนนจริง, false = ระยะโดยประมาณ (เชื่อมต่อแผนที่ถนนไม่ได้)
  riders_available: number; // ไรเดอร์ที่เปิดใช้งานอยู่ในระบบ
  plans: PlanInfo[];
}

// ผลลัพธ์จาก GET /routes (ใบงานที่บันทึกแล้วของวันนั้น)
export interface SavedPlanResponse extends PlanInfo {
  date: string;
  riders_available: number; // ไรเดอร์ที่เปิดใช้งานอยู่ในระบบ
  delivered: number; // ส่งถึงลูกค้าแล้วกี่ออเดอร์ (มากกว่า 0 = ยกเลิก / จัดใหม่ไม่ได้)
  waiting: number; // ออเดอร์ "รอส่ง" ที่ยังไม่อยู่ในใบงาน
  start_time: string | null; // เวลาที่กดออกส่ง
}

// ผลลัพธ์จาก POST /routes (บันทึกแผน ได้เลขใบงาน)
export interface SavePlanResponse {
  affected_row: number;
  routes: { route_no: number; code: string; rider_id: number }[];
}

// ใบงานไรเดอร์ จาก GET /jobs/{code}
export interface JobSheet {
  code: string;
  delivery_date: string;
  route_no: number;
  rider: RouteRider | null;
  start_time: string; // เวลาออกจากร้าน
  total_km: number;
  boxes: number;
  rider_cost: number;
  finish_time: string;
  shop: { lat: number; lng: number };
  stops: RouteStop[];
}
