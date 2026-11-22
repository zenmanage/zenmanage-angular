import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {
  ZenmanageIfFlagDirective,
  ZenmanageIfVariantDirective,
  injectVariant,
} from '@zenmanage/angular';

@Component({
  selector: 'example-app-root',
  imports: [RouterOutlet, RouterLink, ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
  template: `
    <h1>Zenmanage Angular example</h1>

    <p>checkout-flow variant: {{ checkout.variant() }}</p>

    <section *zenmanageIfFlag="'new-dashboard'; else oldDashboard; loading: loading">
      New dashboard content
    </section>
    <ng-template #oldDashboard><section>Old dashboard content</section></ng-template>
    <ng-template #loading><section>Loading…</section></ng-template>

    <section *zenmanageIfVariant="'checkout-flow'; is: ['one-page']; else controlFlow">
      One-page checkout experiment
    </section>
    <ng-template #controlFlow><section>Control checkout flow</section></ng-template>

    <a routerLink="/beta">Go to the beta area</a>
    <router-outlet />
  `,
})
export class AppComponent {
  readonly checkout = injectVariant('checkout-flow');
}
