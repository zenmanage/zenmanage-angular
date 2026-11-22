import { ApplicationConfig } from '@angular/core';
import { provideZenmanage } from '@zenmanage/angular';

export const cachingExampleConfig: ApplicationConfig = {
  providers: [
    provideZenmanage({
      environmentToken: 'cli_your_client_key_here',
      cacheTtl: 120,
      enableUsageReporting: true,
      preload: true,
    }),
  ],
};
