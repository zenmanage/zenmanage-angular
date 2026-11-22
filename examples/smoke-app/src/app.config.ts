import { provideZonelessChangeDetection, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZenmanage, type ZenmanageAngularOptions } from '@zenmanage/angular';
import { routes } from './app.routes';

/** What a real app puts in app.config.ts. The key comes from the caller so tests can pick one. */
export function appConfig(zenmanage: ZenmanageAngularOptions): ApplicationConfig {
  return {
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      provideZenmanage(zenmanage),
    ],
  };
}
