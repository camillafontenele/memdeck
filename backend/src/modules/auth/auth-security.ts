import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { digest } from './oauth-store.js';

// Never serialize URLs, headers, bodies, upstream errors or redirect Location.
export const safeLogger = {
  serializers: {
    req: (req: { method?: string }) => ({ method: req.method }),
    res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    err: () => ({ type: 'Error', message: 'Request failed', stack: '' }),
  },
  redact: ['req.headers', 'req.body', 'res.headers', 'body', 'headers'],
};

export async function installAuthSecurity(app: FastifyInstance) {
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false, max: 20, timeWindow: '1 minute', cache: 10000,
    errorResponseBuilder: () => ({ statusCode: 429, error: 'Too Many Requests', message: 'Muitas tentativas. Aguarde e tente novamente.' }),
  });
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');
  });
  app.setErrorHandler((error, request, reply) => {
    const code = typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined;
    const status = typeof code === 'number' && code >= 400 && code < 500 ? code : 500;
    request.log.warn({ event: 'auth_request_rejected', status }, 'Authentication request rejected');
    reply.status(status).send({ message: status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.' : status === 400 ? 'Dados de autenticação inválidos.' : status === 401 ? 'Sessão inválida ou expirada.' : 'Não foi possível autenticar. Tente novamente.' });
  });
}

export function accountLimit(app: FastifyInstance) {
  const check = app.createRateLimit({
    max: 10, timeWindow: '15 minutes',
    keyGenerator: request => {
      const email = (request.body as { email?: unknown } | undefined)?.email;
      return `account:${digest(typeof email === 'string' ? email.trim().toLowerCase() : request.ip)}`;
    },
  });
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await check(request);
    if (!result.isAllowed && result.isExceeded) return reply.header('Retry-After', Math.max(1, result.ttlInSeconds)).status(429)
      .send({ message: 'Muitas tentativas. Aguarde e tente novamente.' });
  };
}
