import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { digest, equalSecret, isSecret, randomSecret } from './oauth-store.js';
import {
  createOAuthDelivery,
  createOAuthTransaction,
  takeOAuthDelivery,
  takeOAuthTransaction,
} from './oauth-repository.js';
import { googleClient, readGoogleConfig, verifyGoogleIdentity } from './google-provider.js';

export async function googleRoutes(app: FastifyInstance) {
  const config = readGoogleConfig();
  const secure = process.env.NODE_ENV === 'production';
  const cookieName = secure ? '__Host-memdeck-oauth' : 'memdeck-oauth';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
  const destination = (key: 'code' | 'error', value: string) => {
    const url = new URL('/auth/google/return', config!.frontendOrigin);
    // Fragment is never transmitted to frontend hosting or in Referer headers.
    url.hash = new URLSearchParams({ [key]: value }).toString();
    return url.href;
  };

  app.get('/auth/google', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (!config) return reply.status(503).send({ message: 'Login Google indisponível.' });
    const challenge = (request.query as { challenge?: unknown }).challenge;
    if (!isSecret(challenge)) return reply.redirect(destination('error', 'invalid_flow'));
    const state = randomSecret();
    const browser = randomSecret();
    const nonce = randomSecret();
    const verifier = randomSecret();
    await createOAuthTransaction(state, {
      browserHash: digest(browser),
      nonce,
      verifier,
      challengeHash: challenge,
    });
    reply.setCookie(cookieName, browser, { ...cookieOptions, maxAge: 300 });
    const client = googleClient(config);
    return reply.redirect(client.generateAuthUrl({
      response_type: 'code', scope: ['openid', 'email', 'profile'], access_type: 'online',
      state, nonce, code_challenge: digest(verifier),
      code_challenge_method: 'S256' as NonNullable<Parameters<typeof client.generateAuthUrl>[0]>['code_challenge_method'],
    }));
  });

  app.get('/auth/google/callback', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (!config) return reply.status(503).send({ message: 'Login Google indisponível.' });
    const query = request.query as { state?: unknown; code?: unknown; error?: unknown };
    const browser = request.cookies[cookieName];
    reply.clearCookie(cookieName, cookieOptions);
    const flow = isSecret(query.state) ? await takeOAuthTransaction(query.state) : undefined;
    if (!flow || !isSecret(browser) || !equalSecret(flow.browserHash, digest(browser))) return reply.redirect(destination('error', 'invalid_flow'));
    if (query.error) return reply.redirect(destination('error', query.error === 'access_denied' ? 'cancelled' : 'failed'));
    if (typeof query.code !== 'string' || !query.code || query.code.length > 4096) return reply.redirect(destination('error', 'invalid_flow'));
    try {
      const client = googleClient(config);
      const { tokens } = await client.getToken({ code: query.code, codeVerifier: flow.verifier, redirect_uri: config.redirectUri });
      if (!tokens.id_token) throw new Error('Missing ID token');
      const identity = await verifyGoogleIdentity(client, tokens.id_token, config.clientId, flow.nonce);
      const select = { id: true, name: true, email: true } as const;
      let user = await prisma.user.findUnique({ where: { googleId: identity.sub }, select });
      if (!user) {
        // Case-insensitive check also protects existing non-normalized local accounts.
        const collision = await prisma.user.findFirst({ where: { email: { equals: identity.email, mode: 'insensitive' } }, select: { id: true } });
        if (collision) return reply.redirect(destination('error', 'account_conflict'));
        user = await prisma.user.create({ data: { googleId: identity.sub, email: identity.email, name: identity.name }, select });
      }
      const code = randomSecret();
      await createOAuthDelivery(code, { challenge: flow.challengeHash, userId: user.id });
      return reply.redirect(destination('code', code));
    } catch (error) {
      const conflict = typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
      request.log.warn({ event: 'google_callback_failed' }, 'Google authentication failed');
      return reply.redirect(destination('error', conflict ? 'account_conflict' : 'failed'));
    }
  });

  app.post('/auth/google/exchange', {
    bodyLimit: 2048,
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!config) return reply.status(503).send({ message: 'Login Google indisponível.' });
    if (request.headers.origin !== config.frontendOrigin) return reply.status(403).send({ message: 'Origem inválida.' });
    const body = request.body as { code?: unknown; verifier?: unknown } | null;
    if (!isSecret(body?.code) || !isSecret(body?.verifier)) return reply.status(400).send({ message: 'Autenticação inválida ou expirada. Inicie novamente.' });
    const delivery = await takeOAuthDelivery(body.code);
    if (!delivery || !equalSecret(delivery.challenge, digest(body.verifier))) return reply.status(400).send({ message: 'Autenticação inválida ou expirada. Inicie novamente.' });
    const user = await prisma.user.findUnique({
      where: { id: delivery.userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) return reply.status(400).send({ message: 'Autenticação inválida ou expirada. Inicie novamente.' });
    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' });
    return { user, token };
  });
}
