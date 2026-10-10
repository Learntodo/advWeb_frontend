// body ที่ส่งไป POST /customers และ PUT /customers/{id} (ต้องส่งครบทุกฟิลด์)
export interface CustomerPostRequest {
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string;
  latitude: number;
  longitude: number;
}
