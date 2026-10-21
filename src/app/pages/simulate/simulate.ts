import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBoxOpen,
  faBroom,
  faCheck,
  faCircleCheck,
  faClipboardList,
  faMotorcycle,
  faRoute,
  faUsers,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { Simulate as SimulateApi } from '../../services/api/simulate';
import { Orders as OrdersApi } from '../../services/api/orders';
import { SimulateStatus } from '../../model/simulate';
import { Notify } from '../../services/notify';
import { thaiDate, today } from '../../utils/format';

// จำนวนที่สร้างต่อการกด 1 ครั้ง
const CUSTOMER_COUNT = 30;
const RIDER_COUNT = 5;
const ORDER_COUNT = 25;

// หน้าจำลองระบบ (เจ้าของร้าน): สร้างข้อมูลจำลองเพื่อทดลองใช้ทั้งระบบผ่านหน้าเว็บ
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

  faWandMagicSparkles = faWandMagicSparkles;
  faUsers = faUsers;
  faMotorcycle = faMotorcycle;
  faBoxOpen = faBoxOpen;
  faRoute = faRoute;
  faClipboardList = faClipboardList;
  faCircleCheck = faCircleCheck;
  faBroom = faBroom;
  faCheck = faCheck;

  thaiDate = thaiDate;
  CUSTOMER_COUNT = CUSTOMER_COUNT;
  RIDER_COUNT = RIDER_COUNT;
  ORDER_COUNT = ORDER_COUNT;

  date = signal(today()); // วันที่ส่งที่จะจำลอง
  status = signal<SimulateStatus | null>(null);
  loading = signal(true);
  working = signal(false);

  // จำนวนออเดอร์ของวันที่เลือก (ไม่นับที่ยกเลิก)
  dayOrders = computed(() => {
    const day = this.status()?.day;
    return day ? day.pending + day.delivering + day.delivered : 0;
  });

  // ขั้นไหนทำแล้วบ้าง (ใช้ขึ้นเครื่องหมายถูก และบอกว่าขั้นต่อไปคืออะไร)
  done = computed(() => {
    const s = this.status();
    return [
      (s?.customers ?? 0) > 0,
      (s?.riders ?? 0) > 0,
      this.dayOrders() > 0,
      (s?.routes.length ?? 0) > 0,
      (s?.routes.length ?? 0) > 0,
      (s?.day.delivered ?? 0) > 0,
    ];
  });

  // ขั้นที่ควรทำต่อไป (เลข 1-6, 0 = ทำครบแล้ว)
  nextStep = computed(() => this.done().indexOf(false) + 1);

  // มีข้อมูลจำลองให้ล้างไหม
  hasSimData = computed(() => {
    const s = this.status();
    return !!s && s.customers + s.orders + s.riders > 0;
  });

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
    if (!value) return;
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

  // ปุ่มเดียวครบชุด: สร้างลูกค้า / ไรเดอร์ (ถ้ายังไม่พอ) และออเดอร์ของวันที่เลือก
  quickStart() {
    this.run(async () => {
      const s = this.status();
      // ลูกค้าน้อยกว่าจำนวนออเดอร์ เพิ่มลูกค้าก่อน (ออเดอร์จะได้ไม่ซ้ำคนเดิม)
      if ((s?.customers ?? 0) < ORDER_COUNT) {
        await this.simulateApi.customers(CUSTOMER_COUNT);
      }
      if ((s?.riders ?? 0) === 0) {
        await this.simulateApi.riders(RIDER_COUNT);
      }
      const res = await this.ordersApi.simulate(this.date(), ORDER_COUNT);
      return `พร้อมแล้ว! มีออเดอร์วันที่ ${thaiDate(this.date())} เพิ่ม ${res.affected_row} รายการ ไปจัดเส้นทางต่อได้เลย`;
    }, 'สร้างข้อมูลจำลองไม่สำเร็จ');
  }

  // POST /simulate/customers
  addCustomers() {
    this.run(async () => {
      const res = await this.simulateApi.customers(CUSTOMER_COUNT);
      return `เพิ่มลูกค้าจำลอง ${res.affected_row} คน`;
    }, 'จำลองลูกค้าไม่สำเร็จ');
  }

  // POST /simulate/riders
  addRiders() {
    this.run(async () => {
      const res = await this.simulateApi.riders(RIDER_COUNT);
      return `เพิ่มไรเดอร์จำลอง ${res.affected_row} คน`;
    }, 'จำลองไรเดอร์ไม่สำเร็จ');
  }

  // POST /orders/simulate ของวันที่เลือก
  addOrders() {
    this.run(async () => {
      const res = await this.ordersApi.simulate(this.date(), ORDER_COUNT);
      return `เพิ่มออเดอร์วันที่ ${thaiDate(this.date())} ${res.affected_row} รายการ`;
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
    if (
      !confirm(
        'ลบข้อมูลจำลองทั้งหมดใช่หรือไม่?\n(ลูกค้า ไรเดอร์ ออเดอร์ และใบงานที่สร้างจากหน้านี้ ข้อมูลจริงไม่ถูกลบ)',
      )
    ) {
      return;
    }
    this.run(async () => {
      const res = await this.simulateApi.clearAll();
      return `ลบแล้ว: ลูกค้า ${res.customers} · ไรเดอร์ ${res.riders} · ออเดอร์ ${res.orders} · ใบงาน ${res.routes}`;
    }, 'ล้างข้อมูลจำลองไม่สำเร็จ');
  }
}
