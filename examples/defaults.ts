import { Component, inject } from '@angular/core';
import { DefaultsCollection } from '@zenmanage/sdk';
import { ZenmanageFlagsService } from '@zenmanage/angular';

@Component({
  selector: 'example-defaults',
  standalone: true,
  template: `
    <h2>Defaults</h2>
    <p>new-ui: {{ newUi }}</p>
    <p>max-items: {{ maxItems }}</p>
    <p>checkout-flow: {{ checkoutFlow }}</p>
  `,
})
export class DefaultsExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  newUi = false;
  maxItems = 0;
  checkoutFlow = 'control';

  async ngOnInit(): Promise<void> {
    const defaults = DefaultsCollection.fromObject({
      'new-ui': true,
      'max-items': 25,
      'checkout-flow': 'one-page',
    });

    this.newUi = await this.flags.isEnabled('new-ui', false, { defaults });
    this.maxItems = (await this.flags.getValue('max-items', 0, { defaults })).value;
    this.checkoutFlow = await this.flags.getVariant('checkout-flow', 'control', { defaults });
  }
}
