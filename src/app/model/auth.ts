// body ที่ส่งไป POST /auth/login
export interface LoginRequest {
  phone: string;
  password: string;
}

// ข้อมูลผู้ใช้ที่ login อยู่ (เจ้าของร้าน หรือ ไรเดอร์)
export interface UserInfo {
  id: number;
  phone: string;
  role: 'owner' | 'rider';
  first_name: string;
  last_name: string;
  license_plate: string | null;
}

// ผลลัพธ์จาก POST /auth/login: ตั๋ว (token) และข้อมูลผู้ใช้
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

// body ที่ส่งไป PUT /auth/password
export interface PasswordRequest {
  old_password: string;
  new_password: string;
}
