import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding() ให้รับ path param / query param ด้วย input() ได้
    provideRouter(routes, withComponentInputBinding()),
    // provideHttpClient() ให้เรียกใช้ HttpClient ได้ทั้งแอป
    // withInterceptors แนบตั๋ว JWT ไปกับทุกคำขอให้อัตโนมัติ
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
