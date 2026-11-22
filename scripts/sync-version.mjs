#!/usr/bin/env node
// Writes package.json's version into src/lib/identity.ts. Run by `npm run version-packages`
// right after Changesets bumps the version, so the client agent never reports a stale one.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const file = join(root, 'src', 'lib', 'identity.ts');
const source = readFileSync(file, 'utf8');
const updated = source.replace(
  /export const PACKAGE_VERSION = '[^']*';/,
  `export const PACKAGE_VERSION = '${version}';`
);

if (updated === source && !source.includes(`'${version}'`)) {
  throw new Error('Could not find PACKAGE_VERSION in src/lib/identity.ts.');
}

writeFileSync(file, updated);
console.log(`PACKAGE_VERSION is ${version}`);
