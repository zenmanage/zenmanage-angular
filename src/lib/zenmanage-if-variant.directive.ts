import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import type { Context } from '@zenmanage/sdk';
import { ZenmanageFlagsService } from './zenmanage-flags.service';

@Directive({
  selector: '[zenmanageIfVariant]',
  standalone: true,
})
export class ZenmanageIfVariantDirective implements OnChanges, OnDestroy {
  @Input() zenmanageIfVariant = '';
  @Input() zenmanageIfVariantIs: string | string[] = [];
  @Input() zenmanageIfVariantDefault = 'control';
  @Input() zenmanageIfVariantElse: TemplateRef<unknown> | null = null;
  @Input() zenmanageIfVariantContext?: Context;
  @Input() zenmanageIfVariantInvert = false;

  private currentRequestId = 0;

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly flags: ZenmanageFlagsService
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    void this.renderFromVariant();
  }

  ngOnDestroy(): void {
    this.currentRequestId += 1;
  }

  private async renderFromVariant(): Promise<void> {
    if (!this.zenmanageIfVariant) {
      this.viewContainer.clear();
      return;
    }

    const requestId = ++this.currentRequestId;

    try {
      const variant = await this.flags.getVariant(
        this.zenmanageIfVariant,
        this.zenmanageIfVariantDefault,
        {
          context: this.zenmanageIfVariantContext,
        }
      );

      if (requestId !== this.currentRequestId) {
        return;
      }

      const expected = this.normalizeExpectedVariants(this.zenmanageIfVariantIs);
      const isMatch = expected.includes(variant);
      const shouldRenderPrimary = this.zenmanageIfVariantInvert ? !isMatch : isMatch;

      this.updateView(shouldRenderPrimary);
    } catch {
      if (requestId !== this.currentRequestId) {
        return;
      }

      this.updateView(false);
    }
  }

  private normalizeExpectedVariants(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value) {
      return [];
    }

    return [value];
  }

  private updateView(shouldRenderPrimary: boolean): void {
    this.viewContainer.clear();

    if (shouldRenderPrimary) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      return;
    }

    if (this.zenmanageIfVariantElse) {
      this.viewContainer.createEmbeddedView(this.zenmanageIfVariantElse);
    }
  }
}
