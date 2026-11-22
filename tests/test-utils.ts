import { Flag } from '@zenmanage/sdk';
import type { FlagManager } from '@zenmanage/sdk';
import { vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

export function booleanFlag(key: string, value: boolean): Flag {
  return Flag.fromObject({
    version: '1',
    type: 'boolean',
    key,
    name: key,
    target: {
      value: {
        value: {
          boolean: value,
        },
      },
    },
    rules: [],
  });
}

export function numberFlag(key: string, value: number): Flag {
  return Flag.fromObject({
    version: '1',
    type: 'number',
    key,
    name: key,
    target: {
      value: {
        value: {
          number: value,
        },
      },
    },
    rules: [],
  });
}

export function stringFlag(key: string, value: string): Flag {
  return Flag.fromObject({
    version: '1',
    type: 'string',
    key,
    name: key,
    target: {
      value: {
        value: {
          string: value,
        },
      },
    },
    rules: [],
  });
}

export interface MockFlagManager {
  single: MockFn;
  all: MockFn;
  refreshRules: MockFn;
  withContext: MockFn;
  withDefaults: MockFn;
}

export function createMockFlagManager(): MockFlagManager {
  const manager: MockFlagManager = {
    single: vi.fn(async () => booleanFlag('default-flag', true)) as MockFn,
    all: vi.fn(async () => []) as MockFn,
    refreshRules: vi.fn(async () => undefined) as MockFn,
    withContext: vi.fn() as MockFn,
    withDefaults: vi.fn() as MockFn,
  };

  manager.withContext.mockReturnValue(manager as unknown as FlagManager);
  manager.withDefaults.mockReturnValue(manager as unknown as FlagManager);

  return manager;
}
