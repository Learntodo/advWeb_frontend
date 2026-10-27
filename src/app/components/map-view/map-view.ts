import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Api } from '../../config/api';

// พิกัด 1 จุด
export interface LatLng {
  lat: number;
  lng: number;
}

// หมุด 1 อันบนแผนที่
export interface MapMarker {
  id: number; // รหัสลูกค้า หรือ รหัสออเดอร์ (ส่งกลับตอนคลิกหมุด)
  lat: number;
  lng: number;
  label: string; // ตัวเลขที่แสดงในหมุด
  color: string; // สีหมุด
  popup: string; // ข้อความตอนคลิกหมุด
}

// เส้นทางวิ่ง 1 เส้น (ใช้ในหน้าจัดเส้นทาง / ใบงาน) ลากจากจุดแรกไปจุดสุดท้ายตามลำดับ
export interface MapLine {
  points: LatLng[];
  color: string;
  step?: number; // ลำดับช่วง (1 = ร้าน -> จุด 1, 2 = จุด 1 -> จุด 2, ...) มีค่า = ค่อยๆ วาดทีละช่วงตามลำดับ + มีลูกศรบอกทิศ
}

// เวลาที่ใช้วาดเส้น 1 ช่วง (มิลลิวินาที)
const STEP_MS = 800;

// วงกลมรัศมี (ใช้ในหน้าค้นหาตามระยะ)
export interface MapCircle {
  lat: number;
  lng: number;
  radiusKm: number;
}

// คอมโพเนนต์แผนที่ (Leaflet + OpenStreetMap) ใช้ซ้ำได้ทุกหน้า
// วิธีใช้: <app-map-view [markers]="markers()" (mapClick)="pick($event)"></app-map-view>
@Component({
  selector: 'app-map-view',
  imports: [],
  templateUrl: './map-view.html',
  styleUrl: './map-view.css',
})
export class MapView implements AfterViewInit, OnDestroy {
  api = inject(Api);

  // ---------- ข้อมูลที่รับมาจาก component แม่ ----------
  markers = input<MapMarker[]>([]); // หมุดที่จะแสดง
  picked = input<LatLng | null>(null); // จุดที่ผู้ใช้เลือก (แสดงเป็นจุดสีแดง)
  circle = input<MapCircle | null>(null); // วงกลมรัศมี (ซูมให้เห็นทั้งวง)
  zone = input<MapCircle | null>(null); // เขตส่งของร้าน (วงประ ไม่ซูมตาม)
  lines = input<MapLine[]>([]); // เส้นทางวิ่งของไรเดอร์ (แยกสีแต่ละคน)
  focus = input<LatLng | null>(null); // ถ้ามีค่า แผนที่จะเลื่อนไปที่จุดนี้
  autoZoom = input(true); // true = ซูมให้เห็นหมุดทั้งหมด

  // ---------- เหตุการณ์ที่ส่งกลับไปให้ component แม่ ----------
  mapClick = output<LatLng>(); // คลิกบนแผนที่
  markerClick = output<number>(); // คลิกหมุด (ส่ง id ของหมุด)

  mapDiv = viewChild.required<ElementRef<HTMLDivElement>>('map');
  map!: L.Map;
  layer = L.layerGroup(); // เก็บหมุดทั้งหมดไว้ในกลุ่มเดียว ลบแล้ววาดใหม่ได้ง่าย
  ready = signal(false); // แผนที่สร้างเสร็จแล้วหรือยัง
  resizeTimer = 0; // รหัสของ setTimeout (ใช้ยกเลิกตอนปิดแผนที่)
  animation = 0; // รหัสของ requestAnimationFrame ที่กำลังวาดเส้นทีละช่วง (ใช้ยกเลิกตอนวาดใหม่)

  constructor() {
    // effect จะทำงานใหม่ทุกครั้งที่ input ที่ถูกอ่านข้างใน (markers, picked, circle) เปลี่ยน
    effect(() => {
      if (this.ready()) {
        this.draw();
      }
    });

    // เลื่อนแผนที่ไปยังจุด focus
    effect(() => {
      const point = this.focus();
      if (this.ready() && point) {
        // animate: false = ย้ายทันที ไม่มีแอนิเมชัน (กัน error ถ้าปิดแผนที่ระหว่างกำลังเลื่อน)
        this.map.setView([point.lat, point.lng], 16, { animate: false });
      }
    });
  }

