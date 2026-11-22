import type {
  Context,
  DefaultsCollection,
  Flag,
  FlagManager,
  FlagValue,
  Zenmanage,
} from '@zenmanage/sdk';
import type { UrlTree } from '@angular/router';

export type PrimitiveFlagValue = boolean | string | number;

export interface FlagEvaluationOptions {
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ZenmanageAngularOptions {
  client?: Zenmanage;
  environmentToken?: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  context?: Context;
  defaults?: DefaultsCollection;
  preload?: boolean;
  onError?: (error: Error) => void;
}

export interface ZenmanageServiceState {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
}

export interface ZenmanageRouteFlagOptions extends FlagEvaluationOptions {
  key: string;
  defaultValue?: FlagValue;
  expectedVariant?: string | string[];
  invert?: boolean;
  redirectTo?: string | UrlTree;
}

export interface FlagResolutionResult<T extends PrimitiveFlagValue = PrimitiveFlagValue> {
  key: string;
  value: T;
  flag: Flag;
}

export interface ZenmanageRuntimeSnapshot {
  client: Zenmanage;
  manager: FlagManager;
  state: ZenmanageServiceState;
}
