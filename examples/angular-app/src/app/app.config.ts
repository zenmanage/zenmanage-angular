import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZenmanage } from '@zenmanage/angular';
import { appRoutes } from './app.routes';

// The browser's configuration: a client key (cli_...).
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideZenmanage({
      environmentToken: 'cli_your_client_key_here',
      cacheTtl: 300,
    }),
  ],
};
