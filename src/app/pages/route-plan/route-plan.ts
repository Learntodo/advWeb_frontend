import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowsRotate,
  faCheck,
  faChevronDown,
  faChevronRight,
  faCircleCheck,
  faCopy,
  faEye,
  faMotorcycle,
  faPhone,
  faRoute,
  faTrash,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
// ชื่อ class ซ้ำกับ Routes ของ Angular Router จึงตั้งชื่อใหม่ว่า RoutesApi
import { DeliveryRoutes as RoutesApi } from '../../services/api/routes';
import { Riders as RidersApi } from '../../services/api/riders';
import { PlanInfo, RouteInfo, SavedPlanResponse } from '../../model/route';
import { RiderGetResponse } from '../../model/rider';
import { LatLng, MapLine, MapMarker, MapView } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { Api } from '../../config/api';
import { Road } from '../../services/road';
import { baht, thaiDate, today } from '../../utils/format';

// สีเส้นทางของแต่ละเที่ยว (เที่ยวที่ 1 แดง, 2 เขียว, 3 น้ำเงิน, ...)
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

// ไรเดอร์ 1 คนรับได้ไม่เกิน 3 ออเดอร์
const MAX_ORDERS = 3;

// หน้าจัดเส้นทางส่ง (เจ้าของร้าน): กดจัดเส้นทาง -> ดูแผนบนแผนที่ -> คำนวณใหม่ได้ -> ยืนยันเป็นใบงานของไรเดอร์
// ส่งได้หลายรอบต่อวัน: มีออเดอร์ใหม่เข้ามาหลังออกส่งแล้ว กด "จัดเส้นทางรอบใหม่" ให้ไรเดอร์ที่ว่างรับไป
@Component({
  selector: 'app-route-plan',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView, NgTemplateOutlet],
  templateUrl: './route-plan.html',
  styleUrl: './route-plan.css',
})
export class RoutePlan {
  routesApi = inject(RoutesApi);
  ridersApi = inject(RidersApi);
  notify = inject(Notify);
  api = inject(Api);
  road = inject(Road);

  // ?date=YYYY-MM-DD จากลิงก์ในหน้าจำลองระบบ
  dateQuery = input<string>(undefined, { alias: 'date' });

  faRoute = faRoute;
  faArrowsRotate = faArrowsRotate;
  faCheck = faCheck;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faTrash = faTrash;
  faEye = faEye;
  faCopy = faCopy;
  faMotorcycle = faMotorcycle;
  faPhone = faPhone;
  faCircleCheck = faCircleCheck;
  faTriangleExclamation = faTriangleExclamation;

  baht = baht;
  thaiDate = thaiDate;

  date = signal(today()); // วันที่ส่ง
  plans = signal<PlanInfo[]>([]); // แผนที่ระบบเสนอ (ยังไม่บันทึก)
  selected = signal(0); // แผนที่เลือกดูอยู่
  round = signal(0); // ครั้งที่กดคำนวณใหม่
  saved = signal<SavedPlanResponse | null>(null); // ใบงานทุกรอบที่บันทึกแล้วของวันนี้
  riders = signal<RiderGetResponse[]>([]); // ไรเดอร์ที่เปิดใช้งาน (ใช้เลือกคนรับใบงาน)
  onlyRoute = signal<number | null>(null); // ดูเฉพาะเที่ยวเดียว (null = ดูทุกเที่ยว)
  loading = signal(true);
  working = signal(false);
  roadDistance = signal(true); // true = ระยะทางของแผนคิดตามถนนจริง
  roadPaths = signal<Record<string, LatLng[][]>>({}); // เส้นตามถนนจริงที่โหลดมาแล้ว (ชื่อเส้น -> พิกัดตลอดเส้นของแต่ละช่วง)
  roadFailed = signal(false); // โหลดเส้นถนนไม่ได้ -> วาดเส้นตรงแทน
  requested = new Set<string>(); // แผนที่ขอเส้นถนนไปแล้ว (ไม่ขอซ้ำ)
  openRounds = signal<Record<string, boolean>>({}); // รอบที่ผู้ใช้กดพับ / กางเอง (เวลาออกส่ง -> กางอยู่ไหม)

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

  // ส่งครบทุกออเดอร์แล้ว และไม่มีออเดอร์ใหม่รอจัด
  allDelivered = computed(() => {
    const saved = this.saved();
    return !!saved && saved.orders > 0 && saved.delivered === saved.orders && saved.waiting === 0;
  });

