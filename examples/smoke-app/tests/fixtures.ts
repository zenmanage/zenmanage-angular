import { vi } from 'vitest';
import { flag } from './fakeApi';

export const CLIENT_KEY = 'cli_smoke_client_key';
export const SERVER_KEY = 'srv_smoke_server_key';

/** What the fake API serves. None of it equals a default anywhere in the app. */
export const LIVE_FLAGS = [
  flag('new-checkout', true),
  flag('beta-banner', false),
  flag('checkout-flow', 'one-page'),
  flag('pricing-layout', 'annual'),
  flag('welcome-text', 'Welcome back'),
  flag('api-timeout-ms', 2500),
  flag('ui-config', { theme: 'dark', pageSize: 50 }),
  flag('beta-page', true),
  flag('labs-page', false),
  flag('lazy-page', false),
];

/** The text of the element marked `data-test="<id>"`. */
export function read(root: ParentNode, id: string): string {
  const element = root.querySelector(`[data-test="${id}"]`);

  if (!element) {
    throw new Error(`No element with data-test="${id}"`);
  }

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Holds every network request until the returned function is called. Call after installFakeApi(). */
export function holdNetwork(): () => void {
  const network = globalThis.fetch;
  let release!: () => void;
  const open = new Promise<void>((resolve) => {
    release = resolve;
  });

  vi.stubGlobal('fetch', (...args: Parameters<typeof fetch>) => open.then(() => network(...args)));

  return release;
}
