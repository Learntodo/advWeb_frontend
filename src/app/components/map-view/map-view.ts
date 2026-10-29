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
}

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

  // ========== ส่วนที่ 1: ข้อมูลที่รับมาจาก component แม่ ==========
  markers = input<MapMarker[]>([]); // หมุดที่จะแสดง
  picked = input<LatLng | null>(null); // จุดที่ผู้ใช้เลือก (แสดงเป็นจุดสีแดง)
  circle = input<MapCircle | null>(null); // วงกลมรัศมี (ซูมให้เห็นทั้งวง)
  zone = input<MapCircle | null>(null); // เขตส่งของร้าน (วงประ ไม่ซูมตาม)
  lines = input<MapLine[]>([]); // เส้นทางวิ่งของไรเดอร์ (แยกสีแต่ละคน)
  focus = input<LatLng | null>(null); // ถ้ามีค่า แผนที่จะเลื่อนไปที่จุดนี้
  autoZoom = input(true); // true = ซูมให้เห็นหมุดทั้งหมด

  // ========== ส่วนที่ 2: เหตุการณ์ที่ส่งกลับไปให้ component แม่ ==========
  mapClick = output<LatLng>(); // คลิกบนแผนที่
  markerClick = output<number>(); // คลิกหมุด (ส่ง id ของหมุด)

  // ========== ส่วนที่ 3: ตัวแผนที่ Leaflet ==========
  mapDiv = viewChild.required<ElementRef<HTMLDivElement>>('map');
  map!: L.Map;
  layer = L.layerGroup(); // เก็บหมุดทั้งหมดไว้ในกลุ่มเดียว ลบแล้ววาดใหม่ได้ง่าย
  ready = signal(false); // แผนที่สร้างเสร็จแล้วหรือยัง
  resizeTimer = 0; // รหัสของ setTimeout (ใช้ยกเลิกตอนปิดแผนที่)

  // ========== ส่วนที่ 4: สร้าง / ปิดแผนที่ ==========
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
    this.map.remove();
  }

  // ========== ส่วนที่ 5: วาดหมุด เส้นทาง และวงกลม ==========
  // ลบทุกอย่างบนแผนที่ แล้ววาดใหม่ทั้งหมด
  draw() {
    this.layer.clearLayers();
    this.drawShop();

    // 0) เส้นทางวิ่ง (วาดก่อนหมุด หมุดจะได้อยู่ด้านบนเส้น)
    const points: L.LatLngExpression[] = [];
    for (const line of this.lines()) {
      const latlngs: L.LatLngExpression[] = line.points.map((point) => [point.lat, point.lng]);
      L.polyline(latlngs, { color: line.color, weight: 5, opacity: 0.85 }).addTo(this.layer);
      for (const point of latlngs) points.push(point);
    }

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
