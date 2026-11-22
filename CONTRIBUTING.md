# Contributing

Thanks for your interest in contributing to the Zenmanage Angular SDK.

## Development Setup

```bash
npm install
npm run validate
```

## Branching

- Create feature branches from `main`
- Keep pull requests focused and small
- Include tests for behavior changes

## Quality Requirements

Before opening a pull request:

```bash
npm run format
npm run lint
npm run type-check
npm run test:coverage
npm run build
npm run test:smoke
```

`test:smoke` packs the build, installs it in a copy of `examples/smoke-app` and runs the app's tests there, the way a user's project would. Set `SMOKE_ANGULAR_VERSION` (for example `20` or `latest`) to try another Angular version.

## Testing Guidelines

- Add tests for all public API changes
- Add regression tests for bug fixes
- Make a fallback in a test differ from the live value, so the fallback can't pass for it
- Compare rendered text, not HTML strings
- Keep coverage above configured thresholds

## Pull Request Checklist

- [ ] Code is formatted and lint-clean
- [ ] Type-check passes
- [ ] Tests pass with coverage
- [ ] README/docs are updated
- [ ] Changelog updated (if needed)

## Release Notes with Changesets

When your PR changes package behavior, add a changeset:

```bash
npm run changeset
```

This creates a file under `.changeset/` used by the automated release workflow. `npm run version-packages` also keeps `src/lib/identity.ts` in step with `package.json`; a test fails if the two differ.

If you write a `CHANGELOG.md` entry by hand instead, title the heading exactly `## X.Y.Z` with the real version in place of the placeholder (for example `## 1.0.0`): no brackets and no date. The release workflow copies the section with that heading into the GitHub Release, and falls back to the whole file when none matches.
