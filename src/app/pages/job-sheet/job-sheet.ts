import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBowlRice,
  faCircleCheck,
  faClipboardList,
  faHouse,
  faLocationArrow,
  faMapLocationDot,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { DeliveryRoutes as RoutesApi } from '../../services/api/routes';
import { JobSheet as JobSheetData, RouteStop } from '../../model/route';
import { LatLng, MapLine, MapMarker, MapView } from '../../components/map-view/map-view';
import { Road } from '../../services/road';
import { Notify } from '../../services/notify';
import { Auth } from '../../services/auth';
import { googleMapsLink, googleMapsRouteLink, thaiDate } from '../../utils/format';

// หน้าใบงานของไรเดอร์ (เปิดในมือถือ ไม่ต้อง login) กรอกเลขใบงานที่ได้จากร้าน
// เปิดลิงก์ /job?code=XXXXXXXX ได้ใบงานทันที, ไรเดอร์เจ้าของใบงานที่ login อยู่ กด "ส่งถึงแล้ว" ได้ทีละจุด
@Component({
  selector: 'app-job-sheet',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView],
  templateUrl: './job-sheet.html',
  styleUrl: './job-sheet.css',
})
export class JobSheet {
  routesApi = inject(RoutesApi);
  notify = inject(Notify);
  router = inject(Router);
  auth = inject(Auth);
  road = inject(Road);

  // ?code=XXXXXXXX จากลิงก์
  code = input<string>();

  faClipboardList = faClipboardList;
  faBowlRice = faBowlRice;
  faPhone = faPhone;
  faLocationArrow = faLocationArrow;
  faMapLocationDot = faMapLocationDot;
  faHouse = faHouse;
  faCircleCheck = faCircleCheck;

  thaiDate = thaiDate;
  googleMapsLink = googleMapsLink;

  codeText = signal(''); // เลขใบงานที่พิมพ์
  job = signal<JobSheetData | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  saving = signal<number | null>(null); // รหัสออเดอร์ที่กำลังบันทึกว่าส่งแล้ว
  roadLegs = signal<LatLng[][] | null>(null); // เส้นตามถนนจริงแยกเป็นช่วง (null = ยังโหลดไม่เสร็จ)
  roadFailed = signal(false); // โหลดเส้นถนนไม่ได้ -> วาดเส้นตรงแทน

  // กด "ส่งถึงแล้ว" ได้ไหม: ต้อง login เป็นไรเดอร์เจ้าของใบงาน หรือเจ้าของร้าน
  canDeliver = computed(() => {
    const user = this.auth.user();
    const job = this.job();
    if (!user || !job) return false;
    return user.role === 'owner' || job.rider?.id === user.id;
  });

  // ส่งถึงแล้วกี่จุด
  deliveredCount = computed(() => (this.job()?.stops ?? []).filter((s) => s.status === 'delivered').length);

  // ลิงก์ Google Maps ทั้งเส้นทาง: ร้าน -> จุด 1 -> จุด 2 -> ... -> กลับร้าน
  routeLink = computed(() => {
    const job = this.job();
    if (!job) return '';
    const points = [job.shop];
    for (const s of job.stops) {
      points.push({ lat: s.latitude, lng: s.longitude });
    }
    points.push(job.shop);
    return googleMapsRouteLink(points);
  });

  // แผนที่เล็ก: หมุดจุดส่งตามลำดับ และเส้นทาง
  markers = computed(() => {
    const markers: MapMarker[] = [];
    for (const s of this.job()?.stops ?? []) {
      markers.push({
        id: s.order_id,
        lat: s.latitude,
        lng: s.longitude,
        label: String(s.seq),
        color: s.status === 'delivered' ? '#16a34a' : '#dc2626',
        popup: `บ้านที่ ${s.seq} ${s.first_name} ${s.last_name}\n${s.quantity} กล่อง`,
      });
    }
    return markers;
  });

  // จุดที่วิ่งผ่าน: ร้าน -> จุดส่งตามลำดับ
  stopPoints = computed(() => {
    const job = this.job();
    if (!job) return [];
    const points: LatLng[] = [job.shop];
    for (const s of job.stops) {
      points.push({ lat: s.latitude, lng: s.longitude });
    }
    return points;
  });

  // เส้นทางบนแผนที่ ตามถนนจริง (รอโหลดเสร็จก่อนค่อยวาด, โหลดไม่ได้ จึงวาดเส้นตรง)
  // แยกเป็นช่วง แผนที่จะค่อยๆ วาดทีละช่วง ร้าน -> จุด 1 -> จุด 2 ... พร้อมลูกศรบอกทิศ
  lines = computed(() => {
    if (!this.job()) return [];
    const legs = this.roadLegs() ?? (this.roadFailed() ? this.road.straight(this.stopPoints()) : null);
    if (!legs) return [];
    return legs.map((leg, i) => {
      const line: MapLine = { points: leg, color: '#dc2626', step: i + 1 };
      return line;
    });
  });

  ngOnInit() {
    const code = this.code();
    if (code) {
      this.codeText.set(code);
      this.open();
    }
  }

  // GET /jobs/{code} เปิดใบงาน
  async open() {
    const code = this.codeText().trim();
    if (code === '') {
      this.errorMessage.set('กรุณากรอกเลขใบงาน');
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      const job = await this.routesApi.job(code);
      this.job.set(job);
      this.roadLegs.set(null);
      this.roadFailed.set(false);
      this.road.paths([this.stopPoints()]).then((lines) => {
        if (lines) this.roadLegs.set(lines[0] as LatLng[][]);
        else this.roadFailed.set(true);
      });
      // ใส่เลขใบงานใน URL ไว้ กดรีเฟรชแล้วยังอยู่หน้าเดิม
      this.router.navigate([], { queryParams: { code: job.code }, replaceUrl: true });
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 429)) {
        this.errorMessage.set(err.error?.error ?? 'ไม่พบใบงาน');
      } else {
        this.notify.apiError(err, 'เปิดใบงานไม่สำเร็จ');
      }
    }
    this.loading.set(false);
  }

  // PUT /jobs/{code}/stops/{orderId} กด "ส่งถึงแล้ว" (delivered = false คือกดผิด ย้อนกลับ)
  async markDelivered(s: RouteStop, delivered: boolean) {
    const job = this.job();
    if (!job) return;
    this.saving.set(s.order_id);
    try {
      await this.routesApi.markDelivered(job.code, s.order_id, delivered);
      // อัปเดตสถานะในหน้าเลย ไม่ต้องโหลดใหม่ทั้งใบ
      const status = delivered ? 'delivered' : 'delivering';
      this.job.set({ ...job, stops: job.stops.map((x) => (x.order_id === s.order_id ? { ...x, status: status } : x)) });
      if (delivered) this.notify.success(`บันทึกแล้ว: ส่งถึงคุณ${s.first_name} เรียบร้อย`);
    } catch (err) {
      this.notify.apiError(err, 'บันทึกไม่สำเร็จ');
    }
    this.saving.set(null);
  }

  // กลับไปกรอกเลขใบงานใหม่
  reset() {
    this.job.set(null);
    this.codeText.set('');
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
