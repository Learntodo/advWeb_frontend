import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Orders as OrdersApi } from '../../../services/api/orders';
import { CustomerGetResponse } from '../../../model/customer-get-res';
import { OrderPostRequest } from '../../../model/order-req';
import { MapView, LatLng } from '../../../components/map-view/map-view';
import { Notify } from '../../../services/notify';
import { Api } from '../../../config/api';
import { baht, today } from '../../../utils/format';

// ฟอร์มเพิ่มออเดอร์ (แสดงเป็นกล่อง modal)
// ใช้ในหน้า orders: <app-order-add-form [customers]="..." (saved)="..." (closed)="..." />
@Component({
  selector: 'app-order-add-form',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView],
  templateUrl: './order-add-form.html',
  styleUrl: './order-add-form.css',
})
export class OrderAddForm {
  ordersApi = inject(OrdersApi);
  notify = inject(Notify);
  api = inject(Api);

  customers = input<CustomerGetResponse[]>([]); // ลูกค้าทั้งหมด (ให้เลือก)
  customerId = input<number | null>(null); // ลูกค้าที่เลือกไว้ก่อน (ถ้ามี)
  saved = output();
  closed = output();

  faXmark = faXmark;
  faMagnifyingGlass = faMagnifyingGlass;
  baht = baht;
  quantityChoices = [1, 2, 3]; // สั่งได้ไม่เกิน 3 กล่อง

  // ========== ส่วนที่ 1: ข้อมูลในฟอร์ม ==========
  // ข้อมูลในฟอร์ม
  selectedId = signal<number | null>(null); // รหัสลูกค้าที่เลือก
  searchText = signal(''); // ช่องค้นหาลูกค้าเก่า
  quantity = signal(1);
  unitPrice = signal(this.api.BOX_PRICE);
  deliveryDate = signal(today());
  note = signal('');
  otherPlace = signal(false); // true = ส่งที่อื่น ไม่ใช่บ้านลูกค้า
  address = signal('');
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  saving = signal(false);

  // ========== ส่วนที่ 2: ค่าที่คำนวณ (ลูกค้าที่เลือก ผลค้นหา จุดส่ง ระยะจากร้าน) ==========
  // ข้อมูลลูกค้าที่เลือก
  selectedCustomer = computed(() => {
    return this.customers().find((customer) => customer.id === this.selectedId()) ?? null;
  });

  // ค้นหาลูกค้าเก่าจากชื่อหรือเบอร์โทร (แสดงไม่เกิน 6 คน)
  searchResults = computed(() => {
    const text = this.searchText().trim();
    if (text === '') {
      return [];
    }
    const results: CustomerGetResponse[] = [];
    for (const customer of this.customers()) {
      const fullName = customer.first_name + ' ' + customer.last_name;
      if (fullName.includes(text) || customer.phone.includes(text)) {
        results.push(customer);
      }
    }
    return results.slice(0, 6);
  });

  // จุดส่งที่แสดงบนแผนที่
  deliveryPoint = computed(() => {
    // กรณีส่งที่อื่น ใช้จุดที่คลิกเลือกบนแผนที่
    if (this.otherPlace()) {
      const lat = this.lat();
      const lng = this.lng();
      if (lat === null || lng === null) {
        return null;
      }
      return { lat: lat, lng: lng };
    }
    // กรณีส่งที่บ้านลูกค้า ใช้พิกัดของลูกค้า
    const customer = this.selectedCustomer();
    if (customer === null) {
      return null;
    }
    return { lat: Number(customer.latitude), lng: Number(customer.longitude) };
  });

  // ระยะจากร้านถึงจุดส่ง (กม.) ยังไม่มีจุดส่ง = null
  shopDistance = computed(() => {
    const point = this.deliveryPoint();
    return point ? this.api.shopKm(point) : null;
  });

  // ========== ส่วนที่ 3: เลือกลูกค้า และจุดส่ง ==========
  ngOnInit() {
    this.selectedId.set(this.customerId());
  }

  chooseCustomer(customer: CustomerGetResponse) {
    this.selectedId.set(customer.id);
    this.searchText.set('');
  }

  // เปิด/ปิด "ส่งที่อื่น" ตอนเปิดให้เริ่มจากที่อยู่ของลูกค้าก่อน แล้วค่อยแก้
  toggleOtherPlace() {
    this.otherPlace.set(!this.otherPlace());
    const customer = this.selectedCustomer();
    if (this.otherPlace() && customer) {
      this.address.set(customer.address);
      this.lat.set(Number(customer.latitude));
      this.lng.set(Number(customer.longitude));
    }
  }

  // คลิกแผนที่ -> ตั้งเป็นจุดส่ง (เฉพาะตอนเลือก "ส่งที่อื่น")
  pickLocation(point: LatLng) {
    if (this.otherPlace()) {
      this.lat.set(point.lat);
      this.lng.set(point.lng);
    }
  }

  // ========== ส่วนที่ 4: บันทึก (POST /orders) ==========
  async save() {
    const customer = this.selectedCustomer();
    if (customer === null) {
      this.notify.error('กรุณาเลือกลูกค้าก่อน');
      return;
    }

    // ส่งเฉพาะข้อมูลที่จำเป็น ที่อยู่/พิกัด backend จะใช้ของลูกค้าให้เอง
    const data: OrderPostRequest = {
      customer_id: customer.id,
      quantity: this.quantity(),
      unit_price: this.unitPrice(),
      delivery_date: this.deliveryDate(),
      note: this.note().trim() || null,
    };

    // ถ้าส่งที่อื่น ต้องส่งที่อยู่และพิกัดไปด้วย
    if (this.otherPlace()) {
      if (this.address().trim() === '' || this.lat() === null || this.lng() === null) {
        this.notify.error('กรุณากรอกที่อยู่จัดส่ง และกดบนแผนที่ตรงจุดที่จะไปส่ง');
        return;
      }
      data.delivery_address = this.address().trim();
      data.delivery_latitude = this.lat()!;
      data.delivery_longitude = this.lng()!;
    }

    // จุดส่งต้องอยู่ในเขตส่ง 3 กม. จากร้าน
    const km = this.shopDistance();
    if (km !== null && km > this.api.MAX_KM) {
      this.notify.error(`จุดส่งอยู่ห่างร้าน ${km.toFixed(1)} กม. เกินเขตส่ง ${this.api.MAX_KM} กม. ร้านส่งไม่ถึง`);
      return;
    }

    this.saving.set(true);
    try {
      const res = await this.ordersApi.add(data); // POST /orders
      this.notify.success(`เพิ่มออเดอร์ ID ${res.last_idx} ของ ${customer.first_name} แล้ว`);
      this.saved.emit();
    } catch (err) {
      this.notify.apiError(err, 'เพิ่มออเดอร์ไม่สำเร็จ');
    }
    this.saving.set(false);
  }
}
