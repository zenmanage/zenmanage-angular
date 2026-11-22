# Server-Side Rendering

How `@zenmanage/angular` works with Angular SSR (`@angular/ssr`, or `renderApplication` from `@angular/platform-server`).

## How it works

1. On the server, `injectFlag` and the directives evaluate flags while Angular renders. Each evaluation holds a `PendingTask`, so the server waits for the flags before it serializes the page, and the HTML carries the real values. This works with and without zone.js.
2. When the page is serialized, the service writes the flags the page read into `TransferState`, under `ZENMANAGE_STATE_KEY`. They travel in the `ng-state` script tag with the rest of Angular's transferred state.
3. In the browser, the service reads that payload. The first render matches the server HTML, so there is no flash of the default value. Once the browser's rules load, its own evaluation replaces the server's value. If they never load (a blocked CDN, no network), the server's value stays.

Keys:

- The server needs a server key (`srv_...`), from a server-only environment variable.
- The browser needs a client key (`cli_...`).
- `@zenmanage/sdk` refuses the wrong one in each place. A `srv_` key must never reach the browser.

On a server `provideZenmanage` shares one client per configuration, so a request reuses the rules the one before it fetched. Rules are cached for 60 seconds unless you set `cacheTtl`.

## Setup

Keep the two keys in two files so the server key stays out of the browser bundle.

`app.config.ts` (browser):

```ts
import type { ApplicationConfig } from '@angular/core';
import { provideZenmanage } from '@zenmanage/angular';

export const appConfig: ApplicationConfig = {
  providers: [provideZenmanage({ environmentToken: 'cli_your_client_key_here' })],
};
```

`app.config.server.ts` (server). Providers merged later win, so this replaces the browser's client key:

```ts
import { mergeApplicationConfig, type ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideZenmanage } from '@zenmanage/angular';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideZenmanage({ environmentToken: process.env['ZENMANAGE_SERVER_KEY'] ?? '' }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

Then use `injectFlag`, the directives, and the guards in any component, as in a browser-only app.

Only flags read through `injectFlag` (and the directives, which use it) travel to the browser. A flag a route guard or a `ZenmanageFlagsService` call read isn't part of the payload, so the browser evaluates it itself.

## The user context

To evaluate for the signed-in user on the server, pass a `context` to the server's `provideZenmanage`. The payload leaves the context out by default, since it can carry personal data. The browser needs its own context for the same user. Either build it again from the session, or send the server's:

```ts
provideZenmanage({
  environmentToken: process.env['ZENMANAGE_SERVER_KEY'] ?? '',
  context: () => contextForRequest(),
  transferContext: true,
});
```

With no `context` option, the browser's service then evaluates for the context in the payload. A flag with a `context` of its own never starts from the server's value, since the server answered for another context.

## Options

- `transferState: false` turns the transfer off on both sides.
- `bootstrap: payload` starts the browser from a payload you carried yourself; `bootstrap: null` ignores `TransferState`.

## Without a component

To read flags in server code that isn't an Angular app (an API route, middleware), use the helpers. They share the same clients:

```ts
import { getBootstrapPayload, getFlagValue } from '@zenmanage/angular';

const enabled = await getFlagValue({ environmentToken, key: 'new-checkout', context }, false);

// Every flag in the environment, or just the ones you name
const payload = await getBootstrapPayload({ environmentToken, context, keys: ['new-checkout'] });
```

`getFlagValue` uses its second argument as the default for a flag that doesn't exist or when the API can't be reached.
