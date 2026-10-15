import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faBoxOpen,
  faHouse,
  faLocationCrosshairs,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-header',
  imports: [RouterModule, FontAwesomeModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  faBars = faBars;

  // เมนูหลักของฝั่งเจ้าของร้าน (เฉพาะส่วนที่ backend มีตอนนี้)
  menus = [
    { path: '/', label: 'ภาพรวม', icon: faHouse, exact: true },
    { path: '/customers', label: 'ลูกค้า', icon: faUsers, exact: false },
    { path: '/orders', label: 'ออเดอร์', icon: faBoxOpen, exact: false },
    { path: '/nearby', label: 'ค้นหาตามระยะ', icon: faLocationCrosshairs, exact: false },
  ];
}
