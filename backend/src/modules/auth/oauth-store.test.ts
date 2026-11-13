import { describe, expect, it } from 'vitest';
import { digest, OneTimeStore, randomSecret } from './oauth-store.js';

describe('one-time OAuth store', () => {
  it('retains only hashed keys and consumes without an asynchronous gap', () => {
    const store = new OneTimeStore<string>(1000);
    const code = randomSecret(); store.put(code, 'value');
    const keys = [...(store as unknown as { entries: Map<string, unknown> }).entries.keys()];
    expect(keys).toEqual([digest(code)]);
    expect(store.take(code)).toBe('value'); expect(store.take(code)).toBeUndefined();
  });
  it('expires entries and bounds memory without evicting live transactions', () => {
    let now = 0; const store = new OneTimeStore<string>(1000, 1, () => now);
    store.put('first', 'one'); expect(() => store.put('second', 'two')).toThrow();
    now = 1000; expect(store.take('first')).toBeUndefined();
    store.put('second', 'two'); expect(store.take('second')).toBe('two');
  });
});
