// ข้อมูลไรเดอร์ที่ได้จาก GET /riders (ไม่มีรหัสผ่าน)
export interface RiderGetResponse {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  license_plate: string | null;
  is_active: number; // 1 = ใช้งาน, 0 = ปิดใช้งาน (login ไม่ได้)
  created_at: string;
  updated_at: string;
}

// body ที่ส่งไป POST /riders และ PUT /riders/{id}
// password: ตอนเพิ่มต้องส่ง, ตอนแก้ไขส่ง '' = ไม่เปลี่ยนรหัส
export interface RiderPostRequest {
  first_name: string;
  last_name: string;
  phone: string;
  license_plate: string | null;
  password: string;
  is_active: number;
}
