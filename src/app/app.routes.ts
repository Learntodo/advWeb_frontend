import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Customers } from './pages/customers/customers';
import { Orders } from './pages/orders/orders';
import { OrderDetail } from './pages/order-detail/order-detail';
import { Nearby } from './pages/nearby/nearby';
import { ComingSoon } from './pages/coming-soon/coming-soon';
import { Pagenotfound } from './pages/pagenotfound/pagenotfound';

export const routes: Routes = [
  { path: '', component: Home, title: 'ภาพรวม | ส่งด่วนมื้อเที่ยง' },
  { path: 'customers', component: Customers, title: 'ลูกค้า | ส่งด่วนมื้อเที่ยง' },
  { path: 'orders', component: Orders, title: 'ออเดอร์ | ส่งด่วนมื้อเที่ยง' },
  { path: 'orders/:id', component: OrderDetail, title: 'รายละเอียดออเดอร์ | ส่งด่วนมื้อเที่ยง' },
  { path: 'nearby', component: Nearby, title: 'ค้นหาตามระยะ | ส่งด่วนมื้อเที่ยง' },
  // ส่วนที่เตรียมไว้ รอ API ฝั่ง backend
  { path: 'coming-soon', component: ComingSoon, title: 'กำลังพัฒนา | ส่งด่วนมื้อเที่ยง' },
  // Wild Card Route สำหรับหน้าที่ไม่มีอยู่ (404)
  { path: '**', component: Pagenotfound },
];
