// @vitest-environment jsdom
import { ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ZENMANAGE_STATE_KEY, buildBootstrapPayload } from '@zenmanage/angular';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from '../src/app.component';
import { appConfig } from '../src/app.config';
import { installFakeApi } from './fakeApi';
import { CLIENT_KEY, LIVE_FLAGS, holdNetwork, read } from './fixtures';

// What the server's render read, as the page would have received it. It differs from every
// default in the app, and from the live values in `welcome-text`, `api-timeout-ms`, `ui-config`
// and the variant name, so replacing the server's values with live ones can be seen.
const SERVER_VALUES = {
  'new-checkout': true,
  'beta-banner': false,
  'checkout-flow': 'stepper',
  'pricing-layout': 'annual',
  'welcome-text': 'Hello from the server',
  'api-timeout-ms': 1234,
  'ui-config': { theme: 'sepia', pageSize: 25 },
  'beta-page': true,
};

let app: ApplicationRef | undefined;

afterEach(() => {
  app?.destroy();
  app = undefined;
  document.body.innerHTML = '';
});

describe('starting from the server payload, from the packed package', () => {
  it('renders the server values on the first render, then the live ones', async () => {
    installFakeApi(LIVE_FLAGS);
    // Rules can't load until released, so anything on screen before then came from the payload.
    const release = holdNetwork();

    // What Angular's server render writes into the page: TransferState under its own key.
    const payload = buildBootstrapPayload(SERVER_VALUES);
    document.body.innerHTML = `<app-root></app-root>
      <script id="ng-state" type="application/json">${JSON.stringify({
        [ZENMANAGE_STATE_KEY]: payload,
      })}</script>`;

    app = await bootstrapApplication(
      AppComponent,
      appConfig({ environmentToken: CLIENT_KEY, enableUsageReporting: false })
    );
    const root = document.querySelector('app-root') as HTMLElement;

    expect(read(root, 'welcome')).toBe('Hello from the server');
    expect(read(root, 'timeout')).toBe('1234');
    expect(read(root, 'config')).toBe('sepia/25');
    expect(read(root, 'variant')).toBe('stepper');
    expect(read(root, 'checkout')).toBe('New checkout');
    expect(read(root, 'banner')).toBe('No banner');
    expect(read(root, 'flow')).toBe('Streamlined flow');
    expect(read(root, 'pricing')).toBe('Other pricing');
    expect(root.textContent).not.toContain('Loading');

    // Still the server's, however long the rules take.
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(read(root, 'welcome')).toBe('Hello from the server');

    release();
    await vi.waitFor(() => expect(read(root, 'welcome')).toBe('Welcome back'), { timeout: 3000 });

    expect(read(root, 'timeout')).toBe('2500');
    expect(read(root, 'config')).toBe('dark/50');
    expect(read(root, 'variant')).toBe('one-page');
    expect(root.textContent).not.toContain('Loading');
  });

  it('renders the defaults on the first render when there is no payload', async () => {
    installFakeApi(LIVE_FLAGS);
    const release = holdNetwork();
    document.body.innerHTML = '<app-root></app-root>';

    app = await bootstrapApplication(
      AppComponent,
      appConfig({ environmentToken: CLIENT_KEY, enableUsageReporting: false })
    );
    const root = document.querySelector('app-root') as HTMLElement;

    expect(read(root, 'welcome')).toBe('Welcome');
    expect(read(root, 'checkout')).toBe('Loading');

    release();
    await vi.waitFor(() => expect(read(root, 'welcome')).toBe('Welcome back'), { timeout: 3000 });
  });
});
