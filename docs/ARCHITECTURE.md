# Architecture

The Angular SDK is a thin integration layer over `@zenmanage/sdk`.

## Layers

1. Core runtime (from `@zenmanage/sdk`): `Zenmanage`, `FlagManager`, `Context`, `DefaultsCollection`. It evaluates flags and owns the rules cache.
2. Angular integration (this package):
   - `provideZenmanage` and its DI tokens
   - `ZenmanageFlagsService`: loads, evaluates, and refreshes, and exposes the state as signals
   - `injectFlag` and friends: signals for one flag
   - the structural directives and route guards, which sit on top of those
   - server helpers for code that isn't a component

## Runtime Flow

1. `provideZenmanage` registers the options, a client, and the service. An environment initializer creates the service, which starts the first load right away (and holds a `PendingTask`, so a server render and `whenStable()` wait for it).
2. The service owns one flag manager for the current context and defaults. The manager is replaced only when their _content_ changes, never for an equal-but-new `Context`.
3. Every evaluation waits for the manager's first load, so all consumers read from a warm cache and the rules are fetched once.
4. `injectFlag` evaluates in an `effect` that tracks the key, default, context, manager, and `revision`. A result is kept only for the key, manager, and context that produced it.
5. `refresh()` re-fetches the rules, then bumps `revision`; consumers re-evaluate without going back to loading.
6. The directives and guards use the same pieces: the directives render from an `injectFlag`, the guards call the service.

## Server rendering

See [SSR.md](SSR.md). On a server the service shares one client per configuration across requests, evaluates while the page renders, and registers a `TransferState.onSerialize` callback that writes the flags the page read. In the browser the service reads that payload and `injectFlag` seeds its first value from it.

## Why extend `@zenmanage/sdk`

Flag evaluation stays in one place and is identical across the JavaScript, React, Vue, Next.js, and Angular SDKs, while Angular code gets signals, templates, and routing that feel native.
