# Angular app example

A standalone Angular application using:

- `provideZenmanage(...)` for setup, with a client key in the browser and a server key on the server
- `injectVariant` and the `*zenmanageIfFlag` / `*zenmanageIfVariant` directives
- `canActivateFlag(...)` to gate a route
- Angular SSR: the server renders with the real flag values and hands them to the browser through `TransferState`

## Files

- `src/main.ts`: browser entry
- `src/main.server.ts`: server entry
- `src/app/app.config.ts`, `src/app/app.config.server.ts`: providers for each side
- `src/app/app.component.ts`, `src/app/app.routes.ts`, `src/app/beta.component.ts`

## How to use

Create an Angular app with the Angular CLI (add `--ssr` for server rendering), install `@zenmanage/angular` and `@zenmanage/sdk`, and copy these files in. Put your server key in the `ZENMANAGE_SERVER_KEY` environment variable on the server.
