import { isPlatformServer } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  PendingTasks,
  TransferState,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import {
  DefaultsCollection,
  type Context,
  type Flag,
  type FlagManager,
  type FlagValue,
  type Zenmanage,
} from '@zenmanage/sdk';
import {
  buildBootstrapPayload,
  contextFromBootstrapPayload,
  defaultsFromBootstrapPayload,
  parseBootstrapPayload,
} from './bootstrap';
import { describeDefaults, mergeDefaults } from './defaults';
import { registerInternals } from './internal';
import { ZENMANAGE_CLIENT, ZENMANAGE_OPTIONS, ZENMANAGE_STATE_KEY } from './tokens';
import type {
  BootstrapPayload,
  FlagEvaluationOptions,
  FlagResolutionResult,
  MaybeSource,
  RuntimeBootstrapOptions,
  WidenFlagValue,
} from './types';

interface LoadState {
  manager: FlagManager;
  status: 'loading' | 'ready' | 'failed';
  error: Error | null;
  /** The flags the loaded rules contain; `null` until they have loaded. */
  live: ReadonlySet<string> | null;
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Reads a plain value, a signal or a function. */
export function readSource<T>(source: MaybeSource<T>): T {
  return typeof source === 'function' ? (source as () => T)() : source;
}

export function describeContext(context: Context | undefined): string {
  return context === undefined ? '' : JSON.stringify(context);
}

/** Reads a flag as the type of `fallback`: a boolean, number or string, or a JSON object or array. */
export function coerceFlagValue<T extends FlagValue>(flag: Flag, fallback: T): WidenFlagValue<T> {
  if (typeof fallback === 'boolean') {
    return flag.asBool() as WidenFlagValue<T>;
  }

  if (typeof fallback === 'number') {
    return flag.asNumber() as WidenFlagValue<T>;
  }

  if (typeof fallback === 'string') {
    return flag.asString() as WidenFlagValue<T>;
  }

  return flag.asJson() as WidenFlagValue<T>;
}

/**
 * Loads, evaluates and refreshes flags. Provided by `provideZenmanage` (or
 * `ZenmanageModule.forRoot`); inject it in a component, a guard or another service.
 *
 * The state is exposed as signals (and as observables for `async` pipes). A load starts when
 * the app does, so the first evaluation reads from a warm cache instead of every consumer
 * fetching the rules itself.
 */
@Injectable()
export class ZenmanageFlagsService {
  private readonly options = inject(ZENMANAGE_OPTIONS);
  private readonly transferState = inject(TransferState);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly preloadEnabled = this.options.preload !== false;
  private readonly transferEnabled = this.options.transferState !== false;
  private readonly bootstrapDefaults: DefaultsCollection | undefined;
  /** The context the server's values were evaluated for. They are another user's answers for any other. */
  private readonly seedContextSignature: string;
  private readonly lives = new WeakMap<FlagManager, Promise<void>>();
  private readonly loadState = signal<LoadState | null>(null);
  private readonly loads = new WeakMap<FlagManager, Promise<void>>();
  private readonly evaluated = new Map<string, FlagValue>();
  private readonly revisionState = signal(0);

  readonly client: Zenmanage = inject(ZENMANAGE_CLIENT);

  /** The payload the browser started from, when there was one. */
  readonly bootstrap: BootstrapPayload | null;

  /**
   * The flag manager for the current context and defaults. It is replaced only when their
   * content changes: an equal-but-new `Context` keeps the same manager, so nothing reloads.
   */
  readonly manager: Signal<FlagManager>;
  readonly context: Signal<Context | undefined>;
  readonly defaults: Signal<DefaultsCollection | undefined>;

  /** `true` once the initial load has succeeded (or immediately when `preload` is off). */
  readonly isReady: Signal<boolean>;
  /** `true` only while the initial load is in flight; background refreshes don't set it. */
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<Error | null>;
  /** Bumps after every successful `refresh()` so consumers re-evaluate. */
  readonly revision: Signal<number> = this.revisionState.asReadonly();

  readonly isReady$: Observable<boolean>;
  readonly isLoading$: Observable<boolean>;
  readonly error$: Observable<Error | null>;

