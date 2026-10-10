import { Component, inject } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faCircleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Notify } from '../../services/notify';

// แสดงข้อความแจ้งเตือนจาก Notify service ที่มุมขวาล่าง
@Component({
  selector: 'app-toast',
  imports: [FontAwesomeModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  notify = inject(Notify);

  faCircleCheck = faCircleCheck;
  faCircleExclamation = faCircleExclamation;
  faXmark = faXmark;
}
