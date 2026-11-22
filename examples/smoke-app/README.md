# Smoke App

This app checks that the packed `@zenmanage/angular` tarball works as a real dependency of a standalone Angular app. It runs the real `@zenmanage/sdk`; only the network is faked (`tests/fakeApi.ts`, an in-memory Zenmanage API).

`scripts/smoke.mjs` packs the package, copies this app to a temp directory, installs the tarball there and runs the checks, so Angular and `@zenmanage/sdk` resolve from the app's own `node_modules`, as in a user's project.

It covers:

- **AOT, strict templates** (`tsconfig.aot.json`, `ngc --noEmit`): the app's templates use `*zenmanageIfFlag` (`else`, `loading`, `default`) and `*zenmanageIfVariant` (`is`, `else`, `default`), so a typing regression in the published `.d.ts` fails the run. `aot-negative/` holds templates that must NOT compile; the script fails if they do, so the check can't pass vacuously.
- **A client-side app** (`tests/spa.test.ts`, jsdom, zoneless): `injectFlag`, `injectConfig`, `injectBooleanFlag`, `injectVariant`, both directives, `refresh()`, an unreachable API, and `canActivateFlag`, `canMatchFlag` and `ZenmanageFlagGuard` on real routes. Every default in the app differs from the fake API's value.
- **zone.js** (`tests/zone.test.ts`): the same page in an app that still runs with zone.js.
- **Server rendering** (`tests/ssr.test.ts`, Node): `renderApplication` with a `srv_` key. The HTML carries the real values, the serialized `ng-state` holds the payload, and the key never reaches the page.
- **Starting from the server payload** (`tests/hydration.test.ts`, jsdom): `bootstrapApplication` with `TransferState` pre-seeded. The first render shows the server's values while the rules are held back, then the live values replace them. It does not use `provideClientHydration`.

Run from the package root, after `npm run build`:

```bash
npm run test:smoke
```

`SMOKE_ANGULAR_VERSION=20 npm run test:smoke` runs it on another Angular major (20 is the oldest this package supports; 20, 21 and 22 are known). The script pairs each with the TypeScript version its compiler needs.
