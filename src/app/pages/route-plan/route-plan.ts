import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowsRotate,
  faCheck,
  faCircleCheck,
  faClipboardList,
  faCopy,
  faEye,
  faMotorcycle,
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
@Component({
  selector: 'app-route-plan',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView],
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
  faTrash = faTrash;
  faEye = faEye;
  faClipboardList = faClipboardList;
  faCopy = faCopy;
  faMotorcycle = faMotorcycle;
  faCircleCheck = faCircleCheck;
  faTriangleExclamation = faTriangleExclamation;

  baht = baht;
  thaiDate = thaiDate;

  date = signal(today()); // วันที่ส่ง
  plans = signal<PlanInfo[]>([]); // แผนที่ระบบเสนอ (ยังไม่บันทึก)
  selected = signal(0); // แผนที่เลือกดูอยู่
  round = signal(0); // ครั้งที่กดคำนวณใหม่
  saved = signal<SavedPlanResponse | null>(null); // ใบงานที่บันทึกแล้วของวันนี้
  riders = signal<RiderGetResponse[]>([]); // ไรเดอร์ที่เปิดใช้งาน (ใช้เลือกคนรับใบงาน)
  onlyRoute = signal<number | null>(null); // ดูเฉพาะเที่ยวเดียว (null = ดูทุกเที่ยว)
  loading = signal(true);
  working = signal(false);
  roadDistance = signal(true); // true = ระยะทางของแผนคิดตามถนนจริง
  roadPaths = signal<Record<string, LatLng[]>>({}); // เส้นตามถนนจริงที่โหลดมาแล้ว (ชื่อเส้น -> พิกัดตลอดเส้น)
  roadFailed = signal(false); // โหลดเส้นถนนไม่ได้ -> วาดเส้นตรงแทน
  requested = new Set<string>(); // แผนที่ขอเส้นถนนไปแล้ว (ไม่ขอซ้ำ)

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

  // ไรเดอร์เริ่มส่งของแล้ว (ส่งถึงลูกค้าอย่างน้อย 1 จุด) -> ยกเลิก / จัดใหม่ / เปลี่ยนคนไม่ได้
  locked = computed(() => (this.saved()?.delivered ?? 0) > 0);

  // ส่งครบทุกออเดอร์แล้ว
  allDelivered = computed(() => {
    const saved = this.saved();
    return !!saved && saved.orders > 0 && saved.delivered === saved.orders;
  });

  // ออเดอร์ที่ต้องจัดเส้นทาง (ยังไม่ได้จัด = รอส่งทั้งหมด, จัดแล้ว = ในใบงาน + ที่รับเพิ่มมา)
  orderCount = computed(() => {
    const saved = this.saved();
    return saved ? saved.orders + saved.waiting : 0;
  });

  // ไรเดอร์ที่ต้องใช้อย่างน้อย (คนละไม่เกิน 3 ออเดอร์)
  ridersNeeded = computed(() => Math.ceil(this.orderCount() / MAX_ORDERS));

  // ไรเดอร์ที่เปิดใช้งานอยู่
  ridersAvailable = computed(() => this.saved()?.riders_available ?? 0);

  // เส้นถนนของแผนที่แสดงอยู่โหลดครบหรือยัง (ยังไม่ครบ = แสดงคำว่า "กำลังวาดเส้นทาง")
  drawing = computed(() => {
    const plan = this.current();
    if (!plan || this.roadFailed()) return false;
    const paths = this.roadPaths();
    return plan.routes.some((r) => !paths[this.road.key(this.stopPoints(r))]);
  });

  // เส้นที่แสดงบนแผนที่ (ร้าน -> จุด 1 -> จุด 2 -> ...) ตามถนนจริง
  // วาดเมื่อได้เส้นถนนครบแล้วเท่านั้น (ไม่วาดเส้นตรงก่อน) ถ้าโหลดเส้นถนนไม่ได้ จึงวาดเป็นเส้นตรง
  lines = computed(() => {
    const lines: MapLine[] = [];
    if (this.drawing()) return lines;
    const paths = this.roadPaths();
    for (const r of this.visibleRoutes()) {
      const points = this.stopPoints(r);
      lines.push({ points: paths[this.road.key(points)] ?? points, color: this.color(r) });
    }
    return lines;
  });

  // หมุดจุดส่ง (ตัวเลขในหมุด = ลำดับที่ส่งในเที่ยวนั้น)
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
            `เที่ยวที่ ${r.route_no} จุดที่ ${s.seq}${r.rider ? ' · ' + r.rider.first_name : ''}\n` +
            `ลูกค้า #${s.customer_id} ${s.first_name} ${s.last_name} · ${s.quantity} กล่อง\n` +
            `ออเดอร์ #${s.order_id} · ถึงประมาณ ${s.eta} น.`,
        });
      }
    }
    return markers;
  });

  // เที่ยวที่แสดงบนแผนที่ (ทุกเที่ยว หรือเฉพาะเที่ยวที่เลือก)
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
        const add: Record<string, LatLng[]> = {};
        trips.forEach((t, i) => (add[this.road.key(t)] = lines[i] as LatLng[]));
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

  // POST /routes ยืนยันแผนที่เลือก -> ได้เลขใบงาน และแจกให้ไรเดอร์แต่ละคน
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
      this.notify.apiError(err, 'ออกใบงานไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // PUT /routes/{id} เปลี่ยนไรเดอร์ของใบงาน (คนที่เลือกมีใบงานอยู่แล้ว จะสลับใบงานกัน)
  async changeRider(r: RouteInfo, riderId: string) {
    if (!r.id) return;
    this.working.set(true);
    try {
      await this.routesApi.changeRider(r.id, Number(riderId));
      this.notify.success(`เปลี่ยนไรเดอร์ของเที่ยวที่ ${r.route_no} แล้ว`);
    } catch (err) {
      this.notify.apiError(err, 'เปลี่ยนไรเดอร์ไม่สำเร็จ');
    }
    await this.loadSaved();
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
    } catch (err) {
      this.notify.apiError(err, 'ยกเลิกใบงานไม่สำเร็จ');
    }
    await this.loadSaved();
    this.working.set(false);
  }
}
