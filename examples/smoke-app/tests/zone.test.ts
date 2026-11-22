// @vitest-environment jsdom
import 'zone.js';
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZenmanage } from '@zenmanage/angular';
import { describe, expect, it, vi } from 'vitest';
import { AppComponent } from '../src/app.component';
import { routes } from '../src/app.routes';
import { installFakeApi } from './fakeApi';
import { CLIENT_KEY, LIVE_FLAGS, read } from './fixtures';

// Most existing Angular apps still run with zone.js. The package is signal-based, so this checks
// that a zone app sees the same results as the zoneless one in spa.test.ts.
describe('an app that runs with zone.js, from the packed package', () => {
  it('renders the loading state, then the real values', async () => {
    installFakeApi(LIVE_FLAGS);
    TestBed.configureTestingModule({
      providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideZenmanage({ environmentToken: CLIENT_KEY, enableUsageReporting: false }),
      ],
    });

    const fixture = TestBed.createComponent(AppComponent);
    const root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(read(root, 'checkout')).toBe('Loading');
    expect(read(root, 'welcome')).toBe('Welcome');

    await vi.waitFor(
      () => {
        fixture.detectChanges();
        expect(read(root, 'welcome')).toBe('Welcome back');
      },
      { timeout: 3000, interval: 5 }
    );

    expect(read(root, 'checkout')).toBe('New checkout');
    expect(read(root, 'banner')).toBe('No banner');
    expect(read(root, 'flow')).toBe('Streamlined flow');
    expect(read(root, 'pricing')).toBe('Other pricing');
    expect(read(root, 'config')).toBe('dark/50');
  });
});
