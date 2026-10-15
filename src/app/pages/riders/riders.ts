import { Component, computed, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMotorcycle, faPen, faPhone, faTrash, faUserPlus } from '@fortawesome/free-solid-svg-icons';
// ชื่อ class ซ้ำกับ component นี้ (Riders) จึงตั้งชื่อใหม่ว่า RidersApi
import { Riders as RidersApi } from '../../services/api/riders';
import { RiderGetResponse } from '../../model/rider';
import { Notify } from '../../services/notify';
import { RiderForm } from './rider-form/rider-form';

// หน้าจัดการข้อมูลไรเดอร์ (เฉพาะเจ้าของร้าน)
@Component({
  selector: 'app-riders',
  imports: [FontAwesomeModule, RiderForm],
  templateUrl: './riders.html',
  styleUrl: './riders.css',
})
export class Riders {
  ridersApi = inject(RidersApi);
  notify = inject(Notify);

  faUserPlus = faUserPlus;
  faPen = faPen;
  faTrash = faTrash;
  faPhone = faPhone;
  faMotorcycle = faMotorcycle;

  riders = signal<RiderGetResponse[]>([]);
  loading = signal(true);
  activeCount = computed(() => this.riders().filter((r) => r.is_active === 1).length);

  // ฟอร์มเพิ่ม / แก้ไข
  formOpen = signal(false);
  editingRider = signal<RiderGetResponse | null>(null); // null = เพิ่มใหม่

  ngOnInit() {
    this.loadRiders();
  }

  // GET /riders โหลดไรเดอร์ทั้งหมด
  async loadRiders() {
    this.loading.set(true);
    try {
      const res = await this.ridersApi.getAll();
      this.riders.set(res);
    } catch (err) {
      this.notify.apiError(err, 'โหลดข้อมูลไรเดอร์ไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  openAdd() {
    this.editingRider.set(null);
    this.formOpen.set(true);
  }

  openEdit(r: RiderGetResponse) {
    this.editingRider.set(r);
    this.formOpen.set(true);
  }

  // ฟอร์มบันทึกสำเร็จ -> ปิดฟอร์มแล้วโหลดข้อมูลใหม่
  onSaved() {
    this.formOpen.set(false);
    this.loadRiders();
  }

  // เปิด / ปิดการใช้งาน (PUT ส่งแค่ is_active) ไรเดอร์ที่ปิดอยู่จะ login ไม่ได้
  async toggleActive(r: RiderGetResponse) {
    const isActive = r.is_active === 1 ? 0 : 1;
    try {
      await this.ridersApi.update(r.id, { is_active: isActive });
      this.notify.success(`${isActive ? 'เปิด' : 'ปิด'}การใช้งาน ${r.first_name} แล้ว`);
    } catch (err) {
      this.notify.apiError(err, 'เปลี่ยนสถานะไม่สำเร็จ');
    }
    this.loadRiders(); // โหลดใหม่ทั้งสองกรณี ให้สวิตช์ตรงกับข้อมูลจริง
  }

  // DELETE /riders/{id} ลบไรเดอร์
  async remove(r: RiderGetResponse) {
    if (!confirm(`ลบไรเดอร์ ${r.first_name} ${r.last_name} ใช่หรือไม่?`)) {
      return;
    }
    try {
      await this.ridersApi.delete(r.id);
      this.notify.success(`ลบ ${r.first_name} แล้ว`);
      this.loadRiders();
    } catch (err) {
      this.notify.apiError(err, 'ลบไม่สำเร็จ');
    }
  }
}