  ngAfterViewInit() {
    const shop = this.api.SHOP_LOCATION;

    // สร้างแผนที่ เริ่มต้นที่ร้าน
    this.map = L.map(this.mapDiv().nativeElement).setView([shop.lat, shop.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.layer.addTo(this.map);

    // คลิกแผนที่ -> ส่งพิกัด (ปัดทศนิยม 6 ตำแหน่ง) กลับไปให้ component แม่
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.mapClick.emit({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    });

    // แผนที่ที่อยู่ในกล่อง modal อาจคำนวณขนาดผิดตอนเปิด จึงสั่งให้คำนวณใหม่อีกครั้ง
    this.resizeTimer = setTimeout(() => this.map.invalidateSize(), 300);

    this.ready.set(true);
  }

  // ปิดหน้า / ปิด modal -> ลบแผนที่ทิ้ง
  ngOnDestroy() {
    clearTimeout(this.resizeTimer);
    cancelAnimationFrame(this.animation);
    this.map.remove();
  }

  // ลบทุกอย่างบนแผนที่ แล้ววาดใหม่ทั้งหมด
  draw() {
    cancelAnimationFrame(this.animation);
    this.layer.clearLayers();
    this.drawShop();

    // 0) เส้นทางวิ่ง (วาดก่อนหมุด หมุดจะได้อยู่ด้านบนเส้น)
    // เส้นที่มีลำดับช่วง เริ่มจากเส้นว่าง แล้วค่อยๆ ยืดออกทีละช่วงใน grow()
    const points: L.LatLngExpression[] = [];
    const growing: { shape: L.Polyline; line: MapLine }[] = [];
    for (const line of this.lines()) {
      const latlngs: L.LatLngExpression[] = line.points.map((point) => [point.lat, point.lng]);
      const shape = L.polyline(line.step ? [] : latlngs, { color: line.color, weight: 5, opacity: 0.85 });
      shape.addTo(this.layer);
      if (line.step) growing.push({ shape: shape, line: line });
      for (const point of latlngs) points.push(point);
    }
    this.grow(growing);

    // 1) หมุดลูกค้า / ออเดอร์
    for (const pin of this.markers()) {
      const marker = L.marker([pin.lat, pin.lng], { icon: this.pinIcon(pin.label, pin.color) });

      // ใช้ innerText เพื่อให้ข้อความแสดงเป็นตัวอักษรธรรมดา (กันโค้ด HTML แปลกปลอมจากข้อมูล)
      const popup = document.createElement('div');
      popup.innerText = pin.popup;
      marker.bindPopup(popup);

      marker.on('click', () => this.markerClick.emit(pin.id));
      marker.addTo(this.layer);
      points.push([pin.lat, pin.lng]);
    }

    // 2) จุดที่ผู้ใช้เลือก (จุดสีแดง)
    const picked = this.picked();
    if (picked) {
      L.circleMarker([picked.lat, picked.lng], {
        radius: 9,
        color: 'white',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
      }).addTo(this.layer);
    }

    // 3) เขตส่งของร้าน (วงประ คลิกทะลุได้ ไม่ขวางการปักหมุด)
    const zone = this.zone();
    if (zone) {
      L.circle([zone.lat, zone.lng], {
        radius: zone.radiusKm * 1000,
        color: '#16a34a',
        weight: 2,
        fill: false,
        dashArray: '8 8',
        interactive: false,
      }).addTo(this.layer);
    }

    // 4) วงกลมรัศมี แล้วซูมให้เห็นทั้งวง
    const circle = this.circle();
    if (circle) {
      const shape = L.circle([circle.lat, circle.lng], {
        radius: circle.radiusKm * 1000, // หน่วยเป็นเมตร
        color: '#c2410c',
        weight: 2,
        fillOpacity: 0.08,
        dashArray: '6 6',
      }).addTo(this.layer);
      this.map.fitBounds(shape.getBounds(), { animate: false });
    }

    // 5) ซูมให้เห็นหมุดทั้งหมด (รวมร้าน)
    if (this.autoZoom() && points.length > 0) {
      const shop = this.api.SHOP_LOCATION;
      points.push([shop.lat, shop.lng]);
      this.map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16, animate: false });
    }
  }

  // ค่อยๆ วาดเส้นทีละช่วง: ช่วงที่ 1 ก่อน (ร้าน -> จุด 1) จบแล้วจึงวาดช่วงที่ 2 ต่อ ...
  // ไรเดอร์ดูแล้วรู้ว่าต้องไปจุดไหนก่อน ช่วงไหนวาดเสร็จแล้วใส่ลูกศรบอกทิศทางวิ่ง
  grow(list: { shape: L.Polyline; line: MapLine }[]) {
    if (list.length === 0) return;
    const done = new Set<L.Polyline>();
    const start = performance.now();
    const frame = (now: number) => {
      const passed = (now - start) / STEP_MS; // วาดผ่านไปแล้วกี่ช่วง (มีเศษ)
      for (const item of list) {
        if (done.has(item.shape)) continue;
        // ช่วงที่ n เริ่มวาดเมื่อผ่านไป n-1 ช่วง ได้ส่วนที่วาดแล้ว 0 ถึง 1
        const part = Math.min(1, Math.max(0, passed - ((item.line.step as number) - 1)));
        item.shape.setLatLngs(this.cut(item.line.points, part));
        if (part >= 1) {
          done.add(item.shape);
          this.drawArrows(item.line);
        }
      }
      if (done.size < list.length) this.animation = requestAnimationFrame(frame);
    };
    this.animation = requestAnimationFrame(frame);
  }

