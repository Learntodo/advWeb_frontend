import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLocationDot, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Customers as CustomersApi } from '../../../services/api/customers';
import { CustomerGetResponse } from '../../../model/customer-get-res';
import { CustomerPostRequest } from '../../../model/customer-post-req';
import { MapView, LatLng } from '../../../components/map-view/map-view';
import { Notify } from '../../../services/notify';
import { Api } from '../../../config/api';
import { googleMapsLink } from '../../../utils/format';

// ฟอร์มเพิ่ม / แก้ไขลูกค้า (แสดงเป็นกล่อง modal)
// ใช้ในหน้า customers: <app-customer-form [customer]="..." (saved)="..." (closed)="..." />
@Component({
  selector: 'app-customer-form',
  imports: [FormsModule, FontAwesomeModule, MapView],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.css',
})
export class CustomerForm {
  customersApi = inject(CustomersApi);
  notify = inject(Notify);
  api = inject(Api);

  // ลูกค้าที่จะแก้ไข ถ้าเป็น null คือเพิ่มลูกค้าใหม่
  customer = input<CustomerGetResponse | null>(null);
  saved = output(); // บันทึกสำเร็จ
  closed = output(); // กดปิดฟอร์ม

  faXmark = faXmark;
  faLocationDot = faLocationDot;
  googleMapsLink = googleMapsLink;

  // ข้อมูลในฟอร์ม (ผูกกับช่องกรอกด้วย [(ngModel)])
  firstName = signal('');
  lastName = signal('');
  phone = signal('');
  email = signal('');
  address = signal('');
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);

  errorMessage = signal('');
  saving = signal(false);
  startPoint = signal<LatLng | null>(null); // จุดเริ่มต้นของแผนที่ในฟอร์ม

  // จุดที่เลือกบนแผนที่ (มีค่าเมื่อกรอกพิกัดครบ)
  pickedPoint = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    if (lat === null || lng === null) {
      return null;
    }
    return { lat: lat, lng: lng };
  });

  // ระยะจากร้านถึงบ้าน (กม.) ยังไม่ปักหมุด = null
  shopDistance = computed(() => {
    const point = this.pickedPoint();
    return point ? this.api.shopKm(point) : null;
  });

  ngOnInit() {
    // ถ้าเป็นการแก้ไข ให้นำข้อมูลเดิมมาใส่ในฟอร์ม
    const c = this.customer();
    if (c) {
      this.firstName.set(c.first_name);
      this.lastName.set(c.last_name);
      this.phone.set(c.phone);
      this.email.set(c.email ?? '');
      this.address.set(c.address);
      this.latitude.set(Number(c.latitude));
      this.longitude.set(Number(c.longitude));
      this.startPoint.set({ lat: Number(c.latitude), lng: Number(c.longitude) });
    }
  }

  // คลิกบนแผนที่ -> ตั้งเป็นพิกัดบ้าน
  pickLocation(point: LatLng) {
    this.latitude.set(point.lat);
    this.longitude.set(point.lng);
  }

  // ใช้ตำแหน่ง GPS ของเครื่องเป็นพิกัดบ้าน
  useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        this.pickLocation(point);
        this.startPoint.set(point);
      },
      () => this.notify.error('หาตำแหน่งไม่ได้ ลองกดอนุญาตให้เว็บรู้ตำแหน่งก่อน'),
    );
  }

  // ตรวจข้อมูลก่อนบันทึก ถ้าผิดจะคืนข้อความบอกว่าผิดอะไร ถ้าถูกคืน ''
  validate(): string {
    if (this.firstName().trim() === '') return 'กรุณากรอกชื่อ';
    if (this.lastName().trim() === '') return 'กรุณากรอกนามสกุล';
    // เบอร์โทร: ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0
    if (!/^0[0-9]{8,9}$/.test(this.phone().trim())) return 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0';
    if (this.address().trim() === '') return 'กรุณากรอกที่อยู่';
    if (this.latitude() === null || this.longitude() === null) return 'กรุณากดบนแผนที่ตรงบ้านลูกค้า';
    const km = this.shopDistance() as number;
    if (km > this.api.MAX_KM)
      return `บ้านลูกค้าอยู่ห่างร้าน ${km.toFixed(1)} กม. เกินเขตส่ง ${this.api.MAX_KM} กม. ร้านส่งไม่ถึง`;
    return '';
  }

  async save() {
    const error = this.validate();
    this.errorMessage.set(error);
    if (error !== '') {
      return;
    }

    // สร้างอ็อบเจ็กต์ข้อมูล เพื่อส่งไปยัง API
    const data: CustomerPostRequest = {
      first_name: this.firstName().trim(),
      last_name: this.lastName().trim(),
      phone: this.phone().trim(),
      email: this.email().trim() || null, // ไม่กรอกอีเมล ส่งเป็น null
      address: this.address().trim(),
      latitude: this.latitude()!,
      longitude: this.longitude()!,
    };

    this.saving.set(true);
    try {
      const c = this.customer();
      if (c === null) {
        await this.customersApi.add(data); // POST /customers
        this.notify.success(`เพิ่มลูกค้า ${data.first_name} แล้ว`);
      } else {
        await this.customersApi.update(c.id, data); // PUT /customers/{id}
        this.notify.success(`บันทึกข้อมูล ${data.first_name} แล้ว`);
      }
      this.saved.emit();
    } catch (err) {
      this.notify.apiError(err, 'บันทึกไม่สำเร็จ');
    }
    this.saving.set(false);
  }
}
