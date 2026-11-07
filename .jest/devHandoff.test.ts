jest.mock('expo', () => ({ requireOptionalNativeModule: () => null }));

import { getDevPackageName, isDevPackageName } from '../modules/dev-handoff';

describe('getDevPackageName', () => {
  it('appends .dev to the production package', () => {
    expect(getDevPackageName('com.dleanjeans.recupero')).toBe('com.dleanjeans.recupero.dev');
  });

  it('swaps the preview suffix for .dev', () => {
    expect(getDevPackageName('com.dleanjeans.recupero.preview')).toBe('com.dleanjeans.recupero.dev');
  });

  it('keeps a dev package as is', () => {
    expect(getDevPackageName('com.dleanjeans.recupero.dev')).toBe('com.dleanjeans.recupero.dev');
  });
});

describe('isDevPackageName', () => {
  it('detects only the dev variant', () => {
    expect(isDevPackageName('com.dleanjeans.recupero.dev')).toBe(true);
    expect(isDevPackageName('com.dleanjeans.recupero.preview')).toBe(false);
    expect(isDevPackageName('com.dleanjeans.recupero')).toBe(false);
  });
});
