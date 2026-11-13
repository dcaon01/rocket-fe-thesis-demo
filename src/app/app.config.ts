import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor, loadingInterceptor } from './core';
import { crudInterceptor } from './core/interceptors/crud/crud.interceptor';
import { resellerAccessInterceptor } from './core/interceptors/reseller-access/reseller-access.interceptor';
import { environment } from '../environments/environment';
import { CognitoApiConfiguration, CoreApiConfiguration } from '../../libs/api/src';
import { provideEchartsCore } from 'ngx-echarts';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideBrnCalendarI18n } from '@spartan-ng/brain/calendar';
import { provideHlmDateRangePickerConfig } from '@spartan-ng/helm/date-picker';
import { formatItDateRange, IT_CALENDAR_I18N } from './core/constants/it-locale';

// Italian formats for the date, number and currency pipes (1.248,00 €).
registerLocaleData(localeIt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'it' },
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        loadingInterceptor,
        crudInterceptor,
        resellerAccessInterceptor
      ])
    ),
    provideEchartsCore({ echarts: () => import('echarts') }),
    provideNativeDateAdapter(),
    provideBrnCalendarI18n(IT_CALENDAR_I18N),
    provideHlmDateRangePickerConfig<Date>({ formatDates: formatItDateRange }),
    { provide: CoreApiConfiguration, useValue: { rootUrl: environment.apiUrl } },
    { provide: CognitoApiConfiguration, useValue: { rootUrl: environment.apiUrl } }
  ]
};
