#!/usr/bin/env node
// Packs this package, installs the tarball in a copy of examples/smoke-app, and runs the app's
// checks there. A copy, so the smoke app resolves @angular/* and @zenmanage/sdk from its own
// node_modules, exactly as a user's project would, not from this repository's.
//
//   npm run build && node scripts/smoke.mjs
//   SMOKE_ANGULAR_VERSION=20 node scripts/smoke.mjs   # another Angular major (20 is the oldest supported)
//
// It runs, in order: an AOT compile of the app with strict templates, a compile of a
// deliberately wrong template that must FAIL (so the first check can't pass vacuously), and the
// app's vitest suite (client-side, server rendering, starting from the server payload).

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const angularVersion = process.env.SMOKE_ANGULAR_VERSION;
const work = mkdtempSync(join(tmpdir(), 'zenmanage-angular-smoke-'));
const appDir = join(work, 'app');

const ANGULAR_PACKAGES = [
  'core',
  'common',
  'compiler',
  'compiler-cli',
  'platform-browser',
  'platform-server',
  'router',
];

// Each Angular major supports a narrow TypeScript range (see compiler-cli's peerDependencies).
const TYPESCRIPT_FOR_ANGULAR = { 20: '~5.9.0', 21: '~5.9.0', 22: '~6.0.0' };

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function installedVersion(name) {
  return JSON.parse(readFileSync(join(appDir, 'node_modules', name, 'package.json'), 'utf8'))
    .version;
}

try {
  run('npm', ['pack', '--pack-destination', work, '--silent'], { cwd: root });
  const tarball = join(
    work,
    readdirSync(work).find((name) => name.endsWith('.tgz'))
  );

  cpSync(join(root, 'examples', 'smoke-app'), appDir, {
    recursive: true,
    filter: (source) => !source.includes('node_modules'),
  });

  // Pin Angular (and the TypeScript it needs) in the copy's package.json, so one install
  // resolves everything together: the Angular packages pin each other.
  if (angularVersion) {
    const major = Number.parseInt(angularVersion, 10);
    const typescript = TYPESCRIPT_FOR_ANGULAR[major];

    if (!typescript) {
      throw new Error(
        `SMOKE_ANGULAR_VERSION=${angularVersion}: no TypeScript version known for Angular ${major}. ` +
          'Add it to TYPESCRIPT_FOR_ANGULAR in scripts/smoke.mjs.'
      );
    }

    const manifestPath = join(appDir, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const name of ANGULAR_PACKAGES) {
      manifest.devDependencies[`@angular/${name}`] = angularVersion;
    }
    manifest.devDependencies.typescript = typescript;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  run('npm', ['install', '--no-audit', '--no-fund', tarball], { cwd: appDir });

  console.log(
    `\nSmoke test against Angular ${installedVersion('@angular/core')}, ` +
      `TypeScript ${installedVersion('typescript')}, @zenmanage/sdk ${installedVersion('@zenmanage/sdk')}, ` +
      `@zenmanage/angular ${installedVersion('@zenmanage/angular')} (packed)\n`
  );

  run('npx', ['ngc', '-p', 'tsconfig.aot.json', '--noEmit'], { cwd: appDir });

  // The negative control: templates that must not type-check.
  console.log('$ npx ngc -p tsconfig.aot-negative.json --noEmit   (expected to fail)');
  let rejected = '';
  try {
    execFileSync('npx', ['ngc', '-p', 'tsconfig.aot-negative.json', '--noEmit'], {
      cwd: appDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    rejected = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  if (!rejected.includes('bad.component.ts') || !rejected.includes('is not assignable')) {
    throw new Error(
      'The deliberately wrong templates in aot-negative/ compiled: the package typings do not ' +
        `constrain the directives' inputs.\n${rejected}`
    );
  }
  console.log(`  rejected as expected:\n${rejected.trim().replace(/^/gm, '    ')}\n`);

  run('npx', ['vitest', 'run'], { cwd: appDir });
} finally {
  rmSync(work, { recursive: true, force: true });
}
