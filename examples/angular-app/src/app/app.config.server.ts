import { mergeApplicationConfig, type ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideZenmanage } from '@zenmanage/angular';
import { appConfig } from './app.config';

// The server's configuration. Providers merged later win, so this server key replaces the
// browser's client key and never reaches the browser bundle.
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideZenmanage({ environmentToken: process.env['ZENMANAGE_SERVER_KEY'] ?? '' }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
