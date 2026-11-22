import { Injectable, inject } from '@angular/core';
import {
  Router,
  type ActivatedRouteSnapshot,
  type CanActivate,
  type CanActivateFn,
  type CanMatch,
  type CanMatchFn,
  type Route,
  type UrlSegment,
  type UrlTree,
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
  const evaluation = { context: options.context, defaults: options.defaults };
  let allowed: boolean;

  if (options.expectedVariant) {
    const variant = await flags.getVariant(options.key, 'control', evaluation);

    allowed = toArray(options.expectedVariant).includes(variant);
  } else {
    const flag = await flags.getFlag(options.key, options.defaultValue ?? false, evaluation);

    allowed = flag.asBool();
  }

  if (options.invert) {
    allowed = !allowed;
  }

  if (allowed) {
    return true;
  }

  if (options.redirectTo) {
    return typeof options.redirectTo === 'string'
      ? router.parseUrl(options.redirectTo)
      : options.redirectTo;
  }

  return false;
}

function readOptionsFromRoute(route: ActivatedRouteSnapshot | Route): ZenmanageRouteFlagOptions {
  const source = (route.data?.[ROUTE_DATA_KEY] as ZenmanageRouteFlagOptions | undefined) ?? null;

  if (!source?.key) {
    throw new Error(
      'Missing route.data.zenmanageFlag.key configuration for Zenmanage guard evaluation.'
    );
  }

  return source;
}

/** Lets the route activate while the flag is on (or the variant matches). Waits for the flags to load. */
export function canActivateFlag(options: ZenmanageRouteFlagOptions): CanActivateFn {
  return () => resolveGuardDecision(inject(ZenmanageFlagsService), inject(Router), options);
}

/** Lets the route match while the flag is on (or the variant matches), so a lazy route isn't even loaded otherwise. */
export function canMatchFlag(options: ZenmanageRouteFlagOptions): CanMatchFn {
  return () => resolveGuardDecision(inject(ZenmanageFlagsService), inject(Router), options);
}

/** Class guard that reads its options from `route.data.zenmanageFlag`. */
@Injectable({ providedIn: 'root' })
export class ZenmanageFlagGuard implements CanActivate, CanMatch {
  private readonly flags = inject(ZenmanageFlagsService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    return resolveGuardDecision(this.flags, this.router, readOptionsFromRoute(route));
  }

  canMatch(route: Route, _segments: UrlSegment[]): Promise<boolean | UrlTree> {
    return resolveGuardDecision(this.flags, this.router, readOptionsFromRoute(route));
  }
}
