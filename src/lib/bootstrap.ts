import {
  Context,
  DefaultsCollection,
  type ContextData,
  type Flag,
  type FlagValue,
} from '@zenmanage/sdk';
import type { BootstrapPayload, BuildBootstrapPayloadOptions } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFlagValue(value: unknown): value is FlagValue {
  return (
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'object' && value !== null)
  );
}

/** Builds the payload the server hands to the browser. Accepts flags or a `{ key: value }` record. */
export function buildBootstrapPayload(
  flags: Flag[] | Record<string, FlagValue>,
  options: BuildBootstrapPayloadOptions = {}
): BootstrapPayload {
  const values = Array.isArray(flags)
    ? Object.fromEntries(flags.map((flag) => [flag.getKey(), flag.getValue()]))
    : flags;

  return {
    version: 1,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    flags: values,
    ...(options.context ? { context: options.context.toJSON() } : {}),
  };
}

/** Checks a value that came out of `TransferState` and drops entries that aren't flag values. */
export function parseBootstrapPayload(value: unknown): BootstrapPayload | null {
  if (
    !isPlainObject(value) ||
    value['version'] !== 1 ||
    !isPlainObject(value['flags']) ||
    typeof value['generatedAt'] !== 'string'
  ) {
    return null;
  }

  const flags = Object.fromEntries(
    Object.entries(value['flags']).filter(([, entry]) => isFlagValue(entry))
  ) as Record<string, FlagValue>;

  return {
    version: 1,
    generatedAt: value['generatedAt'],
    flags,
    ...(isPlainObject(value['context'])
      ? { context: value['context'] as unknown as ContextData }
      : {}),
  };
}

export function defaultsFromBootstrapPayload(
  payload: BootstrapPayload | null | undefined
): DefaultsCollection | undefined {
  return payload ? DefaultsCollection.fromObject(payload.flags) : undefined;
}

export function contextFromBootstrapPayload(
  payload: BootstrapPayload | null | undefined
): Context | undefined {
  if (!isPlainObject(payload?.context)) {
    return undefined;
  }

  try {
    return Context.fromObject(payload?.context as ContextData);
  } catch {
    return undefined;
  }
}
