// จุดส่ง 1 จุดในเที่ยว
export interface RouteStop {
  seq: number; // จุดที่ 1, 2, 3
  order_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  delivery_address: string;
  latitude: number;
  longitude: number;
  quantity: number;
  distance_km: number; // ระยะจากจุดก่อนหน้า (จุดแรก = จากร้าน)
  eta: string; // เวลาถึงโดยประมาณ เช่น "11:42"
}

// 1 เที่ยว = งานของไรเดอร์ 1 คน
export interface RouteInfo {
  route_no: number; // ไรเดอร์คนที่
  code?: string; // เลขใบงาน (มีเมื่อบันทึกแล้ว)
  order_ids: number[];
  stops: RouteStop[];
  total_km: number;
  boxes: number;
  sales: number;
  food_cost: number;
  rider_cost: number;
  profit: number;
  finish_time: string;
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
  late_orders: number;
  routes: RouteInfo[];
}

// ผลลัพธ์จาก POST /routes/plan (เสนอ 3 แผน)
export interface PlanResponse {
  date: string;
  road_distance: boolean; // true = ระยะตามถนนจริง, false = ระยะโดยประมาณ (เชื่อมต่อแผนที่ถนนไม่ได้)
  plans: PlanInfo[];
}

// ผลลัพธ์จาก GET /routes (ใบงานที่บันทึกแล้วของวันนั้น)
export interface SavedPlanResponse extends PlanInfo {
  date: string;
}

// ผลลัพธ์จาก POST /routes (บันทึกแผน ได้เลขใบงาน)
export interface SavePlanResponse {
  affected_row: number;
  routes: { route_no: number; code: string }[];
}

// ใบงานไรเดอร์ จาก GET /jobs/{code}
export interface JobSheet {
  code: string;
  delivery_date: string;
  route_no: number;
  total_km: number;
  boxes: number;
  rider_cost: number;
  finish_time: string;
  shop: { lat: number; lng: number };
  stops: RouteStop[];
}
