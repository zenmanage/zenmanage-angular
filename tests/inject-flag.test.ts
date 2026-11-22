import { signal } from '@angular/core';
import { Attribute, Context, DefaultsCollection } from '@zenmanage/sdk';
import { describe, expect, it } from 'vitest';
import { injectBooleanFlag, injectConfig, injectFlag, injectVariant } from '../src/lib/inject-flag';
import { flag, installFakeApi } from './fakeApi';
import { mount, until, untilLoaded } from './helpers';

// These tests run the helpers against the real @zenmanage/sdk, with only the network faked, so
// they catch drift between this package and the SDK.

describe('injectFlag against the real @zenmanage/sdk', () => {
  it('evaluates boolean, string, number and JSON flags', async () => {
    installFakeApi([
      flag('promo', true),
      flag('mode', 'one-page'),
      flag('timeout', 1500),
      flag('ui', { theme: 'dark', pageSize: 50 }),
      flag('steps', [1, 2, 3]),
    ]);

    const { fixture, result } = mount(() => ({
      promo: injectFlag('promo', false),
      boolean: injectBooleanFlag('promo'),
      mode: injectVariant('mode'),
      timeout: injectFlag('timeout', 1000),
      config: injectConfig('timeout', 1000),
      ui: injectFlag('ui', { theme: 'light', pageSize: 20 }),
      steps: injectFlag<number[]>('steps', []),
    }));
    await untilLoaded(fixture, ...Object.values(result));

    expect(result.promo.value()).toBe(true);
    expect(result.boolean.value()).toBe(true);
    expect(result.mode.variant()).toBe('one-page');
    expect(result.timeout.value()).toBe(1500);
    expect(result.config.value()).toBe(1500);
    expect(result.ui.value()).toEqual({ theme: 'dark', pageSize: 50 });
    expect(result.steps.value()).toEqual([1, 2, 3]);
    expect(result.promo.flag()?.getKey()).toBe('promo');
    expect(result.promo.key()).toBe('promo');
  });

  it('starts from the default, loading, and settles on the flag', async () => {
    installFakeApi([flag('promo', true)]);

    const { fixture, result } = mount(() => injectFlag('promo', false));

    expect(result.value()).toBe(false);
    expect(result.isLoading()).toBe(true);
    expect(result.flag()).toBeNull();

    await untilLoaded(fixture, result);
    expect(result.value()).toBe(true);
    expect(result.error()).toBeNull();
  });

  it('loads the rules once for every consumer, not once per consumer', async () => {
    const api = installFakeApi([flag('a', true), flag('b', 'x'), flag('c', 3)]);

    const { fixture, result } = mount(() => [
      injectFlag('a', false),
      injectFlag('b', ''),
      injectFlag('c', 0),
      injectFlag('a', false),
    ]);
    await untilLoaded(fixture, ...result);

    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('answers with the default for a flag that does not exist, without an error', async () => {
    installFakeApi([flag('promo', true)]);

    const { fixture, result } = mount(() => injectFlag('nope', 'fallback'));
    await untilLoaded(fixture, result);

    expect(result.value()).toBe('fallback');
    expect(result.error()).toBeNull();
  });

  it('uses the defaults collection when there is no inline default', async () => {
    installFakeApi([]);

    const { fixture, result } = mount(() => injectFlag<string>('missing', 'inline'), {
      defaults: DefaultsCollection.fromObject({ missing: 'from-collection' }),
    });
    await untilLoaded(fixture, result);

    // The SDK prefers an inline default, so the helper shows it; the collection answers when
    // there isn't one.
    expect(result.value()).toBe('inline');
  });
});

describe('injectFlag with signals', () => {
  it('re-evaluates when the key changes, and never shows the old key for the new one', async () => {
    installFakeApi([flag('first', 'one'), flag('second', 'two')]);
    const key = signal('first');

    const { fixture, result } = mount(() => injectFlag(key, 'unset'));
    await untilLoaded(fixture, result);
    expect(result.value()).toBe('one');

    key.set('second');
    fixture.detectChanges();

    // The old key's answer must not be shown for the new key while it loads.
    expect(result.isLoading()).toBe(true);
    expect(result.value()).toBe('unset');
    expect(result.flag()).toBeNull();

    await untilLoaded(fixture, result);
    expect(result.value()).toBe('two');
  });

  it('ignores a slow answer for a key that is no longer current', async () => {
    const api = installFakeApi([flag('first', 'one'), flag('second', 'two')]);
    const key = signal('first');

    const { fixture, result } = mount(() => injectFlag(key, 'unset'));
    await untilLoaded(fixture, result);
    expect(api.rulesLoads()).toHaveLength(1);

    key.set('second');
    fixture.detectChanges();
    key.set('first');
    fixture.detectChanges();
    await untilLoaded(fixture, result);

    expect(result.key()).toBe('first');
    expect(result.value()).toBe('one');
  });

  it('reads a default from a signal', async () => {
    installFakeApi([]);
    const fallback = signal('a');

    const { fixture, result } = mount(() => injectFlag('missing', fallback));
    await untilLoaded(fixture, result);
    expect(result.value()).toBe('a');

    fallback.set('b');
    await until(fixture, () => expect(result.value()).toBe('b'));
  });

  it('does not re-evaluate for an equal default', async () => {
    const api = installFakeApi([flag('ui', { a: 1 })]);
    const fallback = signal({ a: 0 });

    const { fixture, result } = mount(() => injectFlag('ui', fallback));
    await untilLoaded(fixture, result);
    const before = api.requests.length;

    fallback.set({ a: 0 });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.requests.length).toBe(before);
    expect(result.isLoading()).toBe(false);
  });
});

describe('injectFlag with a context', () => {
  const rules = [
    { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true },
  ];

  function user(id: string, plan: string): Context {
    const context = Context.single('user', id);
    context.addAttribute(new Attribute('plan', [plan]));
    return context;
  }

  it('evaluates for the context from the options', async () => {
    installFakeApi([flag('beta', false, rules as never)]);

    const pro = mount(() => injectFlag('beta', false), { context: user('a', 'pro') });
    await untilLoaded(pro.fixture, pro.result);
    expect(pro.result.value()).toBe(true);
  });

  it('re-evaluates when the service context changes, and never shows the old answer for the new one', async () => {
    installFakeApi([flag('beta', false, rules as never)]);
    const context = signal<Context | undefined>(user('a', 'pro'));

    // The default is the opposite of what the pro user gets, so a stale value can't pass.
    const { fixture, result } = mount(() => injectFlag('beta', false), { context });
    await untilLoaded(fixture, result);
    expect(result.value()).toBe(true);

    context.set(user('b', 'free'));
    fixture.detectChanges();
    expect(result.isLoading()).toBe(true);
    expect(result.value()).toBe(false);

    await untilLoaded(fixture, result);
    expect(result.value()).toBe(false);
    expect(result.flag()).not.toBeNull();
  });

  it('does not restart loading for an equal-but-new context', async () => {
    const api = installFakeApi([flag('beta', false, rules as never)]);
    const context = signal<Context | undefined>(user('a', 'pro'));

    const { fixture, result } = mount(() => injectFlag('beta', false), { context });
    await untilLoaded(fixture, result);
    const loads = api.rulesLoads().length;

    context.set(user('a', 'pro'));
    fixture.detectChanges();

    expect(result.isLoading()).toBe(false);
    expect(result.value()).toBe(true);
    await fixture.whenStable();
    expect(api.rulesLoads()).toHaveLength(loads);
  });

  it('takes a context of its own, compared by content', async () => {
    installFakeApi([flag('beta', false, rules as never)]);
    const own = signal<Context | undefined>(user('a', 'free'));

    const { fixture, result } = mount(() => injectFlag('beta', false, { context: own }));
    await untilLoaded(fixture, result);
    expect(result.value()).toBe(false);

    own.set(user('b', 'pro'));
    fixture.detectChanges();
    expect(result.isLoading()).toBe(true);
    await untilLoaded(fixture, result);
    expect(result.value()).toBe(true);
  });
});

describe('injectFlag refresh and failures', () => {
  it('refresh() re-fetches the rules and updates without a loading flash', async () => {
    const api = installFakeApi([flag('promo', false)]);

    const { fixture, result } = mount(() => injectFlag('promo', true));
    await untilLoaded(fixture, result);
    expect(result.value()).toBe(false);
    expect(api.rulesLoads()).toHaveLength(1);

    api.setFlags([flag('promo', true)]);
    const refreshing = result.refresh();
    fixture.detectChanges();
    expect(result.isLoading()).toBe(false);
    expect(result.value()).toBe(false);
    await refreshing;

    await until(fixture, () => expect(result.value()).toBe(true));
    expect(result.isLoading()).toBe(false);
    expect(api.rulesLoads()).toHaveLength(2);
  });

  it('settles on the default when the API is unreachable', async () => {
    installFakeApi([flag('promo', false)]).goOffline();

    // `false` is what the live flag would say, so `true` can only be the fallback.
    const { fixture, result } = mount(() => injectFlag('promo', true));
    await untilLoaded(fixture, result);

    expect(result.value()).toBe(true);
  });

  it('settles on the default and surfaces the error when an evaluation throws', async () => {
    const manager = {
      withDefaults: () => manager,
      withContext: () => manager,
      all: async () => [],
      single: async () => {
        throw new Error('evaluation failed');
      },
    };

    const { fixture, result } = mount(() => injectFlag('promo', true), {
      client: { flags: () => manager } as never,
    });
    await untilLoaded(fixture, result);

    expect(result.value()).toBe(true);
    expect(result.error()?.message).toBe('evaluation failed');
    expect(result.flag()).toBeNull();
  });

  it('wraps a thrown value that is not an Error', async () => {
    const manager = {
      withDefaults: () => manager,
      withContext: () => manager,
      all: async () => [],
      single: async () => Promise.reject('plain'),
    };

    const { fixture, result } = mount(() => injectFlag('promo', true), {
      client: { flags: () => manager } as never,
    });
    await untilLoaded(fixture, result);

    expect(result.error()?.message).toBe('plain');
  });

  it('is destroyed with its component and stops updating', async () => {
    installFakeApi([flag('promo', true)]);

    const { fixture, result } = mount(() => injectFlag('promo', false));
    fixture.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.value()).toBe(false);
  });
});
