import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as provider from './google-provider.js';
import { digest, randomSecret } from './oauth-store.js';
import { safeLogger } from './auth-security.js';

const database = vi.hoisted(() => ({ user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() } }));
const oauth = vi.hoisted(() => {
  const transactions = new Map<string, { value: { browserHash: string; nonce: string; verifier: string; challengeHash: string }; expiresAt: number }>();
  const deliveries = new Map<string, { value: { challenge: string; userId: string }; expiresAt: number }>();
  return {
    reset: () => { transactions.clear(); deliveries.clear(); },
    createOAuthTransaction: async (state: string, value: { browserHash: string; nonce: string; verifier: string; challengeHash: string }) => {
      transactions.set(state, { value, expiresAt: Date.now() + 300_000 });
    },
    takeOAuthTransaction: async (state: string) => {
      const entry = transactions.get(state); transactions.delete(state);
      return entry && entry.expiresAt > Date.now() ? entry.value : undefined;
    },
    createOAuthDelivery: async (code: string, value: { challenge: string; userId: string }) => {
      deliveries.set(code, { value, expiresAt: Date.now() + 60_000 });
    },
    takeOAuthDelivery: async (code: string) => {
      const entry = deliveries.get(code); deliveries.delete(code);
      return entry && entry.expiresAt > Date.now() ? entry.value : undefined;
    },
  };
});
vi.mock('../../lib/prisma.js', () => ({ prisma: database }));
vi.mock('./oauth-repository.js', () => oauth);
import { authRoutes } from './auth-routes.js';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const originalFactory = provider.googleClient;
const user = { id: 'memdeck-user', name: 'Ana', email: 'ana@example.com' };
let nonce = '';
let googleChallenge = '';
let claims: Record<string, unknown> = {};
let invalidSignature = false;
let failExchange = false;
let rejectPkce = false;
let tokenExchange = vi.fn();
let clients: ReturnType<typeof originalFactory>[];
let apps: FastifyInstance[];

