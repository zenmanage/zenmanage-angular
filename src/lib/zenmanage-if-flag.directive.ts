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
import { injectFlag } from './inject-flag';

/**
 * Renders its template while a boolean flag is on.
 *
 * ```html
 * <app-new-dashboard *zenmanageIfFlag="'new-dashboard'; else: legacy; loading: spinner" />
 * ```
 *
 * `else` renders when the flag is off (or on, with `invert`), and `loading` while the first
 * value is on its way. A refresh doesn't remount the view unless the answer changes.
 */
@Directive({
  selector: '[zenmanageIfFlag]',
  standalone: true,
})
export class ZenmanageIfFlagDirective {
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly key = signal('');
  private readonly defaultValue = signal(false);
  private readonly elseTemplate = signal<TemplateRef<unknown> | null>(null);
  private readonly loadingTemplate = signal<TemplateRef<unknown> | null>(null);
  private readonly invert = signal(false);
  private readonly context = signal<Context | undefined>(undefined);
  private shown: TemplateRef<unknown> | null = null;

  @Input({ required: true })
  set zenmanageIfFlag(key: string) {
    this.key.set(key);
  }

  @Input()
  set zenmanageIfFlagDefault(value: boolean) {
    this.defaultValue.set(value);
  }

  @Input()
  set zenmanageIfFlagElse(template: TemplateRef<unknown> | null | undefined) {
    this.elseTemplate.set(template ?? null);
  }

  @Input()
  set zenmanageIfFlagLoading(template: TemplateRef<unknown> | null | undefined) {
    this.loadingTemplate.set(template ?? null);
  }

  @Input()
  set zenmanageIfFlagInvert(value: boolean) {
    this.invert.set(value);
  }

  @Input()
  set zenmanageIfFlagContext(context: Context | undefined) {
    this.context.set(context);
  }

  constructor() {
    const flag = injectFlag<boolean>(this.key, this.defaultValue, { context: this.context });

    effect(() => {
      let next: TemplateRef<unknown> | null;

      if (!this.key()) {
        next = null;
      } else if (flag.isLoading()) {
        next = this.loadingTemplate();
      } else {
        next = flag.value() !== this.invert() ? this.templateRef : this.elseTemplate();
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
