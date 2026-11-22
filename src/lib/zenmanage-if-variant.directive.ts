import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import type { Context } from '@zenmanage/sdk';
import { injectVariant } from './inject-flag';

/**
 * Renders its template while a string flag equals one of the given variants.
 *
 * ```html
 * <app-checkout *zenmanageIfVariant="'checkout-flow'; is: ['one-page', 'stepper']; else: control" />
 * ```
 *
 * `else` renders for any other variant (or a match, with `invert`), and `loading` while the
 * first value is on its way.
 */
@Directive({
  selector: '[zenmanageIfVariant]',
  standalone: true,
})
export class ZenmanageIfVariantDirective {
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly key = signal('');
  private readonly expected = signal<string[]>([]);
  private readonly defaultVariant = signal('control');
  private readonly elseTemplate = signal<TemplateRef<unknown> | null>(null);
  private readonly loadingTemplate = signal<TemplateRef<unknown> | null>(null);
  private readonly invert = signal(false);
  private readonly context = signal<Context | undefined>(undefined);
  private shown: TemplateRef<unknown> | null = null;

  @Input({ required: true })
  set zenmanageIfVariant(key: string) {
    this.key.set(key);
  }

  @Input()
  set zenmanageIfVariantIs(variants: string | string[] | null | undefined) {
    this.expected.set(Array.isArray(variants) ? variants : variants ? [variants] : []);
  }

  @Input()
  set zenmanageIfVariantDefault(value: string) {
    this.defaultVariant.set(value);
  }

  @Input()
  set zenmanageIfVariantElse(template: TemplateRef<unknown> | null | undefined) {
    this.elseTemplate.set(template ?? null);
  }

  @Input()
  set zenmanageIfVariantLoading(template: TemplateRef<unknown> | null | undefined) {
    this.loadingTemplate.set(template ?? null);
  }

  @Input()
  set zenmanageIfVariantInvert(value: boolean) {
    this.invert.set(value);
  }

  @Input()
  set zenmanageIfVariantContext(context: Context | undefined) {
    this.context.set(context);
  }

  constructor() {
    const result = injectVariant(this.key, this.defaultVariant, { context: this.context });

    effect(() => {
      let next: TemplateRef<unknown> | null;

      if (!this.key()) {
        next = null;
      } else if (result.isLoading()) {
        next = this.loadingTemplate();
      } else {
        const matches = this.expected().includes(result.variant());
        next = matches !== this.invert() ? this.templateRef : this.elseTemplate();
      }

      untracked(() => this.show(next));
    });
  }

  private show(template: TemplateRef<unknown> | null): void {
    if (template === this.shown) {
      return;
    }

    this.viewContainer.clear();
    this.shown = template;

    if (template) {
      this.viewContainer.createEmbeddedView(template);
    }
  }
}
