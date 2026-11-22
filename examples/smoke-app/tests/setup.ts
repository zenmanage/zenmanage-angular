// The JIT compiler: the smoke app's components are compiled when they load, and so is the
// partially compiled package, exactly as in a project that runs its tests this way.
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { clearServerClients } from '@zenmanage/angular';
import { afterEach, beforeEach, vi } from 'vitest';

// The server rendering test (a `// @vitest-environment node` file) sets up its own platform.
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
  clearServerClients();
});
