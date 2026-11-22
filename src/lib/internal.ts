import type { Signal } from '@angular/core';
import type { FlagManager, FlagValue } from '@zenmanage/sdk';

/**
 * Bookkeeping the flag helpers share with the service. Kept out of the service's public type:
 * it isn't API.
 */
export interface ServiceInternals {
  /** The flags `injectFlag` and the directives have read, for the bootstrap payload. */
  evaluated: Map<string, FlagValue>;
  /**
   * Which flags the loaded rules contain, or `null` until they have loaded. Tells "the live
   * value" apart from "the SDK fell back to the default because nothing loaded".
   */
  live: Signal<ReadonlySet<string> | null>;
  /**
   * The manager the bootstrap payload was evaluated for. Once the context or defaults change
   * the service has another one, and the server's values no longer apply to it.
   */
  seedManager: FlagManager;
}

const internals = new WeakMap<object, ServiceInternals>();

export function registerInternals(service: object, value: ServiceInternals): void {
  internals.set(service, value);
}

export function internalsOf(service: object): ServiceInternals {
  const value = internals.get(service);

  if (!value) {
    throw new Error('This Zenmanage service was not created by provideZenmanage().');
  }

  return value;
}