function signedToken() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const input = `${encode({ alg: 'RS256', kid: 'local-test' })}.${encode({ iss: 'https://accounts.google.com', aud: 'test-client', sub: 'google-user', name: user.name, email: user.email, email_verified: true, nonce, iat: now - 1, exp: now + 300, ...claims })}`;
  const signature = sign('RSA-SHA256', Buffer.from(input), keys.privateKey);
  if (invalidSignature) signature[0] ^= 255;
  return `${input}.${signature.toString('base64url')}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  oauth.reset();
  apps = []; clients = []; claims = {}; invalidSignature = false; failExchange = false; rejectPkce = false;
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
  vi.stubEnv('GOOGLE_REDIRECT_URI', 'https://api.example.com/auth/google/callback');
  vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
  vi.stubEnv('CORS_ORIGIN', 'https://app.example.com');
  vi.stubEnv('NODE_ENV', 'production');
  database.user.findUnique.mockImplementation(({ where }: { where: { googleId?: string; id?: string } }) =>
    Promise.resolve(where.id === user.id ? user : null),
  );
  database.user.findFirst.mockResolvedValue(null);
  database.user.create.mockResolvedValue(user);
  tokenExchange = vi.fn(async (options: { codeVerifier: string }) => {
    if (failExchange) throw new Error('SECRET_UPSTREAM_RESPONSE');
    if (rejectPkce || digest(options.codeVerifier) !== googleChallenge) throw new Error('invalid_grant');
    return { tokens: { id_token: signedToken(), access_token: 'SECRET_GOOGLE_ACCESS_TOKEN' } };
  });
  vi.spyOn(provider, 'googleClient').mockImplementation(config => {
    const client = originalFactory(config);
    vi.spyOn(client, 'getToken').mockImplementation(tokenExchange as never);
    // Real verifyIdToken crypto; only certificate transport is replaced, never verification.
    vi.spyOn(client, 'getFederatedSignonCertsAsync').mockResolvedValue({
      certs: { 'local-test': keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() }, format: 'PEM',
    } as Awaited<ReturnType<typeof client.getFederatedSignonCertsAsync>>);
    clients.push(client);
    return client;
  });
});
afterEach(async () => {
  await Promise.all(apps.map(app => app.close()));
  vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks();
});

async function setup() {
  const logs: string[] = [];
  const app = Fastify({ logger: { ...safeLogger, stream: { write: (line: string) => logs.push(line) } } });
  apps.push(app);
  await app.register(jwt, { secret: 'local-jwt-secret' });
  await app.register(authRoutes);
  await app.ready();
  return { app, logs };
}
async function begin(app: FastifyInstance) {
  const verifier = randomSecret();
  const response = await app.inject({ url: `/auth/google?challenge=${digest(verifier)}` });
  expect(response.statusCode).toBe(302);
  const url = new URL(response.headers.location!);
  nonce = url.searchParams.get('nonce')!;
  googleChallenge = url.searchParams.get('code_challenge')!;
  const cookie = response.cookies[0];
  expect(cookie.httpOnly).toBe(true); expect(cookie.secure).toBe(true); expect(cookie.sameSite).toBe('Lax');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  return { verifier, state: url.searchParams.get('state')!, cookies: { [cookie.name]: cookie.value } };
}
async function callback(app: FastifyInstance, flow: Awaited<ReturnType<typeof begin>>, extra = '') {
  return app.inject({ url: `/auth/google/callback?state=${flow.state}&code=SECRET_GOOGLE_CODE${extra}`, cookies: flow.cookies });
}
function returned(response: { headers: { location?: string } }) { return new URLSearchParams(new URL(response.headers.location!).hash.slice(1)); }
async function exchange(app: FastifyInstance, code: string, verifier: string, origin = 'https://app.example.com') {
  return app.inject({ method: 'POST', url: '/auth/google/exchange', headers: { origin }, payload: { code, verifier } });
}

describe('Google OAuth security', () => {
  it('creates a Google account and delivers the existing JWT session through a single-use exchange', async () => {
    const { app, logs } = await setup(); const flow = await begin(app);
    const result = await callback(app, flow); const code = returned(result).get('code')!;
    expect(code).toMatch(/^[\w-]{43}$/);
    expect(new URL(result.headers.location!).search).toBe('');
    expect(database.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: { googleId: 'google-user', email: user.email, name: user.name } }));
    expect(tokenExchange).toHaveBeenCalledWith(expect.objectContaining({ code: 'SECRET_GOOGLE_CODE', redirect_uri: 'https://api.example.com/auth/google/callback' }));
    expect(clients).toHaveLength(2); expect(clients[0]).not.toBe(clients[1]);
    const session = await exchange(app, code, flow.verifier);
    expect(session.statusCode).toBe(200);
    expect(app.jwt.verify<{ sub: string }>(session.json().token).sub).toBe(user.id);
    expect(session.headers['cache-control']).toBe('no-store');
    expect(session.headers['referrer-policy']).toBe('no-referrer');
    expect((await exchange(app, code, flow.verifier)).statusCode).toBe(400);
    const text = logs.join('');
    for (const secret of [code, flow.verifier, flow.state, nonce, 'SECRET_GOOGLE_CODE', 'SECRET_GOOGLE_ACCESS_TOKEN', session.json().token, user.email]) expect(text).not.toContain(secret);
    expect(JSON.stringify(result.headers)).not.toContain('SECRET_GOOGLE_ACCESS_TOKEN');
  });
  it('logs in an existing identity by sub even when Google email changes', async () => {
    database.user.findUnique.mockResolvedValue(user); claims.email = 'changed@example.com';
    const { app } = await setup(); const flow = await begin(app); const result = await callback(app, flow);
    expect(returned(result).has('code')).toBe(true);
    expect(database.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { googleId: 'google-user' } }));
    expect(database.user.findFirst).not.toHaveBeenCalled(); expect(database.user.create).not.toHaveBeenCalled(); expect(database.user.update).not.toHaveBeenCalled();
  });
  it.each([null, 'different-google-sub'])('refuses email linking for existing account googleId=%s', async googleId => {
    database.user.findFirst.mockResolvedValue({ ...user, googleId });
    const { app } = await setup(); const flow = await begin(app);
    expect(returned(await callback(app, flow)).get('error')).toBe('account_conflict');
    expect(database.user.update).not.toHaveBeenCalled(); expect(database.user.create).not.toHaveBeenCalled();
  });
  it('handles concurrent unique email conflicts safely', async () => {
    database.user.create.mockRejectedValue({ code: 'P2002', message: 'SECRET_DATABASE_DETAILS' });
    const { app, logs } = await setup(); const flow = await begin(app);
    expect(returned(await callback(app, flow)).get('error')).toBe('account_conflict');
    expect(logs.join('')).not.toContain('SECRET_DATABASE_DETAILS');
  });
  it.each(['invalid', 'expired', 'replayed', 'wrong-browser'])('rejects %s state before calling Google', async variant => {
    const { app } = await setup(); const flow = await begin(app);
    if (variant === 'invalid') flow.state = randomSecret();
    if (variant === 'wrong-browser') flow.cookies = { '__Host-memdeck-oauth': randomSecret() };
    if (variant === 'expired') vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301_000);
    if (variant === 'replayed') { await callback(app, flow, '&error=access_denied'); tokenExchange.mockClear(); }
    expect(returned(await callback(app, flow)).get('error')).toBe('invalid_flow');
    expect(tokenExchange).not.toHaveBeenCalled(); expect(database.user.create).not.toHaveBeenCalled();
  });
  it.each(['nonce', 'signature', 'audience', 'issuer', 'expiry', 'email', 'sub', 'pkce'])('rejects invalid %s', async variant => {
    const { app } = await setup(); const flow = await begin(app);
    if (variant === 'nonce') claims.nonce = randomSecret();
    if (variant === 'signature') invalidSignature = true;
    if (variant === 'audience') claims.aud = 'another-client';
    if (variant === 'issuer') claims.iss = 'https://attacker.example';
    if (variant === 'expiry') claims.exp = Math.floor(Date.now() / 1000) - 600;
    if (variant === 'email') claims.email_verified = false;
    if (variant === 'sub') claims.sub = '';
    if (variant === 'pkce') rejectPkce = true;
    expect(returned(await callback(app, flow)).get('error')).toBe('failed');
    expect(database.user.findUnique).not.toHaveBeenCalled();
  });
  it('handles cancellation without token exchange', async () => {
    const { app } = await setup(); const flow = await begin(app);
    expect(returned(await callback(app, flow, '&error=access_denied')).get('error')).toBe('cancelled');
    expect(tokenExchange).not.toHaveBeenCalled();
  });
  it('handles provider failures without exposing details', async () => {
    failExchange = true;
    const { app, logs } = await setup(); const flow = await begin(app); const result = await callback(app, flow);
    expect(returned(result).get('error')).toBe('failed');
    expect(JSON.stringify(result.headers) + result.body + logs.join('')).not.toContain('SECRET_UPSTREAM_RESPONSE');
  });
  it.each(['wrong-verifier', 'expired', 'other-flow'])('rejects %s delivery', async variant => {
    const { app } = await setup(); const flow = await begin(app); const code = returned(await callback(app, flow)).get('code')!;
    let verifier = flow.verifier;
    if (variant === 'wrong-verifier') verifier = randomSecret();
    if (variant === 'other-flow') verifier = (await begin(app)).verifier;
    if (variant === 'expired') vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    expect((await exchange(app, code, verifier)).statusCode).toBe(400);
  });
  it('only one of two concurrent exchanges succeeds', async () => {
    const { app } = await setup(); const flow = await begin(app); const code = returned(await callback(app, flow)).get('code')!;
    const results = await Promise.all([exchange(app, code, flow.verifier), exchange(app, code, flow.verifier)]);
    expect(results.map(value => value.statusCode).sort()).toEqual([200, 400]);
  });
  it('shares an OAuth flow between separate Fastify instances', async () => {
    const first = await setup(); const second = await setup(); const flow = await begin(first.app);
    const code = returned(await callback(second.app, flow)).get('code')!;
    expect((await exchange(first.app, code, flow.verifier)).statusCode).toBe(200);
  });
  it('rejects untrusted exchange origin without consuming delivery', async () => {
    const { app } = await setup(); const flow = await begin(app); const code = returned(await callback(app, flow)).get('code')!;
    expect((await exchange(app, code, flow.verifier, 'https://evil.example')).statusCode).toBe(403);
    expect((await exchange(app, code, flow.verifier)).statusCode).toBe(200);
  });
  it('rejects callback without a code and removes the binding cookie', async () => {
    const { app } = await setup(); const flow = await begin(app);
    const result = await app.inject({ url: `/auth/google/callback?state=${flow.state}`, cookies: flow.cookies });
    expect(returned(result).get('error')).toBe('invalid_flow');
    expect(result.cookies[0].value).toBe(''); expect(tokenExchange).not.toHaveBeenCalled();
  });
  it('limits OAuth starts', async () => {
    const { app } = await setup();
    for (let i = 0; i < 10; i++) expect((await app.inject({ url: `/auth/google?challenge=${randomSecret()}` })).statusCode).toBe(302);
    expect((await app.inject({ url: `/auth/google?challenge=${randomSecret()}` })).statusCode).toBe(429);
  });
});
