import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import type { ZenmanageAngularOptions } from './types';
import { createZenmanageProviders } from './providers';
import { ZenmanageIfFlagDirective } from './zenmanage-if-flag.directive';
import { ZenmanageIfVariantDirective } from './zenmanage-if-variant.directive';

@NgModule({
  imports: [CommonModule, ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
  exports: [ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
})
export class ZenmanageModule {
  static forRoot(options: ZenmanageAngularOptions): ModuleWithProviders<ZenmanageModule> {
    return {
      ngModule: ZenmanageModule,
      providers: createZenmanageProviders(options),
    };
  }
}
