import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Attribute, Context, DefaultsCollection, type FlagManager } from '@zenmanage/sdk';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PACKAGE_VERSION } from '../src/lib/identity';
import { internalsOf } from '../src/lib/internal';
import { flag, installFakeApi } from './fakeApi';
import { injectFlag } from '../src/lib/inject-flag';
import { configure, mount, service, untilLoaded } from './helpers';
import pkg from '../package.json';

const rules = [{ clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true }];

function user(id: string, plan: string): Context {
  const context = Context.single('user', id);
  context.addAttribute(new Attribute('plan', [plan]));
  return context;
}

describe('internals', () => {
  it('refuses an object that is not the service', () => {
    expect(() => internalsOf({})).toThrow('was not created by provideZenmanage()');
  });
});

describe('ZenmanageFlagsService', () => {
  it('preloads at startup and reports ready', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();
    const flags = service();

    expect(flags.isLoading()).toBe(true);
    expect(flags.isReady()).toBe(false);

    await flags.whenReady();

    expect(flags.isLoading()).toBe(false);
    expect(flags.isReady()).toBe(true);
    expect(flags.error()).toBeNull();
    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('does not load when preload is off, and loads on the first evaluation', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure({ preload: false });
    const flags = service();

    expect(flags.isReady()).toBe(true);
    expect(flags.isLoading()).toBe(false);

    expect(await flags.isEnabled('promo')).toBe(true);
    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('identifies itself to the API as zenmanage-angular/<version>', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();

    await service().whenReady();

    // The rules metadata request goes to the Zenmanage API; the rules themselves come from a CDN.
    const agents = api
      .rulesLoads()
      .map((request) => new Headers(request.headers).get('x-zen-client-agent'));
    expect(agents).toEqual([`zenmanage-angular/${PACKAGE_VERSION}`]);
  });

  it('keeps PACKAGE_VERSION in step with package.json', () => {
    // scripts/sync-version.mjs writes it; this fails when someone bumps one without the other.
    expect(PACKAGE_VERSION).toBe(pkg.version);
  });

  it('evaluates typed values, including JSON', async () => {
    installFakeApi([
      flag('promo', true),
      flag('mode', 'one-page'),
      flag('timeout', 1500),
      flag('ui', { theme: 'dark' }),
    ]);
    configure();
    const flags = service();

    expect(await flags.isEnabled('promo')).toBe(true);
    expect(await flags.getVariant('mode')).toBe('one-page');
    expect((await flags.getValue('timeout', 0)).value).toBe(1500);
    expect((await flags.getValue('ui', { theme: 'light' })).value).toEqual({ theme: 'dark' });
    expect((await flags.getValue('promo', false)).flag.getKey()).toBe('promo');
    expect((await flags.getFlag('mode')).asString()).toBe('one-page');
  });

  it('uses the defaults for a flag that does not exist', async () => {
    installFakeApi([]);
    configure();
    const flags = service();

    expect(await flags.isEnabled('missing', true)).toBe(true);
    expect(await flags.getVariant('missing')).toBe('control');
    expect((await flags.getValue('missing', { fallback: true })).value).toEqual({ fallback: true });
  });

  it('evaluates for a context or defaults given with the call', async () => {
    installFakeApi([flag('beta', false, rules as never)]);
    configure();
    const flags = service();

    expect(await flags.isEnabled('beta', false, { context: user('a', 'pro') })).toBe(true);
    expect(await flags.isEnabled('beta', false, { context: user('b', 'free') })).toBe(false);
    // An inline default beats a defaults collection, so none is given here.
    const fromDefaults = await flags.getFlag('nope', undefined, {
      defaults: DefaultsCollection.fromObject({ nope: 'from-defaults' }),
    });
    expect(fromDefaults.asString()).toBe('from-defaults');
  });

  it('waits for the preload instead of fetching the rules again', async () => {
    const api = installFakeApi([flag('a', true), flag('b', true), flag('c', true)]);
    configure();
    const flags = service();

    await Promise.all([flags.isEnabled('a'), flags.isEnabled('b'), flags.isEnabled('c')]);

    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('refresh() re-fetches the rules, bumps the revision and does not set isLoading', async () => {
    const api = installFakeApi([flag('promo', false)]);
    configure();
    const flags = service();
    await flags.whenReady();
    expect(flags.revision()).toBe(0);

    api.setFlags([flag('promo', true)]);
    const refreshing = flags.refresh();
    expect(flags.isLoading()).toBe(false);
    await refreshing;

    expect(flags.revision()).toBe(1);
    expect(api.rulesLoads()).toHaveLength(2);
    expect(await flags.isEnabled('promo')).toBe(true);
  });

  it('preload() loads every flag again', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();
    const flags = service();
    await flags.whenReady();
    const all = vi.spyOn(flags.manager(), 'all');

    await flags.preload();

    // The SDK serves the second read from its cache, so it isn't another API request.
    expect(all).toHaveBeenCalledTimes(1);
    expect(api.rulesLoads()).toHaveLength(1);
    expect(flags.isReady()).toBe(true);
  });

  it('exposes the state as observables too', async () => {
    installFakeApi([flag('promo', true)]);
    configure();
    const flags = service();
    await flags.whenReady();
    TestBed.tick();

    expect(await firstValueFrom(flags.isReady$)).toBe(true);
    expect(await firstValueFrom(flags.isLoading$)).toBe(false);
    expect(await firstValueFrom(flags.error$)).toBeNull();
  });

  describe('when the rules cannot be loaded', () => {
    function failingClient(error: Error) {
      const manager = {
        withDefaults: vi.fn(() => manager),
        withContext: vi.fn(() => manager),
        all: vi.fn(async () => {
          throw error;
        }),
        single: vi.fn(async () => flag),
        refreshRules: vi.fn(async () => {
          throw error;
        }),
      } as unknown as FlagManager;

      return { flags: () => manager } as never;
    }

    it('settles on the defaults, sets the error and calls onError', async () => {
      const onError = vi.fn();
      configure({ client: failingClient(new Error('boom')), onError });
      const flags = service();

      await flags.whenReady();

      expect(flags.isLoading()).toBe(false);
      expect(flags.isReady()).toBe(false);
      expect(flags.error()?.message).toBe('boom');
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    });

    it('preload() and refresh() reject with the error', async () => {
      const onError = vi.fn();
      configure({ client: failingClient(new Error('down')), onError });
      const flags = service();

      await expect(flags.preload()).rejects.toThrow('down');
      await expect(flags.refresh()).rejects.toThrow('down');
      expect(onError).toHaveBeenCalledTimes(3);
      expect(flags.error()?.message).toBe('down');
    });

    it('wraps a thrown value that is not an Error', async () => {
      configure({ client: failingClient('plain string' as never) });
      const flags = service();

      await flags.whenReady();

      expect(flags.error()?.message).toBe('plain string');
    });
  });

  describe('context and defaults', () => {
    it('follows a context signal, and builds the new manager only when the content changes', async () => {
      const api = installFakeApi([flag('beta', false, rules as never)]);
      const context = signal<Context | undefined>(user('a', 'pro'));
      configure({ context });
      const flags = service();
      await flags.whenReady();
      const first = flags.manager();
      expect(await flags.isEnabled('beta')).toBe(true);

      context.set(user('a', 'pro'));
      expect(flags.manager()).toBe(first);

      context.set(user('b', 'free'));
      const second = flags.manager();
      expect(second).not.toBe(first);
      expect(flags.isLoading()).toBe(true);

      expect(await flags.isEnabled('beta')).toBe(false);
      expect(flags.isLoading()).toBe(false);
      expect(api.rulesLoads()).toHaveLength(1);
    });

    it('starts loading the new context without a consumer asking for it', async () => {
      installFakeApi([flag('beta', false, rules as never)]);
      const context = signal<Context | undefined>(user('a', 'pro'));
      configure({ context });
      const flags = service();
      await flags.whenReady();
      const next = user('b', 'free');

      context.set(next);
      expect(flags.isLoading()).toBe(true);
      TestBed.tick();
      await vi.waitFor(() => expect(flags.isLoading()).toBe(false));

      expect(flags.context()).toBe(next);
      expect(flags.isReady()).toBe(true);
    });

    it('takes a plain function for context and defaults', async () => {
      installFakeApi([]);
      configure({
        context: () => user('a', 'pro'),
        defaults: () => DefaultsCollection.fromObject({ x: 'y' }),
      });
      const flags = service();

      expect((await flags.getFlag('x')).asString()).toBe('y');
      expect(flags.defaults()?.get('x')).toBe('y');
    });

    it('ignores a refresh that finishes after the context changed', async () => {
      installFakeApi([flag('promo', true)]);
      const context = signal<Context | undefined>(user('a', 'pro'));
      configure({ context });
      const flags = service();
      await flags.whenReady();

      const refreshing = flags.refresh();
      context.set(user('b', 'free'));
      await refreshing;

      expect(flags.revision()).toBe(0);
    });
  });

  describe('bootstrap payloads', () => {
    it('leaves out flags that were read for a context of their own', async () => {
      installFakeApi([flag('beta', false, rules as never), flag('mode', 'a')]);
      const { fixture, result } = mount(() => ({
        base: injectFlag('beta', true),
        own: injectFlag('beta', false, { context: user('p', 'pro') }),
        mode: injectFlag('mode', 'unset'),
      }));
      await untilLoaded(fixture, result.base, result.own, result.mode);

      expect(result.base.value()).toBe(false);
      expect(result.own.value()).toBe(true);
      // The page's `beta` is the base context's answer, not the override's.
      expect((await service().getBootstrapPayload()).flags).toEqual({ beta: false, mode: 'a' });
    });

    it('covers every flag in the environment when asked for keys', async () => {
      installFakeApi([flag('a', true), flag('b', 'x'), flag('c', 1)]);
      configure();
      const flags = service();

      const payload = await flags.getBootstrapPayload({ keys: ['a', 'c'] });

      expect(payload.version).toBe(1);
      expect(payload.flags).toEqual({ a: true, c: 1 });
      expect(payload.context).toBeUndefined();
    });

    it('defaults to what was read, and includes the context only when asked', async () => {
      installFakeApi([flag('a', true), flag('b', 'x')]);
      configure({ context: user('a', 'pro') });
      const flags = service();

      expect((await flags.getBootstrapPayload()).flags).toEqual({});

      await flags.getValue('b', 'unset');
      const payload = await flags.getBootstrapPayload();
      expect(payload.flags).toEqual({});

      const withContext = await flags.getBootstrapPayload({ includeContext: true, keys: ['b'] });
      expect(withContext.flags).toEqual({ b: 'x' });
      expect(withContext.context).toBeDefined();
    });
  });
});
