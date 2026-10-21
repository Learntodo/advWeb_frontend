import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBoxOpen,
  faBroom,
  faCircleCheck,
  faClipboardList,
  faFlask,
  faMotorcycle,
  faRoute,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { Simulate as SimulateApi } from '../../services/api/simulate';
import { Orders as OrdersApi } from '../../services/api/orders';
import { SimulateStatus } from '../../model/simulate';
import { Notify } from '../../services/notify';
import { thaiDate, today } from '../../utils/format';

// หน้าจำลองระบบ (เจ้าของร้าน): สร้างข้อมูลจำลองเพื่อทดสอบทั้งระบบผ่านหน้าเว็บ
// ลูกค้า -> ไรเดอร์ -> ออเดอร์ของวันที่เลือก -> จัดเส้นทาง -> เปิดใบงาน -> ส่งเสร็จ -> ล้างข้อมูลจำลอง
@Component({
  selector: 'app-simulate',
  imports: [FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './simulate.html',
  styleUrl: './simulate.css',
})
export class Simulate {
  simulateApi = inject(SimulateApi);
  ordersApi = inject(OrdersApi);
  notify = inject(Notify);

  // ?date=YYYY-MM-DD จากลิงก์ในหน้าจัดเส้นทาง
  dateQuery = input<string>(undefined, { alias: 'date' });

  faFlask = faFlask;
  faUsers = faUsers;
  faMotorcycle = faMotorcycle;
  faBoxOpen = faBoxOpen;
  faRoute = faRoute;
  faClipboardList = faClipboardList;
  faCircleCheck = faCircleCheck;
  faBroom = faBroom;

  thaiDate = thaiDate;

  date = signal(today()); // วันที่ส่งที่จะจำลอง
  customerCount = signal(15);
  riderCount = signal(5);
  orderCount = signal(25);
  status = signal<SimulateStatus | null>(null);
  loading = signal(true);
  working = signal(false);

  ngOnInit() {
    const date = this.dateQuery();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.date.set(date);
    }
    this.load();
  }

  // GET /simulate?date= โหลดสรุปข้อมูลจำลองของวันที่เลือก
  async load() {
    try {
      this.status.set(await this.simulateApi.status(this.date()));
    } catch (err) {
      this.notify.apiError(err, 'โหลดข้อมูลจำลองไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  changeDate(value: string) {
    this.date.set(value);
    this.load();
  }

  // ลิงก์ใบงานที่ไรเดอร์เปิดในมือถือ
  jobLink(code: string): string {
    return `${location.origin}/job?code=${code}`;
  }

  // ใช้ร่วมกันทุกปุ่ม: เรียก API -> แจ้งผล -> โหลดสรุปใหม่
  async run(action: () => Promise<string>, failTitle: string) {
    this.working.set(true);
    try {
      this.notify.success(await action());
    } catch (err) {
      this.notify.apiError(err, failTitle);
    }
    await this.load();
    this.working.set(false);
  }

  // POST /simulate/customers
  addCustomers() {
    this.run(async () => {
      const res = await this.simulateApi.customers(this.customerCount());
      return `เพิ่มลูกค้าจำลอง ${res.affected_row} คน`;
    }, 'จำลองลูกค้าไม่สำเร็จ');
  }

  // POST /simulate/riders
  addRiders() {
    this.run(async () => {
      const res = await this.simulateApi.riders(this.riderCount());
      return `เพิ่มไรเดอร์จำลอง ${res.affected_row} คน`;
    }, 'จำลองไรเดอร์ไม่สำเร็จ');
  }

  // POST /orders/simulate ของวันที่เลือก
  addOrders() {
    this.run(async () => {
      const res = await this.ordersApi.simulate(this.date(), this.orderCount());
      return `จำลองออเดอร์วันที่ ${thaiDate(this.date())} ${res.affected_row} รายการ`;
    }, 'จำลองออเดอร์ไม่สำเร็จ');
  }

  // POST /simulate/deliver
  deliver() {
    this.run(async () => {
      const res = await this.simulateApi.deliver(this.date());
      return `ไรเดอร์ส่งเสร็จ ${res.affected_row} ออเดอร์`;
    }, 'จำลองการส่งไม่สำเร็จ');
  }

  // DELETE /simulate
  clearAll() {
    if (!confirm('ล้างข้อมูลจำลองทั้งหมด (ลูกค้า ไรเดอร์ ออเดอร์ และใบงานที่มีออเดอร์จำลอง) ใช่หรือไม่?')) {
      return;
    }
    this.run(async () => {
      const res = await this.simulateApi.clearAll();
      return `ล้างแล้ว: ลูกค้า ${res.customers} · ไรเดอร์ ${res.riders} · ออเดอร์ ${res.orders} · ใบงาน ${res.routes}`;
    }, 'ล้างข้อมูลจำลองไม่สำเร็จ');
  }
}
