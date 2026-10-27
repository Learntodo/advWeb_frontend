import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faBoxOpen,
  faFlask,
  faHouse,
  faKey,
  faLocationCrosshairs,
  faMoon,
  faMotorcycle,
  faRightFromBracket,
  faRoute,
  faSun,
  faUser,
  faUsers,
  faXmark,
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
  faKey = faKey;
  faRightFromBracket = faRightFromBracket;
  faXmark = faXmark;
  faUser = faUser;
  faMoon = faMoon;
  faSun = faSun;

  passwordOpen = signal(false); // เปิดฟอร์มเปลี่ยนรหัสผ่าน
  menuOpen = signal(false); // เปิดเมนูด้านข้างบนมือถือ

  // ธีมสว่าง / มืด: จำค่าที่เลือกไว้ใน localStorage (index.html อ่านค่านี้ตอนเปิดเว็บ)
  isDark = signal(localStorage.getItem('theme') === 'dark');

  toggleTheme() {
    this.isDark.set(!this.isDark());
    const theme = this.isDark() ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', this.isDark() ? 'lunchbox-dark' : 'lunchbox');
  }

  // เมนูหลักของฝั่งเจ้าของร้าน (ไรเดอร์ไม่เห็นเมนูนี้)
  menus = [
    { path: '/', label: 'หน้าแรก', icon: faHouse, exact: true },
    { path: '/customers', label: 'ลูกค้า', icon: faUsers, exact: false },
    { path: '/orders', label: 'ออเดอร์', icon: faBoxOpen, exact: false },
    { path: '/routes', label: 'จัดเส้นทาง', icon: faRoute, exact: false },
    { path: '/nearby', label: 'ค้นหาตามระยะ', icon: faLocationCrosshairs, exact: false },
    { path: '/riders', label: 'ไรเดอร์', icon: faMotorcycle, exact: false },
    { path: '/simulate', label: 'จำลองระบบ', icon: faFlask, exact: false },
  ];
}
