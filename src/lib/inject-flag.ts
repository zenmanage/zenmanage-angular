import {
  DestroyRef,
  assertInInjectionContext,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import type { Flag, FlagManager, FlagValue } from '@zenmanage/sdk';
import { internalsOf } from './internal';
import type {
  FlagResult,
  InjectFlagOptions,
  MaybeSource,
  VariantResult,
  WidenFlagValue,
} from './types';
import {
  ZenmanageFlagsService,
  coerceFlagValue,
  describeContext,
  readSource,
  toError,
} from './zenmanage-flags.service';

interface Resolution<T> {
  key: string;
  manager: FlagManager;
  contextSignature: string;
  flag: Flag | null;
  value: T;
  error: Error | null;
}

function sameKind(candidate: FlagValue, fallback: FlagValue): boolean {
  if (typeof fallback === 'object') {
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      Array.isArray(candidate) === Array.isArray(fallback)
    );
  }

  return typeof candidate === typeof fallback;
}

/**
 * Reads a flag as signals. Call it in an injection context (a constructor or a field
 * initializer). `key`, `defaultValue` and `options.context` accept a signal or a function, and
 * the signals update when any of them, the service's context or a refresh changes.
 *
 * The value is the default until the first evaluation has landed. A result only counts for
 * the key, context and flag manager that produced it, so switching any of them never shows the
 * previous answer. A refresh keeps the last value on screen while it re-evaluates.
 */
export function injectFlag<T extends FlagValue>(
  key: MaybeSource<string>,
  defaultValue: MaybeSource<T>,
  options: InjectFlagOptions = {}
): FlagResult<WidenFlagValue<T>> {
  assertInInjectionContext(injectFlag);

  const service = inject(ZenmanageFlagsService);
  const { evaluated, live, seedManager } = internalsOf(service);
  const currentKey = computed(() => readSource(key));
  const currentDefault = computed(() => readSource(defaultValue), {
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  const currentContext = computed(() => readSource(options.context));
  const contextSignature = computed(() => describeContext(currentContext()));
  const resolution = signal<Resolution<WidenFlagValue<T>> | null>(null);
  let evaluation = 0;
  let isDestroyed = false;

  inject(DestroyRef).onDestroy(() => {
    isDestroyed = true;
  });

  async function evaluate(): Promise<void> {
    evaluation += 1;
    const current = evaluation;
    const evaluatedKey = currentKey();
    const fallback = currentDefault();
    const signature = contextSignature();
    const context = currentContext();

    try {
      // Waits for the service's load, so every consumer reads from the same warm cache instead
      // of each triggering its own rules fetch. If the load failed, the SDK answers with the
      // default and the service's error is surfaced.
      const { flag, manager } = await service.evaluate(evaluatedKey, fallback, { context });

      if (current === evaluation && !isDestroyed) {
        const value = coerceFlagValue(flag, fallback);
        // The payload is what the page shows for the service's context. A flag read for a
        // context of its own would put another user's answer where the base context's belongs.
        if (context === undefined) {
          evaluated.set(evaluatedKey, value);
        }
        resolution.set({
          key: evaluatedKey,
          manager,
          contextSignature: signature,
          flag,
          value,
          error: null,
        });
      }
    } catch (error) {
      if (current === evaluation && !isDestroyed) {
        resolution.set({
          key: evaluatedKey,
          manager: untracked(service.manager),
          contextSignature: signature,
          flag: null,
          value: fallback as WidenFlagValue<T>,
          error: toError(error),
        });
      }
    }
  }

  // A result only counts for the key, manager and context that produced it. After any of them
  // changes, the previous result is ignored until the new one lands. A refresh keeps the last
  // value on screen while re-evaluating.
  const settled = computed(() => {
    const result = resolution();

    return result !== null &&
      result.key === currentKey() &&
      result.manager === service.manager() &&
      result.contextSignature === contextSignature()
      ? result
      : null;
  });

  // What the server evaluated for this key, while it's the best answer there is: the server's
  // value, until the browser's rules have loaded and its own evaluation replaces it. Without it
  // the browser would render the default first and swap, which doesn't match the server's
  // HTML. If the rules never load (`live` is empty), the server's value stays. It applies only
  // to the manager it was evaluated for, and not to a context of this call's own.
  const seed = computed(() => {
    const candidate = service.bootstrap?.flags[currentKey()];

    if (
      candidate === undefined ||
      !sameKind(candidate, currentDefault()) ||
      service.manager() !== seedManager ||
      currentContext() !== undefined
    ) {
      return undefined;
    }

    // The SDK answers with no flags, rather than an error, when it can't reach the API, so an
    // empty list can't be told apart from a failed load and keeps the server's value. For an
    // environment that really has no flags that is harmless: the server answered from the default.
    const loaded = live();
    const rulesLoaded = loaded !== null && loaded.size > 0;
    return rulesLoaded && settled() !== null ? undefined : candidate;
  });

  const value = computed<WidenFlagValue<T>>(() => {
    const seeded = seed();

    if (seeded !== undefined) {
      return seeded as WidenFlagValue<T>;
    }

    const result = settled();
    return result ? result.value : (currentDefault() as WidenFlagValue<T>);
  });

  effect(() => {
    currentKey();
    currentDefault();
    contextSignature();
    service.manager();
    service.revision();
    untracked(() => void evaluate());
  });

  return {
    key: currentKey,
    value,
    flag: computed(() => settled()?.flag ?? null),
    isLoading: computed(() => seed() === undefined && (service.isLoading() || settled() === null)),
    error: computed(() => service.error() ?? settled()?.error ?? null),
    refresh: () => service.refresh(),
  };
}

export function injectBooleanFlag(
  key: MaybeSource<string>,
  defaultValue: MaybeSource<boolean> = false,
  options?: InjectFlagOptions
): FlagResult<boolean> {
  assertInInjectionContext(injectBooleanFlag);
  return injectFlag<boolean>(key, defaultValue, options);
}

export function injectVariant(
  key: MaybeSource<string>,
  defaultVariant: MaybeSource<string> = 'control',
  options?: InjectFlagOptions
): VariantResult {
  assertInInjectionContext(injectVariant);
  const result = injectFlag<string>(key, defaultVariant, options);

  return {
    key: result.key,
    variant: result.value,
    flag: result.flag,
    isLoading: result.isLoading,
    error: result.error,
    refresh: result.refresh,
  };
}

export function injectConfig<T extends FlagValue>(
  key: MaybeSource<string>,
  defaultValue: MaybeSource<T>,
  options?: InjectFlagOptions
): FlagResult<WidenFlagValue<T>> {
  assertInInjectionContext(injectConfig);
  return injectFlag<T>(key, defaultValue, options);
}
