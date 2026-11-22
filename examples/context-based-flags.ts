import { Component, inject } from '@angular/core';
import { Attribute, Context } from '@zenmanage/sdk';
import { ZenmanageFlagsService } from '@zenmanage/angular';

@Component({
  selector: 'example-context-based-flags',
  standalone: true,
  template: `
    <h2>Context-Based Flags</h2>
    <p>premium-banner enabled: {{ enabled }}</p>
  `,
})
export class ContextBasedFlagsExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  enabled = false;

  async ngOnInit(): Promise<void> {
    const context = new Context('user', 'Jane Doe', 'user-123', [
      new Attribute('country', ['US']),
      new Attribute('plan', ['pro']),
    ]);

    this.enabled = await this.flags.isEnabled('premium-banner', false, { context });
  }
}
