import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

// หน้า 404 แสดงเมื่อเปิด path ที่ไม่มีในระบบ
@Component({
  selector: 'app-pagenotfound',
  imports: [RouterModule],
  templateUrl: './pagenotfound.html',
  styleUrl: './pagenotfound.css',
})
export class Pagenotfound {}
