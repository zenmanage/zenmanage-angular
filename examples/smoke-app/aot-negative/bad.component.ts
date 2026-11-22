import { Component } from '@angular/core';
import { ZenmanageIfFlagDirective, ZenmanageIfVariantDirective } from '@zenmanage/angular';

// Compiled by scripts/smoke.mjs, which expects it to FAIL: it proves the strict-template check
// reads the published typings. If these compiled, the directives' inputs would be `any`.
@Component({
  selector: 'app-bad',
  imports: [ZenmanageIfFlagDirective, ZenmanageIfVariantDirective],
  template: `
    <span *zenmanageIfFlag="42; default: 'yes'">bad flag</span>
    <span *zenmanageIfVariant="'k'; is: 7">bad variant</span>
  `,
})
export class BadComponent {}
