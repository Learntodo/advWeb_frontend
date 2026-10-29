import { Component, computed, effect, inject, signal } from '@angular/core';
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

// สีเส้นทางของแต่ละเที่ยว (เที่ยวแรก แดง, ถัดไป เขียว, น้ำเงิน, ...)
const ROUTE_COLORS = [
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

// รอบที่ออกส่ง 1 รอบ = ใบงานที่กด "ออกส่งเลย" พร้อมกัน (เวลาออกส่งเดียวกัน)
interface Round {
  start_time: string;
  routes: RouteInfo[];
  orders: number; // จำนวนออเดอร์ในรอบนี้
  delivered: number; // ส่งถึงแล้วกี่ออเดอร์
}

// หน้าจัดเส้นทางส่ง (เจ้าของร้าน)
// ขั้นตอน: กด "ให้ระบบจัดเส้นทาง" -> ดูแผนบนแผนที่ (ขอดูแบบอื่นได้) -> กด "ออกส่งเลย" -> ได้ใบงานของไรเดอร์แต่ละคน
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

  // ========== ส่วนที่ 1: ข้อมูลของหน้า ==========
  date = signal(today()); // วันที่ส่ง
  saved = signal<SavedPlanResponse | null>(null); // ใบงานทุกรอบที่ออกส่งแล้วของวันนี้ (จาก GET /routes)
  riders = signal<RiderGetResponse[]>([]); // ไรเดอร์ที่เปิดใช้งาน (ใช้เลือกคนรับใบงาน)
  loading = signal(true); // กำลังโหลดหน้า
  working = signal(false); // กำลังรอ API (ปิดปุ่มไว้ กันกดซ้ำ)

  // แผนที่ระบบเสนอ (จาก POST /routes/plan ยังไม่บันทึก)
  plans = signal<PlanInfo[]>([]); // แผนที่แสดงอยู่ (ครั้งละไม่เกิน 3 แบบ)
  selected = signal(0); // แผนที่เลือกดูอยู่
  seen = signal<string[]>([]); // ชื่อแผนที่ดูไปแล้ว (กด "ขอดูแบบอื่น" จะไม่ได้แบบเดิมซ้ำ)
  firstNo = signal(1); // แผนแรกที่แสดงอยู่เป็นแบบที่เท่าไร
  planTotal = signal(0); // จำนวนแผนทั้งหมดที่ระบบหาได้
  roadDistance = signal(true); // true = ระยะทางของแผนคิดตามถนนจริง

  // การแสดงผล
  onlyRoute = signal<number | null>(null); // ดูเฉพาะเที่ยวเดียว (null = ดูทุกเที่ยว)
  openRounds = signal<Record<string, boolean>>({}); // รอบที่ผู้ใช้กดพับ / กางเอง (เวลาออกส่ง -> กางอยู่ไหม)

  // เส้นตามถนนจริง (โหลดจาก OSRM ผ่าน Road service)
  roadPaths = signal<Record<string, LatLng[][]>>({}); // ชุดจุดของเที่ยว -> เส้นของแต่ละช่วง
  roadFailed = signal(false); // โหลดเส้นถนนไม่ได้ -> วาดเส้นตรงแทน
  requested = new Set<string>(); // แผนที่ขอเส้นถนนไปแล้ว (ไม่ขอซ้ำ)

  // ========== ส่วนที่ 2: สถานะของหน้า (computed) ==========

  // true = กำลังดูแผนที่ระบบเสนอ (ยังไม่ได้ออกส่ง)
  isDraft = computed(() => this.plans().length > 0);

  // แผนที่กำลังแสดง: ถ้ามีแผนที่เพิ่งคำนวณ แสดงแผนนั้น ไม่งั้นแสดงใบงานที่ออกส่งแล้ว
  current = computed<PlanInfo | null>(() => {
    if (this.isDraft()) return this.plans()[this.selected()] ?? null;
    const saved = this.saved();
    return saved && saved.routes.length > 0 ? saved : null;
  });

  // ออเดอร์ที่ต้องจัดเส้นทางรอบใหม่ (ยังไม่อยู่ในใบงาน)
  orderCount = computed(() => this.saved()?.waiting ?? 0);

  // ไรเดอร์ที่ต้องใช้อย่างน้อย (คนละไม่เกิน 3 ออเดอร์)
  ridersNeeded = computed(() => Math.ceil(this.orderCount() / MAX_ORDERS));

  // ไรเดอร์ที่ว่าง (ไม่ได้ถือใบงานที่ยังส่งไม่ครบ)
  ridersAvailable = computed(() => this.saved()?.riders_free ?? 0);

  // ส่งครบทุกออเดอร์แล้ว และไม่มีออเดอร์ใหม่รอจัด
  allDelivered = computed(() => {
    const saved = this.saved();
    return !!saved && saved.orders > 0 && saved.delivered === saved.orders && saved.waiting === 0;
  });

  // รหัสออเดอร์นอกเขตส่ง เช่น "ID 12, ID 15"
  outsideText = computed(() => (this.saved()?.outside ?? []).map((id) => 'ID ' + id).join(', '));

  // ========== ส่วนที่ 3: การ์ดสรุปค่าใช้จ่าย กำไร และเวลา ==========
  summary = computed(() => {
    const plan = this.current();
    if (!plan) return [];
    const time = this.isDraft() ? plan.finish_minutes + ' นาที' : plan.finish_time + ' น.';
    return [
      { label: 'ใช้ไรเดอร์', value: plan.riders + ' คน', late: false },
      { label: this.isDraft() ? 'ใช้เวลาส่ง' : 'ส่งเสร็จประมาณ', value: time, late: plan.late_orders > 0 },
      { label: 'ระยะทางรวม', value: plan.total_km.toFixed(1) + ' กม.', late: false },
      { label: 'ยอดขาย', value: baht(plan.sales), late: false },
      { label: 'ค่าจ้างไรเดอร์', value: baht(plan.rider_cost), late: false },
      { label: plan.profit >= 0 ? 'กำไร' : 'ขาดทุน', value: baht(plan.profit), late: false },
    ];
  });

  // ========== ส่วนที่ 4: ใบงานที่ออกส่งแล้ว แยกตามรอบ ==========

  // จัดกลุ่มใบงานตามเวลาออกส่ง เรียงจากรอบแรก
  rounds = computed(() => {
    const groups: Round[] = [];
    for (const route of this.saved()?.routes ?? []) {
      const start = route.start_time ?? '';
      let group = groups.find((item) => item.start_time === start);
      if (!group) {
        group = { start_time: start, routes: [], orders: 0, delivered: 0 };
        groups.push(group);
      }
      group.routes.push(route);
      group.orders = group.orders + route.stops.length;
      group.delivered = group.delivered + this.deliveredOf(route);
    }
    return groups.sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // รอบนี้กางอยู่ไหม (ยังไม่เคยกดเอง: รอบที่ยังส่งไม่ครบกางไว้, ส่งครบแล้วพับไว้)
  isOpen(group: Round): boolean {
    return this.openRounds()[group.start_time] ?? group.delivered < group.orders;
  }

  // กดหัวรอบ -> พับ / กาง
  toggleRound(group: Round) {
    const open = !this.isOpen(group);
    this.openRounds.update((all) => ({ ...all, [group.start_time]: open }));
  }

  // ========== ส่วนที่ 5: แผนที่ (เส้นทาง และหมุดจุดส่ง) ==========

  // ใบงานที่แสดงบนแผนที่ (ทุกคน หรือเฉพาะคนที่เลือก)
  visibleRoutes = computed(() => {
    const only = this.onlyRoute();
    return (this.current()?.routes ?? []).filter((route) => only === null || route.route_no === only);
  });

  // ชื่อไรเดอร์ที่เลือกดูบนแผนที่ (null = ดูทุกคน)
  onlyLabel = computed(() => {
    const route = this.visibleRoutes().find((item) => item.route_no === this.onlyRoute());
    return route ? this.riderLabel(route) : null;
  });

  // เส้นถนนของแผนที่แสดงอยู่ยังโหลดไม่ครบ (แสดงคำว่า "กำลังวาดเส้นทาง")
  drawing = computed(() => {
    const plan = this.current();
    if (!plan || this.roadFailed()) return false;
    return plan.routes.some((route) => !this.roadPaths()[this.road.key(this.stopPoints(route))]);
  });

  // เส้นบนแผนที่ ตามถนนจริง แยกเป็นช่วง (ร้าน -> จุด 1, จุด 1 -> จุด 2, ...)
  // วาดเมื่อได้เส้นถนนครบแล้วเท่านั้น ถ้าโหลดเส้นถนนไม่ได้ จึงวาดเป็นเส้นตรง
  lines = computed(() => {
    const lines: MapLine[] = [];
    if (this.drawing()) return lines;
    for (const route of this.visibleRoutes()) {
      const points = this.stopPoints(route);
      const legs = this.roadPaths()[this.road.key(points)] ?? this.road.straight(points);
      legs.forEach((leg) => lines.push({ points: leg, color: this.color(route) }));
    }
    return lines;
  });

  // หมุดจุดส่ง (ตัวเลขในหมุด = ลำดับที่ไรเดอร์คนนั้นไปส่ง)
  markers = computed(() => {
    const markers: MapMarker[] = [];
    for (const route of this.visibleRoutes()) {
      for (const stop of route.stops) {
        markers.push({
          id: stop.order_id,
          lat: stop.latitude,
          lng: stop.longitude,
          label: String(stop.seq),
          color: this.color(route),
          popup:
            `${this.riderLabel(route)} · บ้านที่ ${stop.seq}\n` +
            `ลูกค้า ID ${stop.customer_id} ${stop.first_name} ${stop.last_name} · ${stop.quantity} กล่อง\n` +
            `ออเดอร์ ID ${stop.order_id} · ` +
            (this.isDraft() ? `ถึงใน ${stop.minutes} นาที หลังออกจากร้าน` : `ถึงประมาณ ${stop.eta} น.`),
        });
      }
    }
    return markers;
  });

  // แผนที่แสดงเปลี่ยน -> ขอเส้นตามถนนของทุกเที่ยวในแผนครั้งเดียว (แผนเดิมไม่ขอซ้ำ)
  constructor() {
    effect(() => {
      const plan = this.current();
      if (!plan) return;
      const trips = plan.routes.map((route) => this.stopPoints(route));
      const key = trips.map((trip) => this.road.key(trip)).join('|');
      if (this.requested.has(key)) return;
      this.requested.add(key);
      this.roadFailed.set(false);
      this.road.paths(trips).then((paths) => {
        if (paths === null) {
          this.roadFailed.set(true);
          return;
        }
        const newPaths: Record<string, LatLng[][]> = {};
        trips.forEach((trip, i) => (newPaths[this.road.key(trip)] = paths[i] as LatLng[][]));
        this.roadPaths.update((all) => ({ ...all, ...newPaths }));
      });
    });
  }

  // ========== ส่วนที่ 6: ฟังก์ชันช่วยที่ใช้ในหน้าเว็บ ==========

  // จุดที่ไรเดอร์วิ่งผ่าน: ร้าน -> จุดส่งตามลำดับ
  stopPoints(route: RouteInfo): LatLng[] {
    return [this.api.SHOP_LOCATION, ...route.stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }))];
  }

  // สีของเที่ยวนี้ (เลือกจาก ROUTE_COLORS ตาม route_no)
  color(route: RouteInfo): string {
    return ROUTE_COLORS[(route.route_no - 1) % ROUTE_COLORS.length] as string;
  }

  // ชื่อบนการ์ด: ชื่อไรเดอร์ ถ้ายังไม่มีไรเดอร์ (แผนที่ยังไม่ออกส่ง) ใช้ "ไรเดอร์คนที่ N" ตามลำดับในแผน
  riderLabel(route: RouteInfo): string {
    if (route.rider) return route.rider.first_name + ' ' + route.rider.last_name;
    return 'ไรเดอร์คนที่ ' + ((this.current()?.routes.indexOf(route) ?? -1) + 1);
  }

  // จำนวนจุดในใบงานนี้ที่ส่งถึงแล้ว
  deliveredOf(route: RouteInfo): number {
    return route.stops.filter((stop) => stop.status === 'delivered').length;
  }

  // ส่งครบทุกจุดแล้ว
  routeDone(route: RouteInfo): boolean {
    return this.deliveredOf(route) === route.stops.length;
  }

  // ส่งถึงลูกค้าไปแล้วอย่างน้อย 1 จุด -> ยกเลิก / เปลี่ยนไรเดอร์ไม่ได้
  started(route: RouteInfo): boolean {
    return this.deliveredOf(route) > 0;
  }

  // เวลาสุดท้ายที่ต้องถึงลูกค้า = เวลาออกส่ง + 1 ชั่วโมง เช่น "11:05" -> "12:05"
  deadline(start: string): string {
    const hour = (Number(start.slice(0, 2)) + 1) % 24;
    return String(hour).padStart(2, '0') + start.slice(2);
  }

  // ลิงก์ใบงานที่ส่งให้ไรเดอร์เปิดในมือถือ
  jobLink(code: string): string {
    return `${location.origin}/job?code=${code}`;
  }

  // ========== ส่วนที่ 7: โหลดข้อมูล ==========

  // เปิดหน้า: โหลดใบงานของวันนี้
  ngOnInit() {
    this.loadSaved();
  }

  // GET /routes?date= ใบงานที่ออกส่งแล้ว และ GET /riders รายชื่อไรเดอร์ (ใช้เลือกคนรับใบงาน)
  async loadSaved() {
    this.loading.set(true);
    try {
      const [saved, riders] = await Promise.all([this.routesApi.getSaved(this.date()), this.ridersApi.getAll()]);
      this.saved.set(saved);
      this.riders.set(riders.filter((rider) => rider.is_active === 1));
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

  // ========== ส่วนที่ 8: ปุ่มของแผนที่ระบบเสนอ ==========

  // ปุ่ม "ให้ระบบจัดเส้นทาง" (again = false เริ่มดูใหม่) และ "ขอดูแบบอื่น" (again = true ได้ 3 แบบถัดไปที่ไม่ซ้ำ)
  // POST /routes/plan ส่งชื่อแผนที่ดูไปแล้วไปด้วย ถ้าดูครบทุกแบบแล้ว ระบบตอบ restart = true และกลับไปเริ่มที่แบบที่ 1
  async calculate(again: boolean) {
    const seen = again ? this.seen() : [];
    this.working.set(true);
    try {
      const res = await this.routesApi.plan(this.date(), seen);
      if (res.restart) this.notify.success(`ดูครบทั้ง ${res.plan_total} แบบแล้ว กลับมาเริ่มที่แบบที่ 1`);
      const before = res.restart ? [] : seen;
      this.firstNo.set(before.length + 1);
      this.seen.set([...before, ...res.plan_keys]);
      this.planTotal.set(res.plan_total);
      this.plans.set(res.plans);
      this.roadDistance.set(res.road_distance);
      this.selectPlan(0);
    } catch (err) {
      this.notify.apiError(err, 'จัดเส้นทางไม่สำเร็จ');
      await this.loadSaved(); // ข้อมูลอาจเปลี่ยน (เช่น ไรเดอร์ถูกปิด) โหลดสถานะใหม่
    }
    this.working.set(false);
  }

  // กดแท็บ "แบบที่ N" -> ดูแผนนั้น
  selectPlan(index: number) {
    this.selected.set(index);
    this.onlyRoute.set(null);
  }

  // กดการ์ดเที่ยว -> ดูเส้นทางเที่ยวนั้นเที่ยวเดียว กดซ้ำ -> ดูทุกเที่ยว
  toggleRoute(route: RouteInfo) {
    this.onlyRoute.set(this.onlyRoute() === route.route_no ? null : route.route_no);
  }

  // ปุ่ม "ออกส่งเลย" POST /routes ยืนยันแผนที่เลือก -> ได้เลขใบงาน แจกให้ไรเดอร์แต่ละคน
  // เวลาที่กด = เวลาออกจากร้าน ไรเดอร์ต้องส่งถึงทุกจุดภายใน 1 ชั่วโมงหลังจากนี้
  async savePlan() {
    const plan = this.current();
    if (!plan || !this.isDraft()) return;
    const question = `ให้ไรเดอร์ออกจากร้านตอนนี้เลยใช่ไหม?\nต้องส่งให้ถึงลูกค้าทุกบ้านภายใน 1 ชั่วโมง (แผนนี้ใช้เวลา ${plan.finish_minutes} นาที)`;
    if (!confirm(question)) return;
    this.working.set(true);
    try {
      const routes = plan.routes.map((route) => route.order_ids); // รหัสออเดอร์ของแต่ละเที่ยว เรียงตามลำดับส่ง
      const res = await this.routesApi.save(this.date(), routes);
      this.notify.success(`ออกส่งแล้ว ไรเดอร์ ${res.affected_row} คนได้รับใบงาน`);
      this.plans.set([]);
      await this.loadSaved();
    } catch (err) {
      this.notify.apiError(err, 'ออกส่งไม่สำเร็จ');
    }
    this.working.set(false);
  }

  // ========== ส่วนที่ 9: ปุ่มบนใบงานที่ออกส่งแล้ว ==========

  // เลือก "เปลี่ยนคนส่ง" PUT /routes/{id} (คนที่เลือกมีใบงานอยู่แล้ว จะสลับใบงานกัน)
  async changeRider(route: RouteInfo, riderId: string) {
    if (!route.id) return;
    this.working.set(true);
    try {
      await this.routesApi.changeRider(route.id, Number(riderId));
      this.notify.success('เปลี่ยนคนส่งแล้ว');
    } catch (err) {
      this.notify.apiError(err, 'เปลี่ยนไรเดอร์ไม่สำเร็จ');
    }
    await this.loadSaved();
    this.working.set(false);
  }

  // ปุ่ม "ยกเลิกใบงานนี้" DELETE /routes/{id} ออเดอร์กลับเป็น "รอส่ง" (นำไปจัดรอบใหม่ได้)
  async cancelRoute(route: RouteInfo) {
    if (!route.id) return;
    const name = this.riderLabel(route);
    if (!confirm(`ยกเลิกใบงานของ ${name} ใช่หรือไม่?\nออเดอร์ในใบงานนี้จะกลับไปรอส่ง แล้วจัดรอบใหม่ได้`)) return;
    this.working.set(true);
    try {
      await this.routesApi.cancelRoute(route.id);
      this.onlyRoute.set(null);
      this.notify.success(`ยกเลิกใบงานของ ${name} แล้ว`);
    } catch (err) {
      this.notify.apiError(err, 'ยกเลิกใบงานไม่สำเร็จ');
    }
    await this.loadSaved();
    this.working.set(false);
  }

  // ปุ่ม "คัดลอกลิงก์" ลิงก์ใบงาน ไปวางส่งให้ไรเดอร์ทาง LINE / ข้อความ
  async copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(this.jobLink(code));
      this.notify.success(`คัดลอกลิงก์ใบงาน ${code} แล้ว นำไปวางส่งให้ไรเดอร์ได้เลย`);
    } catch (err) {
      this.notify.error('คัดลอกไม่ได้ ให้บอกเลขใบงาน ' + code + ' กับไรเดอร์แทน');
    }
  }
}
