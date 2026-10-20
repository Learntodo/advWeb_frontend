import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowsRotate, faCheck, faClipboardList, faEye, faRoute, faTrash } from '@fortawesome/free-solid-svg-icons';
// ชื่อ class ซ้ำกับ Routes ของ Angular Router จึงตั้งชื่อใหม่ว่า RoutesApi
import { DeliveryRoutes as RoutesApi } from '../../services/api/routes';
import { PlanInfo, RouteInfo, SavedPlanResponse } from '../../model/route';
import { MapLine, MapMarker, MapView } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { Api } from '../../config/api';
import { baht, thaiDate, today } from '../../utils/format';

// สีเส้นทางของไรเดอร์แต่ละคน (คนที่ 1 แดง, 2 เขียว, 3 น้ำเงิน, ...)
export const ROUTE_COLORS = [
  '#dc2626',
  '#16a34a',
  '#2563eb',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#db2777',
  '#854d0e',
  '#4d7c0f',
  '#1e3a8a',
  '#be123c',
  '#0f766e',
  '#7c3aed',
  '#ca8a04',
  '#475569',
];

// หน้าจัดเส้นทางส่ง (เจ้าของร้าน): กดจัดเส้นทาง -> ดูแผนบนแผนที่ -> คำนวณใหม่ได้ -> ยืนยันเป็นใบงาน
@Component({
  selector: 'app-route-plan',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView],
  templateUrl: './route-plan.html',
  styleUrl: './route-plan.css',
})
export class RoutePlan {
  routesApi = inject(RoutesApi);
  notify = inject(Notify);
  api = inject(Api);

  faRoute = faRoute;
  faArrowsRotate = faArrowsRotate;
  faCheck = faCheck;
  faTrash = faTrash;
  faEye = faEye;
  faClipboardList = faClipboardList;

  baht = baht;
  thaiDate = thaiDate;

  date = signal(today()); // วันที่ส่ง
  plans = signal<PlanInfo[]>([]); // แผนที่ระบบเสนอ (ยังไม่บันทึก)
  selected = signal(0); // แผนที่เลือกดูอยู่
  round = signal(0); // ครั้งที่กดคำนวณใหม่
  saved = signal<SavedPlanResponse | null>(null); // ใบงานที่บันทึกแล้วของวันนี้
  onlyRoute = signal<number | null>(null); // ดูเฉพาะไรเดอร์คนเดียว (null = ดูทุกคน)
  loading = signal(true);
  working = signal(false);

  // แผนที่กำลังแสดง: ถ้ามีแผนที่เพิ่งคำนวณ แสดงแผนนั้น ไม่งั้นแสดงใบงานที่บันทึกไว้
  current = computed<PlanInfo | null>(() => {
    if (this.plans().length > 0) {
      return this.plans()[this.selected()] ?? null;
    }
    const saved = this.saved();
    if (saved && saved.routes.length > 0) {
      return saved;
    }
    return null;
  });

  // true = กำลังดูแผนที่ยังไม่ได้บันทึก
  isDraft = computed(() => this.plans().length > 0);

  // เส้นที่แสดงบนแผนที่ (ร้าน -> จุด 1 -> จุด 2 -> ...)
  lines = computed(() => {
    const lines: MapLine[] = [];
    for (const r of this.visibleRoutes()) {
      const points = [this.api.SHOP_LOCATION];
      for (const s of r.stops) {
        points.push({ lat: s.latitude, lng: s.longitude });
      }
      lines.push({ points: points, color: this.color(r) });
    }
    return lines;
  });

  // หมุดจุดส่ง (ตัวเลขในหมุด = ลำดับที่ส่ง)
  markers = computed(() => {
    const markers: MapMarker[] = [];
    for (const r of this.visibleRoutes()) {
      for (const s of r.stops) {
        markers.push({
          id: s.order_id,
          lat: s.latitude,
          lng: s.longitude,
          label: String(s.seq),
          color: this.color(r),
          popup: `ไรเดอร์คนที่ ${r.route_no} จุดที่ ${s.seq}\n${s.first_name} ${s.last_name} · ${s.quantity} กล่อง\nถึงประมาณ ${s.eta} น.`,
        });
      }
    }
    return markers;
  });

