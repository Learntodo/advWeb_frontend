import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBroom,
  faCalendarDay,
  faEye,
  faFlask,
  faLock,
  faMagnifyingGlass,
  faMinus,
  faPen,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
// ชื่อ class ซ้ำกับ component นี้ (Orders) จึงตั้งชื่อใหม่ว่า OrdersApi
import { Orders as OrdersApi } from '../../services/api/orders';
import { Customers as CustomersApi } from '../../services/api/customers';
import { OrderGetResponse, OrderStatus } from '../../model/order-get-res';
import { CustomerGetResponse } from '../../model/customer-get-res';
import { MapMarker, MapView, LatLng } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { Api } from '../../config/api';
import {
  baht,
  statusBadge,
  statusColor,
  statuses,
  statusLabel,
  thaiDate,
  toDateInput,
  today,
} from '../../utils/format';
import { OrderAddForm } from './order-add-form/order-add-form';
import { OrderEditForm } from './order-edit-form/order-edit-form';

// หน้าจัดการออเดอร์ (HW-5 ข้อ 3)
@Component({
  selector: 'app-orders',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView, OrderAddForm, OrderEditForm],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  ordersApi = inject(OrdersApi);
  customersApi = inject(CustomersApi);
  notify = inject(Notify);
  router = inject(Router);
  api = inject(Api);

  // query params ที่ส่งมาจากหน้าอื่น
  // ?customer=5 = เปิดฟอร์มสั่งให้ลูกค้ารหัส 5, ?edit=12 = เปิดฟอร์มแก้ออเดอร์ 12
  customer = input<string>();
  edit = input<string>();

  faPlus = faPlus;
  faMinus = faMinus;
  faPen = faPen;
  faTrash = faTrash;
  faEye = faEye;
  faFlask = faFlask;
  faBroom = faBroom;
  faMagnifyingGlass = faMagnifyingGlass;
  faCalendarDay = faCalendarDay;
  faLock = faLock;

  baht = baht;
  thaiDate = thaiDate;
  today = today;
  statuses = statuses;
  statusLabel = statusLabel;
  statusBadge = statusBadge;
  statusColor = statusColor;

  orders = signal<OrderGetResponse[]>([]);
  customers = signal<CustomerGetResponse[]>([]);
  loading = signal(true);
  working = signal(false); // กำลังจำลอง / ล้างออเดอร์
  selectedId = signal<number | null>(null);
  focus = signal<LatLng | null>(null);

  // ตัวกรอง
  keyword = signal(''); // ชื่อ หรือ เบอร์โทร
  dateFilter = signal(today()); // วันที่ส่ง (YYYY-MM-DD) เริ่มที่วันนี้, ว่าง = ทุกวัน
  statusFilter = signal(''); // สถานะ ว่าง = ทุกสถานะ
  typeFilter = signal('all'); // all = ทั้งหมด, real = ออเดอร์จริง, sim = ออเดอร์จำลอง

  // ฟอร์ม
  addOpen = signal(false);
  addCustomerId = signal<number | null>(null); // ลูกค้าที่เลือกไว้ก่อนเปิดฟอร์มเพิ่ม
  editingOrder = signal<OrderGetResponse | null>(null); // ออเดอร์ที่กำลังแก้ไข

  // ออเดอร์ที่ผ่านตัวกรอง (เรียงจากใหม่ไปเก่า)
  filteredOrders = computed(() => {
    const result: OrderGetResponse[] = [];
    for (const o of this.orders()) {
      if (this.matchFilter(o)) {
        result.push(o);
      }
    }
    return result.sort((a, b) => b.id - a.id);
  });

  // จำนวนออเดอร์ของแต่ละสถานะ (ตามตัวกรองอื่น) แสดงบนแท็บสถานะ
  statusCounts = computed(() => {
    const counts: Record<string, number> = { '': 0, pending: 0, delivering: 0, delivered: 0, cancelled: 0 };
    for (const o of this.orders()) {
      if (this.matchFilter(o, true)) {
        counts[''] = (counts[''] ?? 0) + 1;
        counts[o.status] = (counts[o.status] ?? 0) + 1;
      }
    }
    return counts;
  });

  // จำนวนออเดอร์ที่จำลองไว้
  simulatedCount = computed(() => {
    return this.orders().filter((o) => o.is_simulated === 1).length;
  });

  // สรุปยอดของออเดอร์ที่แสดง (ไม่นับออเดอร์ที่ยกเลิก)
  summary = computed(() => {
    let boxes = 0;
    let sales = 0;
    for (const o of this.filteredOrders()) {
      if (o.status !== 'cancelled') {
        boxes = boxes + o.quantity;
        sales = sales + Number(o.total_price);
      }
    }
    const profit = sales - boxes * this.api.BOX_COST; // กำไรก่อนหักค่าไรเดอร์
    return { count: this.filteredOrders().length, boxes: boxes, sales: sales, profit: profit };
  });

  // หมุดบนแผนที่ (ตัวเลข = รหัสออเดอร์ ตรงกับตาราง, สีตามสถานะ)
  markers = computed(() => {
    const markers: MapMarker[] = [];
    for (const o of this.filteredOrders()) {
      markers.push({
        id: o.id,
        lat: Number(o.delivery_latitude),
        lng: Number(o.delivery_longitude),
        label: String(o.id),
        color: o.id === this.selectedId() ? '#dc2626' : statusColor[o.status],
        popup: `#${o.id} ${o.first_name} ${o.last_name}\n${o.quantity} กล่อง · ${statusLabel[o.status]}\n${o.delivery_address}`,
      });
    }
    return markers;
  });

  async ngOnInit() {
    await this.loadData();

    // เปิดฟอร์มตาม query param ที่ส่งมา
    if (this.customer()) {
      this.openAdd(Number(this.customer()));
    }
    if (this.edit()) {
      const order = this.orders().find((o) => o.id === Number(this.edit()));
      if (order) {
        this.openEdit(order);
      }
    }
  }

  // โหลดออเดอร์ และลูกค้า (ใช้ในฟอร์มเพิ่มออเดอร์)
  async loadData() {
    this.loading.set(true);
    try {
      this.orders.set(await this.ordersApi.getAll());
      this.customers.set(await this.customersApi.getAll());
    } catch (err) {
      this.notify.apiError(err, 'โหลดข้อมูลไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // โหลดเฉพาะออเดอร์ใหม่ (หลังเพิ่ม / แก้ / ลบ)
  async reloadOrders() {
    try {
      this.orders.set(await this.ordersApi.getAll());
    } catch (err) {
      this.notify.apiError(err, 'โหลดข้อมูลออเดอร์ไม่สำเร็จ');
    }
  }

  // ตรวจว่าออเดอร์นี้ผ่านตัวกรองทุกข้อหรือไม่ (ignoreStatus = ไม่ดูตัวกรองสถานะ ใช้นับจำนวนบนแท็บ)
  matchFilter(o: OrderGetResponse, ignoreStatus = false): boolean {
    const keyword = this.keyword().trim();
    if (keyword !== '') {
      const text = `${o.first_name} ${o.last_name} ${o.phone} #${o.id}`;
      if (!text.includes(keyword)) return false;
    }
    if (this.dateFilter() !== '' && toDateInput(o.delivery_date) !== this.dateFilter()) {
      return false;
    }
    if (!ignoreStatus && this.statusFilter() !== '' && o.status !== this.statusFilter()) {
      return false;
    }
    if (this.typeFilter() === 'real' && o.is_simulated === 1) return false;
    if (this.typeFilter() === 'sim' && o.is_simulated === 0) return false;
    return true;
  }

  isTodayFilter() {
    return this.dateFilter() === today();
  }

  clearFilters() {
    this.keyword.set('');
    this.dateFilter.set(today());
    this.statusFilter.set('');
    this.typeFilter.set('all');
  }

  // คลิกแถว -> เลื่อนแผนที่ไปที่จุดส่ง
  select(o: OrderGetResponse) {
    this.selectedId.set(o.id);
    this.focus.set({ lat: Number(o.delivery_latitude), lng: Number(o.delivery_longitude) });
  }

  // คลิกหมุด -> เลือกแถวนั้นในตาราง
  onMarkerClick(id: number) {
    this.selectedId.set(id);
    document.getElementById('order-' + id)?.scrollIntoView({ block: 'center' });
  }

  // 3.1.3 ปุ่ม − / + จำนวนกล่อง (PATCH /orders/{id})
  async changeQuantity(o: OrderGetResponse, change: number) {
    const newQuantity = o.quantity + change;
    if (newQuantity < 1 || newQuantity > 3) {
      return; // สั่งได้ 1-3 กล่องเท่านั้น
    }
    try {
      await this.ordersApi.changeQuantity(o.id, change);
      await this.reloadOrders();
    } catch (err) {
      this.notify.apiError(err, 'แก้จำนวนกล่องไม่สำเร็จ');
    }
  }

  // เปลี่ยนสถานะจาก dropdown ในตาราง (PUT /orders/{id})
  async changeStatus(o: OrderGetResponse, status: string) {
    try {
      await this.ordersApi.update(o.id, { status: status as OrderStatus });
      this.notify.success(`ออเดอร์ #${o.id} เปลี่ยนเป็น "${statusLabel[status as OrderStatus]}"`);
      await this.reloadOrders();
    } catch (err) {
      this.notify.apiError(err, 'เปลี่ยนสถานะไม่สำเร็จ');
    }
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
      await this.reloadOrders();
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
      await this.reloadOrders();
    } catch (err) {
      this.notify.apiError(err, 'ล้างออเดอร์จำลองไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // ลบออเดอร์ 1 รายการ
  async remove(o: OrderGetResponse) {
    if (!confirm(`ลบออเดอร์ #${o.id} ของ ${o.first_name} ใช่หรือไม่?`)) {
      return;
    }
    try {
      await this.ordersApi.delete(o.id);
      this.notify.success(`ลบออเดอร์ #${o.id} แล้ว`);
      await this.reloadOrders();
    } catch (err) {
      this.notify.apiError(err, 'ลบออเดอร์ไม่สำเร็จ');
    }
  }

  openAdd(customerId: number | null) {
    this.addCustomerId.set(customerId);
    this.addOpen.set(true);
  }

  openEdit(o: OrderGetResponse) {
    this.editingOrder.set(o);
  }

  // ฟอร์มบันทึกสำเร็จ -> ปิดฟอร์มแล้วโหลดออเดอร์ใหม่
  onSaved() {
    this.addOpen.set(false);
    this.editingOrder.set(null);
    this.reloadOrders();
  }

  goDetail(o: OrderGetResponse) {
    this.router.navigate(['/orders', o.id]);
  }
}
