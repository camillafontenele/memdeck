import { google } from 'googleapis';
import { equalSecret } from './oauth-store.js';

export type GoogleConfig = {
  clientId: string; clientSecret: string; redirectUri: string; frontendOrigin: string;
};
export function readGoogleConfig(env = process.env): GoogleConfig | undefined {
  const values = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI, env.FRONTEND_URL];
  if (values.every(value => !value)) return undefined;
  if (values.some(value => !value)) throw new Error('Configure all Google OAuth variables and FRONTEND_URL.');
  const redirect = new URL(env.GOOGLE_REDIRECT_URI!);
  const frontend = new URL(env.FRONTEND_URL!);
  for (const url of [redirect, frontend]) {
    const local = env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
      throw new Error('Invalid OAuth URL configuration.');
    }
  }
  if (redirect.pathname !== '/auth/google/callback' || frontend.pathname !== '/') throw new Error('Invalid OAuth callback or frontend origin.');
  const origins = (env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim());
  if (!origins.includes(frontend.origin)) throw new Error('FRONTEND_URL must be allowed by CORS_ORIGIN.');
  return { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, redirectUri: redirect.href, frontendOrigin: frontend.origin };
}

export function googleClient(config: GoogleConfig) {
  return new google.auth.OAuth2({
    clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri,
    transporterOptions: { timeout: 10_000 },
  });
}

export async function verifyGoogleIdentity(client: ReturnType<typeof googleClient>, idToken: string, audience: string, nonce: string) {
  const ticket = await client.verifyIdToken({ idToken, audience });
  const claims = ticket.getPayload() as (ReturnType<typeof ticket.getPayload> & { nonce?: string });
  if (!claims || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 ||
      typeof claims.email !== 'string' || !claims.email || claims.email.length > 254 ||
      claims.email_verified !== true || typeof claims.nonce !== 'string' || !equalSecret(claims.nonce, nonce) ||
      claims.aud !== audience || (claims.azp && claims.azp !== audience) ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
      !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) {
    throw new Error('Invalid Google identity');
  }
  return { sub: claims.sub, email: claims.email, name: claims.name?.slice(0, 200) || 'Usuário' };
}
