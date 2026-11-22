import { Component, inject } from '@angular/core';
import { ZenmanageFlagsService, provideZenmanage } from '@zenmanage/angular';

export const cachingProviders = [
  provideZenmanage({
    environmentToken: 'cli_your_client_key_here',
    // Rules are cached for 5 minutes, then re-read.
    cacheTtl: 300,
    enableUsageReporting: true,
    onError: (error) => console.error('Zenmanage could not load flags', error),
  }),
];

@Component({
  selector: 'example-caching',
  template: `<button (click)="refresh()">Refresh flags</button>`,
})
export class CachingExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  // Re-fetches the rules now instead of waiting for the TTL. Every flag on screen updates, and
  // nothing flashes back to its loading state.
  refresh(): Promise<void> {
    return this.flags.refresh();
  }
}