  // ส่วนต้นของเส้น ยาว part (0 ถึง 1) ของความยาวทั้งเส้น
  cut(points: LatLng[], part: number): L.LatLng[] {
    const latlngs = points.map((point) => L.latLng(point.lat, point.lng));
    let total = 0;
    for (let i = 1; i < latlngs.length; i++) {
      total = total + latlngs[i - 1].distanceTo(latlngs[i]); // ความยาวทั้งเส้น (เมตร)
    }
    let left = total * part; // ระยะที่ต้องวาด (เมตร)
    const result: L.LatLng[] = latlngs.slice(0, 1);
    for (let i = 1; i < latlngs.length; i++) {
      const from = latlngs[i - 1];
      const to = latlngs[i];
      const meters = from.distanceTo(to);
      if (meters >= left) {
        // หยุดกลางทางระหว่างจุด a กับ b
        const fraction = meters === 0 ? 1 : left / meters;
        result.push(L.latLng(from.lat + (to.lat - from.lat) * fraction, from.lng + (to.lng - from.lng) * fraction));
        break;
      }
      result.push(to);
      left = left - meters;
    }
    return result;
  }

  // ลูกศรบอกทิศทางวิ่งบนเส้น (ประมาณทุก 160 พิกเซลบนจอ ไม่เกิน 4 อัน ไม่ให้แผนที่รก)
  drawArrows(line: MapLine) {
    const latlngs = line.points.map((point) => L.latLng(point.lat, point.lng));
    const gaps: number[] = [];
    let total = 0;
    let pixels = 0; // ความยาวเส้นบนจอตอนนี้
    for (let i = 1; i < latlngs.length; i++) {
      const meters = latlngs[i - 1].distanceTo(latlngs[i]);
      gaps.push(meters);
      total = total + meters;
      pixels = pixels + this.map.latLngToLayerPoint(latlngs[i - 1]).distanceTo(this.map.latLngToLayerPoint(latlngs[i]));
    }
    if (pixels < 50) return; // เส้นสั้นมากบนจอ ไม่ต้องมีลูกศร
    const count = Math.min(4, Math.max(1, Math.round(pixels / 160)));
    for (let n = 0; n < count; n++) {
      let at = (total * (n + 0.5)) / count; // ตำแหน่งลูกศร (เมตรจากต้นเส้น)
      let i = 0;
      while (i < gaps.length - 1 && at > gaps[i]) {
        at = at - gaps[i];
        i++;
      }
      const from = latlngs[i];
      const to = latlngs[i + 1];
      const fraction = gaps[i] ? at / gaps[i] : 0;
      // มุมของเส้นบนจอ (แปลงพิกัดเป็นจุดบนภาพแผนที่ก่อน มุมจะตรงทุกระดับซูม)
      const pixelFrom = this.map.project(from, 18);
      const pixelTo = this.map.project(to, 18);
      const angle = (Math.atan2(pixelTo.y - pixelFrom.y, pixelTo.x - pixelFrom.x) * 180) / Math.PI;
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-arrow" style="background:${line.color}"><span style="transform:rotate(${angle}deg)">➜</span></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([from.lat + (to.lat - from.lat) * fraction, from.lng + (to.lng - from.lng) * fraction], {
        icon: icon,
        interactive: false,
        zIndexOffset: -1000, // อยู่ใต้หมุดจุดส่ง
      }).addTo(this.layer);
    }
  }

  // หมุดร้าน (สี่เหลี่ยมสีเข้ม)
  drawShop() {
    const shop = this.api.SHOP_LOCATION;
    const icon = L.divIcon({
      className: '',
      html: '<div class="map-shop">🏪</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    L.marker([shop.lat, shop.lng], { icon: icon, zIndexOffset: 1000 })
      .bindPopup('ร้านส่งด่วนมื้อเที่ยง (จุดออกส่ง)')
      .addTo(this.layer);
  }

  // หมุดวงกลมสี มีตัวเลขตรงกลาง (label เป็นตัวเลขที่เราสร้างเอง จึงใส่ใน html ได้)
  pinIcon(label: string, color: string) {
    return L.divIcon({
      className: '',
      html: `<div class="map-pin" style="background:${color}">${label}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }
}
