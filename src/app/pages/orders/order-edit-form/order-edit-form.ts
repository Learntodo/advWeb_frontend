import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Orders as OrdersApi } from '../../../services/api/orders';
import { OrderGetResponse, OrderStatus } from '../../../model/order-get-res';
import { MapView, LatLng } from '../../../components/map-view/map-view';
import { Notify } from '../../../services/notify';
import { baht, statuses, statusLabel, toDateInput } from '../../../utils/format';

// ฟอร์มแก้ไขออเดอร์ (แสดงเป็นกล่อง modal)
// ใช้ในหน้า orders: <app-order-edit-form [order]="..." (saved)="..." (closed)="..." />
@Component({
  selector: 'app-order-edit-form',
  imports: [FormsModule, FontAwesomeModule, MapView],
  templateUrl: './order-edit-form.html',
  styleUrl: './order-edit-form.css',
})
export class OrderEditForm {
  ordersApi = inject(OrdersApi);
  notify = inject(Notify);

  order = input.required<OrderGetResponse>(); // ออเดอร์ที่จะแก้ไข
  saved = output();
  closed = output();

  faXmark = faXmark;
  baht = baht;
  statuses = statuses;
  statusLabel = statusLabel;
  quantityChoices = [1, 2, 3];

  // ข้อมูลในฟอร์ม
  quantity = signal(1);
  unitPrice = signal(0);
  status = signal<OrderStatus>('pending');
  deliveryDate = signal('');
  address = signal('');
  lat = signal(0);
  lng = signal(0);
  note = signal('');
  saving = signal(false);
  startPoint = signal<LatLng | null>(null);

  deliveryPoint = computed(() => {
    return { lat: this.lat(), lng: this.lng() };
  });

  ngOnInit() {
    // นำข้อมูลเดิมของออเดอร์มาใส่ในฟอร์ม
    const o = this.order();
    this.quantity.set(o.quantity);
    this.unitPrice.set(Number(o.unit_price));
    this.status.set(o.status);
    this.deliveryDate.set(toDateInput(o.delivery_date));
    this.address.set(o.delivery_address);
    this.lat.set(Number(o.delivery_latitude));
    this.lng.set(Number(o.delivery_longitude));
    this.note.set(o.note ?? '');
    this.startPoint.set({ lat: this.lat(), lng: this.lng() });
  }

  // คลิกแผนที่ -> ย้ายจุดส่ง
  pickLocation(point: LatLng) {
    this.lat.set(point.lat);
    this.lng.set(point.lng);
  }

  async save() {
    if (this.address().trim() === '' || this.deliveryDate() === '') {
      this.notify.error('กรุณากรอกที่อยู่และวันที่ส่งให้ครบ');
      return;
    }
    if (this.unitPrice() < 0) {
      this.notify.error('ราคาต่อกล่องต้องไม่ติดลบ');
      return;
    }

    this.saving.set(true);
    try {
      // PUT /orders/{id}
      await this.ordersApi.update(this.order().id, {
        quantity: this.quantity(),
        unit_price: this.unitPrice(),
        status: this.status(),
        delivery_date: this.deliveryDate(),
        delivery_address: this.address().trim(),
        delivery_latitude: this.lat(),
        delivery_longitude: this.lng(),
        note: this.note().trim() || null,
      });
      this.notify.success(`บันทึกออเดอร์ #${this.order().id} แล้ว`);
      this.saved.emit();
    } catch (err) {
      this.notify.apiError(err, 'บันทึกออเดอร์ไม่สำเร็จ');
    }
    this.saving.set(false);
  }
}
