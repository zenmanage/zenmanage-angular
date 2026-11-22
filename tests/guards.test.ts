import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import {
  ActivatedRouteSnapshot,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { canActivateFlag, canMatchFlag, ZenmanageFlagGuard } from '../src/lib/guards';
import { ZenmanageFlagsService } from '../src/lib/zenmanage-flags.service';

describe('guards', () => {
  it('allows canActivate when feature is enabled', async () => {
    const flags = {
      isEnabled: vi.fn(async () => true),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn((value: string) => ({ redirectedTo: value }) as unknown as UrlTree),
    } as unknown as Router;

    const guard = new ZenmanageFlagGuard(flags, router);
    const route = {
      data: {
        zenmanageFlag: {
          key: 'new-ui',
          defaultValue: false,
        },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = await guard.canActivate(route);

    expect(result).toBe(true);
    expect((flags.isEnabled as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('new-ui');
  });

  it('returns redirect UrlTree when feature is disabled and redirect is configured', async () => {
    const flags = {
      isEnabled: vi.fn(async () => false),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const urlTree = { redirectedTo: '/fallback' } as unknown as UrlTree;
    const router = {
      parseUrl: vi.fn(() => urlTree),
    } as unknown as Router;

    const guard = new ZenmanageFlagGuard(flags, router);
    const route = {
      data: {
        zenmanageFlag: {
          key: 'new-ui',
          redirectTo: '/fallback',
        },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = await guard.canActivate(route);

    expect(result).toBe(urlTree);
  });

  it('returns provided UrlTree redirect object without parsing', async () => {
    const flags = {
      isEnabled: vi.fn(async () => false),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn(() => ({ redirectedTo: '/unused' }) as unknown as UrlTree),
    } as unknown as Router;

    const guard = new ZenmanageFlagGuard(flags, router);
    const redirectTree = { redirectedTo: '/tree' } as unknown as UrlTree;
    const route = {
      data: {
        zenmanageFlag: {
          key: 'new-ui',
          redirectTo: redirectTree,
        },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = await guard.canActivate(route);

    expect(result).toBe(redirectTree);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('supports function-based canActivate guard', async () => {
    const flags = {
      isEnabled: vi.fn(async () => true),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn((value: string) => ({ redirectedTo: value }) as unknown as UrlTree),
    } as unknown as Router;

    const injector = Injector.create({
      providers: [
        { provide: ZenmanageFlagsService, useValue: flags },
        { provide: Router, useValue: router },
      ],
    });

    const guardFn = canActivateFlag({ key: 'route-flag', defaultValue: false });
    const result = await runInInjectionContext(injector, () =>
      guardFn({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('supports function-based canMatch guard', async () => {
    const flags = {
      isEnabled: vi.fn(async () => true),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn((value: string) => ({ redirectedTo: value }) as unknown as UrlTree),
    } as unknown as Router;

    const injector = Injector.create({
      providers: [
        { provide: ZenmanageFlagsService, useValue: flags },
        { provide: Router, useValue: router },
      ],
    });

    const guardFn = canMatchFlag({ key: 'route-flag', defaultValue: false });
    const result = await runInInjectionContext(injector, () =>
      guardFn({} as Route, [] as UrlSegment[])
    );

    expect(result).toBe(true);
  });

  it('supports variant-based route evaluation with invert', async () => {
    const flags = {
      isEnabled: vi.fn(async () => true),
      getVariant: vi.fn(async () => 'one-page'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn((value: string) => ({ redirectedTo: value }) as unknown as UrlTree),
    } as unknown as Router;

    const guard = new ZenmanageFlagGuard(flags, router);
    const route = {
      data: {
        zenmanageFlag: {
          key: 'checkout-flow',
          expectedVariant: ['one-page'],
          invert: true,
          redirectTo: '/control',
        },
      },
    } as unknown as ActivatedRouteSnapshot;

    const result = await guard.canActivate(route);
    expect(result).toEqual({ redirectedTo: '/control' });
  });

  it('supports class-based canMatch evaluation', async () => {
    const flags = {
      isEnabled: vi.fn(async () => true),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn((value: string) => ({ redirectedTo: value }) as unknown as UrlTree),
    } as unknown as Router;

    const guard = new ZenmanageFlagGuard(flags, router);
    const route = {
      data: {
        zenmanageFlag: {
          key: 'match-flag',
          defaultValue: false,
        },
      },
    } as unknown as Route;

    const result = await guard.canMatch(route, [] as UrlSegment[]);
    expect(result).toBe(true);
  });

  it('throws when required route guard data is missing', async () => {
    const flags = {
      isEnabled: vi.fn(async () => true),
      getVariant: vi.fn(async () => 'control'),
    } as unknown as ZenmanageFlagsService;

    const router = {
      parseUrl: vi.fn((value: string) => ({ redirectedTo: value }) as unknown as UrlTree),
    } as unknown as Router;

    const guard = new ZenmanageFlagGuard(flags, router);
    expect(() => guard.canActivate({ data: {} } as unknown as ActivatedRouteSnapshot)).toThrow(
      'Missing route.data.zenmanageFlag.key configuration for Zenmanage guard evaluation.'
    );
  });
});
