import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {
  ZenmanageFlagsService,
  ZenmanageIfFlagDirective,
  ZenmanageIfVariantDirective,
} from '@zenmanage/angular';

@Component({
  selector: 'example-app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
  template: `
    <h1>Zenmanage Angular Example</h1>

    <p>checkout-flow variant: {{ checkoutVariant }}</p>

    <ng-container *zenmanageIfFlag="'new-dashboard'; default: false; else: oldDashboard">
      <section>New dashboard content</section>
    </ng-container>

    <ng-template #oldDashboard>
      <section>Old dashboard content</section>
    </ng-template>

    <ng-container *zenmanageIfVariant="'checkout-flow'; is: ['one-page']; else: controlFlow">
      <section>One-page checkout experiment</section>
    </ng-container>

    <ng-template #controlFlow>
      <section>Control checkout flow</section>
    </ng-template>

    <a routerLink="/beta">Go to beta route</a>
    <router-outlet />
  `,
})
export class AppComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  checkoutVariant = 'control';

  async ngOnInit(): Promise<void> {
    this.checkoutVariant = await this.flags.getVariant('checkout-flow', 'control');
  }
}
