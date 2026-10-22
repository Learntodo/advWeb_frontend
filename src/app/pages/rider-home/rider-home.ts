import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBowlRice, faCircleCheck, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Auth } from '../../services/auth';
import { DeliveryRoutes as RoutesApi } from '../../services/api/routes';
import { JobSheet } from '../../model/route';
import { Notify } from '../../services/notify';
import { thaiDate, today } from '../../utils/format';

// หน้าแรกของไรเดอร์ (เปิดผ่านมือถือ) แสดงใบงานของตัวเองวันนี้ กดเปิดได้เลย ไม่ต้องพิมพ์เลขใบงาน
@Component({
  selector: 'app-rider-home',
  imports: [FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './rider-home.html',
  styleUrl: './rider-home.css',
})
export class RiderHome {
  auth = inject(Auth);
  router = inject(Router);
  routesApi = inject(RoutesApi);
  notify = inject(Notify);

  faClipboardList = faClipboardList;
  faBowlRice = faBowlRice;
  faCircleCheck = faCircleCheck;

  thaiDate = thaiDate;
  todayDate = today();

  jobs = signal<JobSheet[]>([]); // ใบงานของฉันวันนี้
  loading = signal(true);
  codeText = signal(''); // เลขใบงานที่พิมพ์ (กรณีร้านบอกเลขมา)
  errorMessage = signal('');

  ngOnInit() {
    this.load();
  }

  // GET /jobs?date=วันนี้ ใบงานที่ร้านแจกให้ฉัน
  async load() {
    this.loading.set(true);
    try {
      this.jobs.set(await this.routesApi.myJobs(this.todayDate));
    } catch (err) {
      this.notify.apiError(err, 'โหลดใบงานไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  // ส่งถึงแล้วกี่จุด
  delivered(job: JobSheet): number {
    return job.stops.filter((s) => s.status === 'delivered').length;
  }

  // กรอกเลขใบงานแล้วกดเปิด -> ไปหน้าใบงาน /job?code=XXXXXXXX
  open() {
    const code = this.codeText().trim();
    if (code === '') {
      this.errorMessage.set('กรุณากรอกเลขใบงานที่ได้จากร้าน');
      return;
    }
    this.router.navigate(['/job'], { queryParams: { code: code } });
  }
}
