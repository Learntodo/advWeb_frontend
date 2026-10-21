import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBowlRice,
  faClipboardList,
  faHouse,
  faLocationArrow,
  faMapLocationDot,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { DeliveryRoutes as RoutesApi } from '../../services/api/routes';
import { JobSheet as JobSheetData } from '../../model/route';
import { LatLng, MapLine, MapMarker, MapView } from '../../components/map-view/map-view';
import { Road } from '../../services/road';
import { Notify } from '../../services/notify';
import { Auth } from '../../services/auth';
import { baht, googleMapsLink, googleMapsRouteLink, thaiDate } from '../../utils/format';

// หน้าใบงานของไรเดอร์ (เปิดในมือถือ ไม่ต้อง login) กรอกเลขใบงานที่ได้จากร้าน
// เปิดลิงก์ /job?code=XXXXXXXX ได้ใบงานทันที
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

  baht = baht;
  thaiDate = thaiDate;
  googleMapsLink = googleMapsLink;

  codeText = signal(''); // เลขใบงานที่พิมพ์
  job = signal<JobSheetData | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  roadLine = signal<LatLng[] | null>(null); // เส้นตามถนนจริง (null = ยังไม่ได้ / โหลดไม่ได้ ใช้เส้นตรง)

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
        color: '#dc2626',
        popup: `จุดที่ ${s.seq} ${s.first_name} ${s.last_name}\n${s.quantity} กล่อง`,
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

  // เส้นทางบนแผนที่ ตามถนนจริง (ระหว่างรอ / โหลดไม่ได้ แสดงเส้นตรง)
  lines = computed(() => {
    if (!this.job()) return [];
    const line: MapLine = { points: this.roadLine() ?? this.stopPoints(), color: '#dc2626' };
    return [line];
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
      this.roadLine.set(null);
      this.road.path(this.stopPoints()).then((line) => this.roadLine.set(line));
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

  // กลับไปกรอกเลขใบงานใหม่
  reset() {
    this.job.set(null);
    this.codeText.set('');
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
