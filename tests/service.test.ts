import { describe, expect, it, vi } from 'vitest';
import { ZenmanageFlagsService } from '../src/lib/zenmanage-flags.service';
import { booleanFlag, createMockFlagManager, numberFlag, stringFlag } from './test-utils';

describe('ZenmanageFlagsService', () => {
  it('preloads flags and marks runtime as ready', async () => {
    const manager = createMockFlagManager();
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    await service.preload();

    const snapshot = service.getRuntimeSnapshot();
    expect(manager.all).toHaveBeenCalledTimes(1);
    expect(snapshot.state.isReady).toBe(true);
    expect(snapshot.state.isLoading).toBe(false);
    expect(snapshot.state.error).toBeNull();
  });

  it('stores preload errors in runtime state', async () => {
    const manager = createMockFlagManager();
    manager.all.mockRejectedValue(new Error('boom'));
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    await expect(service.preload()).rejects.toThrow('boom');

    const snapshot = service.getRuntimeSnapshot();
    expect(snapshot.state.isReady).toBe(false);
    expect(snapshot.state.error?.message).toBe('boom');
  });

  it('refreshes rules and refetches flags', async () => {
    const manager = createMockFlagManager();
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    await service.refresh();

    expect(manager.refreshRules).toHaveBeenCalledTimes(1);
    expect(manager.all).toHaveBeenCalledTimes(1);
  });

  it('can mark runtime as ready without preload', () => {
    const manager = createMockFlagManager();
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    service.markReadyWithoutPreload();

    const snapshot = service.getRuntimeSnapshot();
    expect(snapshot.state.isReady).toBe(true);
    expect(snapshot.state.isLoading).toBe(false);
    expect(snapshot.state.error).toBeNull();
  });

  it('returns typed values for boolean, number, and string flags', async () => {
    const manager = createMockFlagManager();
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    manager.single
      .mockResolvedValueOnce(booleanFlag('new-ui', true))
      .mockResolvedValueOnce(numberFlag('max-items', 25))
      .mockResolvedValueOnce(stringFlag('checkout-flow', 'one-page'));

    const boolValue = await service.getValue('new-ui', false);
    const numberValue = await service.getValue('max-items', 0);
    const stringValue = await service.getValue('checkout-flow', 'control');

    expect(boolValue.value).toBe(true);
    expect(numberValue.value).toBe(25);
    expect(stringValue.value).toBe('one-page');
  });

  it('resolves manager clones when context/defaults are provided', async () => {
    const manager = createMockFlagManager();
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    const context = { getIdentifier: () => 'abc' } as never;
    const defaults = {} as never;

    await service.getFlag('flag-a', false, { context, defaults });

    expect(manager.withContext).toHaveBeenCalledWith(context);
    expect(manager.withDefaults).toHaveBeenCalledWith(defaults);
  });

  it('supports variant helper and boolean fallback conversion', async () => {
    const manager = createMockFlagManager();
    const service = new ZenmanageFlagsService(manager as never, { flags: vi.fn() } as never);

    manager.single
      .mockResolvedValueOnce(stringFlag('checkout-flow', 'one-page'))
      .mockResolvedValueOnce(numberFlag('numeric-bool', 0));

    const variant = await service.getVariant('checkout-flow', 'control');
    const enabled = await service.isEnabled('numeric-bool', true);

    expect(variant).toBe('one-page');
    expect(enabled).toBe(false);
  });
});
