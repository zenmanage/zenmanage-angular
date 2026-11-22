import { InjectionToken, makeStateKey } from '@angular/core';
import type { Zenmanage } from '@zenmanage/sdk';
import type { BootstrapPayload, ZenmanageAngularOptions } from './types';

export const ZENMANAGE_OPTIONS = new InjectionToken<ZenmanageAngularOptions>('ZENMANAGE_OPTIONS');

export const ZENMANAGE_CLIENT = new InjectionToken<Zenmanage>('ZENMANAGE_CLIENT');

/** The `TransferState` key the server's flag values travel under. */
export const ZENMANAGE_STATE_KEY = makeStateKey<BootstrapPayload>('zenmanage-flags');
