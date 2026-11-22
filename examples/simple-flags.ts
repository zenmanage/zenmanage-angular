import { Component } from '@angular/core';
import {
  ZenmanageIfFlagDirective,
  injectBooleanFlag,
  injectConfig,
  injectVariant,
} from '@zenmanage/angular';

// prettier-ignore
@Component({
  selector: 'example-simple-flags',
  imports: [ZenmanageIfFlagDirective],
  template: `
    <h2>Simple flags</h2>

    <!-- A signal: re-renders when the flag changes, with no subscription to manage. -->
    <p>new-dashboard is {{ dashboard.value() ? 'on' : 'off' }}</p>
    <p>checkout-flow variant: {{ checkout.variant() }}</p>
    <p>max-items: {{ maxItems.value() }}</p>

    <!-- Or let a directive decide what to render. -->
    <section *zenmanageIfFlag="'new-dashboard'; else: legacy; loading: spinner">
      Dashboard v2
    </section>
    <ng-template #legacy><section>Dashboard v1</section></ng-template>
    <ng-template #spinner><p>Loading…</p></ng-template>
  `,
})
export class SimpleFlagsExampleComponent {
  readonly dashboard = injectBooleanFlag('new-dashboard');
  readonly checkout = injectVariant('checkout-flow');
  readonly maxItems = injectConfig('max-items', 25);
}
