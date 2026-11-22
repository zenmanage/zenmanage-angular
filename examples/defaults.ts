import { Component } from '@angular/core';
import { DefaultsCollection } from '@zenmanage/sdk';
import { injectFlag, provideZenmanage } from '@zenmanage/angular';

// Answers for flags the API doesn't know, or when it can't be reached.
export const defaultsProviders = [
  provideZenmanage({
    environmentToken: 'cli_your_client_key_here',
    defaults: DefaultsCollection.fromObject({
      'new-dashboard': false,
      'max-items': 25,
      'ui-config': { theme: 'light' },
    }),
  }),
];

@Component({
  selector: 'example-defaults',
  template: `<p>{{ promo.value() }} {{ promo.isLoading() ? '(loading)' : '' }}</p>`,
})
export class DefaultsExampleComponent {
  // An inline default wins over the collection, and is what shows until the flag has loaded.
  readonly promo = injectFlag('summer-promo', false);
}
