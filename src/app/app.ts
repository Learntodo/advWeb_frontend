import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Toast } from './components/toast/toast';

// component หลักของแอป: header + หน้าที่เปิดอยู่ (router-outlet) + ข้อความแจ้งเตือน
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Toast],
  templateUrl: './app.html',
})
export class App {}
