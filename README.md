# Zenmanage Angular SDK

[![npm version](https://badge.fury.io/js/@zenmanage%2Fangular.svg)](https://www.npmjs.com/package/@zenmanage/angular)
[![Build Status](https://github.com/zenmanage/zenmanage-angular/actions/workflows/ci.yml/badge.svg)](https://github.com/zenmanage/zenmanage-angular)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/35f06c17f2dd425fb99ff35bd1a165b3)](https://app.codacy.com/gh/zenmanage/zenmanage-angular/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Angular service, signals, structural directives, route guards, and server-rendering support for Zenmanage feature flags.

This package extends [`@zenmanage/sdk`](https://www.npmjs.com/package/@zenmanage/sdk) and adds Angular-native primitives:

- `provideZenmanage(options)` for standalone applications, `ZenmanageModule.forRoot(options)` for NgModule applications
- `injectFlag(key, default)`, `injectBooleanFlag`, `injectVariant`, and `injectConfig`, which return signals
- `ZenmanageFlagsService` for evaluating and refreshing flags in code
- `*zenmanageIfFlag` and `*zenmanageIfVariant` structural directives
- `canActivateFlag`, `canMatchFlag`, and `ZenmanageFlagGuard` for route-level gating
- Angular SSR: the server renders with the real values and the browser starts from them

## Why This Package

- Minimal wrapper around [`@zenmanage/sdk`](https://www.npmjs.com/package/@zenmanage/sdk)
- Signals first, with observables on the service for `async` pipes
- Typed values for booleans, strings, numbers, and JSON
- Keys, context, and defaults can be signals: change one and every flag re-evaluates
- Explicit loading and error states, so you decide how to handle both
- Works with Angular SSR, zone-based or zoneless, without a flash of the default value

## Installation

```bash
npm install @zenmanage/angular @zenmanage/sdk
```

Requires Angular 20 or newer (`@angular/core`, `@angular/common`, `@angular/router`), `rxjs` 7.8 or newer, and `@zenmanage/sdk` 3.5.1 or newer.

## Documentation

- [Angular quickstart](https://zenmanage.com/developers/quickstarts/angular/): install, providers, signals, directives, guards, and SSR, step by step
- [SDKs and integrations](https://zenmanage.com/developers/sdks/): every Zenmanage SDK and its install command
- [Zenmanage documentation](https://zenmanage.com/developers/): API reference, targeting guides, and the rest of the developer docs

## Key Compatibility

- Browser/client runtime: use client keys prefixed with `cli_`
- Server/node runtime: use server keys prefixed with `srv_`
- Mobile keys (`mob_`) are not valid for this package

`@zenmanage/sdk` checks the key against the runtime it's running in, so a `cli_` key throws in Node.js and a `srv_` key throws in a browser. Never ship a `srv_` key to the browser. See [Server-Side Rendering](#server-side-rendering) if you render on the server.

## Quick Start

```ts
import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideZenmanage } from '@zenmanage/angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZenmanage({ environmentToken: 'cli_your_client_key_here' }),
  ],
};
```

```ts
import { Component } from '@angular/core';
import { injectBooleanFlag } from '@zenmanage/angular';

@Component({
  selector: 'app-checkout-button',
  template: `
    @if (newCheckout.isLoading()) {
      <button disabled>Loading...</button>
    } @else {
      <button>{{ newCheckout.value() ? 'Checkout (new)' : 'Checkout' }}</button>
    }
  `,
})
export class CheckoutButtonComponent {
  readonly newCheckout = injectBooleanFlag('new-checkout-button');
}
```

Or let a directive decide what to render:

```html
<app-dashboard-v2 *zenmanageIfFlag="'new-dashboard'; else: legacy; loading: spinner" />
<ng-template #legacy><app-dashboard-v1 /></ng-template>
<ng-template #spinner><p>Loading...</p></ng-template>
```

The first load starts with the application, so by the time a component asks for a flag the rules are usually in.

### NgModule applications

```ts
@NgModule({
  imports: [
    BrowserModule,
    ZenmanageModule.forRoot({ environmentToken: 'cli_your_client_key_here' }),
  ],
})
export class AppModule {}
```

`ZenmanageModule` also exports both directives.

## Providing Zenmanage

```ts
provideZenmanage({
  environmentToken: 'cli_your_client_key_here',
  apiEndpoint: 'https://api.example.com', // optional
  cacheTtl: 300, // seconds the rules are cached (default: the SDK's)
  enableUsageReporting: true,
  context: currentUser, // a Context, or a signal or function that returns one
  defaults: DefaultsCollection.fromObject({ 'new-dashboard': false }),
  preload: true, // load every flag when the app starts (default)
  onError: (error) => console.error(error),
});
```

| Option             | What it does                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `environmentToken` | The environment's key. Required unless you pass a `client`.                                               |
| `client`           | An existing `Zenmanage` client. The token and client options are then ignored.                            |
| `context`          | Base context for every evaluation. A signal or function re-evaluates every flag when its content changes. |
| `defaults`         | Fallback values. A signal or function works here too.                                                     |
| `preload`          | Load every flag at startup. Turn it off and the first evaluation loads the rules instead.                 |
| `onError`          | Called when the rules can't be loaded or refreshed.                                                       |
| `transferState`    | Transfer the flags the server read to the browser (default: `true`).                                      |
| `transferContext`  | Also transfer the context. Off by default: it can carry personal data.                                    |
| `bootstrap`        | A payload to start from instead of `TransferState`; `null` skips it.                                      |
| `logger`           | A logger for the SDK.                                                                                     |

An equal-but-new `Context` (same attributes) doesn't restart loading: context and defaults are compared by content.

## Signals: `injectFlag` and friends

Call these in an injection context: a field initializer or a constructor.

```ts
const flag = injectFlag('max-items', 25);

flag.value(); // the flag's value, or 25 until it has loaded
flag.isLoading(); // true until the first value for this key and context has landed
flag.error(); // the load error, if any
flag.flag(); // the SDK's Flag object, or null
await flag.refresh(); // re-fetch the rules; value() updates once it lands
```

- `injectFlag(key, default)` reads a boolean, string, number, or JSON value, as the type of `default`. An object or array default makes it a JSON flag.
- `injectBooleanFlag(key, default = false)`, `injectVariant(key, default = 'control')` (read `.variant()`), and `injectConfig(key, default)` are shorthands.
- `key`, `default`, and `options.context` accept a signal or a function. Change one and the flag re-evaluates.
- Pass `{ context }` as the third argument to evaluate one flag for another context.

A result only counts for the key, context, and rules that produced it. Switch the key and you never see the old key's value for the new one; the signals report `isLoading` until the new answer lands. A `refresh()` keeps the last value on screen while it re-evaluates, so gated UI doesn't unmount and remount.

## The service

```ts
const flags = inject(ZenmanageFlagsService);

const enabled = await flags.isEnabled('new-dashboard', false);
const variant = await flags.getVariant('checkout-flow', 'control');
const { value } = await flags.getValue('ui-config', { theme: 'light' });
await flags.refresh();
```

Evaluations wait for the first load, so they read from a warm cache. Every call takes an optional `{ context, defaults }` as its last argument.

State, as signals (and observables for `async` pipes):

| Signal                                 | Meaning                                                               |
| -------------------------------------- | --------------------------------------------------------------------- |
| `isReady()` / `isReady$`               | The first load succeeded (or `preload` is off)                        |
| `isLoading()` / `isLoading$`           | The first load is in flight. A background `refresh()` doesn't set it. |
| `error()` / `error$`                   | The last load or refresh error                                        |
| `revision()`                           | Counts successful refreshes                                           |
| `manager()`, `context()`, `defaults()` | The current flag manager, context, and defaults                       |

When the rules can't be loaded the service settles on your defaults (it doesn't hang), sets `error`, and calls `onError`.

## Directives

### `*zenmanageIfFlag`

```html
<section *zenmanageIfFlag="'new-dashboard'; default: false; else: legacy; loading: spinner">
  New dashboard
</section>
```

| Input                  | Meaning                                              |
| ---------------------- | ---------------------------------------------------- |
| `default: boolean`     | The answer for a flag that doesn't exist             |
| `else: TemplateRef`    | Rendered when the flag is off (or on, with `invert`) |
| `loading: TemplateRef` | Rendered until the first value arrives               |
| `invert: boolean`      | Swap the two branches                                |
| `context: Context`     | Evaluate for another context                         |

With no `loading` template nothing renders until the value arrives. A refresh doesn't remount the view unless the answer changes.

### `*zenmanageIfVariant`

```html
<app-checkout *zenmanageIfVariant="'checkout-flow'; is: ['one-page', 'stepper']; else: control" />
<ng-template #control><app-classic-checkout /></ng-template>
```

`is` takes one variant or an array. `default`, `else`, `loading`, `invert`, and `context` work as above (`default` is a string, `'control'` unless you say otherwise).

## Route Guards

```ts
import { canActivateFlag, canMatchFlag } from '@zenmanage/angular';

export const routes: Routes = [
  {
    path: 'beta',
    canActivate: [canActivateFlag({ key: 'beta-program', redirectTo: '/upgrade' })],
    loadComponent: () => import('./beta.component').then((m) => m.BetaComponent),
  },
  {
    // A disabled flag skips this route, so the next 'dashboard' route matches
    path: 'dashboard',
    canMatch: [canMatchFlag({ key: 'dashboard-v2' })],
    loadComponent: () => import('./dashboard-v2.component').then((m) => m.DashboardV2Component),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
  },
];
```

Options: `key`, `defaultValue`, `expectedVariant` (a string or array: match a variant instead of a boolean), `invert`, `redirectTo` (a URL string or `UrlTree`), and `context` / `defaults`. Guards wait for the flags to load.

To configure a route from its data instead:

```ts
{
  path: 'new-dashboard',
  canActivate: [ZenmanageFlagGuard],
  data: { zenmanageFlag: { key: 'dashboard-v2', redirectTo: '/dashboard' } },
}
```

## Usage Patterns

### Context-Based Targeting

```ts
import { Attribute, Context } from '@zenmanage/sdk';

export const currentUser = signal<Context | undefined>(undefined);

provideZenmanage({ environmentToken: 'cli_your_client_key_here', context: currentUser });

// When someone signs in:
const context = Context.single('user', user.id);
context.addAttribute(new Attribute('plan', [user.plan]));
currentUser.set(context);
```

Every flag on screen re-evaluates for the new user. Setting `undefined` on sign-out means "no context".

### When The API Is Unreachable

A flag the API can't answer resolves to the default you passed, so choose one that is safe to run with:

```ts
const checkout = injectBooleanFlag('new-checkout', false);
```

`isLoading` turns false, `value()` is the default, and the service's `error()` is set.

## Server-Side Rendering

With Angular SSR the server evaluates flags while it renders, waits for them, and hands the values the page read to the browser through `TransferState`. The browser's first render matches the server HTML. See [docs/SSR.md](docs/SSR.md) for the setup.

```ts
// app.config.server.ts: a server key (srv_...), from the environment
provideZenmanage({ environmentToken: process.env['ZENMANAGE_SERVER_KEY'] ?? '' });
```

For server code that isn't a component (an API route, middleware), use `getFlagValue`, `getServerFlag`, `getServerFlags`, and `getBootstrapPayload`.

## Examples

See [examples/README.md](examples/README.md) for short, type-checked samples and a standalone application with routing, guards, and SSR.

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
- `npm run test:smoke` packs the build, installs it in a copy of [examples/smoke-app](examples/smoke-app) and runs it (set `SMOKE_ANGULAR_VERSION` to try another Angular version)

## Releases

Releases go out through Changesets; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
