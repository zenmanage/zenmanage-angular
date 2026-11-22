# Zenmanage Angular SDK Examples

This directory contains examples that mirror the core JavaScript SDK use-cases while using Angular patterns.

## Setup

```bash
npm install
export ZENMANAGE_ENVIRONMENT_TOKEN="cli_your_client_key_here"
```

## Examples

### simple-flags.ts
Basic service-based flag evaluation in an Angular component.

### context-based-flags.ts
Context-aware targeting using `Context` and `Attribute`.

### ab-testing.ts
Variant-driven rendering and experiment branching.

### defaults.ts
Default values and `DefaultsCollection` fallback behavior.

### caching.ts
Cache TTL and usage reporting setup via `provideZenmanage`.

### percentage-rollouts.ts
Deterministic rollout evaluation using context identifiers.

### angular-app/
Standalone Angular application sample showing provider setup, directives, and route guards.
