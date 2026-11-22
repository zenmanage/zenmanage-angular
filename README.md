# Zenmanage Angular SDK

[![npm version](https://badge.fury.io/js/@zenmanage%2Fangular.svg)](https://www.npmjs.com/package/@zenmanage/angular)
[![Build Status](https://github.com/zenmanage/zenmanage-angular/actions/workflows/ci.yml/badge.svg)](https://github.com/zenmanage/zenmanage-angular)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Angular services, guards, and structural directives for Zenmanage feature flags.

This package extends [`@zenmanage/sdk`](https://www.npmjs.com/package/@zenmanage/sdk) and adds Angular-native primitives:

- `provideZenmanage(...)` for standalone applications
- `ZenmanageModule.forRoot(...)` for NgModule applications
- `ZenmanageFlagsService` for flag evaluation and refresh
- `*zenmanageIfFlag` and `*zenmanageIfVariant` structural directives
- `canActivateFlag`, `canMatchFlag`, and `ZenmanageFlagGuard` for route-level gating

## Why This Package

- Thin wrapper over the proven JavaScript SDK runtime
- Supports both standalone and NgModule dependency injection patterns
- Declarative template control via structural directives
- Route guard utilities for feature-gated navigation
- High unit test coverage with CI-enforced thresholds

## Installation

```bash
npm install @zenmanage/angular @zenmanage/sdk @angular/core @angular/common @angular/router rxjs
```

## Key Compatibility

- Browser/client runtime: use client keys prefixed with `cli_`
- Server/node runtime: use server keys prefixed with `srv_`
- Mobile keys (`mob_`) are rejected by the underlying JavaScript SDK in browser environments

## Quick Start (Standalone)

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZenmanage } from '@zenmanage/angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZenmanage({
      environmentToken: 'cli_your_client_key_here',
      preload: true,
    }),
  ],
};
```

```ts
import { Component } from '@angular/core';
import { ZenmanageIfFlagDirective } from '@zenmanage/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ZenmanageIfFlagDirective],
  template: `
    <h1>Checkout</h1>

    <ng-container *zenmanageIfFlag="'checkout-v2'; else legacyCheckout">
      <p>Rendering new checkout flow.</p>
    </ng-container>

    <ng-template #legacyCheckout>
      <p>Rendering legacy checkout flow.</p>
    </ng-template>
  `,
})
export class AppComponent {}
```

## Quick Start (NgModule)

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ZenmanageModule } from '@zenmanage/angular';

@NgModule({
  imports: [
    BrowserModule,
    ZenmanageModule.forRoot({
      environmentToken: 'cli_your_client_key_here',
      preload: true,
    }),
  ],
})
export class AppModule {}
```

## API

### `provideZenmanage(options)`

Standalone provider factory that initializes the Zenmanage client, flag manager, and runtime preload.

```ts
provideZenmanage({
  environmentToken: 'cli_your_client_key_here',
  cacheTtl: 300,
  enableUsageReporting: true,
  preload: true,
  onError: (error) => console.error(error),
});
```

### `ZenmanageFlagsService`

Main Angular service for loading and evaluating flags.

```ts
const enabled = await flagsService.isEnabled('new-dashboard', false);
const variant = await flagsService.getVariant('checkout-flow', 'control');
await flagsService.refresh();
```

### `*zenmanageIfFlag`

Conditionally renders content based on a boolean flag result.

```html
<ng-container *zenmanageIfFlag="'new-dashboard'; default: false; else fallback">
  <app-dashboard-v2 />
</ng-container>
<ng-template #fallback><app-dashboard-v1 /></ng-template>
```

### `*zenmanageIfVariant`

Conditionally renders content based on string variant matching.

```html
<ng-container *zenmanageIfVariant="'checkout-flow'; is: ['one-page', 'stepper']; else control">
  <app-checkout-experiment />
</ng-container>
<ng-template #control><app-checkout-control /></ng-template>
```

### Guards

Functional guards:

```ts
import { canActivateFlag } from '@zenmanage/angular';

{
  path: 'beta',
  canActivate: [
    canActivateFlag({
      key: 'beta-program',
      defaultValue: false,
      redirectTo: '/upgrade',
    }),
  ],
  loadComponent: () => import('./beta.component').then((m) => m.BetaComponent),
}
```

Class guard with route data:

```ts
import { ZenmanageFlagGuard } from '@zenmanage/angular';

{
  path: 'new-dashboard',
  canActivate: [ZenmanageFlagGuard],
  data: {
    zenmanageFlag: {
      key: 'dashboard-v2',
      defaultValue: false,
      redirectTo: '/dashboard',
    },
  },
}
```

## Examples

See [examples/README.md](examples/README.md) for scenario-based samples equivalent to the JavaScript SDK examples:

- `simple-flags.ts`
- `context-based-flags.ts`
- `ab-testing.ts`
- `defaults.ts`
- `caching.ts`
- `percentage-rollouts.ts`
- `angular-app/` (standalone application example)

## Development

```bash
npm install
npm run validate
```

Useful commands:

- `npm run lint`
- `npm run type-check`
- `npm run test:coverage`
- `npm run build`

## Publishing

Use [docs/PUBLISHING.md](docs/PUBLISHING.md).

## License

MIT
