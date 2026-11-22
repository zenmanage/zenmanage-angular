import { APP_INITIALIZER } from '@angular/core';
import { Context, DefaultsCollection, Zenmanage } from '@zenmanage/sdk';
import { describe, expect, it, vi } from 'vitest';
import {
  createZenmanageClient,
  createZenmanageFlagManager,
  createZenmanageProviders,
  provideZenmanage,
} from '../src/lib/providers';
import { createMockFlagManager } from './test-utils';

function getInitializerFactory(providers: unknown[]): (...args: unknown[]) => () => Promise<void> {
  const initializerProvider = providers.find(
    (provider) =>
      typeof provider === 'object' &&
      provider !== null &&
      'provide' in provider &&
      (provider as { provide?: unknown }).provide === APP_INITIALIZER
  );

  if (
    !initializerProvider ||
    typeof (initializerProvider as { useFactory?: unknown }).useFactory !== 'function'
  ) {
    throw new Error('APP_INITIALIZER provider not found');
  }

  return (initializerProvider as { useFactory: (...args: unknown[]) => () => Promise<void> })
    .useFactory;
}

describe('providers', () => {
  it('returns the provided client when one is passed', () => {
    const client = { flags: vi.fn() } as unknown as Zenmanage;

    const result = createZenmanageClient({
      client,
      preload: false,
    });

    expect(result).toBe(client);
  });

  it('throws when neither client nor environment token is provided', () => {
    expect(() => createZenmanageClient({ preload: false })).toThrow(
      'Zenmanage Angular requires either a client or an environmentToken.'
    );
  });

  it('builds a client from environment token options', () => {
    const client = createZenmanageClient({
      environmentToken: 'srv_test_server_key',
      apiEndpoint: 'https://api.zenmanage.com',
      cacheTtl: 90,
      enableUsageReporting: false,
      preload: false,
    });

    expect(client).toBeInstanceOf(Zenmanage);
  });

  it('applies context and defaults while building the manager', () => {
    const manager = createMockFlagManager();
    const client = {
      flags: vi.fn(() => manager),
    } as unknown as Zenmanage;

    const context = Context.single('user', '123');
    const defaults = DefaultsCollection.fromObject({
      'checkout-v2': true,
    });

    const result = createZenmanageFlagManager(client, { context, defaults, preload: false });

    expect(client.flags).toHaveBeenCalledTimes(1);
    expect(manager.withContext).toHaveBeenCalledWith(context);
    expect(manager.withDefaults).toHaveBeenCalledWith(defaults);
    expect(result).toBe(manager);
  });

  it('creates APP_INITIALIZER that preloads flags by default', async () => {
    const options = {
      environmentToken: 'srv_test_server_key',
    };

    const providers = createZenmanageProviders(options);
    const initializerFactory = getInitializerFactory(providers);

    const service = {
      preload: vi.fn(async () => undefined),
    };

    const runInitializer = initializerFactory(service, { preload: true });
    await runInitializer();

    expect(service.preload).toHaveBeenCalledTimes(1);
  });

  it('creates APP_INITIALIZER that skips preload when disabled', async () => {
    const providers = createZenmanageProviders({
      environmentToken: 'srv_test_server_key',
      preload: false,
    });
    const initializerFactory = getInitializerFactory(providers);

    const service = {
      preload: vi.fn(async () => undefined),
      markReadyWithoutPreload: vi.fn(),
    };

    const runInitializer = initializerFactory(service, { preload: false });
    await runInitializer();

    expect(service.markReadyWithoutPreload).toHaveBeenCalledTimes(1);
    expect(service.preload).not.toHaveBeenCalled();
  });

  it('calls onError callback when preload fails in initializer', async () => {
    const onError = vi.fn();
    const providers = createZenmanageProviders({
      environmentToken: 'srv_test_server_key',
      preload: true,
      onError,
    });
    const initializerFactory = getInitializerFactory(providers);

    const service = {
      preload: vi.fn(async () => {
        throw new Error('preload failed');
      }),
    };

    const runInitializer = initializerFactory(service, { preload: true, onError });
    await runInitializer();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('creates environment providers for standalone bootstrap', () => {
    const providers = provideZenmanage({
      environmentToken: 'srv_test_server_key',
      preload: false,
    });

    expect(providers).toBeDefined();
  });
});
