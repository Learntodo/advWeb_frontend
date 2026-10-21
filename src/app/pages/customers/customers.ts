import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCartPlus,
  faFlask,
  faMagnifyingGlass,
  faPen,
  faPhone,
  faTrash,
  faUserPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
// ชื่อ class ซ้ำกับ component นี้ (Customers) จึงตั้งชื่อใหม่ว่า CustomersApi
import { Customers as CustomersApi } from '../../services/api/customers';
import { CustomerGetResponse } from '../../model/customer-get-res';
import { MapMarker, MapView, LatLng } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { Simulate as SimulateApi } from '../../services/api/simulate';
import { CustomerForm } from './customer-form/customer-form';

// หน้าจัดการลูกค้า (HW-5 ข้อ 2)
@Component({
  selector: 'app-customers',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView, CustomerForm],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class Customers {
  customersApi = inject(CustomersApi);
  notify = inject(Notify);
  router = inject(Router);
  simulateApi = inject(SimulateApi);

  // query param ?add=1 ให้เปิดฟอร์มเพิ่มลูกค้าทันที (ส่งมาจากหน้าอื่น)
  add = input<string>();

  faUserPlus = faUserPlus;
  faPen = faPen;
  faTrash = faTrash;
  faMagnifyingGlass = faMagnifyingGlass;
  faXmark = faXmark;
  faPhone = faPhone;
  faCartPlus = faCartPlus;
  faFlask = faFlask;

  allCustomers = signal<CustomerGetResponse[]>([]); // ลูกค้าทั้งหมด
  customers = signal<CustomerGetResponse[]>([]); // ลูกค้าที่แสดงในตาราง (อาจเป็นผลค้นหา)
  loading = signal(true);
  simulating = signal(false); // กำลังจำลองลูกค้า
  keyword = signal(''); // ข้อความในช่องค้นหา
  searchedText = signal(''); // คำที่ค้นหาล่าสุด
  selectedId = signal<number | null>(null); // ลูกค้าที่คลิกเลือก
  focus = signal<LatLng | null>(null); // จุดที่ให้แผนที่เลื่อนไป

  // ฟอร์มเพิ่ม / แก้ไข
  formOpen = signal(false);
  editingCustomer = signal<CustomerGetResponse | null>(null); // null = เพิ่มใหม่

  // สร้างหมุดบนแผนที่จากลูกค้าที่แสดงอยู่
  markers = computed(() => {
    const markers: MapMarker[] = [];
    for (const c of this.customers()) {
      markers.push({
        id: c.id,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        label: String(c.id),
        color: c.id === this.selectedId() ? '#dc2626' : '#7c2d12', // ที่เลือกเป็นสีแดง
        popup: `${c.first_name} ${c.last_name}\n${c.phone}\n${c.address}`,
      });
    }
    return markers;
  });

  ngOnInit() {
    this.loadCustomers();
    if (this.add()) {
      this.openAdd();
    }
  }

  // 2.1 โหลดลูกค้าทั้งหมด
  async loadCustomers() {
    this.loading.set(true);
    try {
      const res = await this.customersApi.getAll();
      this.allCustomers.set(res);
      this.customers.set(res);
      this.searchedText.set('');
      this.keyword.set('');
    } catch (err) {
      this.notify.apiError(err, 'โหลดข้อมูลลูกค้าไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // POST /simulate/customers จำลองลูกค้า 30 คน (ที่อยู่ในระยะ 3 กม. จากร้าน)
  async simulate() {
    this.simulating.set(true);
    try {
      const res = await this.simulateApi.customers(30);
      this.notify.success(`เพิ่มลูกค้าจำลอง ${res.affected_row} คน`);
      await this.loadCustomers();
    } catch (err) {
      this.notify.apiError(err, 'จำลองลูกค้าไม่สำเร็จ');
    }
    this.simulating.set(false);
  }

  // ค้นหาลูกค้า
  // - พิมพ์ตัวเลข = ค้นจากเบอร์โทร (กรองจากข้อมูลที่โหลดมาแล้ว)
  // - พิมพ์ตัวอักษร = 2.2 ค้นจากชื่อ/นามสกุล ผ่าน API /customers/search
  async search() {
    const text = this.keyword().trim();
    this.searchedText.set(text);

    if (text === '') {
      this.customers.set(this.allCustomers());
      return;
    }

    const isPhoneNumber = /^[0-9]+$/.test(text);
    if (isPhoneNumber) {
      const result = this.allCustomers().filter((c) => c.phone.includes(text));
      this.customers.set(result);
      return;
    }

    try {
      const res = await this.customersApi.searchByName(text);
      this.customers.set(res);
    } catch (err) {
      this.notify.apiError(err, 'ค้นหาไม่สำเร็จ');
    }
  }

  clearSearch() {
    this.keyword.set('');
    this.searchedText.set('');
    this.customers.set(this.allCustomers());
  }

  // คลิกแถวในตาราง -> เลื่อนแผนที่ไปที่บ้านลูกค้า
  select(c: CustomerGetResponse) {
    this.selectedId.set(c.id);
    this.focus.set({ lat: Number(c.latitude), lng: Number(c.longitude) });
  }

  // คลิกหมุดบนแผนที่ -> เลือกแถวนั้นในตาราง
  onMarkerClick(id: number) {
    this.selectedId.set(id);
    document.getElementById('customer-' + id)?.scrollIntoView({ block: 'center' });
  }

  openAdd() {
    this.editingCustomer.set(null);
    this.formOpen.set(true);
  }

  openEdit(c: CustomerGetResponse) {
    this.editingCustomer.set(c);
    this.formOpen.set(true);
  }

  // ฟอร์มบันทึกสำเร็จ -> ปิดฟอร์มแล้วโหลดข้อมูลใหม่
  onSaved() {
    this.formOpen.set(false);
    this.loadCustomers();
  }

  // 2.1 ลบลูกค้า
  async remove(c: CustomerGetResponse) {
    if (!confirm(`ลบลูกค้า ${c.first_name} ${c.last_name} ใช่หรือไม่?`)) {
      return;
    }
    try {
      await this.customersApi.delete(c.id);
      this.notify.success(`ลบ ${c.first_name} แล้ว`);
      this.loadCustomers();
    } catch (err) {
      // ถ้าลูกค้ายังมีออเดอร์ ฐานข้อมูลจะไม่ยอมให้ลบ (backend ตอบ 500)
      this.notify.apiError(err, 'ลบไม่ได้ ลูกค้าอาจยังมีออเดอร์อยู่ ให้ลบออเดอร์ก่อน');
    }
  }

  // ไปหน้าออเดอร์ พร้อมส่ง query param ให้เปิดฟอร์มสั่งของลูกค้าคนนี้
  orderFor(c: CustomerGetResponse) {
    this.router.navigate(['/orders'], { queryParams: { customer: c.id } });
  }
}
