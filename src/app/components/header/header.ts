import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faBoxOpen,
  faCircleUser,
  faHouse,
  faKey,
  faLocationCrosshairs,
  faMotorcycle,
  faRightFromBracket,
  faRoute,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { Auth } from '../../services/auth';
import { PasswordForm } from '../password-form/password-form';

@Component({
  selector: 'app-header',
  imports: [RouterModule, FontAwesomeModule, PasswordForm],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  auth = inject(Auth);

  faBars = faBars;
  faCircleUser = faCircleUser;
  faKey = faKey;
  faRightFromBracket = faRightFromBracket;

  passwordOpen = signal(false); // เปิดฟอร์มเปลี่ยนรหัสผ่าน

  // เมนูหลักของฝั่งเจ้าของร้าน (ไรเดอร์ไม่เห็นเมนูนี้)
  menus = [
    { path: '/', label: 'ภาพรวม', icon: faHouse, exact: true },
    { path: '/customers', label: 'ลูกค้า', icon: faUsers, exact: false },
    { path: '/orders', label: 'ออเดอร์', icon: faBoxOpen, exact: false },
    { path: '/routes', label: 'จัดเส้นทาง', icon: faRoute, exact: false },
    { path: '/nearby', label: 'ค้นหาตามระยะ', icon: faLocationCrosshairs, exact: false },
    { path: '/riders', label: 'ไรเดอร์', icon: faMotorcycle, exact: false },
  ];
}
