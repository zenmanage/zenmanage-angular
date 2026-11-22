import { Component, inject } from '@angular/core';
import { ZenmanageFlagsService, ZenmanageIfFlagDirective } from '@zenmanage/angular';

@Component({
  selector: 'example-simple-flags',
  standalone: true,
  imports: [ZenmanageIfFlagDirective],
  template: `
    <h2>Simple Flags</h2>
    <p>new-dashboard enabled: {{ enabled }}</p>

    <div *zenmanageIfFlag="'new-dashboard'; default: false; else: legacy">
      Rendering dashboard v2
    </div>

    <ng-template #legacy>Rendering dashboard v1</ng-template>
  `,
})
export class SimpleFlagsExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  enabled = false;

  async ngOnInit(): Promise<void> {
    this.enabled = await this.flags.isEnabled('new-dashboard', false);
  }
}
