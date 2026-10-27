import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faBowlRice,
  faBroom,
  faCoins,
  faFlask,
  faLocationCrosshairs,
  faReceipt,
  faRoute,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { Customers as CustomersApi } from '../../services/api/customers';
import { Orders as OrdersApi } from '../../services/api/orders';
import { CustomerGetResponse } from '../../model/customer-get-res';
import { OrderGetResponse } from '../../model/order-get-res';
import { MapMarker, MapView } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { Api } from '../../config/api';
import { baht, statusBadge, statusColor, statusLabel, toDateInput, today } from '../../utils/format';

// หน้าแรกของเจ้าของร้าน: สรุปออเดอร์วันนี้ แผนที่จุดส่ง ออเดอร์ล่าสุด + ปุ่มจำลอง / ล้างออเดอร์
@Component({
  selector: 'app-home',
  imports: [RouterModule, FontAwesomeModule, MapView],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  customersApi = inject(CustomersApi);
  ordersApi = inject(OrdersApi);
  notify = inject(Notify);
  api = inject(Api);

  faBowlRice = faBowlRice;
  faFlask = faFlask;
  faBroom = faBroom;
  faArrowRight = faArrowRight;
  faLocationCrosshairs = faLocationCrosshairs;
  faRoute = faRoute;
  faReceipt = faReceipt;
  faCoins = faCoins;
  faUsers = faUsers;

  baht = baht;
  statusLabel = statusLabel;
  statusBadge = statusBadge;

  customers = signal<CustomerGetResponse[]>([]);
  orders = signal<OrderGetResponse[]>([]);
  loading = signal(true);
  apiError = signal(false); // true = เรียก API ไม่ได้
  working = signal(false); // กำลังจำลอง / ล้างออเดอร์

  // วันที่วันนี้แบบไทย เช่น "วันเสาร์ที่ 10 ตุลาคม 2569"
  todayText = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ออเดอร์ที่ต้องส่งวันนี้ (ไม่นับที่ยกเลิก)
  todayOrders = computed(() => {
    return this.orders().filter((order) => {
      return toDateInput(order.delivery_date) === today() && order.status !== 'cancelled';
    });
  });

  // สรุปตัวเลขของวันนี้
  summary = computed(() => {
    let boxes = 0;
    let sales = 0;
    for (const order of this.todayOrders()) {
      boxes = boxes + order.quantity;
      sales = sales + Number(order.total_price);
    }
    return {
      orders: this.todayOrders().length,
      boxes: boxes,
      sales: sales,
    };
  });

  // จำนวนออเดอร์ที่จำลองไว้
  simulatedCount = computed(() => {
    return this.orders().filter((order) => order.is_simulated === 1).length;
  });

  // ออเดอร์ล่าสุด 6 รายการ (รหัสมากสุด = ใหม่สุด)
  latestOrders = computed(() => {
    const sorted = [...this.orders()].sort((a, b) => b.id - a.id);
    return sorted.slice(0, 6);
  });

  // หมุดจุดส่งวันนี้
  markers = computed(() => {
    const markers: MapMarker[] = [];
    for (const order of this.todayOrders()) {
      markers.push({
        id: order.id,
        lat: Number(order.delivery_latitude),
        lng: Number(order.delivery_longitude),
        label: String(order.quantity),
        color: statusColor[order.status],
        popup: `ID ${order.id} ${order.first_name} ${order.last_name}\n${order.quantity} กล่อง · ${order.delivery_address}`,
      });
    }
    return markers;
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      // โหลดพร้อมกัน เร็วกว่าโหลดทีละอย่าง
      const [customers, orders] = await Promise.all([this.customersApi.getAll(), this.ordersApi.getAll()]);
      this.customers.set(customers);
      this.orders.set(orders);
      this.apiError.set(false);
    } catch (err) {
      this.apiError.set(true);
      this.notify.apiError(err, 'โหลดข้อมูลไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // 3.1 จำลองออเดอร์ 20-30 รายการ
  async simulate() {
    if (this.customers().length === 0) {
      this.notify.error('ต้องมีลูกค้าในระบบก่อน ถึงจะจำลองออเดอร์ได้');
      return;
    }
    this.working.set(true);
    try {
      const res = await this.ordersApi.simulate();
      this.notify.success(`จำลองออเดอร์วันนี้ ${res.affected_row} รายการ`);
      await this.loadData();
    } catch (err) {
      this.notify.apiError(err, 'จำลองออเดอร์ไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // 3.2 ล้างออเดอร์ที่จำลองทั้งหมด
  async clearSimulated() {
    if (!confirm(`ลบออเดอร์จำลองทั้งหมด ${this.simulatedCount()} รายการ ใช่หรือไม่?`)) {
      return;
    }
    this.working.set(true);
    try {
      const res = await this.ordersApi.clearSimulated();
      this.notify.success(`ล้างออเดอร์จำลองแล้ว ${res.affected_row} รายการ`);
      await this.loadData();
    } catch (err) {
      this.notify.apiError(err, 'ล้างออเดอร์จำลองไม่สำเร็จ');
    }
    this.working.set(false);
  }
}
