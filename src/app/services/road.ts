import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, timeout } from 'rxjs';
import { Api } from '../config/api';
import { LatLng } from '../components/map-view/map-view';

// หาเส้นทางตามถนนจริงผ่านจุดต่างๆ ตามลำดับ (ใช้บริการ OSRM) เพื่อวาดเส้นบนแผนที่
// ขอทีละเส้น (บริการฟรีไม่ให้ขอพร้อมกันเยอะ) และจำเส้นที่เคยขอแล้วไว้ ไม่ต้องขอซ้ำ
@Injectable({
  providedIn: 'root',
})
export class Road {
  http = inject(HttpClient);
  api = inject(Api);

  cache = new Map<string, LatLng[]>(); // เส้นที่ได้มาแล้ว
  queue: Promise<unknown> = Promise.resolve(); // คิวคำขอ (ทำทีละเส้น)

  // ข้อความแทนชุดจุด ใช้เป็นชื่อเส้นใน cache
  key(points: LatLng[]): string {
    return points.map((p) => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');
  }

  // เส้นทางตามถนนผ่านทุกจุดตามลำดับ ได้เป็นรายการพิกัดตลอดเส้น
  // ขอไม่สำเร็จ (เน็ตหลุด / บริการล่ม) คืนค่า null ให้หน้าเว็บวาดเส้นตรงแทน
  path(points: LatLng[]): Promise<LatLng[] | null> {
    const key = this.key(points);
    const saved = this.cache.get(key);
    if (saved) return Promise.resolve(saved);
    const job = this.queue.then(() => this.fetch(key));
    this.queue = job.catch(() => null);
    return job;
  }

  async fetch(key: string): Promise<LatLng[] | null> {
    const saved = this.cache.get(key);
    if (saved) return saved;
    try {
      const url = `${this.api.ROAD_API}/route/v1/driving/${key}?overview=full&geometries=geojson`;
      const res: any = await lastValueFrom(this.http.get(url).pipe(timeout(8000)));
      const coords: number[][] = res.routes[0].geometry.coordinates; // [ลองจิจูด, ละติจูด]
      const line = coords.map((c) => ({ lat: c[1] as number, lng: c[0] as number }));
      this.cache.set(key, line);
      return line;
    } catch (err) {
      return null;
    }
  }
}
