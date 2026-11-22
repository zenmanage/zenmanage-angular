import { Component } from '@angular/core';
import { ZenmanageIfVariantDirective, injectVariant } from '@zenmanage/angular';

@Component({
  selector: 'example-ab-testing',
  imports: [ZenmanageIfVariantDirective],
  template: `
    <!-- Render one branch per variant... -->
    <p *zenmanageIfVariant="'checkout-flow'; is: 'one-page'; else other">One-page checkout</p>
    <ng-template #other>
      <p *zenmanageIfVariant="'checkout-flow'; is: ['stepper', 'wizard']; else control">
        Multi-step checkout
      </p>
    </ng-template>
    <ng-template #control><p>Classic checkout</p></ng-template>

    <!-- ...or read the variant and decide in code. -->
    <p>Variant: {{ checkout.variant() }}</p>
  `,
})
export class AbTestingExampleComponent {
  // 'control' is what shows until the variant has loaded, and when it can't be.
  readonly checkout = injectVariant('checkout-flow', 'control');
}
