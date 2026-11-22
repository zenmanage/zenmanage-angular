import { Component, NgModule, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Zenmanage } from '@zenmanage/sdk';
import { describe, expect, it, vi } from 'vitest';
import { createZenmanageClient } from '../src/lib/client';
import { ZENMANAGE_CLIENT, ZENMANAGE_OPTIONS } from '../src/lib/tokens';
import { ZenmanageModule } from '../src/lib/zenmanage.module';
import { ZenmanageFlagsService } from '../src/lib/zenmanage-flags.service';
import { flag, installFakeApi } from './fakeApi';
import { CLIENT_KEY, configure, render, service, text, until } from './helpers';

describe('provideZenmanage', () => {
  it('builds the client from the environment token and starts loading with the app', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();

    // Nothing has asked for the service yet; the environment initializer creates it.
    TestBed.inject(ZENMANAGE_OPTIONS);

    await service().whenReady();
    expect(api.rulesLoads()).toHaveLength(1);
    expect(TestBed.inject(ZENMANAGE_CLIENT)).toBeInstanceOf(Zenmanage);
  });

  it('starts the load without anyone injecting the service', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();

    TestBed.inject(ZENMANAGE_OPTIONS); // creates the environment injector, and with it the initializer
    await vi.waitFor(() => expect(api.rulesLoads()).toHaveLength(1));
  });

  it('uses the client it is given instead of building one', async () => {
    installFakeApi([flag('promo', true)]);
    const client = createZenmanageClient({ environmentToken: CLIENT_KEY }, false);
    configure({ client, environmentToken: undefined });

    expect(TestBed.inject(ZENMANAGE_CLIENT)).toBe(client);
    expect(service().client).toBe(client);
  });

  it('asks for a token when there is neither a client nor a token', () => {
    configure({ environmentToken: undefined });

    expect(() => TestBed.inject(ZenmanageFlagsService)).toThrow(
      'Zenmanage Angular requires either a client or an environmentToken.'
    );
  });
});

describe('ZenmanageModule.forRoot', () => {
  @Component({
    imports: [ZenmanageModule],
    template: `<span *zenmanageIfFlag="'promo'; else off">on</span
      ><ng-template #off>off</ng-template>`,
  })
  class Host {}

  it('provides the service and exports both directives', async () => {
    installFakeApi([flag('promo', true)]);
    TestBed.configureTestingModule({
      imports: [
        ZenmanageModule.forRoot({ environmentToken: CLIENT_KEY, enableUsageReporting: false }),
      ],
      providers: [provideZonelessChangeDetection()],
    });

    const fixture = render(Host);
    await until(fixture, () => expect(text(fixture)).toBe('on'));
    expect(TestBed.inject(ZenmanageFlagsService)).toBeInstanceOf(ZenmanageFlagsService);
  });

  it('works inside an NgModule application', () => {
    installFakeApi([]);

    @NgModule({
      imports: [
        ZenmanageModule.forRoot({ environmentToken: CLIENT_KEY, enableUsageReporting: false }),
      ],
    })
    class AppModule {}

    TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [provideZonelessChangeDetection()],
    });

    expect(TestBed.inject(ZenmanageFlagsService).isReady()).toBe(false);
  });
});

describe('createZenmanageClient', () => {
  it('builds a client per call in the browser', () => {
    const options = { environmentToken: CLIENT_KEY };

    expect(createZenmanageClient(options, false)).not.toBe(createZenmanageClient(options, false));
  });

  it('shares one client per configuration on a server', () => {
    // The same sharing is checked with a server key in server.test.ts; jsdom only accepts client keys.
    const options = { environmentToken: CLIENT_KEY };

    expect(createZenmanageClient(options, true)).toBe(createZenmanageClient({ ...options }, true));
    expect(createZenmanageClient(options, true)).not.toBe(
      createZenmanageClient({ environmentToken: 'cli_other_key' }, true)
    );
  });
});
