import { NgModule, type ModuleWithProviders } from '@angular/core';
import { provideZenmanage } from './providers';
import type { ZenmanageAngularOptions } from './types';
import { ZenmanageIfFlagDirective } from './zenmanage-if-flag.directive';
import { ZenmanageIfVariantDirective } from './zenmanage-if-variant.directive';

@NgModule({
  imports: [ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
  exports: [ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
})
export class ZenmanageModule {
  static forRoot(options: ZenmanageAngularOptions): ModuleWithProviders<ZenmanageModule> {
    return {
      ngModule: ZenmanageModule,
      providers: [provideZenmanage(options)],
    };
  }
}