  // ใบงานที่ออกส่งแล้ว จัดกลุ่มตามรอบ (เวลาออกส่งเดียวกัน = รอบเดียวกัน) เรียงจากรอบแรก
  rounds = computed(() => {
    const saved = this.saved();
    const groups: { start_time: string; routes: RouteInfo[]; orders: number; delivered: number }[] = [];
    if (!saved) return groups;
    for (const r of saved.routes) {
      const start = r.start_time ?? '';
      let group = groups.find((g) => g.start_time === start);
      if (!group) {
        group = { start_time: start, routes: [], orders: 0, delivered: 0 };
        groups.push(group);
      }
      group.routes.push(r);
      group.orders = group.orders + r.stops.length;
      group.delivered = group.delivered + this.deliveredOf(r);
    }
    return groups.sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // รหัสออเดอร์นอกเขตส่ง เช่น "#12, #15"
  outsideText = computed(() => (this.saved()?.outside ?? []).map((id) => 'ID ' + id).join(', '));

  // ออเดอร์ที่ต้องจัดเส้นทางรอบใหม่ (ยังไม่อยู่ในใบงาน)
  orderCount = computed(() => this.saved()?.waiting ?? 0);

  // ไรเดอร์ที่ต้องใช้อย่างน้อย (คนละไม่เกิน 3 ออเดอร์)
  ridersNeeded = computed(() => Math.ceil(this.orderCount() / MAX_ORDERS));

  // ไรเดอร์ที่ว่าง (ไม่ได้ถือใบงานที่ยังส่งไม่ครบ)
  ridersAvailable = computed(() => this.saved()?.riders_free ?? 0);

  // เส้นถนนของแผนที่แสดงอยู่โหลดครบหรือยัง (ยังไม่ครบ = แสดงคำว่า "กำลังวาดเส้นทาง")
  drawing = computed(() => {
    const plan = this.current();
    if (!plan || this.roadFailed()) return false;
    const paths = this.roadPaths();
    return plan.routes.some((r) => !paths[this.road.key(this.stopPoints(r))]);
  });

  // เส้นที่แสดงบนแผนที่ ตามถนนจริง แยกเป็นช่วง (ร้าน -> จุด 1, จุด 1 -> จุด 2, ...)
  // แผนที่จะค่อยๆ วาดทีละช่วงตามลำดับ พร้อมลูกศรบอกทิศ ให้รู้ว่าไปจุดไหนก่อน
  // วาดเมื่อได้เส้นถนนครบแล้วเท่านั้น (ไม่วาดเส้นตรงก่อน) ถ้าโหลดเส้นถนนไม่ได้ จึงวาดเป็นเส้นตรง
  lines = computed(() => {
    const lines: MapLine[] = [];
    if (this.drawing()) return lines;
    const paths = this.roadPaths();
    for (const r of this.visibleRoutes()) {
      const points = this.stopPoints(r);
      const legs = paths[this.road.key(points)] ?? this.road.straight(points);
      legs.forEach((leg, i) => lines.push({ points: leg, color: this.color(r), step: i + 1 }));
    }
    return lines;
  });

  // หมุดจุดส่ง (ตัวเลขในหมุด = ลำดับที่ไรเดอร์คนนั้นไปส่ง)
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
          popup:
            `${this.riderLabel(r)} · บ้านที่ ${s.seq}\n` +
            `ลูกค้า ID ${s.customer_id} ${s.first_name} ${s.last_name} · ${s.quantity} กล่อง\n` +
            `ออเดอร์ ID ${s.order_id} · ` +
            (this.isDraft() ? `ถึงใน ${s.minutes} นาที หลังออกจากร้าน` : `ถึงประมาณ ${s.eta} น.`),
        });
      }
    }
    return markers;
  });

  // ชื่อไรเดอร์ที่เลือกดูบนแผนที่ (null = ดูทุกคน)
  onlyLabel = computed(() => {
    const r = this.visibleRoutes().find((x) => x.route_no === this.onlyRoute());
    return r ? this.riderLabel(r) : null;
  });

  // ใบงานที่แสดงบนแผนที่ (ทุกคน หรือเฉพาะคนที่เลือก)
  visibleRoutes = computed(() => {
    const plan = this.current();
    if (!plan) return [];
    const only = this.onlyRoute();
    return plan.routes.filter((r) => only === null || r.route_no === only);
  });

  constructor() {
    // แผนที่แสดงเปลี่ยน -> ขอเส้นตามถนนของทุกเที่ยวในแผนครั้งเดียว
    effect(() => {
      const plan = this.current();
      if (!plan) return;
      const trips = plan.routes.map((r) => this.stopPoints(r));
      const key = trips.map((t) => this.road.key(t)).join('|');
      if (this.requested.has(key)) return;
      this.requested.add(key);
      this.roadFailed.set(false);
      this.road.paths(trips).then((lines) => {
        if (lines === null) {
          this.roadFailed.set(true);
          return;
        }
        const add: Record<string, LatLng[][]> = {};
        trips.forEach((t, i) => (add[this.road.key(t)] = lines[i] as LatLng[][]));
        this.roadPaths.update((all) => ({ ...all, ...add }));
      });
    });
  }

  // จุดที่ไรเดอร์วิ่งผ่าน: ร้าน -> จุดส่งตามลำดับ
  stopPoints(r: RouteInfo): LatLng[] {
    const points: LatLng[] = [this.api.SHOP_LOCATION];
    for (const s of r.stops) {
      points.push({ lat: s.latitude, lng: s.longitude });
    }
    return points;
  }

  ngOnInit() {
    const date = this.dateQuery();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.date.set(date);
    }
    this.loadSaved();
  }

  // เวลาสุดท้ายที่ต้องถึงลูกค้า = เวลาออกส่ง + 1 ชั่วโมง
  deadline(start: string | undefined): string {
    if (!start) return '';
    const h = (Number(start.slice(0, 2)) + 1) % 24;
    return String(h).padStart(2, '0') + start.slice(2);
  }

  // ชื่อที่แสดงบนการ์ด: ชื่อไรเดอร์ ถ้ายังไม่มีไรเดอร์ (แผนที่ยังไม่ออกส่ง) ใช้ "ไรเดอร์คนที่ N" ตามลำดับในแผน
  riderLabel(r: RouteInfo): string {
    if (r.rider) return r.rider.first_name + ' ' + r.rider.last_name;
    const index = this.current()?.routes.indexOf(r) ?? -1;
    return 'ไรเดอร์คนที่ ' + (index + 1);
  }

  // จำนวนจุดในใบงานนี้ที่ส่งถึงแล้ว
  deliveredOf(r: RouteInfo): number {
    return r.stops.filter((s) => s.status === 'delivered').length;
  }

  // เที่ยวนี้ส่งครบทุกจุดแล้ว
  routeDone(r: RouteInfo): boolean {
    return this.deliveredOf(r) === r.stops.length;
  }

  // รอบนี้กางอยู่ไหม (ยังไม่เคยกดเอง: รอบที่ยังส่งไม่ครบกางไว้, ส่งครบแล้วพับไว้)
  isOpen(g: { start_time: string; orders: number; delivered: number }): boolean {
    return this.openRounds()[g.start_time] ?? g.delivered < g.orders;
  }

  // กดหัวรอบ -> พับ / กาง
  toggleRound(g: { start_time: string; orders: number; delivered: number }) {
    const open = !this.isOpen(g);
    this.openRounds.update((all) => ({ ...all, [g.start_time]: open }));
  }

  // เที่ยวนี้ไรเดอร์ส่งถึงลูกค้าไปแล้วอย่างน้อย 1 จุด -> ยกเลิก / เปลี่ยนไรเดอร์ไม่ได้
  started(r: RouteInfo): boolean {
    return r.stops.some((s) => s.status === 'delivered');
  }

  // สีของเที่ยวที่ route_no
  color(r: RouteInfo): string {
    return ROUTE_COLORS[(r.route_no - 1) % ROUTE_COLORS.length] as string;
  }

  // ลิงก์ใบงานที่ส่งให้ไรเดอร์เปิดในมือถือ
  jobLink(code: string): string {
    return `${location.origin}/job?code=${code}`;
  }

  // คัดลอกลิงก์ใบงาน ไปวางส่งให้ไรเดอร์ทาง LINE / ข้อความ
  async copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(this.jobLink(code));
      this.notify.success(`คัดลอกลิงก์ใบงาน ${code} แล้ว นำไปวางส่งให้ไรเดอร์ได้เลย`);
    } catch (err) {
      this.notify.error('คัดลอกไม่ได้ ให้บอกเลขใบงาน ' + code + ' กับไรเดอร์แทน');
    }
  }

  // GET /routes?date= โหลดใบงานที่บันทึกแล้ว และ GET /riders รายชื่อไรเดอร์ (ใช้เลือกคนรับใบงาน)
  async loadSaved() {
    this.loading.set(true);
    try {
      const [saved, riders] = await Promise.all([this.routesApi.getSaved(this.date()), this.ridersApi.getAll()]);
      this.saved.set(saved);
      this.riders.set(riders.filter((r) => r.is_active === 1));
    } catch (err) {
      this.notify.apiError(err, 'โหลดใบงานไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // เปลี่ยนวันที่ -> ล้างแผนที่คำนวณไว้ แล้วโหลดใบงานของวันใหม่
  changeDate(value: string) {
    if (!value) return;
    this.date.set(value);
    this.plans.set([]);
    this.onlyRoute.set(null);
    this.loadSaved();
  }

  // ปุ่ม "จัดเส้นทาง" (round = 0) และ "ดูแผนอื่น" (round + 1)
  async calculate(again: boolean) {
    const round = again ? this.round() + 1 : 0;
    this.working.set(true);
    try {
      const res = await this.routesApi.plan(this.date(), round);
      this.plans.set(res.plans);
      this.roadDistance.set(res.road_distance);
      this.selected.set(0);
      this.round.set(round);
      this.onlyRoute.set(null);
    } catch (err) {
      this.notify.apiError(err, 'จัดเส้นทางไม่สำเร็จ');
      await this.loadSaved(); // ข้อมูลอาจเปลี่ยน (เช่น ไรเดอร์ถูกปิด) โหลดสถานะใหม่
    }
    this.working.set(false);
  }

  // เลือกดูแผนที่ index
  selectPlan(index: number) {
    this.selected.set(index);
    this.onlyRoute.set(null);
  }

  // กดการ์ดเที่ยว -> ดูเส้นทางเที่ยวนั้นเที่ยวเดียว กดซ้ำ -> ดูทุกเที่ยว
  toggleRoute(r: RouteInfo) {
    this.onlyRoute.set(this.onlyRoute() === r.route_no ? null : r.route_no);
  }

  // ปุ่ม "ออกส่งเลย" POST /routes ยืนยันแผนที่เลือก -> ได้เลขใบงาน แจกให้ไรเดอร์แต่ละคน
  // เวลาที่กด = เวลาออกจากร้าน ไรเดอร์ต้องส่งถึงทุกจุดภายใน 1 ชั่วโมงหลังจากนี้
  async savePlan() {
    const plan = this.current();
    if (!plan || !this.isDraft()) return;
    const question = `ให้ไรเดอร์ออกจากร้านตอนนี้เลยใช่ไหม?\nต้องส่งให้ถึงลูกค้าทุกบ้านภายใน 1 ชั่วโมง (แผนนี้ใช้เวลา ${plan.finish_minutes} นาที)`;
    if (!confirm(question)) {
      return;
    }
    this.working.set(true);
    try {
      const routes = plan.routes.map((r) => r.order_ids);
      const res = await this.routesApi.save(this.date(), routes);
      this.notify.success(`ออกส่งแล้ว ไรเดอร์ ${res.affected_row} คนได้รับใบงาน`);
      this.plans.set([]);
      await this.loadSaved();
    } catch (err) {
      this.notify.apiError(err, 'ออกส่งไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // PUT /routes/{id} เปลี่ยนไรเดอร์ของใบงาน (คนที่เลือกมีใบงานอยู่แล้ว จะสลับใบงานกัน)
  async changeRider(r: RouteInfo, riderId: string) {
    if (!r.id) return;
    this.working.set(true);
    try {
      await this.routesApi.changeRider(r.id, Number(riderId));
      this.notify.success('เปลี่ยนคนส่งแล้ว');
    } catch (err) {
      this.notify.apiError(err, 'เปลี่ยนไรเดอร์ไม่สำเร็จ');
    }
    await this.loadSaved();
    this.working.set(false);
  }

  // DELETE /routes/{id} ยกเลิกใบงานเที่ยวนี้ ออเดอร์กลับเป็น "รอส่ง" (นำไปจัดรอบใหม่ได้)
  async cancelRoute(r: RouteInfo) {
    if (!r.id) return;
    if (
      !confirm(`ยกเลิกใบงานของ ${this.riderLabel(r)} ใช่หรือไม่?\nออเดอร์ในใบงานนี้จะกลับไปรอส่ง แล้วจัดรอบใหม่ได้`)
    ) {
      return;
    }
    this.working.set(true);
    try {
      await this.routesApi.cancelRoute(r.id);
      this.onlyRoute.set(null);
      this.notify.success(`ยกเลิกใบงานของ ${this.riderLabel(r)} แล้ว`);
    } catch (err) {
      this.notify.apiError(err, 'ยกเลิกใบงานไม่สำเร็จ');
    }
    await this.loadSaved();
    this.working.set(false);
  }
}
