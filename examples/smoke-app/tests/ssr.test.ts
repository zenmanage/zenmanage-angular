// @vitest-environment node
import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { ZENMANAGE_STATE_KEY } from '@zenmanage/angular';
import { describe, expect, it } from 'vitest';
import { AppComponent } from '../src/app.component';
import { appConfig } from '../src/app.config';
import { installFakeApi } from './fakeApi';
import { LIVE_FLAGS, SERVER_KEY } from './fixtures';

const DOCUMENT = '<!doctype html><html><head></head><body><app-root></app-root></body></html>';

async function render(url = '/'): Promise<string> {
  const config = mergeApplicationConfig(
    appConfig({ environmentToken: SERVER_KEY, enableUsageReporting: false }),
    { providers: [provideServerRendering()] }
  );

  return renderApplication((context) => bootstrapApplication(AppComponent, config, context), {
    document: DOCUMENT,
    url,
  });
}

/** Reads what Angular serialized into `<script id="ng-state">`, undoing its HTML escaping. */
function transferState(html: string): Record<string, unknown> {
  const match = /<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/.exec(html);

  if (!match) {
    throw new Error('No ng-state script in the rendered HTML');
  }

  const json = match[1]
    .replace(/&q;/g, '"')
    .replace(/&s;/g, "'")
    .replace(/&l;/g, '<')
    .replace(/&g;/g, '>')
    .replace(/&a;/g, '&');

  return JSON.parse(json) as Record<string, unknown>;
}

/** The visible text of the element marked `data-test`, by finding it in the markup without a parser. */
function textOf(html: string, id: string): string {
  const marker = html.indexOf(`data-test="${id}"`);
  const open = marker === -1 ? -1 : html.lastIndexOf('<', marker);
  const tag = open === -1 ? '' : (/^<(\w+)/.exec(html.slice(open))?.[1] ?? '');
  const start = tag ? html.indexOf('>', marker) + 1 : 0;
  const end = tag ? html.indexOf(`</${tag}>`, start) : -1;

  if (end === -1) {
    throw new Error(`No element with data-test="${id}" in the rendered HTML`);
  }

  return html
    .slice(start, end)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('server rendering, from the packed package', () => {
  it('renders the real values, not the defaults, and not the loading state', async () => {
    installFakeApi(LIVE_FLAGS);

    const html = await render();

    expect(textOf(html, 'status')).toBe('ready');
    expect(textOf(html, 'welcome')).toBe('Welcome back');
    expect(textOf(html, 'timeout')).toBe('2500');
    expect(textOf(html, 'config')).toBe('dark/50');
    expect(textOf(html, 'beta')).toBe('beta on');
    expect(textOf(html, 'variant')).toBe('one-page');
    expect(textOf(html, 'checkout')).toBe('New checkout');
    expect(textOf(html, 'banner')).toBe('No banner');
    expect(textOf(html, 'flow')).toBe('Streamlined flow');
    expect(textOf(html, 'pricing')).toBe('Other pricing');
    expect(textOf(html, 'page')).toBe('Home page');
    expect(html).not.toContain('Loading');
  });

  it('serializes the flags the page read into TransferState', async () => {
    installFakeApi(LIVE_FLAGS);

    const html = await render();
    const payload = transferState(html)[ZENMANAGE_STATE_KEY] as {
      version: number;
      generatedAt: string;
      flags: Record<string, unknown>;
      context?: unknown;
    };

    expect(payload.version).toBe(1);
    expect(Number.isNaN(Date.parse(payload.generatedAt))).toBe(false);
    expect(payload.flags).toEqual({
      'welcome-text': 'Welcome back',
      'api-timeout-ms': 2500,
      'ui-config': { theme: 'dark', pageSize: 50 },
      'beta-page': true,
      'checkout-flow': 'one-page',
      'new-checkout': true,
      'beta-banner': false,
      'pricing-layout': 'annual',
    });
    // The evaluation context only travels when asked for.
    expect(payload.context).toBeUndefined();
  });

  it('never puts the server key in the page', async () => {
    installFakeApi(LIVE_FLAGS);

    const html = await render();

    expect(html).not.toContain(SERVER_KEY);
    expect(html).not.toContain('srv_');
  });

  it('follows a guard on the server: a route behind an off flag redirects', async () => {
    installFakeApi(LIVE_FLAGS);

    const labs = await render('/labs');
    const beta = await render('/beta');

    expect(textOf(labs, 'page')).toBe('Home page');
    expect(textOf(beta, 'page')).toBe('Beta page');
  });
});
