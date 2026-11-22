// @vitest-environment node
import '@angular/compiler';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { Attribute, Context } from '@zenmanage/sdk';
import { describe, expect, it } from 'vitest';
import { injectFlag, injectVariant } from '../src/lib/inject-flag';
import { provideZenmanage } from '../src/lib/providers';
import type { ZenmanageAngularOptions } from '../src/lib/types';
import { ZenmanageIfFlagDirective } from '../src/lib/zenmanage-if-flag.directive';
import { ZenmanageIfVariantDirective } from '../src/lib/zenmanage-if-variant.directive';
import { flag, installFakeApi } from './fakeApi';

const SERVER_KEY = 'srv_test_server_key';

// prettier-ignore

@Component({
  selector: 'app-root',
  imports: [ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
  template: `
    <p id="values">{{ mode() }}|{{ timeout() }}|{{ ui().theme }}|{{ missing() }}</p>
    <b *zenmanageIfFlag="'promo'; else: off">promo on</b>
    <ng-template #off><b>promo off</b></ng-template>
    <i *zenmanageIfVariant="'checkout'; is: ['stepper']; else: other">stepper</i>
    <ng-template #other><i>not stepper</i></ng-template>
  `,
})
class Page {
  readonly mode = injectVariant('mode', 'unset').variant;
  readonly timeout = injectFlag('timeout', 0).value;
  readonly ui = injectFlag('ui', { theme: 'light' }).value;
  readonly missing = injectFlag('missing', 'fallback').value;
}

async function render(options: Partial<ZenmanageAngularOptions> = {}): Promise<string> {
  return renderApplication(
    (context) =>
      bootstrapApplication(
        Page,
        {
          providers: [
            provideZonelessChangeDetection(),
            provideServerRendering(),
            provideZenmanage({
              environmentToken: SERVER_KEY,
              enableUsageReporting: false,
              ...options,
            }),
          ],
        },
        context
      ),
    { document: '<html><body><app-root></app-root></body></html>', url: '/' }
  );
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function transferred(html: string): { flags: Record<string, unknown>; context?: unknown } {
  const match = /<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  expect(match).not.toBeNull();
  const state = JSON.parse(match?.[1] ?? '{}') as Record<string, unknown>;

  return state['zenmanage-flags'] as { flags: Record<string, unknown>; context?: unknown };
}

describe('rendering on a server', () => {
  const flags = [
    flag('promo', true),
    flag('mode', 'one-page'),
    flag('timeout', 1500),
    flag('ui', { theme: 'dark' }),
    flag('checkout', 'stepper'),
  ];

  it('waits for the flags, so the HTML carries the real values', async () => {
    installFakeApi(flags);

    const html = await render();

    // Every fallback differs from the live value, so none of them can pass for it.
    expect(visibleText(html)).toBe('one-page|1500|dark|fallback promo on stepper');
  });

  it('hands the flags the page read to the browser through TransferState', async () => {
    installFakeApi(flags);

    const payload = transferred(await render());

    expect(payload.flags).toEqual({
      mode: 'one-page',
      timeout: 1500,
      ui: { theme: 'dark' },
      missing: 'fallback',
      promo: true,
      checkout: 'stepper',
    });
    expect(payload.context).toBeUndefined();
  });

  it('never puts the server key in the page', async () => {
    installFakeApi(flags);

    const html = await render();

    expect(html).not.toContain(SERVER_KEY);
  });

  it('answers with the defaults when the API is unreachable, and transfers those', async () => {
    installFakeApi(flags).goOffline();

    const html = await render();

    expect(visibleText(html)).toBe('unset|0|light|fallback promo off not stepper');
  });

  it('transfers the context only when asked to', async () => {
    installFakeApi(flags);
    const context = Context.single('user', 'u-1');
    context.addAttribute(new Attribute('plan', ['pro']));

    const without = transferred(await render({ context }));
    const withContext = transferred(await render({ context, transferContext: true }));

    expect(without.context).toBeUndefined();
    expect(withContext.context).toMatchObject({ type: 'user', identifier: 'u-1' });
  });

  it('transfers nothing when transferState is off', async () => {
    installFakeApi(flags);

    const html = await render({ transferState: false });

    expect(html).not.toContain('zenmanage-flags');
  });

  it('reads the rules once per request, then reuses them from the shared client', async () => {
    const api = installFakeApi(flags);

    await render();
    await render();

    expect(api.rulesLoads()).toHaveLength(1);
  });
});
