import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Attribute, Context } from '@zenmanage/sdk';
import { describe, expect, it } from 'vitest';
import { canActivateFlag, canMatchFlag, ZenmanageFlagGuard } from '../src/lib/guards';
import { flag, installFakeApi } from './fakeApi';
import { configure } from './helpers';

@Component({ template: 'page' })
class Page {}

@Component({ template: 'home' })
class Home {}

/** Returns a function that navigates and reports where the router ended up. One harness per test. */
async function browse(): Promise<(url: string) => Promise<string>> {
  const harness = await RouterTestingHarness.create();

  return async (url) => {
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  };
}

function setUp(routes: Routes): void {
  configure({}, [provideRouter(routes)]);
}

describe('canActivateFlag', () => {
  it('lets the route activate while the flag is on', async () => {
    installFakeApi([flag('beta', true)]);
    const routes: Routes = [
      { path: 'beta', component: Page, canActivate: [canActivateFlag({ key: 'beta' })] },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/beta')).toBe('/beta');
  });

  it('blocks the route while the flag is off', async () => {
    installFakeApi([flag('beta', false)]);
    const routes: Routes = [
      { path: '', component: Home },
      { path: 'beta', component: Page, canActivate: [canActivateFlag({ key: 'beta' })] },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/beta')).toBe('/');
  });

  it('redirects with a string or a UrlTree', async () => {
    installFakeApi([flag('beta', false)]);
    const routes: Routes = [
      { path: 'upgrade', component: Home },
      {
        path: 'beta',
        component: Page,
        canActivate: [canActivateFlag({ key: 'beta', redirectTo: '/upgrade' })],
      },
      {
        path: 'beta-tree',
        component: Page,
        canActivate: [
          () => {
            const router = TestBed.inject(Router);
            return canActivateFlag({ key: 'beta', redirectTo: router.parseUrl('/upgrade') })(
              {} as never,
              {} as never
            );
          },
        ],
      },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/beta')).toBe('/upgrade');
    expect(await go('/beta-tree')).toBe('/upgrade');
  });

  it('uses the default for a flag that does not exist', async () => {
    installFakeApi([]);
    const routes: Routes = [
      {
        path: 'open',
        component: Page,
        canActivate: [canActivateFlag({ key: 'missing', defaultValue: true })],
      },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/open')).toBe('/open');
  });

  it('matches a variant, or any of several', async () => {
    installFakeApi([flag('checkout', 'stepper')]);
    const routes: Routes = [
      { path: '', component: Home },
      {
        path: 'one',
        component: Page,
        canActivate: [canActivateFlag({ key: 'checkout', expectedVariant: 'one-page' })],
      },
      {
        path: 'either',
        component: Page,
        canActivate: [
          canActivateFlag({ key: 'checkout', expectedVariant: ['one-page', 'stepper'] }),
        ],
      },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/one')).toBe('/');
    expect(await go('/either')).toBe('/either');
  });

  it('inverts', async () => {
    installFakeApi([flag('beta', true)]);
    const routes: Routes = [
      { path: '', component: Home },
      {
        path: 'old',
        component: Page,
        canActivate: [canActivateFlag({ key: 'beta', invert: true })],
      },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/old')).toBe('/');
  });

  it('evaluates for the context given to the guard', async () => {
    installFakeApi([
      flag('beta', false, [
        { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true },
      ] as never),
    ]);
    const pro = Context.single('user', 'a');
    pro.addAttribute(new Attribute('plan', ['pro']));
    const routes: Routes = [
      { path: '', component: Home },
      {
        path: 'pro',
        component: Page,
        canActivate: [canActivateFlag({ key: 'beta', context: pro })],
      },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/pro')).toBe('/pro');
  });
});

describe('canMatchFlag', () => {
  it('skips the route when the flag is off, so the next one matches', async () => {
    installFakeApi([flag('v2', false)]);
    const routes: Routes = [
      { path: 'dashboard', component: Page, canMatch: [canMatchFlag({ key: 'v2' })] },
      { path: 'dashboard', component: Home },
    ];
    setUp(routes);

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/dashboard');

    expect(component).toBeInstanceOf(Home);
  });

  it('matches the route when the flag is on', async () => {
    installFakeApi([flag('v2', true)]);
    const routes: Routes = [
      { path: 'dashboard', component: Page, canMatch: [canMatchFlag({ key: 'v2' })] },
      { path: 'dashboard', component: Home },
    ];
    setUp(routes);

    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/dashboard')).toBeInstanceOf(Page);
  });
});

describe('ZenmanageFlagGuard', () => {
  it('reads its options from route.data.zenmanageFlag', async () => {
    installFakeApi([flag('beta', false)]);
    const routes: Routes = [
      { path: 'upgrade', component: Home },
      {
        path: 'beta',
        component: Page,
        canActivate: [ZenmanageFlagGuard],
        data: { zenmanageFlag: { key: 'beta', redirectTo: '/upgrade' } },
      },
    ];
    setUp(routes);
    const go = await browse();

    expect(await go('/beta')).toBe('/upgrade');
  });

  it('works as a canMatch guard too', async () => {
    installFakeApi([flag('v2', true)]);
    const routes: Routes = [
      {
        path: 'dashboard',
        component: Page,
        canMatch: [ZenmanageFlagGuard],
        data: { zenmanageFlag: { key: 'v2' } },
      },
    ];
    setUp(routes);

    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/dashboard')).toBeInstanceOf(Page);
  });

  it('throws a clear error when the route has no configuration', () => {
    installFakeApi([]);
    setUp([]);
    const guard = TestBed.inject(ZenmanageFlagGuard);

    expect(() => guard.canActivate({ data: {} } as never)).toThrow(
      'Missing route.data.zenmanageFlag.key'
    );
    expect(() => guard.canMatch({ data: {} } as never, [])).toThrow(
      'Missing route.data.zenmanageFlag.key'
    );
    expect(() => guard.canActivate({} as never)).toThrow('Missing route.data.zenmanageFlag.key');
  });
});
