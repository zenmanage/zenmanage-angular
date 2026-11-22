import { Component, inject, signal } from '@angular/core';
import { Attribute, Context } from '@zenmanage/sdk';
import { ZenmanageFlagsService, injectFlag, provideZenmanage } from '@zenmanage/angular';

function userContext(id: string, plan: string, country: string): Context {
  const context = Context.single('user', id);
  context.addAttribute(new Attribute('plan', [plan]));
  context.addAttribute(new Attribute('country', [country]));
  return context;
}

// The signed-in user. Set it when someone signs in, clear it when they sign out.
export const currentUser = signal<Context | undefined>(undefined);

// Pass a signal and every flag in the app re-evaluates when the user changes. An equal-but-new
// Context (same attributes) doesn't restart loading.
export const contextProviders = [
  provideZenmanage({
    environmentToken: 'cli_your_client_key_here',
    context: currentUser,
  }),
];

@Component({
  selector: 'example-context-flags',
  template: `
    <button (click)="signIn()">Sign in</button>
    <p>Beta: {{ beta.value() }}</p>
    <p>Beta for a Canadian pro user: {{ canadianPro.value() }}</p>
  `,
})
export class ContextFlagsExampleComponent {
  private readonly flags = inject(ZenmanageFlagsService);

  // Uses the user from provideZenmanage.
  readonly beta = injectFlag('beta-program', false);

  // A context of its own, for this one flag.
  readonly canadianPro = injectFlag('beta-program', false, {
    context: userContext('preview', 'pro', 'CA'),
  });

  signIn(): void {
    currentUser.set(userContext('user-123', 'pro', 'US'));
  }

  // Or evaluate once, in code, for any context.
  isEnabledFor(context: Context): Promise<boolean> {
    return this.flags.isEnabled('beta-program', false, { context });
  }
}
