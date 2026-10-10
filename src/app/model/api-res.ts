// ผลลัพธ์ตอนเพิ่มข้อมูล: 201 { affected_row, last_idx }
export interface InsertResponse {
  affected_row: number;
  last_idx: number;
}

// ผลลัพธ์ตอนแก้ / ลบ: 200 { affected_row }
export interface AffectedResponse {
  affected_row: number;
}

// ผลลัพธ์ตอนผิดพลาด: 4xx / 500 { error }
export interface ErrorResponse {
  error: string;
}
