import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBoxOpen,
  faLocationCrosshairs,
  faMagnifyingGlassLocation,
  faStore,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { Customers as CustomersApi } from '../../services/api/customers';
import { Orders as OrdersApi } from '../../services/api/orders';
import { CustomerGetResponse, CustomerNearbyResponse } from '../../model/customer-get-res';
import { OrderNearbyResponse } from '../../model/order-get-res';
import { LatLng, MapMarker, MapView } from '../../components/map-view/map-view';
import { Notify } from '../../services/notify';
import { Api } from '../../config/api';
import { statusBadge, statusColor, statusLabel, thaiDate } from '../../utils/format';

// หน้าค้นหาตามระยะ
// - 2.3 ลูกค้าในระยะ 1 กม. จากพิกัดที่กำหนด
// - 3.3 ออเดอร์ในระยะ 2 กม. จากพิกัดที่กำหนด
@Component({
  selector: 'app-nearby',
  imports: [FormsModule, RouterModule, FontAwesomeModule, MapView],
  templateUrl: './nearby.html',
  styleUrl: './nearby.css',
})
export class Nearby {
  customersApi = inject(CustomersApi);
  ordersApi = inject(OrdersApi);
  notify = inject(Notify);
  api = inject(Api);

  faUsers = faUsers;
  faBoxOpen = faBoxOpen;
  faStore = faStore;
  faLocationCrosshairs = faLocationCrosshairs;
  faMagnifyingGlassLocation = faMagnifyingGlassLocation;

  thaiDate = thaiDate;
  statusLabel = statusLabel;
  statusBadge = statusBadge;

  mode = signal('customers'); // 'customers' = ค้นลูกค้า, 'orders' = ค้นออเดอร์
  lat = signal(this.api.SHOP_LOCATION.lat); // จุดศูนย์กลาง (เริ่มที่ร้าน)
  lng = signal(this.api.SHOP_LOCATION.lng);
  loading = signal(false);

  customerResults = signal<CustomerNearbyResponse[]>([]);
  orderResults = signal<OrderNearbyResponse[]>([]);
  allCustomers = signal<CustomerGetResponse[]>([]); // ใช้หาชื่อลูกค้าของออเดอร์
  focus = signal<LatLng | null>(null);

  // จุดศูนย์กลาง
  center = computed(() => {
    return { lat: this.lat(), lng: this.lng() };
  });

  // วงกลมรัศมี: ลูกค้า 1 กม. / ออเดอร์ 2 กม.
  circle = computed(() => {
    const radiusKm = this.mode() === 'customers' ? 1 : 2;
    return { lat: this.lat(), lng: this.lng(), radiusKm: radiusKm };
  });

  // หมุดบนแผนที่ (ตัวเลข = ID ลูกค้า / ID ออเดอร์ ตรงกับหน้าอื่น)
  markers = computed(() => {
    const markers: MapMarker[] = [];
    if (this.mode() === 'customers') {
      for (const c of this.customerResults()) {
        markers.push({
          id: c.id,
          lat: Number(c.latitude),
          lng: Number(c.longitude),
          label: String(c.id),
          color: '#7c2d12',
          popup: `ลูกค้า ID ${c.id} ${c.first_name} ${c.last_name}\nห่าง ${c.distance_km.toFixed(2)} กม.`,
        });
      }
    } else {
      for (const o of this.orderResults()) {
        markers.push({
          id: o.id,
          lat: Number(o.delivery_latitude),
          lng: Number(o.delivery_longitude),
          label: String(o.id),
          color: statusColor[o.status],
          popup: `ออเดอร์ ID ${o.id} · ลูกค้า ID ${o.customer_id} ${this.customerName(o.customer_id)}\nห่าง ${o.distance_km.toFixed(2)} กม.`,
        });
      }
    }
    return markers;
  });

  // จำนวนกล่องรวมของออเดอร์ที่ค้นเจอ
  totalBoxes = computed(() => {
    let total = 0;
    for (const o of this.orderResults()) {
      total = total + o.quantity;
    }
    return total;
  });

  async ngOnInit() {
    // โหลดรายชื่อลูกค้าไว้ เพราะ API /orders/nearby ไม่ได้ส่งชื่อลูกค้ามา
    try {
      this.allCustomers.set(await this.customersApi.getAll());
    } catch (err) {
      this.notify.apiError(err, 'โหลดข้อมูลลูกค้าไม่สำเร็จ');
    }
    this.search();
  }

  // หาชื่อลูกค้าจากรหัสลูกค้า
  customerName(customerId: number): string {
    const c = this.allCustomers().find((x) => x.id === customerId);
    if (c) {
      return c.first_name + ' ' + c.last_name;
    }
    return 'ลูกค้า ID ' + customerId;
  }

  // สลับแท็บ ลูกค้า / ออเดอร์
  setMode(mode: string) {
    this.mode.set(mode);
    this.search();
  }

  // คลิกแผนที่ -> ใช้เป็นจุดศูนย์กลางแล้วค้นหาใหม่
  pick(point: LatLng) {
    this.lat.set(point.lat);
    this.lng.set(point.lng);
    this.search();
  }

  useShop() {
    this.pick(this.api.SHOP_LOCATION);
  }

  useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.pick({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => this.notify.error('หาตำแหน่งไม่ได้ ลองกดอนุญาตให้เว็บรู้ตำแหน่งก่อน'),
    );
  }

  // เรียก API ค้นหาตามระยะ
  async search() {
    this.loading.set(true);
    try {
      if (this.mode() === 'customers') {
        const res = await this.customersApi.nearby(this.lat(), this.lng()); // GET /customers/nearby
        this.customerResults.set(res);
      } else {
        const res = await this.ordersApi.nearby(this.lat(), this.lng()); // GET /orders/nearby
        this.orderResults.set(res);
      }
    } catch (err) {
      this.notify.apiError(err, 'ค้นหาไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // คลิกรายการ -> เลื่อนแผนที่ไปที่จุดนั้น
  showOnMap(lat: string, lng: string) {
    this.focus.set({ lat: Number(lat), lng: Number(lng) });
  }
}
