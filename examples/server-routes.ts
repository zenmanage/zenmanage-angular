import { getBootstrapPayload, getFlagValue } from '@zenmanage/angular';

const environmentToken = process.env['ZENMANAGE_SERVER_KEY'] ?? '';

// Server code that isn't an Angular component (an API route, middleware) can read flags too.
// These helpers share one client per configuration, so a request reuses the rules the one
// before it fetched.
export async function maintenanceMode(): Promise<boolean> {
  return getFlagValue({ environmentToken, key: 'maintenance-mode' }, false);
}

export async function publicFlags() {
  return getBootstrapPayload({ environmentToken, keys: ['new-dashboard', 'checkout-flow'] });
}
