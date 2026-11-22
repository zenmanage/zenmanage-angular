import { InjectionToken } from '@angular/core';
import type { FlagManager, Zenmanage } from '@zenmanage/sdk';
import type { ZenmanageAngularOptions } from './types';

export const ZENMANAGE_OPTIONS = new InjectionToken<ZenmanageAngularOptions>('ZENMANAGE_OPTIONS');

export const ZENMANAGE_CLIENT = new InjectionToken<Zenmanage>('ZENMANAGE_CLIENT');

export const ZENMANAGE_FLAG_MANAGER = new InjectionToken<FlagManager>('ZENMANAGE_FLAG_MANAGER');
