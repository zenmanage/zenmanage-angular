import { isPlatformServer } from '@angular/common';
import {
  PLATFORM_ID,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  inject,
  type EnvironmentProviders,
} from '@angular/core';
import { createZenmanageClient } from './client';
import { ZENMANAGE_CLIENT, ZENMANAGE_OPTIONS } from './tokens';
import type { ZenmanageAngularOptions } from './types';
import { ZenmanageFlagsService } from './zenmanage-flags.service';

/**
 * Sets up Zenmanage for an application: the client, the flag service and the first load,
 * which starts with the application. Use it in `bootstrapApplication` or `ApplicationConfig`.
 */
export function provideZenmanage(options: ZenmanageAngularOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ZENMANAGE_OPTIONS, useValue: options },
    {
      provide: ZENMANAGE_CLIENT,
      useFactory: () => createZenmanageClient(options, isPlatformServer(inject(PLATFORM_ID))),
    },
    ZenmanageFlagsService,
    // Creating the service starts the load, so it doesn't wait for the first component.
    provideEnvironmentInitializer(() => {
      inject(ZenmanageFlagsService);
    }),
  ]);
}
