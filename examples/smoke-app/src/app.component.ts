import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {
  ZenmanageFlagsService,
  ZenmanageIfFlagDirective,
  ZenmanageIfVariantDirective,
  injectBooleanFlag,
  injectConfig,
  injectFlag,
  injectVariant,
} from '@zenmanage/angular';

// Every default in this app differs from the value the fake API serves, so a default that
// leaks into the page can't pass for the real thing.
@Component({
  selector: 'app-root',
  imports: [ZenmanageIfFlagDirective, ZenmanageIfVariantDirective, RouterLink, RouterOutlet],
  template: `
    <h1>Smoke app</h1>

    <p data-test="status">{{ flags.isReady() ? 'ready' : 'not ready' }}</p>
    <p data-test="welcome">{{ welcome.value() }}</p>
    <p data-test="timeout">{{ timeout.value() }}</p>
    <p data-test="config">{{ config.value().theme }}/{{ config.value().pageSize }}</p>
    <p data-test="beta">{{ beta.value() ? 'beta on' : 'beta off' }}</p>
    <p data-test="variant">{{ flow.variant() }}</p>

    <p data-test="checkout">
      <span *zenmanageIfFlag="'new-checkout'; else classicCheckout; loading: spin; default: false"
        >New checkout</span
      >
    </p>
    <p data-test="banner">
      <span *zenmanageIfFlag="'beta-banner'; else noBanner; loading: spin; default: true"
        >Beta banner</span
      >
    </p>
    <p data-test="flow">
      <span
        *zenmanageIfVariant="
          'checkout-flow';
          is: ['one-page', 'stepper'];
          else classicFlow;
          loading: spin;
          default: 'control'
        "
        >Streamlined flow</span
      >
    </p>
    <p data-test="pricing">
      <span
        *zenmanageIfVariant="
          'pricing-layout';
          is: ['monthly'];
          else otherPricing;
          loading: spin;
          default: 'monthly'
        "
        >Monthly pricing</span
      >
    </p>

    <ng-template #spin>Loading</ng-template>
    <ng-template #classicCheckout>Classic checkout</ng-template>
    <ng-template #noBanner>No banner</ng-template>
    <ng-template #classicFlow>Classic flow</ng-template>
    <ng-template #otherPricing>Other pricing</ng-template>

    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/beta">Beta</a>
    </nav>
    <main data-test="page"><router-outlet /></main>
  `,
})
export class AppComponent {
  readonly flags = inject(ZenmanageFlagsService);
  readonly welcome = injectFlag('welcome-text', 'Welcome');
  readonly timeout = injectFlag('api-timeout-ms', 100);
  readonly config = injectConfig('ui-config', { theme: 'light', pageSize: 10 });
  readonly beta = injectBooleanFlag('beta-page', false);
  readonly flow = injectVariant('checkout-flow', 'control');
}

@Component({ template: 'Home page' })
export class HomePage {}

@Component({ template: 'Beta page' })
export class BetaPage {}

@Component({ template: 'Checkout page' })
export class CheckoutPage {}

@Component({ template: 'Labs page' })
export class LabsPage {}

@Component({ template: 'Lazy page' })
export class LazyPage {}

@Component({ template: 'Not found' })
export class NotFoundPage {}
