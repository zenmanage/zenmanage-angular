import type { Routes } from '@angular/router';
import { ZenmanageFlagGuard, canActivateFlag, canMatchFlag } from '@zenmanage/angular';
import {
  BetaPage,
  CheckoutPage,
  HomePage,
  LabsPage,
  LazyPage,
  NotFoundPage,
} from './app.component';

export const routes: Routes = [
  { path: '', component: HomePage },
  // The flag is on; the guard's fallback (`false`) would have blocked it.
  {
    path: 'beta',
    component: BetaPage,
    canActivate: [canActivateFlag({ key: 'beta-page', defaultValue: false, redirectTo: '/' })],
  },
  // The variant matches; the fallback variant ('control') would not.
  {
    path: 'checkout',
    component: CheckoutPage,
    canActivate: [canActivateFlag({ key: 'checkout-flow', expectedVariant: ['one-page'] })],
  },
  // The flag is off; the guard's fallback (`true`) would have let it through.
  {
    path: 'labs',
    component: LabsPage,
    canActivate: [ZenmanageFlagGuard],
    data: { zenmanageFlag: { key: 'labs-page', defaultValue: true, redirectTo: '/' } },
  },
  // Same, but the route doesn't match at all, so it falls through to the wildcard.
  {
    path: 'lazy',
    canMatch: [canMatchFlag({ key: 'lazy-page', defaultValue: true })],
    component: LazyPage,
  },
  { path: '**', component: NotFoundPage },
];
