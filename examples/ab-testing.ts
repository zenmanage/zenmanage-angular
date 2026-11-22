import { Component, inject } from '@angular/core';
import { ZenmanageFlagsService } from '@zenmanage/angular';

@Component({
  selector: 'example-ab-testing',
  standalone: true,
  template: `
    <h2>A/B Testing</h2>
    <p>checkout-flow variant: {{ variant }}</p>
    <p>{{ message }}</p>
  `,
})
export class AbTestingExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  variant = 'control';
  message = 'Loading...';

  async ngOnInit(): Promise<void> {
    this.variant = await this.flags.getVariant('checkout-flow', 'control');
    this.message =
      this.variant === 'one-page' ? 'Render one-page checkout' : 'Render multi-step checkout';
  }
}
