import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import type { DefaultsCollection, Flag, FlagManager, FlagValue } from '@zenmanage/sdk';
import type {
  FlagEvaluationOptions,
  FlagResolutionResult,
  PrimitiveFlagValue,
  ZenmanageRuntimeSnapshot,
} from './types';
import { ZENMANAGE_CLIENT, ZENMANAGE_FLAG_MANAGER } from './tokens';
import type { Context, Zenmanage } from '@zenmanage/sdk';

@Injectable()
export class ZenmanageFlagsService {
  private readonly isReadySubject = new BehaviorSubject<boolean>(false);
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<Error | null>(null);

  readonly isReady$: Observable<boolean> = this.isReadySubject.asObservable();
  readonly isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  readonly error$: Observable<Error | null> = this.errorSubject.asObservable();

  constructor(
    @Inject(ZENMANAGE_FLAG_MANAGER) private readonly manager: FlagManager,
    @Inject(ZENMANAGE_CLIENT) private readonly client: Zenmanage
  ) {}

  markReadyWithoutPreload(): void {
    this.isReadySubject.next(true);
    this.isLoadingSubject.next(false);
    this.errorSubject.next(null);
  }

  async preload(): Promise<void> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      await this.manager.all();
      this.isReadySubject.next(true);
    } catch (error) {
      this.errorSubject.next(error as Error);
      this.isReadySubject.next(false);
      throw error;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  async refresh(): Promise<void> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      await this.manager.refreshRules();
      await this.manager.all();
      this.isReadySubject.next(true);
    } catch (error) {
      this.errorSubject.next(error as Error);
      throw error;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  async getFlag(
    key: string,
    defaultValue?: FlagValue,
    options?: FlagEvaluationOptions
  ): Promise<Flag> {
    const resolvedManager = this.resolveManager(options?.context, options?.defaults);
    return resolvedManager.single(key, defaultValue);
  }

  async isEnabled(
    key: string,
    defaultValue = false,
    options?: FlagEvaluationOptions
  ): Promise<boolean> {
    const flag = await this.getFlag(key, defaultValue, options);
    return flag.asBool();
  }

  async getVariant(
    key: string,
    defaultVariant = 'control',
    options?: FlagEvaluationOptions
  ): Promise<string> {
    const flag = await this.getFlag(key, defaultVariant, options);
    return flag.asString();
  }

  async getValue<T extends PrimitiveFlagValue>(
    key: string,
    defaultValue: T,
    options?: FlagEvaluationOptions
  ): Promise<FlagResolutionResult<T>> {
    const flag = await this.getFlag(key, defaultValue, options);
    const value = this.castValue(flag, defaultValue);

    return {
      key,
      value,
      flag,
    };
  }

  getRuntimeSnapshot(): ZenmanageRuntimeSnapshot {
    return {
      client: this.client,
      manager: this.manager,
      state: {
        isReady: this.isReadySubject.getValue(),
        isLoading: this.isLoadingSubject.getValue(),
        error: this.errorSubject.getValue(),
      },
    };
  }

  private resolveManager(context?: Context, defaults?: DefaultsCollection): FlagManager {
    let resolved = this.manager;

    if (context) {
      resolved = resolved.withContext(context);
    }

    if (defaults) {
      resolved = resolved.withDefaults(defaults);
    }

    return resolved;
  }

  private castValue<T extends PrimitiveFlagValue>(flag: Flag, defaultValue: T): T {
    if (typeof defaultValue === 'boolean') {
      return flag.asBool() as T;
    }

    if (typeof defaultValue === 'number') {
      return flag.asNumber() as T;
    }

    return flag.asString() as T;
  }
}
