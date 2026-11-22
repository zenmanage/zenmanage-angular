import {
  APP_INITIALIZER,
  EnvironmentProviders,
  Provider,
  makeEnvironmentProviders,
} from '@angular/core';
import { ConfigBuilder, FlagManager, Zenmanage } from '@zenmanage/sdk';
import { ZENMANAGE_CLIENT, ZENMANAGE_FLAG_MANAGER, ZENMANAGE_OPTIONS } from './tokens';
import type { ZenmanageAngularOptions } from './types';
import { ZenmanageFlagsService } from './zenmanage-flags.service';

function normalizeOptions(options: ZenmanageAngularOptions): ZenmanageAngularOptions {
  return {
    preload: true,
    ...options,
  };
}

export function createZenmanageClient(options: ZenmanageAngularOptions): Zenmanage {
  if (options.client) {
    return options.client;
  }

  if (!options.environmentToken) {
    throw new Error('Zenmanage Angular requires either a client or an environmentToken.');
  }

  const builder = ConfigBuilder.create().withEnvironmentToken(options.environmentToken);

  if (options.apiEndpoint) {
    builder.withApiEndpoint(options.apiEndpoint);
  }

  if (typeof options.cacheTtl === 'number') {
    builder.withCacheTtl(options.cacheTtl);
  }

  if (typeof options.enableUsageReporting === 'boolean') {
    builder.withUsageReporting(options.enableUsageReporting);
  }

  return new Zenmanage(builder.build());
}

export function createZenmanageFlagManager(
  client: Zenmanage,
  options: ZenmanageAngularOptions
): FlagManager {
  let manager = client.flags();

  if (options.context) {
    manager = manager.withContext(options.context);
  }

  if (options.defaults) {
    manager = manager.withDefaults(options.defaults);
  }

  return manager;
}

export function createZenmanageProviders(options: ZenmanageAngularOptions): Provider[] {
  return [
    {
      provide: ZENMANAGE_OPTIONS,
      useValue: normalizeOptions(options),
    },
    {
      provide: ZENMANAGE_CLIENT,
      useFactory: createZenmanageClient,
      deps: [ZENMANAGE_OPTIONS],
    },
    {
      provide: ZENMANAGE_FLAG_MANAGER,
      useFactory: createZenmanageFlagManager,
      deps: [ZENMANAGE_CLIENT, ZENMANAGE_OPTIONS],
    },
    ZenmanageFlagsService,
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [ZenmanageFlagsService, ZENMANAGE_OPTIONS],
      useFactory: (service: ZenmanageFlagsService, normalizedOptions: ZenmanageAngularOptions) => {
        return async (): Promise<void> => {
          if (normalizedOptions.preload === false) {
            service.markReadyWithoutPreload();
            return;
          }

          try {
            await service.preload();
          } catch (error) {
            normalizedOptions.onError?.(error as Error);
          }
        };
      },
    },
  ];
}

export function provideZenmanage(options: ZenmanageAngularOptions): EnvironmentProviders {
  return makeEnvironmentProviders(createZenmanageProviders(options));
}
