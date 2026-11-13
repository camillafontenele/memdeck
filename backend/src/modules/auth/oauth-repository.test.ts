import { beforeEach, describe, expect, it, vi } from 'vitest';
import { digest, randomSecret } from './oauth-store.js';

const database = vi.hoisted(() => ({
  oAuthTransaction: { create: vi.fn() },
  oAuthDelivery: { create: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: database }));

import {
  createOAuthDelivery,
  createOAuthTransaction,
  takeOAuthDelivery,
  takeOAuthTransaction,
} from './oauth-repository.js';

describe('OAuth PostgreSQL repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists only hashes for opaque state and delivery codes', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T18:00:00.000Z'));
    const state = randomSecret(); const code = randomSecret();
    await createOAuthTransaction(state, { browserHash: 'browser', nonce: 'nonce', verifier: 'verifier', challengeHash: 'challenge' });
    await createOAuthDelivery(code, { challenge: 'challenge', userId: 'user-1' });
    expect(database.oAuthTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stateHash: digest(state), expiresAt: new Date('2026-11-13T18:05:00.000Z') }),
    });
    expect(database.oAuthDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ codeHash: digest(code), challengeHash: 'challenge', userId: 'user-1', expiresAt: new Date('2026-11-13T18:01:00.000Z') }),
    });
    vi.useRealTimers();
  });

  it('uses atomic delete-returning queries and allows only one concurrent delivery consumption', async () => {
    const code = randomSecret();
    let delivery: { challenge: string; userId: string } | undefined = { challenge: 'challenge', userId: 'user-1' };
    database.$queryRaw.mockImplementation(async () => {
      const consumed = delivery; delivery = undefined;
      return consumed ? [consumed] : [];
    });
    const results = await Promise.all([takeOAuthDelivery(code), takeOAuthDelivery(code)]);
    expect(results.filter(Boolean)).toEqual([{ challenge: 'challenge', userId: 'user-1' }]);
    const query = database.$queryRaw.mock.calls[0][0] as { strings: TemplateStringsArray; values: unknown[] };
    expect(query.strings.join(' ')).toContain('DELETE FROM "OAuthDelivery"');
    expect(query.strings.join(' ')).toContain('"expiresAt" > NOW()');
    expect(query.strings.join(' ')).toContain('RETURNING');
    expect(query.values).toContain(digest(code));
  });

  it('uses the same atomic expiry guard for OAuth transactions', async () => {
    database.$queryRaw.mockResolvedValue([{ browserHash: 'browser', nonce: 'nonce', verifier: 'verifier', challengeHash: 'challenge' }]);
    await expect(takeOAuthTransaction(randomSecret())).resolves.toEqual({ browserHash: 'browser', nonce: 'nonce', verifier: 'verifier', challengeHash: 'challenge' });
    const query = database.$queryRaw.mock.calls[0][0] as { strings: TemplateStringsArray };
    expect(query.strings.join(' ')).toContain('DELETE FROM "OAuthTransaction"');
    expect(query.strings.join(' ')).toContain('"expiresAt" > NOW()');
  });
});
