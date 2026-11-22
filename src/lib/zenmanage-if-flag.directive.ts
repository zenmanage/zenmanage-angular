import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import type { Context, FlagValue } from '@zenmanage/sdk';
import { ZenmanageFlagsService } from './zenmanage-flags.service';

@Directive({
  selector: '[zenmanageIfFlag]',
  standalone: true,
})
export class ZenmanageIfFlagDirective implements OnChanges, OnDestroy {
  @Input() zenmanageIfFlag = '';
  @Input() zenmanageIfFlagDefault: FlagValue = false;
  @Input() zenmanageIfFlagElse: TemplateRef<unknown> | null = null;
  @Input() zenmanageIfFlagContext?: Context;
  @Input() zenmanageIfFlagInvert = false;

  private currentRequestId = 0;

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly flags: ZenmanageFlagsService
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    void this.renderFromFlag();
  }

  ngOnDestroy(): void {
    this.currentRequestId += 1;
  }

  private async renderFromFlag(): Promise<void> {
    if (!this.zenmanageIfFlag) {
      this.clearView();
      return;
    }

    const requestId = ++this.currentRequestId;

    try {
      const isEnabled = await this.flags.isEnabled(this.zenmanageIfFlag, this.asBooleanDefault(), {
        context: this.zenmanageIfFlagContext,
      });

      if (requestId !== this.currentRequestId) {
        return;
      }

      const shouldRender = this.zenmanageIfFlagInvert ? !isEnabled : isEnabled;
      this.updateView(shouldRender);
    } catch {
      if (requestId !== this.currentRequestId) {
        return;
      }

      this.updateView(false);
    }
  }

  private asBooleanDefault(): boolean {
    const defaultValue = this.zenmanageIfFlagDefault;

    if (typeof defaultValue === 'boolean') {
      return defaultValue;
    }

    if (typeof defaultValue === 'number') {
      return defaultValue !== 0;
    }

    return defaultValue.toLowerCase() === 'true';
  }

  private updateView(shouldRenderPrimary: boolean): void {
    this.viewContainer.clear();

    if (shouldRenderPrimary) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      return;
    }

    if (this.zenmanageIfFlagElse) {
      this.viewContainer.createEmbeddedView(this.zenmanageIfFlagElse);
    }
  }

  private clearView(): void {
    this.viewContainer.clear();
  }
}
