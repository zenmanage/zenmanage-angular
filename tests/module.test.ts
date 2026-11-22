import { describe, expect, it } from 'vitest';
import { ZenmanageModule } from '../src/lib/zenmanage.module';

describe('ZenmanageModule', () => {
  it('builds ModuleWithProviders via forRoot', () => {
    const result = ZenmanageModule.forRoot({
      environmentToken: 'srv_test_server_key',
      preload: false,
    });

    expect(result.ngModule).toBe(ZenmanageModule);
    expect(result.providers?.length).toBeGreaterThan(0);
  });
});
