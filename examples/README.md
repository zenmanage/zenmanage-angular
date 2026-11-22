# Zenmanage Angular SDK examples

Short, type-checked samples (`npm run type-check` compiles them with `ngc` and strict templates). Each file is self-contained; copy what you need.

| File                     | Shows                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `simple-flags.ts`        | `injectBooleanFlag`, `injectVariant`, `injectConfig` and `*zenmanageIfFlag`           |
| `json-flags.ts`          | JSON flags: an object or array default                                                |
| `context-based-flags.ts` | A signal for the current user, a context per flag, evaluating in code                 |
| `ab-testing.ts`          | `*zenmanageIfVariant` and `injectVariant`                                             |
| `defaults.ts`            | Fallback values with a `DefaultsCollection` and inline defaults                       |
| `caching.ts`             | `cacheTtl`, usage reporting, `refresh()`                                              |
| `percentage-rollouts.ts` | Rollouts bucket by the context's identifier                                           |
| `ssr.ts`                 | Angular SSR: a server key on the server, a client key in the browser, `TransferState` |
| `server-routes.ts`       | Reading flags in server code that isn't a component                                   |
| `angular-app/`           | A standalone application with routing, directives, guards and SSR                     |

Use a client key (`cli_...`) in the browser and a server key (`srv_...`) on a server. `@zenmanage/sdk` refuses the wrong one in each place.
