# @zenmanage/angular

## 1.0.0

First public release. The API below is the 1.0 surface, and semantic versioning applies from here. The Changed, Removed, and Fixed entries are relative to the internal 0.1.0 snapshot.

### Added

- `provideZenmanage`, `ZenmanageModule.forRoot`, `ZenmanageFlagsService`, the `*zenmanageIfFlag` and `*zenmanageIfVariant` directives, and the `canActivateFlag`, `canMatchFlag`, and `ZenmanageFlagGuard` route guards.
- `injectFlag`, `injectBooleanFlag`, `injectVariant`, and `injectConfig`, which return signals for the value, loading state, error, and the SDK's `Flag`.
- JSON flags. Pass an object or array as the default to `injectFlag` or `injectConfig` and read the flag's JSON value. `ZenmanageFlagsService.getValue` reads them too.
- Reactive keys, context, and defaults. `injectFlag` takes a signal or function for the key, the default, and its own context, and `provideZenmanage`'s `context` and `defaults` options take a signal or function. Changing any of them re-evaluates every flag on screen.
- The package identifies itself to the API as `zenmanage-angular/<version>` instead of the base SDK's `zenmanage-javascript`. This relies on `ConfigBuilder.withClientAgent()` from `@zenmanage/sdk` 3.5.0.
- Angular SSR. The server evaluates flags while it renders and waits for them (through `PendingTasks`), then hands the flags the page read to the browser through `TransferState`. The browser starts from them, so its first render matches the server HTML. Once the browser's rules load, its own evaluation replaces the server's value; if they never load, the server's value stays. Set `transferContext` to send the user's context too. A flag read for a context of its own is left out of the payload, and the server's values stop serving as fallbacks once the context changes. See `docs/SSR.md`.
- `getFlagValue`, `getServerFlag`, `getServerFlags`, `getBootstrapPayload`, `createServerManager`, `createServerClient`, and `clearServerClients` for server code outside a component. On a server `provideZenmanage` and these helpers share one client per configuration, so a request reuses the rules the one before it fetched. Server clients cache rules for 60 seconds unless you set `cacheTtl`.
- `ZenmanageFlagsService.revision`, `whenReady()`, `preload()`, `refresh()`, and `getBootstrapPayload()`, and signals for `isReady`, `isLoading`, `error`, `manager`, `context`, and `defaults`.
- A `loading` template for both directives, and `default`, `invert`, and `context` inputs on both.
- Works zone-based and zoneless, on Angular 20, 21, and 22.

### Changed

- Angular 20 or newer and `@zenmanage/sdk` 3.5.1 or newer are now required. Angular 17 to 19 are no longer supported.
- The first load starts when the application does, but it no longer blocks application startup. Before, an `APP_INITIALIZER` waited for it. Components show `isLoading` until the flags are in.
- Evaluations wait for the first load, so every consumer reads from the same cache. Before, each could trigger its own rules fetch.
- A result only counts for the key and context that produced it. Before, a slow response for an old key or context could overwrite a newer one.
- `refresh()` re-fetches rules from the API and re-evaluates every consumer. Before, it re-read the cache. A refresh doesn't set `isLoading`, so the directives keep their content mounted while it runs.
- A failed first load settles on the defaults, sets `error`, and calls `onError`, instead of leaving consumers waiting.
- `injectFlag('k', false).value()` is typed `boolean`, and `injectFlag('k', 'control').value()` is `string`. The literal default doesn't leak into the type.
- The directives evaluate with signals, and render their `else` template for a flag that is off. They show the `loading` template (or nothing) until the first value arrives. Before, they showed nothing until a promise resolved, and rendered `else` when an evaluation threw.
- `*zenmanageIfFlag`'s `default` input is a boolean.
- `ZenmanageFlagsService` exposes the client as `client` and the manager as the `manager()` signal.
- The package root points at the built output, so `npm publish` from the repository root ships a working package.

### Removed

- `getRuntimeSnapshot()`, `markReadyWithoutPreload()`, the `ZENMANAGE_FLAG_MANAGER` token, and `createZenmanageProviders`, `createZenmanageFlagManager`, `createZenmanageClient`. Use the service's signals and `provideZenmanage`.
- `docs/PUBLISHING.md`. Releases go out through Changesets; see `CONTRIBUTING.md`.

### Fixed

- `npm publish` shipped a package whose root `package.json` had no entry point.

## 0.1.0

### Added

- Initial Angular SDK package built on top of `@zenmanage/sdk`.
- `provideZenmanage` standalone provider factory and `ZenmanageModule.forRoot` support.
- `ZenmanageFlagsService` for flag evaluation and refresh.
- `ZenmanageIfFlagDirective` and `ZenmanageIfVariantDirective` structural directives.
- Route guard helpers: `canActivateFlag`, `canMatchFlag`, and class-based `ZenmanageFlagGuard`.
