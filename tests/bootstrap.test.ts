import { Attribute, Context, DefaultsCollection, Flag } from '@zenmanage/sdk';
import { describe, expect, it } from 'vitest';
import {
  buildBootstrapPayload,
  contextFromBootstrapPayload,
  defaultsFromBootstrapPayload,
  parseBootstrapPayload,
} from '../src/lib/bootstrap';
import { describeDefaults, mergeDefaults } from '../src/lib/defaults';
import { flag } from './fakeApi';

const generatedAt = new Date('2026-10-10T12:00:00Z');

describe('buildBootstrapPayload', () => {
  it('builds from a record', () => {
    expect(buildBootstrapPayload({ a: true, b: 'x' }, { generatedAt })).toEqual({
      version: 1,
      generatedAt: '2026-10-10T12:00:00.000Z',
      flags: { a: true, b: 'x' },
    });
  });

  it('is plain JSON data, so TransferState can serialize it: nothing in it is undefined', () => {
    const payload = buildBootstrapPayload({ a: true }, { generatedAt });

    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    expect('context' in payload).toBe(false);
  });

  it('builds from evaluated flags, keeping every value type', () => {
    const flags = [
      flag('on', true),
      flag('limit', 7),
      flag('mode', 'b'),
      flag('ui', { theme: 'dark' }),
      flag('steps', [1, 2]),
    ].map((data) => Flag.fromObject(data));

    expect(buildBootstrapPayload(flags, { generatedAt }).flags).toEqual({
      on: true,
      limit: 7,
      mode: 'b',
      ui: { theme: 'dark' },
      steps: [1, 2],
    });
  });

  it('includes the context when one is given', () => {
    const context = Context.single('user', 'u-1');
    context.addAttribute(new Attribute('plan', ['pro']));

    const payload = buildBootstrapPayload({}, { context, generatedAt });

    expect(payload.context).toMatchObject({ type: 'user', identifier: 'u-1' });
  });

  it('stamps the current time by default', () => {
    const before = Date.now();
    const stamped = Date.parse(buildBootstrapPayload({}).generatedAt);

    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
  });
});

describe('parseBootstrapPayload', () => {
  const valid = buildBootstrapPayload({ a: true, ui: { x: 1 } }, { generatedAt });

  it('accepts what buildBootstrapPayload made', () => {
    expect(parseBootstrapPayload(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it('rejects anything that is not a version 1 payload', () => {
    expect(parseBootstrapPayload(null)).toBeNull();
    expect(parseBootstrapPayload('text')).toBeNull();
    expect(parseBootstrapPayload([])).toBeNull();
    expect(parseBootstrapPayload({ ...valid, version: 2 })).toBeNull();
    expect(parseBootstrapPayload({ ...valid, flags: [] })).toBeNull();
    expect(parseBootstrapPayload({ ...valid, generatedAt: 5 })).toBeNull();
  });

  it('drops values that are not flag values', () => {
    const parsed = parseBootstrapPayload({
      ...valid,
      flags: { ok: 1, nope: null, bad: Number.POSITIVE_INFINITY, text: 'x', missing: undefined },
    });

    expect(parsed?.flags).toEqual({ ok: 1, text: 'x' });
  });

  it('keeps an object context and ignores any other', () => {
    expect(parseBootstrapPayload({ ...valid, context: { type: 'user' } })?.context).toEqual({
      type: 'user',
    });
    expect(parseBootstrapPayload({ ...valid, context: 'user' })?.context).toBeUndefined();
  });
});

describe('defaults and context from a payload', () => {
  it('turns flags into defaults', () => {
    const defaults = defaultsFromBootstrapPayload(buildBootstrapPayload({ a: true, b: 'x' }));

    expect(defaults?.get('a')).toBe(true);
    expect(defaults?.get('b')).toBe('x');
    expect(defaultsFromBootstrapPayload(null)).toBeUndefined();
  });

  it('rebuilds the context', () => {
    const context = Context.single('user', 'u-1');
    context.addAttribute(new Attribute('plan', ['pro']));

    const rebuilt = contextFromBootstrapPayload(buildBootstrapPayload({}, { context }));

    expect(rebuilt?.toJSON()).toEqual(context.toJSON());
  });

  it('has no context when the payload has none, or it is unusable', () => {
    expect(contextFromBootstrapPayload(null)).toBeUndefined();
    expect(contextFromBootstrapPayload(buildBootstrapPayload({}))).toBeUndefined();

    const broken = { ...buildBootstrapPayload({}), context: 42 } as never;
    expect(contextFromBootstrapPayload(broken)).toBeUndefined();
  });
});

describe('mergeDefaults', () => {
  it('prefers the base over the bootstrap where both define a key', () => {
    const merged = mergeDefaults(
      DefaultsCollection.fromObject({ a: 'base', only: 'base' }),
      DefaultsCollection.fromObject({ a: 'bootstrap', other: 'bootstrap' })
    );

    expect(merged?.get('a')).toBe('base');
    expect(merged?.get('only')).toBe('base');
    expect(merged?.get('other')).toBe('bootstrap');
  });

  it('works with one side, or neither', () => {
    expect(mergeDefaults()).toBeUndefined();
    expect(mergeDefaults(DefaultsCollection.fromObject({ a: 1 }))?.get('a')).toBe(1);
    expect(mergeDefaults(undefined, DefaultsCollection.fromObject({ a: 2 }))?.get('a')).toBe(2);
  });
});

describe('describeDefaults', () => {
  it('describes equal collections the same, whatever order they were built in', () => {
    const first = DefaultsCollection.fromObject({ a: 1, b: 2 });
    const second = new DefaultsCollection().set('b', 2).set('a', 1);

    expect(describeDefaults(first)).toBe(describeDefaults(second));
    expect(describeDefaults(first)).not.toBe(
      describeDefaults(DefaultsCollection.fromObject({ a: 1 }))
    );
    expect(describeDefaults(undefined)).toBe('');
  });
});
