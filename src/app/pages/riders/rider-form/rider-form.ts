import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Riders as RidersApi } from '../../../services/api/riders';
import { RiderGetResponse, RiderPostRequest } from '../../../model/rider';
import { Notify } from '../../../services/notify';

// ฟอร์มเพิ่ม / แก้ไขไรเดอร์ (แสดงเป็นกล่อง modal)
// ใช้ในหน้า riders: <app-rider-form [rider]="..." (saved)="..." (closed)="..." />
@Component({
  selector: 'app-rider-form',
  imports: [FormsModule, FontAwesomeModule],
  templateUrl: './rider-form.html',
  styleUrl: './rider-form.css',
})
export class RiderForm {
  ridersApi = inject(RidersApi);
  notify = inject(Notify);

  // ไรเดอร์ที่จะแก้ไข ถ้าเป็น null คือเพิ่มไรเดอร์ใหม่
  rider = input<RiderGetResponse | null>(null);
  saved = output(); // บันทึกสำเร็จ
  closed = output(); // กดปิดฟอร์ม

  faXmark = faXmark;

  // ========== ส่วนที่ 1: ข้อมูลในฟอร์ม ==========
  // ข้อมูลในฟอร์ม (ผูกกับช่องกรอกด้วย [(ngModel)])
  firstName = signal('');
  lastName = signal('');
  phone = signal('');
  licensePlate = signal('');
  password = signal('');
  isActive = signal(true);

  errorMessage = signal('');
  saving = signal(false);

  // ========== ส่วนที่ 2: เปิดฟอร์ม (แก้ไข = ใส่ข้อมูลเดิม) ==========
  ngOnInit() {
    // ถ้าเป็นการแก้ไข ให้นำข้อมูลเดิมมาใส่ในฟอร์ม (รหัสผ่านเว้นว่าง = ไม่เปลี่ยน)
    const rider = this.rider();
    if (rider) {
      this.firstName.set(rider.first_name);
      this.lastName.set(rider.last_name);
      this.phone.set(rider.phone);
      this.licensePlate.set(rider.license_plate ?? '');
      this.isActive.set(rider.is_active === 1);
    }
  }

  // ========== ส่วนที่ 3: ตรวจข้อมูล และบันทึก (POST / PUT /riders) ==========
  // ตรวจข้อมูลก่อนบันทึก ถ้าผิดจะคืนข้อความบอกว่าผิดอะไร ถ้าถูกคืน ''
  validate(): string {
    if (this.firstName().trim() === '') return 'กรุณากรอกชื่อ';
    if (this.lastName().trim() === '') return 'กรุณากรอกนามสกุล';
    // เบอร์โทร: ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0 (ใช้เป็นชื่อผู้ใช้ตอน login)
    if (!/^0[0-9]{8,9}$/.test(this.phone().trim())) return 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0';
    // เพิ่มใหม่ต้องตั้งรหัสผ่าน, แก้ไขจะเว้นว่างก็ได้
    if (this.rider() === null && this.password().length < 6) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว';
    if (this.password() !== '' && this.password().length < 6) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว';
    return '';
  }

  async save() {
    const error = this.validate();
    this.errorMessage.set(error);
    if (error !== '') {
      return;
    }

    // สร้างอ็อบเจ็กต์ข้อมูล เพื่อส่งไปยัง API
    const data: RiderPostRequest = {
      first_name: this.firstName().trim(),
      last_name: this.lastName().trim(),
      phone: this.phone().trim(),
      license_plate: this.licensePlate().trim() || null, // ไม่กรอกทะเบียน ส่งเป็น null
      password: this.password(),
      is_active: this.isActive() ? 1 : 0,
    };

    this.saving.set(true);
    try {
      const rider = this.rider();
      if (rider === null) {
        await this.ridersApi.add(data); // POST /riders
        this.notify.success(`เพิ่มไรเดอร์ ${data.first_name} แล้ว`);
      } else {
        await this.ridersApi.update(rider.id, data); // PUT /riders/{id}
        this.notify.success(`บันทึกข้อมูล ${data.first_name} แล้ว`);
      }
      this.saved.emit();
    } catch (err: any) {
      // 409 = เบอร์โทรซ้ำกับคนที่มีอยู่แล้ว
      if (err?.status === 409) {
        this.errorMessage.set('เบอร์โทรนี้มีในระบบแล้ว');
      } else {
        this.notify.apiError(err, 'บันทึกไม่สำเร็จ');
      }
    }
    this.saving.set(false);
  }
}
