import { Component, inject } from '@angular/core';
import { Context } from '@zenmanage/sdk';
import { ZenmanageFlagsService } from '@zenmanage/angular';

@Component({
  selector: 'example-percentage-rollouts',
  standalone: true,
  template: `
    <h2>Percentage Rollouts</h2>
    <p>user: {{ userId }}</p>
    <p>new-checkout-flow enabled: {{ enabled }}</p>
  `,
})
export class PercentageRolloutsExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  userId = 'user-42';
  enabled = false;

  async ngOnInit(): Promise<void> {
    const context = Context.single('user', this.userId);
    this.enabled = await this.flags.isEnabled('new-checkout-flow', false, { context });
  }
}