  constructor() {
    this.bootstrap = this.resolveBootstrap();
    this.bootstrapDefaults = defaultsFromBootstrapPayload(this.bootstrap);
    this.seedContextSignature = describeContext(untracked(() => this.currentContext()));

    this.context = computed(() => this.currentContext());
    this.defaults = computed(() => this.currentDefaults());

    // `context` and `defaults` are often built inline, so compare them by content: a
    // new-but-equal object must not replace the flag manager, which would put every consumer
    // back into its loading state.
    const signature = computed(
      () => `${describeContext(this.currentContext())}|${describeDefaults(this.currentDefaults())}`
    );
    this.manager = computed(() => {
      signature();
      return untracked(() => this.buildManager());
    });

    const state = computed(() => {
      const current = this.loadState();
      return current !== null && current.manager === this.manager() ? current : null;
    });
    this.isLoading = computed(
      () => this.preloadEnabled && (state() === null || state()?.status === 'loading')
    );
    this.isReady = computed(() => !this.preloadEnabled || state()?.status === 'ready');
    this.error = computed(() => state()?.error ?? null);
    const live = computed(() => state()?.live ?? null);

    this.isReady$ = toObservable(this.isReady);
    this.isLoading$ = toObservable(this.isLoading);
    this.error$ = toObservable(this.error);

    registerInternals(this, { evaluated: this.evaluated, live, seedManager: this.manager() });

    // The first load. A manager replaced later (a reactive context changed) loads here too.
    void this.ensureLoad(this.manager());
    if (this.isReactive(this.options.context) || this.isReactive(this.options.defaults)) {
      effect(() => {
        const next = this.manager();
        untracked(() => void this.ensureLoad(next));
      });
    }

    if (this.isServer && this.transferEnabled) {
      // Runs when the server serializes the page, after everything it rendered has been read.
      this.transferState.onSerialize(ZENMANAGE_STATE_KEY, () =>
        buildBootstrapPayload(Object.fromEntries(this.evaluated), {
          context: this.options.transferContext ? this.currentContext() : undefined,
        })
      );
    }
  }

  /** Resolves once the first load has finished, whether or not it succeeded. Never rejects. */
  whenReady(): Promise<void> {
    return this.ensureLoad(this.manager());
  }

  /** Loads every flag again. Rejects with the load error. */
  async preload(): Promise<void> {
    const target = this.manager();
    this.loads.delete(target);
    await this.ensureLoad(target);

    const error = this.error();
    if (error) {
      throw error;
    }
  }

  /**
   * Re-fetches rules from the API and re-evaluates every consumer. A refresh doesn't set
   * `isLoading`: consumers keep serving their last value, so gated UI doesn't unmount and
   * remount on every refresh.
   */
  async refresh(): Promise<void> {
    const target = this.manager();
    const done = this.pendingTasks.add();

    try {
      await target.refreshRules();
      const flags = await target.all();

      // The context changed while this ran: the new manager's own load is the one that counts.
      if (target !== this.manager()) {
        return;
      }

      this.loadState.set({
        manager: target,
        status: 'ready',
        error: null,
        live: new Set(flags.map((flag) => flag.getKey())),
      });
      this.revisionState.update((revision) => revision + 1);
    } catch (refreshError) {
      const resolved = toError(refreshError);

      if (target === this.manager()) {
        this.loadState.update((current) =>
          current?.manager === target ? { ...current, error: resolved } : current
        );
        this.options.onError?.(resolved);
      }

      throw resolved;
    } finally {
      done();
    }
  }

  /**
   * Evaluates a flag once the first load has finished. `manager` is the one the result belongs
   * to, so a caller can tell that the context changed while it waited.
   */
  async evaluate(
    key: string,
    defaultValue?: FlagValue,
    options?: FlagEvaluationOptions
  ): Promise<{ flag: Flag; manager: FlagManager }> {
    const done = this.pendingTasks.add();

    try {
      const base = this.manager();
      await this.ensureLoad(base);

      if (!this.preloadEnabled) {
        await this.ensureLive(base);
      }

      let target = base;
      if (options?.context) {
        target = target.withContext(options.context);
      }
      if (options?.defaults) {
        target = target.withDefaults(options.defaults);
      }

      return { flag: await target.single(key, defaultValue), manager: base };
    } finally {
      done();
    }
  }

  async getFlag(
    key: string,
    defaultValue?: FlagValue,
    options?: FlagEvaluationOptions
  ): Promise<Flag> {
    return (await this.evaluate(key, defaultValue, options)).flag;
  }

  async isEnabled(
    key: string,
    defaultValue = false,
    options?: FlagEvaluationOptions
  ): Promise<boolean> {
    return (await this.getFlag(key, defaultValue, options)).asBool();
  }

  async getVariant(
    key: string,
    defaultVariant = 'control',
    options?: FlagEvaluationOptions
  ): Promise<string> {
    return (await this.getFlag(key, defaultVariant, options)).asString();
  }

  /**
   * Evaluates a flag and returns its value as the type of `defaultValue`: a boolean, number or
   * string, or a JSON object or array.
   */
  async getValue<T extends FlagValue>(
    key: string,
    defaultValue: T,
    options?: FlagEvaluationOptions
  ): Promise<FlagResolutionResult<T>> {
    const flag = await this.getFlag(key, defaultValue, options);

    return { key, value: coerceFlagValue(flag, defaultValue), flag };
  }

