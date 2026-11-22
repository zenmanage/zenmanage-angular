import {
  Component,
  provideZonelessChangeDetection,
  type EnvironmentProviders,
  type Provider,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { expect, vi } from 'vitest';
import { provideZenmanage } from '../src/lib/providers';
import type { ZenmanageAngularOptions } from '../src/lib/types';
import { ZenmanageFlagsService } from '../src/lib/zenmanage-flags.service';

export const CLIENT_KEY = 'cli_test_client_key';

type ExtraProviders = Array<Provider | EnvironmentProviders>;

/** Configures the testing module with Zenmanage talking to the fake API. Zoneless, like new apps. */
export function configure(
  options: Partial<ZenmanageAngularOptions> = {},
  extra: ExtraProviders = []
): void {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideZenmanage({ environmentToken: CLIENT_KEY, enableUsageReporting: false, ...options }),
      ...extra,
    ],
  });
}

export function service(): ZenmanageFlagsService {
  return TestBed.inject(ZenmanageFlagsService);
}

export interface Mounted<T> {
  fixture: ComponentFixture<unknown>;
  result: T;
}

/** Creates a component whose field initializer runs `setup()`, so it can call `injectFlag` and friends. */
export function mount<T>(
  setup: () => T,
  options: Partial<ZenmanageAngularOptions> = {},
  extra: ExtraProviders = []
): Mounted<T> {
  configure(options, extra);

  @Component({ template: '' })
  class Probe {
    readonly result = setup();
  }

  const fixture = TestBed.createComponent(Probe);
  fixture.detectChanges();

  return { fixture, result: fixture.componentInstance.result };
}

/** Creates `component` and runs change detection once. */
export function render<C>(component: Type<C>): ComponentFixture<C> {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

/** Runs change detection until `check` passes. */
export async function until(
  fixture: ComponentFixture<unknown>,
  check: () => void,
  timeout = 2000
): Promise<void> {
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      check();
    },
    { timeout, interval: 5 }
  );
}

export async function untilLoaded(
  fixture: ComponentFixture<unknown>,
  ...states: Array<{ isLoading: () => boolean }>
): Promise<void> {
  await until(fixture, () => expect(states.every((state) => !state.isLoading())).toBe(true));
}

export function text(fixture: ComponentFixture<unknown>): string {
  return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
