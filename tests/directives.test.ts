import type { TemplateRef, ViewContainerRef } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ZenmanageIfFlagDirective } from '../src/lib/zenmanage-if-flag.directive';
import { ZenmanageIfVariantDirective } from '../src/lib/zenmanage-if-variant.directive';
import type { ZenmanageFlagsService } from '../src/lib/zenmanage-flags.service';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createViewContainerMock(): Pick<ViewContainerRef, 'clear' | 'createEmbeddedView'> {
  return {
    clear: vi.fn(),
    createEmbeddedView: vi.fn(),
  } as unknown as Pick<ViewContainerRef, 'clear' | 'createEmbeddedView'>;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function invokeRenderFromFlag(directive: ZenmanageIfFlagDirective): Promise<void> {
  const internal = directive as unknown as { renderFromFlag: () => Promise<void> };
  return internal.renderFromFlag();
}

function invokeRenderFromVariant(directive: ZenmanageIfVariantDirective): Promise<void> {
  const internal = directive as unknown as { renderFromVariant: () => Promise<void> };
  return internal.renderFromVariant();
}

describe('ZenmanageIfFlagDirective', () => {
  it('clears view when no flag key is provided', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const isEnabled = vi.fn(async () => true);
    const flags = {
      isEnabled,
    } as Pick<ZenmanageFlagsService, 'isEnabled'>;

    const directive = new ZenmanageIfFlagDirective(
      templateRef,
      viewContainer as never,
      flags as never
    );
    directive.zenmanageIfFlag = '';

    await invokeRenderFromFlag(directive);

    expect(viewContainer.clear).toHaveBeenCalledTimes(1);
    expect(isEnabled).not.toHaveBeenCalled();
  });

  it('renders primary template when flag is enabled', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      isEnabled: vi.fn(async () => true),
    } as never;

    const directive = new ZenmanageIfFlagDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfFlag = 'checkout-v2';

    await invokeRenderFromFlag(directive);

    expect(viewContainer.clear).toHaveBeenCalledTimes(1);
    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(templateRef);
  });

  it('renders else template when flag is disabled', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const elseRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      isEnabled: vi.fn(async () => false),
    } as never;

    const directive = new ZenmanageIfFlagDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfFlag = 'checkout-v2';
    directive.zenmanageIfFlagElse = elseRef;

    await invokeRenderFromFlag(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(elseRef);
  });

  it('supports inverted rendering', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const elseRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      isEnabled: vi.fn(async () => true),
    } as never;

    const directive = new ZenmanageIfFlagDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfFlag = 'checkout-v2';
    directive.zenmanageIfFlagElse = elseRef;
    directive.zenmanageIfFlagInvert = true;

    await invokeRenderFromFlag(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(elseRef);
  });

  it('renders fallback branch when evaluation throws', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const elseRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      isEnabled: vi.fn(async () => {
        throw new Error('failed');
      }),
    } as never;

    const directive = new ZenmanageIfFlagDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfFlag = 'checkout-v2';
    directive.zenmanageIfFlagElse = elseRef;

    await invokeRenderFromFlag(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(elseRef);
  });

  it('coerces string and numeric default values to booleans', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const isEnabled = vi.fn(async () => true);
    const flags = {
      isEnabled,
    } as Pick<ZenmanageFlagsService, 'isEnabled'>;

    const directive = new ZenmanageIfFlagDirective(
      templateRef,
      viewContainer as never,
      flags as never
    );
    directive.zenmanageIfFlag = 'checkout-v2';

    directive.zenmanageIfFlagDefault = 'true';
    await invokeRenderFromFlag(directive);

    directive.zenmanageIfFlagDefault = 1;
    await invokeRenderFromFlag(directive);

    expect(isEnabled).toHaveBeenCalledWith('checkout-v2', true, {
      context: undefined,
    });
  });

  it('ignores stale async responses after destroy', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const pending = deferred<boolean>();
    const isEnabled = vi.fn(async () => pending.promise);
    const flags = {
      isEnabled,
    } as Pick<ZenmanageFlagsService, 'isEnabled'>;

    const directive = new ZenmanageIfFlagDirective(
      templateRef,
      viewContainer as never,
      flags as never
    );
    directive.zenmanageIfFlag = 'checkout-v2';

    directive.ngOnChanges({});
    directive.ngOnDestroy();
    pending.resolve(true);
    await Promise.resolve();

    expect(viewContainer.createEmbeddedView).not.toHaveBeenCalled();
  });
});

describe('ZenmanageIfVariantDirective', () => {
  it('renders primary template on matching variant', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      getVariant: vi.fn(async () => 'one-page'),
    } as never;

    const directive = new ZenmanageIfVariantDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfVariant = 'checkout-flow';
    directive.zenmanageIfVariantIs = ['one-page', 'control'];

    await invokeRenderFromVariant(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(templateRef);
  });

  it('renders else template on non-matching variant', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const elseRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      getVariant: vi.fn(async () => 'multi-step'),
    } as never;

    const directive = new ZenmanageIfVariantDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfVariant = 'checkout-flow';
    directive.zenmanageIfVariantIs = 'one-page';
    directive.zenmanageIfVariantElse = elseRef;

    await invokeRenderFromVariant(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(elseRef);
  });

  it('clears view when no variant key is provided', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      getVariant: vi.fn(async () => 'control'),
    } as never;

    const directive = new ZenmanageIfVariantDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfVariant = '';

    directive.ngOnChanges({});
    await Promise.resolve();

    expect(viewContainer.clear).toHaveBeenCalledTimes(1);
  });

  it('supports inverted variant rendering and string expected values', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const elseRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      getVariant: vi.fn(async () => 'one-page'),
    } as never;

    const directive = new ZenmanageIfVariantDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfVariant = 'checkout-flow';
    directive.zenmanageIfVariantIs = 'one-page';
    directive.zenmanageIfVariantInvert = true;
    directive.zenmanageIfVariantElse = elseRef;

    await invokeRenderFromVariant(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(elseRef);
  });

  it('renders else template when variant evaluation throws', async () => {
    const templateRef = {} as TemplateRef<unknown>;
    const elseRef = {} as TemplateRef<unknown>;
    const viewContainer = createViewContainerMock();
    const flags = {
      getVariant: vi.fn(async () => {
        throw new Error('failed');
      }),
    } as never;

    const directive = new ZenmanageIfVariantDirective(templateRef, viewContainer as never, flags);
    directive.zenmanageIfVariant = 'checkout-flow';
    directive.zenmanageIfVariantIs = 'one-page';
    directive.zenmanageIfVariantElse = elseRef;

    await invokeRenderFromVariant(directive);

    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(elseRef);
  });
});