  /** Packages flag values for the browser. Call it after the server render has finished. */
  async getBootstrapPayload(options: RuntimeBootstrapOptions = {}): Promise<BootstrapPayload> {
    const target = this.manager();
    await this.ensureLoad(target);

    let flags: Record<string, FlagValue>;

    if (options.keys) {
      const wanted = new Set(options.keys);
      const all = await target.all();
      flags = Object.fromEntries(
        all
          .filter((flag) => wanted.has(flag.getKey()))
          .map((flag) => [flag.getKey(), flag.getValue()])
      );
    } else {
      // What the page displayed, including flags answered from a default: the browser has to
      // start from the same values or the first render won't match.
      flags = Object.fromEntries(this.evaluated);
    }

    return buildBootstrapPayload(flags, {
      context: options.includeContext ? this.currentContext() : undefined,
    });
  }

  private isReactive(source: unknown): boolean {
    return typeof source === 'function';
  }

  private resolveBootstrap(): BootstrapPayload | null {
    if (this.options.bootstrap !== undefined) {
      return this.options.bootstrap;
    }

    if (this.isServer || !this.transferEnabled) {
      return null;
    }

    return parseBootstrapPayload(this.transferState.get(ZENMANAGE_STATE_KEY, null));
  }

  // Without an explicit context the browser evaluates for the user the server evaluated for.
  // Only when no `context` option was given at all: a signal that becomes undefined (a user
  // logging out) means "no context", not "the server's user".
  private currentContext(): Context | undefined {
    return this.options.context === undefined
      ? contextFromBootstrapPayload(this.bootstrap)
      : readSource(this.options.context);
  }

  // The server's values are fallbacks for the user it rendered for. Once the context changes
  // (someone else signed in) they would hand that user the previous user's targeted answers
  // whenever the rules can't load, so they are dropped.
  private currentDefaults(): DefaultsCollection | undefined {
    const forSeedContext = describeContext(this.currentContext()) === this.seedContextSignature;

    return mergeDefaults(
      readSource(this.options.defaults),
      forSeedContext ? this.bootstrapDefaults : undefined
    );
  }

  // The manager is copied even without a context or defaults: a manager loads its rules once
  // and keeps them until the cache TTL passes, so the client's own would be shared by everyone.
  private buildManager(): FlagManager {
    let manager = this.client
      .flags()
      .withDefaults(this.currentDefaults() ?? new DefaultsCollection());
    const context = this.currentContext();

    if (context) {
      manager = manager.withContext(context);
    }

    return manager;
  }

  // With `preload` off nothing has read the rules when the first evaluation starts. Reading them
  // here tells which flags they contain, so a server value stops standing in for the live one.
  private ensureLive(target: FlagManager): Promise<void> {
    let live = this.lives.get(target);

    if (!live) {
      const record = (keys: Set<string>): void =>
        this.loadState.update((current) =>
          current?.manager === target && current.live === null
            ? { ...current, live: keys }
            : current
        );

      live = target.all().then(
        (flags) => record(new Set(flags.map((flag) => flag.getKey()))),
        () => record(new Set())
      );
      this.lives.set(target, live);
    }

    return live;
  }

  // One load per manager, started by whichever consumer asks first. Resolves whatever
  // happens: the SDK serves defaults instead of throwing when it can't load rules, and a
  // load that does throw is reported through `error` and `onError`.
  private ensureLoad(target: FlagManager): Promise<void> {
    let load = this.loads.get(target);

    if (!load) {
      load = this.startLoad(target);
      this.loads.set(target, load);
    }

    return load;
  }

  private startLoad(target: FlagManager): Promise<void> {
    if (!this.preloadEnabled) {
      this.loadState.set({ manager: target, status: 'ready', error: null, live: null });
      return Promise.resolve();
    }

    this.loadState.set({ manager: target, status: 'loading', error: null, live: null });
    // Keeps a server render (and `whenStable`) waiting until the rules are in.
    const done = this.pendingTasks.add();

    const settle = (next: Omit<LoadState, 'manager'>): void => {
      // A newer manager started loading meanwhile: its load is the one that counts.
      if (this.loadState()?.manager === target) {
        this.loadState.set({ manager: target, ...next });
      }
    };

    return target
      .all()
      .then(
        (flags) => {
          settle({
            status: 'ready',
            error: null,
            live: new Set(flags.map((flag) => flag.getKey())),
          });
        },
        (loadError: unknown) => {
          const resolved = toError(loadError);
          settle({ status: 'failed', error: resolved, live: new Set() });
          this.options.onError?.(resolved);
        }
      )
      .finally(done);
  }
}
