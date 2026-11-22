# Architecture

The Angular SDK is a thin integration layer over `@zenmanage/sdk`.

## Layers

1. Core runtime (from `@zenmanage/sdk`):
   - `Zenmanage`
   - `FlagManager`
   - `Context` / `DefaultsCollection`
2. Angular integration (this package):
   - DI tokens and provider factory
   - `ZenmanageFlagsService`
   - structural directives
   - route guard helpers

## Runtime Flow

1. `provideZenmanage` or `ZenmanageModule.forRoot` creates DI providers.
2. Providers construct a `Zenmanage` client and configured `FlagManager`.
3. `APP_INITIALIZER` optionally preloads flags.
4. `ZenmanageFlagsService` executes evaluations and refreshes.
5. Directives and guards use the service for UI/routing decisions.

## Why Extend `@zenmanage/sdk`

This keeps feature evaluation logic centralized and identical across JavaScript and Angular consumers while exposing Angular-native APIs for templates and routing.
