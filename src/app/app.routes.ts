import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Customers } from './pages/customers/customers';
import { Orders } from './pages/orders/orders';
import { OrderDetail } from './pages/order-detail/order-detail';
import { Nearby } from './pages/nearby/nearby';
import { Riders } from './pages/riders/riders';
import { Login } from './pages/login/login';
import { RiderHome } from './pages/rider-home/rider-home';
import { RoutePlan } from './pages/route-plan/route-plan';
import { JobSheet } from './pages/job-sheet/job-sheet';
import { Simulate } from './pages/simulate/simulate';
import { Pagenotfound } from './pages/pagenotfound/pagenotfound';
import { guestGuard, ownerGuard, riderGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard], title: 'เข้าสู่ระบบ | ส่งด่วนมื้อเที่ยง' },
  // หน้าของเจ้าของร้าน (ต้อง login เป็นเจ้าของร้าน)
  { path: '', component: Home, canActivate: [ownerGuard], title: 'ภาพรวม | ส่งด่วนมื้อเที่ยง' },
  { path: 'customers', component: Customers, canActivate: [ownerGuard], title: 'ลูกค้า | ส่งด่วนมื้อเที่ยง' },
  { path: 'orders', component: Orders, canActivate: [ownerGuard], title: 'ออเดอร์ | ส่งด่วนมื้อเที่ยง' },
  {
    path: 'orders/:id',
    component: OrderDetail,
    canActivate: [ownerGuard],
    title: 'รายละเอียดออเดอร์ | ส่งด่วนมื้อเที่ยง',
  },
  { path: 'nearby', component: Nearby, canActivate: [ownerGuard], title: 'ค้นหาตามระยะ | ส่งด่วนมื้อเที่ยง' },
  { path: 'riders', component: Riders, canActivate: [ownerGuard], title: 'ไรเดอร์ | ส่งด่วนมื้อเที่ยง' },
  { path: 'routes', component: RoutePlan, canActivate: [ownerGuard], title: 'จัดเส้นทาง | ส่งด่วนมื้อเที่ยง' },
  { path: 'simulate', component: Simulate, canActivate: [ownerGuard], title: 'จำลองระบบ | ส่งด่วนมื้อเที่ยง' },
  // หน้าของไรเดอร์ (ต้อง login เป็นไรเดอร์)
  { path: 'rider', component: RiderHome, canActivate: [riderGuard], title: 'ใบงานของฉัน | ส่งด่วนมื้อเที่ยง' },
  // ใบงานไรเดอร์ เปิดด้วยเลขใบงาน (ไม่ต้อง login)
  { path: 'job', component: JobSheet, title: 'ใบงานไรเดอร์ | ส่งด่วนมื้อเที่ยง' },
  // Wild Card Route สำหรับหน้าที่ไม่มีอยู่ (404)
  { path: '**', component: Pagenotfound },
];
