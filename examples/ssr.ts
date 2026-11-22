import { mergeApplicationConfig, type ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideZenmanage } from '@zenmanage/angular';

// app.config.ts: what runs in the browser. A client key (cli_...) is safe to ship.
export const appConfig: ApplicationConfig = {
  providers: [provideZenmanage({ environmentToken: 'cli_your_client_key_here' })],
};

// app.config.server.ts: what runs on the server. A server key (srv_...) must stay out of the
// browser bundle, so read it from the environment here and nowhere else.
//
// The server evaluates the flags while it renders, waits for them, and hands the values the
// page read to the browser through TransferState. The browser's first render matches the
// server's HTML, then replaces the values with its own once its rules have loaded.
export const serverConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(),
    provideZenmanage({ environmentToken: process.env['ZENMANAGE_SERVER_KEY'] ?? '' }),
  ],
});