  // เที่ยวที่แสดงบนแผนที่ (ทุกคน หรือเฉพาะคนที่เลือก)
  visibleRoutes = computed(() => {
    const plan = this.current();
    if (!plan) return [];
    const only = this.onlyRoute();
    return plan.routes.filter((r) => only === null || r.route_no === only);
  });

  ngOnInit() {
    this.loadSaved();
  }

  // สีของไรเดอร์คนที่ route_no
  color(r: RouteInfo): string {
    return ROUTE_COLORS[(r.route_no - 1) % ROUTE_COLORS.length] as string;
  }

  // ลิงก์ใบงานที่ส่งให้ไรเดอร์เปิดในมือถือ
  jobLink(code: string): string {
    return `${location.origin}/job?code=${code}`;
  }

  // GET /routes?date= โหลดใบงานที่บันทึกแล้ว
  async loadSaved() {
    this.loading.set(true);
    try {
      this.saved.set(await this.routesApi.getSaved(this.date()));
    } catch (err) {
      this.notify.apiError(err, 'โหลดใบงานไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // เปลี่ยนวันที่ -> ล้างแผนที่คำนวณไว้ แล้วโหลดใบงานของวันใหม่
  changeDate(value: string) {
    this.date.set(value);
    this.plans.set([]);
    this.onlyRoute.set(null);
    this.loadSaved();
  }

  // ปุ่ม "จัดเส้นทาง" (round = 0) และ "คำนวณใหม่" (round + 1)
  async calculate(again: boolean) {
    const round = again ? this.round() + 1 : 0;
    this.working.set(true);
    try {
      const res = await this.routesApi.plan(this.date(), round);
      this.plans.set(res.plans);
      this.selected.set(0);
      this.round.set(round);
      this.onlyRoute.set(null);
    } catch (err) {
      this.notify.apiError(err, 'จัดเส้นทางไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // เลือกดูแผนที่ index
  selectPlan(index: number) {
    this.selected.set(index);
    this.onlyRoute.set(null);
  }

  // กดการ์ดไรเดอร์ -> ดูเส้นทางคนนั้นคนเดียว กดซ้ำ -> ดูทุกคน
  toggleRoute(r: RouteInfo) {
    this.onlyRoute.set(this.onlyRoute() === r.route_no ? null : r.route_no);
  }

  // POST /routes ยืนยันแผนที่เลือก -> ได้เลขใบงานของไรเดอร์แต่ละคน
  async savePlan() {
    const plan = this.current();
    if (!plan || !this.isDraft()) return;
    const saved = this.saved();
    if (saved && saved.routes.length > 0) {
      if (!confirm('วันนี้มีใบงานอยู่แล้ว ต้องการแทนที่ด้วยแผนนี้ใช่หรือไม่? (เลขใบงานเดิมจะใช้ไม่ได้)')) {
        return;
      }
    }
    this.working.set(true);
    try {
      const routes = plan.routes.map((r) => r.order_ids);
      const res = await this.routesApi.save(this.date(), routes);
      this.notify.success(`ออกใบงานให้ไรเดอร์ ${res.affected_row} คนแล้ว`);
      this.plans.set([]);
      await this.loadSaved();
    } catch (err) {
      this.notify.apiError(err, 'บันทึกใบงานไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // DELETE /routes?date= ยกเลิกใบงานทั้งหมดของวันนี้
  async cancelSaved() {
    if (!confirm('ยกเลิกใบงานทั้งหมดของวันนี้ใช่หรือไม่? (ออเดอร์จะกลับเป็น "รอส่ง")')) {
      return;
    }
    this.working.set(true);
    try {
      await this.routesApi.deleteSaved(this.date());
      this.notify.success('ยกเลิกใบงานแล้ว');
      await this.loadSaved();
    } catch (err) {
      this.notify.apiError(err, 'ยกเลิกใบงานไม่สำเร็จ');
    }
    this.working.set(false);
  }
}
