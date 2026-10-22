// ข้อมูลจาก GET /simulate?date=.. สรุปข้อมูลจำลอง และสถานะของวันที่เลือก
export interface SimulateStatus {
  customers: number; // ลูกค้าจำลองทั้งหมด
  orders: number; // ออเดอร์จำลองทั้งหมด (ทุกวัน)
  riders: number; // ไรเดอร์จำลองทั้งหมด
  active_riders: number; // ไรเดอร์ที่เปิดใช้งานทั้งหมด (จริง + จำลอง) ใช้ดูว่าพอส่งไหม
  date: string;
  // จำนวนออเดอร์ของวันที่เลือก แยกตามสถานะ (รวมออเดอร์จริง)
  day: { pending: number; delivering: number; delivered: number; cancelled: number };
  rider_password: string; // รหัสผ่านของไรเดอร์จำลองทุกคน
  sim_riders: { id: number; phone: string; first_name: string; last_name: string; license_plate: string | null }[];
  routes: { route_no: number; code: string; first_name: string | null }[]; // เลขใบงานของวันที่เลือก
}

// ผลลัพธ์จาก DELETE /simulate จำนวนที่ลบของแต่ละอย่าง
export interface SimulateClearResponse {
  routes: number;
  orders: number;
  customers: number;
  riders: number;
}
