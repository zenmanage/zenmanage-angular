import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { clearServerClients } from '../src/lib/client';

// Tests that render on a server (a `// @vitest-environment node` file) set up their own platform.
if (typeof document !== 'undefined') {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

// A test that forgets installFakeApi() would otherwise reach the real API.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.reject(new Error('Unexpected network request: call installFakeApi() first'))
    )
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  clearServerClients();
});
