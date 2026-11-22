import { TransferState, signal } from '@angular/core';
import { Attribute, Context } from '@zenmanage/sdk';
import { describe, expect, it, vi } from 'vitest';
import { buildBootstrapPayload } from '../src/lib/bootstrap';
import { injectFlag, injectVariant } from '../src/lib/inject-flag';
import { ZENMANAGE_STATE_KEY } from '../src/lib/tokens';
import type { BootstrapPayload } from '../src/lib/types';
import { flag, installFakeApi } from './fakeApi';
import { mount, service, untilLoaded } from './helpers';

const rules = [{ clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true }];

function transferred(payload: BootstrapPayload | unknown) {
  return {
    provide: TransferState,
    useFactory: () => {
      const state = new TransferState();
      state.set(ZENMANAGE_STATE_KEY, payload as BootstrapPayload);
      return state;
    },
  };
}

// What the server's HTML shows: values that differ from every default used below.
const fromServer = buildBootstrapPayload({
  promo: true,
  mode: 'stepper',
  timeout: 1500,
  ui: { theme: 'dark' },
});

describe('starting from what the server rendered', () => {
  it('shows the server values on the very first render, then the live ones once the rules load', async () => {
    installFakeApi([
      flag('promo', false),
      flag('mode', 'one-page'),
      flag('timeout', 2500),
      flag('ui', { theme: 'light' }),
    ]);

    const { fixture, result } = mount(
      () => ({
        promo: injectFlag('promo', false),
        mode: injectVariant('mode', 'control'),
        timeout: injectFlag('timeout', 0),
        ui: injectFlag('ui', { theme: 'plain' }),
      }),
      {},
      [transferred(fromServer)]
    );

    // No flash of the default: the server's answers are there before anything has loaded.
    expect(result.promo.value()).toBe(true);
    expect(result.mode.variant()).toBe('stepper');
    expect(result.timeout.value()).toBe(1500);
    expect(result.ui.value()).toEqual({ theme: 'dark' });
    expect(result.promo.isLoading()).toBe(false);
    expect(service().bootstrap?.flags['mode']).toBe('stepper');

    // The browser's own evaluation takes over once its rules are in.
    await untilLoaded(fixture, result.promo);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(result.promo.value()).toBe(false);
    });
    expect(result.mode.variant()).toBe('one-page');
    expect(result.timeout.value()).toBe(2500);
    expect(result.ui.value()).toEqual({ theme: 'light' });
  });

  it('keeps the server values when the rules never load', async () => {
    installFakeApi([flag('promo', false)]).goOffline();

    const { fixture, result } = mount(() => injectFlag('promo', false), {}, [
      transferred(fromServer),
    ]);
    await service().whenReady();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(result.value()).toBe(true);
    expect(result.isLoading()).toBe(false);
  });

  it('ignores a server value of another type than the default', async () => {
    installFakeApi([flag('timeout', 2500)]);

    const { result } = mount(() => injectFlag('timeout', 'seconds'), {}, [transferred(fromServer)]);

    // 1500 is a number and the default is a string, so it is not this flag's seed.
    expect(result.value()).toBe('seconds');
    expect(result.isLoading()).toBe(true);
  });

  it('treats an object and an array default as different kinds', () => {
    installFakeApi([]);

    const { result } = mount(() => injectFlag<number[]>('ui', []), {}, [transferred(fromServer)]);

    expect(result.value()).toEqual([]);
  });

  it('does not seed a flag the server did not read', async () => {
    installFakeApi([flag('other', true)]);

    const { result } = mount(() => injectFlag('other', false), {}, [transferred(fromServer)]);

    expect(result.value()).toBe(false);
    expect(result.isLoading()).toBe(true);
  });

  it('does not seed a helper that has a context of its own', async () => {
    installFakeApi([flag('promo', false)]);
    const own = Context.single('user', 'u-1');

    const { result } = mount(() => injectFlag('promo', false, { context: own }), {}, [
      transferred(fromServer),
    ]);

    expect(result.value()).toBe(false);
    expect(result.isLoading()).toBe(true);
  });

  it('uses the server values as the defaults when the rules cannot load', async () => {
    installFakeApi([]).goOffline();

    const { fixture } = mount(() => injectFlag('promo', false), {}, [transferred(fromServer)]);
    await service().whenReady();
    fixture.detectChanges();

    expect((await service().getFlag('mode')).asString()).toBe('stepper');
  });

  it('evaluates for the context the server sent, when there is no context option', async () => {
    installFakeApi([flag('beta', false, rules as never)]);
    const pro = Context.single('user', 'u-1');
    pro.addAttribute(new Attribute('plan', ['pro']));
    const payload = buildBootstrapPayload({}, { context: pro });

    mount(() => undefined, {}, [transferred(payload)]);

    expect(service().context()?.toJSON()).toEqual(pro.toJSON());
    expect(await service().isEnabled('beta')).toBe(true);
  });

  it('prefers the context option over the one the server sent', async () => {
    installFakeApi([flag('beta', false, rules as never)]);
    const pro = Context.single('user', 'u-1');
    pro.addAttribute(new Attribute('plan', ['pro']));
    const free = Context.single('user', 'u-2');
    free.addAttribute(new Attribute('plan', ['free']));

    mount(() => undefined, { context: free }, [
      transferred(buildBootstrapPayload({}, { context: pro })),
    ]);

    expect(await service().isEnabled('beta')).toBe(false);
  });

  it('does not seed once the context changes: the server answered for another user', async () => {
    installFakeApi([flag('promo', false)]);
    const context = signal<Context | undefined>(undefined);

    const { fixture, result } = mount(() => injectFlag('promo', false), { context }, [
      transferred(fromServer),
    ]);
    expect(result.value()).toBe(true);

    context.set(Context.single('user', 'someone-else'));
    fixture.detectChanges();

    expect(result.value()).toBe(false);
    expect(result.isLoading()).toBe(true);
  });

  it('ignores a payload that is not a version 1 payload', () => {
    installFakeApi([flag('promo', false)]);

    const { result } = mount(() => injectFlag('promo', false), {}, [
      transferred({ version: 9, flags: { promo: true } }),
    ]);

    expect(service().bootstrap).toBeNull();
    expect(result.value()).toBe(false);
  });

  it('takes the payload from the bootstrap option instead of TransferState', () => {
    installFakeApi([flag('promo', false)]);

    const given = mount(() => injectFlag('promo', false), { bootstrap: fromServer });
    expect(given.result.value()).toBe(true);
  });

  it('skips TransferState with null, or when transferState is off', () => {
    installFakeApi([flag('promo', false)]);

    const skipped = mount(() => injectFlag('promo', false), { bootstrap: null }, [
      transferred(fromServer),
    ]);

    expect(skipped.result.value()).toBe(false);
    expect(service().bootstrap).toBeNull();
  });

  it('skips TransferState when transferState is off', () => {
    installFakeApi([flag('promo', false)]);

    const off = mount(() => injectFlag('promo', false), { transferState: false }, [
      transferred(fromServer),
    ]);

    expect(off.result.value()).toBe(false);
  });

  it('stops showing the server value once the first evaluation has loaded the rules, with preload off', async () => {
    installFakeApi([flag('promo', false)]);

    const { fixture, result } = mount(() => injectFlag('promo', true), { preload: false }, [
      transferred(fromServer),
    ]);
    expect(result.value()).toBe(true);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(result.value()).toBe(false);
    });
  });

  it("drops the server values as defaults once the context changes: they were another user's answers", async () => {
    installFakeApi([]).goOffline();
    const context = signal<Context | undefined>(undefined);

    mount(() => undefined, { context }, [transferred(fromServer)]);
    expect(service().defaults()?.get('mode')).toBe('stepper');

    context.set(Context.single('user', 'someone-else'));
    expect(service().defaults()?.get('mode')).toBeUndefined();

    context.set(undefined);
    expect(service().defaults()?.get('mode')).toBe('stepper');
  });
});
