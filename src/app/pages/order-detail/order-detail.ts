import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faDiamondTurnRight,
  faMinus,
  faPen,
  faPhone,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { Orders as OrdersApi } from '../../services/api/orders';
import { OrderGetResponse, OrderStatus } from '../../model/order-get-res';
import { MapMarker, MapView } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { baht, googleMapsLink, statusBadge, statusColor, statuses, statusLabel, thaiDate } from '../../utils/format';

// หน้ารายละเอียดออเดอร์ /orders/:id
@Component({
  selector: 'app-order-detail',
  imports: [RouterModule, FontAwesomeModule, MapView],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail {
  ordersApi = inject(OrdersApi);
  notify = inject(Notify);
  router = inject(Router);

  // รับ path param :id ด้วย input() (ชื่อต้องตรงกับใน app.routes.ts)
  id = input.required<string>();

  faArrowLeft = faArrowLeft;
  faPhone = faPhone;
  faDiamondTurnRight = faDiamondTurnRight;
  faMinus = faMinus;
  faPlus = faPlus;
  faPen = faPen;
  faTrash = faTrash;

  baht = baht;
  thaiDate = thaiDate;
  googleMapsLink = googleMapsLink;
  statuses = statuses;
  statusLabel = statusLabel;
  statusBadge = statusBadge;

  order = signal<OrderGetResponse | null>(null);
  loading = signal(true);
  notFound = signal(false);

  // หมุดจุดส่ง 1 อัน
  markers = computed(() => {
    const o = this.order();
    if (o === null) {
      return [];
    }
    const marker: MapMarker = {
      id: o.id,
      lat: Number(o.delivery_latitude),
      lng: Number(o.delivery_longitude),
      label: String(o.quantity),
      color: statusColor[o.status],
      popup: `${o.first_name} ${o.last_name}\n${o.delivery_address}`,
    };
    return [marker];
  });

  ngOnInit() {
    this.loadOrder();
  }

  // GET /orders/{id}
  async loadOrder() {
    try {
      const res = await this.ordersApi.getOne(Number(this.id()));
      this.order.set(res);
    } catch (err) {
      // ไม่พบออเดอร์ (backend ตอบ 404) หรือเกิดข้อผิดพลาดอื่น
      this.notFound.set(true);
    }
    this.loading.set(false);
  }

  // PATCH /orders/{id} เพิ่ม/ลดจำนวนกล่อง
  async changeQuantity(o: OrderGetResponse, change: number) {
    try {
      await this.ordersApi.changeQuantity(o.id, change);
      await this.loadOrder();
    } catch (err) {
      this.notify.apiError(err, 'แก้จำนวนกล่องไม่สำเร็จ');
    }
  }

  // PUT /orders/{id} เปลี่ยนสถานะ
  async changeStatus(o: OrderGetResponse, status: OrderStatus) {
    try {
      await this.ordersApi.update(o.id, { status: status });
      this.notify.success(`เปลี่ยนสถานะเป็น "${statusLabel[status]}" แล้ว`);
      await this.loadOrder();
    } catch (err) {
      this.notify.apiError(err, 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  }

  // DELETE /orders/{id} แล้วกลับไปหน้าออเดอร์
  async remove(o: OrderGetResponse) {
    if (!confirm(`ลบออเดอร์ #${o.id} ใช่หรือไม่?`)) {
      return;
    }
    try {
      await this.ordersApi.delete(o.id);
      this.notify.success(`ลบออเดอร์ #${o.id} แล้ว`);
      this.router.navigate(['/orders']);
    } catch (err) {
      this.notify.apiError(err, 'ลบออเดอร์ไม่สำเร็จ');
    }
  }
}
