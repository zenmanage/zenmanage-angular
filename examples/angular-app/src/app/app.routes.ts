import { Routes } from '@angular/router';
import { canActivateFlag } from '@zenmanage/angular';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app.component').then((m) => m.AppComponent),
  },
  {
    path: 'beta',
    canActivate: [
      canActivateFlag({
        key: 'beta-program',
        defaultValue: false,
        redirectTo: '/',
      }),
    ],
    loadComponent: () => import('./beta.component').then((m) => m.BetaComponent),
  },
];
