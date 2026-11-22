# Publishing Guide

## Prerequisites

- npm account with publish access to `@zenmanage/angular`
- Two-factor authentication enabled for npm publish
- Clean git working tree

## Release Checklist

1. Update `CHANGELOG.md`
2. Update `version` in `package.json`
3. Run full validation:
   ```bash
   npm ci
   npm run validate
   ```
4. Build package:
   ```bash
   npm run build
   ```
5. Inspect packed output:
   ```bash
   npm pack --dry-run
   ```
6. Publish:
   ```bash
   npm publish --access public
   ```
7. Create git tag matching version
8. Push commit + tag

## Notes

- Build output is generated using `ng-packagr` into `dist/`
- `prepublishOnly` runs `npm run validate`
