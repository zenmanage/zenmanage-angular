import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateFn,
  CanMatch,
  CanMatchFn,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import type { ZenmanageRouteFlagOptions } from './types';
import { ZenmanageFlagsService } from './zenmanage-flags.service';

const ROUTE_DATA_KEY = 'zenmanageFlag';

function toArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function resolveGuardDecision(
  flags: ZenmanageFlagsService,
  router: Router,
  options: ZenmanageRouteFlagOptions
): Promise<boolean | UrlTree> {
  let allowed: boolean;

  if (options.expectedVariant) {
    const variant = await flags.getVariant(options.key, 'control', {
      context: options.context,
      defaults: options.defaults,
    });

    allowed = toArray(options.expectedVariant).includes(variant);
  } else {
    allowed = await flags.isEnabled(options.key, Boolean(options.defaultValue), {
      context: options.context,
      defaults: options.defaults,
    });
  }

  if (options.invert) {
    allowed = !allowed;
  }

  if (allowed) {
    return true;
  }

  if (options.redirectTo) {
    if (typeof options.redirectTo === 'string') {
      return router.parseUrl(options.redirectTo);
    }

    return options.redirectTo;
  }

  return false;
}

function readOptionsFromRoute(route: ActivatedRouteSnapshot | Route): ZenmanageRouteFlagOptions {
  const source = (route.data?.[ROUTE_DATA_KEY] as ZenmanageRouteFlagOptions | undefined) || null;

  if (!source || !source.key) {
    throw new Error(
      'Missing route.data.zenmanageFlag.key configuration for Zenmanage guard evaluation.'
    );
  }

  return source;
}

export function canActivateFlag(options: ZenmanageRouteFlagOptions): CanActivateFn {
  return async (_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
    const flags = inject(ZenmanageFlagsService);
    const router = inject(Router);
    return resolveGuardDecision(flags, router, options);
  };
}

export function canMatchFlag(options: ZenmanageRouteFlagOptions): CanMatchFn {
  return async (_route: Route, _segments: UrlSegment[]) => {
    const flags = inject(ZenmanageFlagsService);
    const router = inject(Router);
    return resolveGuardDecision(flags, router, options);
  };
}

@Injectable({ providedIn: 'root' })
export class ZenmanageFlagGuard implements CanActivate, CanMatch {
  constructor(
    private readonly flags: ZenmanageFlagsService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const options = readOptionsFromRoute(route);
    return resolveGuardDecision(this.flags, this.router, options);
  }

  canMatch(route: Route, _segments: UrlSegment[]): Promise<boolean | UrlTree> {
    const options = readOptionsFromRoute(route);
    return resolveGuardDecision(this.flags, this.router, options);
  }
}
