import { Component, signal } from '@angular/core';
import { Attribute, Context } from '@zenmanage/sdk';
import { describe, expect, it } from 'vitest';
import { ZenmanageIfFlagDirective } from '../src/lib/zenmanage-if-flag.directive';
import { ZenmanageIfVariantDirective } from '../src/lib/zenmanage-if-variant.directive';
import { flag, installFakeApi } from './fakeApi';
import { configure, render, service, text, until } from './helpers';

@Component({
  imports: [ZenmanageIfFlagDirective],
  template: `
    <section>
      <span
        *zenmanageIfFlag="
          key();
          else off;
          loading: pending;
          default: fallback();
          invert: invert();
          context: context()
        "
        >on</span
      >
      <ng-template #off><i>off</i></ng-template>
      <ng-template #pending><i>loading</i></ng-template>
    </section>
  `,
})
class FlagHost {
  readonly key = signal('promo');
  readonly fallback = signal(false);
  readonly invert = signal(false);
  readonly context = signal<Context | undefined>(undefined);
}

@Component({
  imports: [ZenmanageIfFlagDirective],
  template: `<span *zenmanageIfFlag="'promo'">on</span>`,
})
class BareFlagHost {}

@Component({
  imports: [ZenmanageIfVariantDirective],
  template: `
    <section>
      <span
        *zenmanageIfVariant="
          key();
          is: expected();
          else other;
          loading: pending;
          default: fallback();
          invert: invert();
          context: context()
        "
        >match</span
      >
      <ng-template #other><i>other</i></ng-template>
      <ng-template #pending><i>loading</i></ng-template>
    </section>
  `,
})
class VariantHost {
  readonly key = signal('checkout');
  readonly expected = signal<string | string[]>(['one-page', 'stepper']);
  readonly fallback = signal('control');
  readonly invert = signal(false);
  readonly context = signal<Context | undefined>(undefined);
}

describe('*zenmanageIfFlag', () => {
  it('shows the loading template, then the template for an enabled flag', async () => {
    installFakeApi([flag('promo', true)]);
    configure();

    const fixture = render(FlagHost);
    expect(text(fixture)).toBe('loading');

    await until(fixture, () => expect(text(fixture)).toBe('on'));
  });

  it('shows the else template for a disabled flag', async () => {
    installFakeApi([flag('promo', false)]);
    configure();

    const fixture = render(FlagHost);

    await until(fixture, () => expect(text(fixture)).toBe('off'));
  });

  it('inverts', async () => {
    installFakeApi([flag('promo', false)]);
    configure();

    const fixture = render(FlagHost);
    fixture.componentInstance.invert.set(true);

    await until(fixture, () => expect(text(fixture)).toBe('on'));
  });

  it('shows nothing, not even the else template, while loading without a loading template', async () => {
    installFakeApi([flag('promo', true)]);
    configure();

    const fixture = render(BareFlagHost);
    expect(text(fixture)).toBe('');

    await until(fixture, () => expect(text(fixture)).toBe('on'));
  });

  it('uses the default for a flag that does not exist', async () => {
    installFakeApi([]);
    configure();

    const fixture = render(FlagHost);
    fixture.componentInstance.key.set('missing');
    await until(fixture, () => expect(text(fixture)).toBe('off'));

    fixture.componentInstance.fallback.set(true);
    await until(fixture, () => expect(text(fixture)).toBe('on'));
  });

  it('renders nothing for an empty key', async () => {
    installFakeApi([flag('promo', true)]);
    configure();

    const fixture = render(FlagHost);
    await until(fixture, () => expect(text(fixture)).toBe('on'));

    fixture.componentInstance.key.set('');
    fixture.detectChanges();
    expect(text(fixture)).toBe('');
  });

  it('never shows the old flag for a new key while it loads', async () => {
    installFakeApi([flag('promo', true), flag('other', false)]);
    configure();

    const fixture = render(FlagHost);
    await until(fixture, () => expect(text(fixture)).toBe('on'));

    fixture.componentInstance.key.set('other');
    fixture.detectChanges();
    expect(text(fixture)).toBe('loading');

    await until(fixture, () => expect(text(fixture)).toBe('off'));
  });

  it('keeps the rendered view through a refresh when the answer stays the same', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();

    const fixture = render(FlagHost);
    await until(fixture, () => expect(text(fixture)).toBe('on'));
    const before = (fixture.nativeElement as HTMLElement).querySelector('span');

    await service().refresh();
    await until(fixture, () => expect(api.rulesLoads()).toHaveLength(2));
    fixture.detectChanges();

    expect(text(fixture)).toBe('on');
    expect((fixture.nativeElement as HTMLElement).querySelector('span')).toBe(before);
  });

  it('swaps the view when a refresh changes the answer', async () => {
    const api = installFakeApi([flag('promo', true)]);
    configure();

    const fixture = render(FlagHost);
    await until(fixture, () => expect(text(fixture)).toBe('on'));

    api.setFlags([flag('promo', false)]);
    await service().refresh();

    await until(fixture, () => expect(text(fixture)).toBe('off'));
  });

  it('evaluates for the context given to the directive', async () => {
    installFakeApi([
      flag('promo', false, [
        { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true },
      ] as never),
    ]);
    configure();
    const pro = Context.single('user', 'a');
    pro.addAttribute(new Attribute('plan', ['pro']));

    const fixture = render(FlagHost);
    await until(fixture, () => expect(text(fixture)).toBe('off'));

    fixture.componentInstance.context.set(pro);
    await until(fixture, () => expect(text(fixture)).toBe('on'));
  });
});

