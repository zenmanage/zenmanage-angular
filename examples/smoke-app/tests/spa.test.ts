// @vitest-environment jsdom
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ZenmanageFlagsService } from '@zenmanage/angular';
import { describe, expect, it, vi } from 'vitest';
import { AppComponent } from '../src/app.component';
import { appConfig } from '../src/app.config';
import { flag, installFakeApi } from './fakeApi';
import { CLIENT_KEY, LIVE_FLAGS, holdNetwork, read } from './fixtures';

function start(): ComponentFixture<AppComponent> {
  TestBed.configureTestingModule({
    providers: appConfig({ environmentToken: CLIENT_KEY, enableUsageReporting: false }).providers,
  });

  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();

  return fixture;
}

/** Runs change detection until `check` passes. */
async function until(fixture: ComponentFixture<unknown>, check: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      check();
    },
    { timeout: 3000, interval: 5 }
  );
}

function el(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function visit(fixture: ComponentFixture<unknown>, url: string): Promise<string> {
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  fixture.detectChanges();

  return router.url;
}

describe('a client-side app, from the packed package', () => {
  it('shows loading and the defaults first, then the real values', async () => {
    installFakeApi(LIVE_FLAGS);
    const release = holdNetwork();
    const fixture = start();

    expect(read(el(fixture), 'status')).toBe('not ready');
    expect(read(el(fixture), 'checkout')).toBe('Loading');
    expect(read(el(fixture), 'banner')).toBe('Loading');
    expect(read(el(fixture), 'flow')).toBe('Loading');
    expect(read(el(fixture), 'pricing')).toBe('Loading');
    expect(read(el(fixture), 'welcome')).toBe('Welcome');
    expect(read(el(fixture), 'timeout')).toBe('100');
    expect(read(el(fixture), 'config')).toBe('light/10');

    release();
    await until(fixture, () => expect(read(el(fixture), 'status')).toBe('ready'));
    await until(fixture, () => expect(el(fixture).textContent).not.toContain('Loading'));

    expect(read(el(fixture), 'welcome')).toBe('Welcome back');
    expect(read(el(fixture), 'timeout')).toBe('2500');
    expect(read(el(fixture), 'config')).toBe('dark/50');
    expect(read(el(fixture), 'beta')).toBe('beta on');
    expect(read(el(fixture), 'variant')).toBe('one-page');
  });

  it('renders the template for an enabled flag and else for a disabled one', async () => {
    installFakeApi(LIVE_FLAGS);
    const fixture = start();

    await until(fixture, () => expect(read(el(fixture), 'checkout')).toBe('New checkout'));
    // The fallback is `true`, the real value `false`.
    await until(fixture, () => expect(read(el(fixture), 'banner')).toBe('No banner'));
  });

  it('renders the variant template on a match and else on a miss', async () => {
    installFakeApi(LIVE_FLAGS);
    const fixture = start();

    await until(fixture, () => expect(read(el(fixture), 'flow')).toBe('Streamlined flow'));
    // The fallback variant ('monthly') matches, the real one ('annual') doesn't.
    await until(fixture, () => expect(read(el(fixture), 'pricing')).toBe('Other pricing'));
  });

  it('shows the defaults when the API is unreachable', async () => {
    installFakeApi(LIVE_FLAGS).goOffline();
    const fixture = start();

    await until(fixture, () => expect(el(fixture).textContent).not.toContain('Loading'));

    expect(read(el(fixture), 'welcome')).toBe('Welcome');
    expect(read(el(fixture), 'checkout')).toBe('Classic checkout');
    expect(read(el(fixture), 'banner')).toBe('Beta banner');
    expect(read(el(fixture), 'config')).toBe('light/10');
  });

  it('updates the page after a refresh', async () => {
    const api = installFakeApi(LIVE_FLAGS);
    const fixture = start();
    await until(fixture, () => expect(read(el(fixture), 'checkout')).toBe('New checkout'));

    api.setFlags([
      ...LIVE_FLAGS.filter((live) => live.key !== 'new-checkout' && live.key !== 'welcome-text'),
      flag('new-checkout', false),
      flag('welcome-text', 'Hello again'),
    ]);
    await TestBed.inject(ZenmanageFlagsService).refresh();

    await until(fixture, () => expect(read(el(fixture), 'checkout')).toBe('Classic checkout'));
    await until(fixture, () => expect(read(el(fixture), 'welcome')).toBe('Hello again'));
  });

  describe('route guards', () => {
    it('lets a route activate while its flag is on', async () => {
      installFakeApi(LIVE_FLAGS);
      const fixture = start();

      expect(await visit(fixture, '/beta')).toBe('/beta');
      await until(fixture, () => expect(read(el(fixture), 'page')).toBe('Beta page'));
    });

    it('lets a route activate when the variant matches', async () => {
      installFakeApi(LIVE_FLAGS);
      const fixture = start();

      expect(await visit(fixture, '/checkout')).toBe('/checkout');
      await until(fixture, () => expect(read(el(fixture), 'page')).toBe('Checkout page'));
    });

    it('redirects a route whose flag is off, with the class guard', async () => {
      installFakeApi(LIVE_FLAGS);
      const fixture = start();

      expect(await visit(fixture, '/labs')).toBe('/');
      await until(fixture, () => expect(read(el(fixture), 'page')).toBe('Home page'));
    });

    it('does not match a route whose flag is off, so the wildcard takes it', async () => {
      installFakeApi(LIVE_FLAGS);
      const fixture = start();

      expect(await visit(fixture, '/lazy')).toBe('/lazy');
      await until(fixture, () => expect(read(el(fixture), 'page')).toBe('Not found'));
    });
  });
});
