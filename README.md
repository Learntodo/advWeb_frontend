# avdWeb_API — Frontend (ส่งด่วนมื้อเที่ยง)

หน้าเว็บฝั่งเจ้าของร้าน ทำด้วย Angular 21 + Tailwind CSS + DaisyUI + Font Awesome (ตามสไลด์วิชา)
และแผนที่ Leaflet + OpenStreetMap เรียกใช้ Web API ใน `../backend` เฉพาะเส้นที่มีอยู่ตอนนี้ (HW-5)

## วิธีรัน

1. รัน backend ก่อน (ดู `../backend/README.md`) ให้ API อยู่ที่ `http://localhost:3000`
2. ติดตั้งแพ็กเกจ (ครั้งแรกครั้งเดียว)
   ```shell
   npm install
   ```
3. รันหน้าเว็บ
   ```shell
   npm start
   # หรือ
   ng serve -o
   ```
4. เปิด http://localhost:4200 (backend อนุญาต CORS ให้ port 4200 ไว้แล้ว)

ถ้า API ไม่ได้อยู่ที่ `http://localhost:3000` ให้แก้ `API_ENDPOINT` ใน `src/app/config/api.ts`
พิกัดร้าน ราคา/ต้นทุนต่อกล่อง ก็แก้ได้ในไฟล์เดียวกัน

## หน้าเว็บ และ API ที่เรียก

| หน้า | Path | ทำอะไรได้ | API |
|---|---|---|---|
| ภาพรวม | `/` | สรุปออเดอร์วันนี้ (จำนวน กล่อง ยอดขาย) แผนที่จุดส่งวันนี้ ปุ่มจำลอง/ล้างออเดอร์ | GET /customers, GET /orders, POST/DELETE /orders/simulate |
| ลูกค้า | `/customers` | ดูทุกคน + บ้านบนแผนที่, เพิ่ม/แก้ไข (คลิกแผนที่เพื่อปักพิกัดบ้าน), ลบ, ค้นหาจากชื่อ/นามสกุล หรือเบอร์โทร, ปุ่มสั่งออเดอร์ให้ลูกค้า | GET/POST /customers, PUT/DELETE /customers/{id}, GET /customers/search |
| ออเดอร์ | `/orders` | ตารางออเดอร์ + แผนที่สีตามสถานะ, เพิ่ม (ค้นลูกค้าเก่าจากเบอร์โทร), ปุ่ม −/+ จำนวนกล่อง, เปลี่ยนสถานะ, แก้ไข, ลบ, จำลอง 20–30 รายการ, ล้างที่จำลอง, กรองตามวัน/สถานะ/จริง-จำลอง | GET/POST /orders, PATCH/PUT/DELETE /orders/{id}, POST/DELETE /orders/simulate |
| รายละเอียดออเดอร์ | `/orders/:id` | ข้อมูลออเดอร์ โทรหาลูกค้า แผนที่ ปุ่มนำทาง Google Maps เปลี่ยนสถานะ −/+ กล่อง | GET/PATCH/PUT/DELETE /orders/{id} |
| ค้นหาตามระยะ | `/nearby` | คลิกแผนที่เลือกจุด แล้วแสดงลูกค้าในระยะ 1 กม. หรือออเดอร์ในระยะ 2 กม. เรียงตามระยะทาง | GET /customers/nearby, GET /orders/nearby |

ส่วนจัดเส้นทางไรเดอร์ / ใบงานไรเดอร์ ยังไม่ได้ทำ เพราะ backend ยังไม่มี API ส่วนนี้

## โครงสร้างไฟล์ (src/app)

```
app.routes.ts                    เส้นทางทุกหน้า + หน้า 404
app.config.ts                    provideRouter(withComponentInputBinding) + provideHttpClient
config/api.ts                    ที่อยู่ API (API_ENDPOINT) พิกัดร้าน ราคา/ต้นทุนต่อกล่อง
model/                           interface ของข้อมูลที่รับ-ส่งกับ API
services/api/customers.ts        เรียก /customers ทุกเส้น (HttpClient + lastValueFrom)
services/api/orders.ts           เรียก /orders ทุกเส้น
services/notify.ts               ข้อความแจ้งเตือนมุมขวาล่าง
utils/format.ts                  ฟังก์ชันแสดงเงิน วันที่ ชื่อสถานะ
components/header                เมนูด้านบน
components/map-view              แผนที่ Leaflet ใช้ซ้ำได้ทุกหน้า (รับ input / ส่ง output)
components/toast                 แสดงข้อความแจ้งเตือน
pages/home                       หน้าภาพรวม
pages/customers                  หน้าลูกค้า
pages/customers/customer-form    ฟอร์มเพิ่ม/แก้ไขลูกค้า (component ย่อยของหน้าลูกค้า)
pages/orders                     หน้าออเดอร์
pages/orders/order-add-form      ฟอร์มเพิ่มออเดอร์
pages/orders/order-edit-form     ฟอร์มแก้ไขออเดอร์
pages/order-detail               หน้ารายละเอียดออเดอร์ (/orders/:id)
pages/nearby                     หน้าค้นหาตามระยะ
pages/pagenotfound               หน้า 404
```

ทุกหน้าใช้รูปแบบเดียวกัน: ข้อมูลเก็บใน `signal()`, โหลดข้อมูลใน `ngOnInit()`,
เรียก API ด้วย `async/await` ใน `try { ... } catch { แจ้งเตือน }`, ค่าที่คำนวณจากข้อมูลอื่นใช้ `computed()`

หมายเหตุ: mysql2 ส่งค่า DECIMAL (ราคา, พิกัด) มาเป็น string เช่น `"65.00"` หน้าเว็บจึงแปลงด้วย `Number()` ก่อนใช้

## Deploy (Vercel)

```shell
ng build
```
ผลลัพธ์อยู่ใน `dist/frontend/browser` อัปโหลดขึ้น GitHub แล้วเชื่อมกับ Vercel ตามสไลด์
ก่อน deploy ให้แก้ `API_ENDPOINT` เป็น URL ของ backend บน Render และเพิ่ม URL ของ Vercel
ลงใน `allowedOrigins` ของ `backend/app.ts` (ไม่อย่างนั้น CORS จะบล็อก)
