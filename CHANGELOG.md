# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-08

### Added

- Initial Angular SDK package built on top of `@zenmanage/sdk`.
- `provideZenmanage` standalone provider factory and `ZenmanageModule.forRoot` support.
- `ZenmanageFlagsService` for flag evaluation and refresh.
- `ZenmanageIfFlagDirective` and `ZenmanageIfVariantDirective` structural directives.
- Route guard helpers: `canActivateFlag`, `canMatchFlag`, and class-based `ZenmanageFlagGuard`.
- Full documentation and examples including a standalone Angular app integration sample.
- High coverage unit test suite with enforced thresholds.
