// ข้อมูลลูกค้าที่ได้จาก GET /customers และ GET /customers/search
// หมายเหตุ: ค่า DECIMAL (latitude, longitude) ฐานข้อมูลส่งมาเป็น string เช่น "16.2460000"
//          ก่อนนำไปคำนวณหรือใช้บนแผนที่ ต้องแปลงด้วย Number() ก่อน
export interface CustomerGetResponse {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string;
  latitude: string;
  longitude: string;
  created_at: string;
  updated_at: string;
}

// ข้อมูลจาก GET /customers/nearby จะมี distance_km (ระยะทาง กม.) เพิ่มมา
export interface CustomerNearbyResponse extends CustomerGetResponse {
  distance_km: number;
}
