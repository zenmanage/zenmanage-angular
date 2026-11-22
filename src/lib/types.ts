import type { Signal } from '@angular/core';
import type { UrlTree } from '@angular/router';
import type {
  Context,
  ContextData,
  DefaultsCollection,
  Flag,
  FlagValue,
  Logger,
  Zenmanage,
} from '@zenmanage/sdk';

export type PrimitiveFlagValue = boolean | string | number;

/** A plain value, or a signal or function that returns it. Read it inside an effect to track changes. */
export type MaybeSource<T> = T | (() => T);

/**
 * Widens a literal default (`false`, `'control'`, `1500`) to its primitive type, so
 * `injectFlag('k', false).value()` is `boolean` rather than the literal `false`. Object and
 * array defaults (JSON flags) pass through unchanged.
 */
export type WidenFlagValue<T extends FlagValue> = T extends boolean
  ? boolean
  : T extends number
    ? number
    : T extends string
      ? string
      : T;

/** Server cache TTL (seconds) when none is given. Short, so a long-running server picks up flag changes. */
export const DEFAULT_SERVER_CACHE_TTL = 60;

/** What the server evaluated, handed to the browser through Angular's `TransferState`. */
export interface BootstrapPayload {
  version: 1;
  generatedAt: string;
  flags: Record<string, FlagValue>;
  context?: ContextData;
}

export interface BuildBootstrapPayloadOptions {
  context?: Context;
  generatedAt?: Date;
}

export interface RuntimeBootstrapOptions {
  /** Flags to include. Defaults to the flags the page read while rendering. */
  keys?: string[];
  /** Also send the evaluation context, so the browser evaluates for the same user. Off by default. */
  includeContext?: boolean;
}

export interface FlagEvaluationOptions {
  /** Evaluate for this context instead of the one given to `provideZenmanage`. */
  context?: Context;
  /** Fallback values for this call. */
  defaults?: DefaultsCollection;
}

export interface ZenmanageAngularOptions {
  /** An existing client. When set, `environmentToken` and the other client options are ignored. */
  client?: Zenmanage;
  environmentToken?: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  logger?: Logger;
  /** Base context for every evaluation. Pass a signal or function to change it while the app runs. */
  context?: MaybeSource<Context | undefined>;
  /** Fallback values. Pass a signal or function to change them while the app runs. */
  defaults?: MaybeSource<DefaultsCollection | undefined>;
  /** Load every flag when the app starts (default: `true`). */
  preload?: boolean;
  /**
   * What the server evaluated, for the first render in the browser. When it's left out the
   * service reads it from `TransferState`; pass `null` to skip that.
   */
  bootstrap?: BootstrapPayload | null;
  /**
   * Hand the flags the page read to the browser through `TransferState` when rendering on a
   * server, and start from them in the browser (default: `true`).
   */
  transferState?: boolean;
  /** Also transfer the evaluation context. Off by default: it can carry personal data. */
  transferContext?: boolean;
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

export interface FlagResolutionResult<T extends FlagValue = FlagValue> {
  key: string;
  value: WidenFlagValue<T>;
  flag: Flag;
}

export interface InjectFlagOptions {
  /** Evaluate for this context instead of the service's. Compared by content. */
  context?: MaybeSource<Context | undefined>;
}

export interface FlagResult<T extends FlagValue> {
  key: Signal<string>;
  /** The flag's value, or the default until it has resolved. */
  value: Signal<T>;
  flag: Signal<Flag | null>;
  /** `true` until the first value for the current key and context has landed. */
  isLoading: Signal<boolean>;
  error: Signal<Error | null>;
  /** Re-fetches rules from the API; `value` updates once the re-evaluation lands. */
  refresh: () => Promise<void>;
}

export interface VariantResult {
  key: Signal<string>;
  variant: Signal<string>;
  flag: Signal<Flag | null>;
  isLoading: Signal<boolean>;
  error: Signal<Error | null>;
  refresh: () => Promise<void>;
}

export interface AngularZenmanageClientOptions {
  environmentToken: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  logger?: Logger;
}

export interface ServerFlagInput extends AngularZenmanageClientOptions {
  key: string;
  defaultValue?: FlagValue;
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ServerFlagsInput extends AngularZenmanageClientOptions {
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ServerBootstrapInput extends ServerFlagsInput {
  /** Flags to include. Defaults to every flag in the environment. */
  keys?: string[];
  /** Also send the context, so the browser evaluates for the same user. Off by default. */
  includeContext?: boolean;
}
