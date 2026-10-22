import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, timeout } from 'rxjs';
import { Api } from '../config/api';
import { LatLng } from '../components/map-view/map-view';

// จำนวนจุดสูงสุดต่อคำขอ 1 ครั้ง (เที่ยวเยอะเกิน จะแบ่งขอเป็นหลายครั้ง)
const MAX_POINTS = 90;

// หาเส้นทางตามถนนจริงของหลายเที่ยวพร้อมกัน (ใช้บริการ OSRM) เพื่อวาดเส้นบนแผนที่
// ต่อจุดของทุกเที่ยวเป็นเส้นเดียว ขอครั้งเดียวได้ครบทุกเที่ยว แล้วแยกเส้นออกเป็นของแต่ละเที่ยว
// แต่ละเที่ยวแบ่งเป็นช่วง (ร้าน -> จุด 1, จุด 1 -> จุด 2, ...) ให้หน้าเว็บวาดทีละช่วงตามลำดับได้
// จำเส้นที่เคยขอแล้วไว้ ไม่ต้องขอซ้ำ
@Injectable({
  providedIn: 'root',
})
export class Road {
  http = inject(HttpClient);
  api = inject(Api);

  cache = new Map<string, LatLng[][]>(); // เส้นที่ได้มาแล้ว (ชื่อเส้น -> พิกัดตลอดเส้นของแต่ละช่วง)

  // ข้อความแทนชุดจุด ใช้เป็นชื่อเส้นใน cache
  key(points: LatLng[]): string {
    return points.map((p) => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');
  }

  // เส้นทางตามถนนของทุกเที่ยว (เที่ยวละ: ร้าน -> จุด 1 -> จุด 2 -> ...) ได้ครบทุกเที่ยวพร้อมกัน
  // ผลลัพธ์ของแต่ละเที่ยวเป็นรายการช่วง ช่วงที่ 1 = ร้าน -> จุด 1, ช่วงที่ 2 = จุด 1 -> จุด 2, ...
  // ขอไม่สำเร็จ (เน็ตหลุด / บริการล่ม) คืนค่า null ให้หน้าเว็บวาดเส้นตรงแทน
  async paths(trips: LatLng[][]): Promise<LatLng[][][] | null> {
    // เที่ยวที่ยังไม่มีใน cache แบ่งเป็นกลุ่ม กลุ่มละไม่เกิน MAX_POINTS จุด
    const groups: LatLng[][][] = [];
    let group: LatLng[][] = [];
    let count = 0;
    for (const trip of trips) {
      if (trip.length < 2 || this.cache.has(this.key(trip))) continue;
      if (count + trip.length > MAX_POINTS && group.length > 0) {
        groups.push(group);
        group = [];
        count = 0;
      }
      group.push(trip);
      count = count + trip.length;
    }
    if (group.length > 0) groups.push(group);

    try {
      await Promise.all(groups.map((g) => this.fetch(g)));
    } catch (err) {
      return null;
    }
    return trips.map((trip) => (trip.length < 2 ? [] : (this.cache.get(this.key(trip)) as LatLng[][])));
  }

  // เส้นตรงต่อจุดทีละช่วง (ใช้ตอนโหลดเส้นถนนไม่ได้)
  straight(trip: LatLng[]): LatLng[][] {
    const legs: LatLng[][] = [];
    for (let i = 0; i < trip.length - 1; i++) {
      legs.push([trip[i] as LatLng, trip[i + 1] as LatLng]);
    }
    return legs;
  }

  // ขอเส้นทางของกลุ่มเที่ยวในครั้งเดียว: ต่อจุดเป็น ร้าน A B C ร้าน D E ...
  // ช่วงระหว่างจุดเรียกว่า leg ช่วงที่ย้อนกลับร้านไปเริ่มเที่ยวใหม่ไม่ใช้ (ไม่วาด)
  // continue_straight=false = ให้กลับรถที่จุดส่งได้ ไม่ต้องขับวนรอบซอยเพื่อกลับทางเดิม
  async fetch(trips: LatLng[][]) {
    const all: LatLng[] = [];
    for (const trip of trips) all.push(...trip);
    const url = `${this.api.ROAD_API}/route/v1/driving/${this.key(all)}?overview=false&steps=true&geometries=geojson&continue_straight=false`;
    const res: any = await lastValueFrom(this.http.get(url).pipe(timeout(10000)));
    const legs: any[] = res.routes[0].legs;

    let leg = 0;
    for (const trip of trips) {
      const lines: LatLng[][] = [];
      for (let i = 0; i < trip.length - 1; i++) {
        // เริ่มและจบที่หมุดจริง (OSRM ให้เส้นถึงแค่ถนนที่ใกล้หมุดที่สุด)
        const line: LatLng[] = [trip[i] as LatLng];
        for (const step of legs[leg + i].steps) {
          for (const c of step.geometry.coordinates as number[][]) {
            line.push({ lat: c[1] as number, lng: c[0] as number }); // c = [ลองจิจูด, ละติจูด]
          }
        }
        line.push(trip[i + 1] as LatLng);
        lines.push(line);
      }
      this.cache.set(this.key(trip), lines);
      leg = leg + trip.length; // ข้าม leg ที่ย้อนกลับร้าน
    }
  }
}