describe('*zenmanageIfVariant', () => {
  it('shows the loading template, then the template for a matching variant', async () => {
    installFakeApi([flag('checkout', 'stepper')]);
    configure();

    const fixture = render(VariantHost);
    expect(text(fixture)).toBe('loading');

    await until(fixture, () => expect(text(fixture)).toBe('match'));
  });

  it('shows the else template for any other variant', async () => {
    installFakeApi([flag('checkout', 'legacy')]);
    configure();

    const fixture = render(VariantHost);

    await until(fixture, () => expect(text(fixture)).toBe('other'));
  });

  it('accepts a single variant, and inverts', async () => {
    installFakeApi([flag('checkout', 'legacy')]);
    configure();

    const fixture = render(VariantHost);
    fixture.componentInstance.expected.set('legacy');
    await until(fixture, () => expect(text(fixture)).toBe('match'));

    fixture.componentInstance.invert.set(true);
    await until(fixture, () => expect(text(fixture)).toBe('other'));
  });

  it('matches nothing when no variant is expected', async () => {
    installFakeApi([flag('checkout', 'legacy')]);
    configure();

    const fixture = render(VariantHost);
    fixture.componentInstance.expected.set([]);

    await until(fixture, () => expect(text(fixture)).toBe('other'));
  });

  it('uses the default variant for a flag that does not exist', async () => {
    installFakeApi([]);
    configure();

    const fixture = render(VariantHost);
    fixture.componentInstance.key.set('missing');
    fixture.componentInstance.expected.set('control');

    await until(fixture, () => expect(text(fixture)).toBe('match'));
  });

  it('renders nothing for an empty key', async () => {
    installFakeApi([flag('checkout', 'stepper')]);
    configure();

    const fixture = render(VariantHost);
    await until(fixture, () => expect(text(fixture)).toBe('match'));

    fixture.componentInstance.key.set('');
    fixture.detectChanges();
    expect(text(fixture)).toBe('');
  });

  it('evaluates for the context given to the directive', async () => {
    installFakeApi([
      flag('checkout', 'legacy', [
        { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: 'stepper' },
      ] as never),
    ]);
    configure();
    const pro = Context.single('user', 'a');
    pro.addAttribute(new Attribute('plan', ['pro']));

    const fixture = render(VariantHost);
    await until(fixture, () => expect(text(fixture)).toBe('other'));

    fixture.componentInstance.context.set(pro);
    await until(fixture, () => expect(text(fixture)).toBe('match'));
  });
});
