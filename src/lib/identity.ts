/** The client agent the API registers this package under (see the api's EnsureClientAgentIsValid). */
export const CLIENT_AGENT = 'zenmanage-angular';

/**
 * This package's version, reported to the API as `zenmanage-angular/<version>`. ng-packagr can't
 * bundle `package.json`, so `scripts/sync-version.mjs` keeps this in step with it (the
 * `version-packages` script runs it, and a unit test fails when they differ).
 */
export const PACKAGE_VERSION = '1.0.0';
