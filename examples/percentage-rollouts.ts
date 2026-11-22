import { Component } from '@angular/core';
import { Context } from '@zenmanage/sdk';
import { injectFlag } from '@zenmanage/angular';

@Component({
  selector: 'example-percentage-rollouts',
  template: `<p>{{ checkout.value() ? 'New checkout' : 'Old checkout' }}</p>`,
})
export class PercentageRolloutsExampleComponent {
  // A rollout buckets by the context's identifier: the same user always lands on the same side,
  // and a context without an identifier never gets a gradual rollout.
  readonly checkout = injectFlag('checkout-rollout', false, {
    context: Context.single('user', 'user-123'),
  });
}
