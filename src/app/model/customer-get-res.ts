// ข้อมูลลูกค้าที่ได้จาก GET /customers และ GET /customers/search
export interface CustomerGetResponse {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string;
  latitude: number; // ละติจูดบ้านลูกค้า
  longitude: number; // ลองจิจูดบ้านลูกค้า
  created_at: string;
  updated_at: string;
}

// ข้อมูลจาก GET /customers/nearby จะมี distance_km (ระยะทาง กม.) เพิ่มมา
export interface CustomerNearbyResponse extends CustomerGetResponse {
  distance_km: number;
}
