import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { digest } from './oauth-store.js';

const transactionTtlMs = 5 * 60_000;
const deliveryTtlMs = 60_000;

export type OAuthTransaction = {
  browserHash: string;
  nonce: string;
  verifier: string;
  challengeHash: string;
};

export type OAuthDelivery = {
  challenge: string;
  userId: string;
};

export async function createOAuthTransaction(
  state: string,
  transaction: OAuthTransaction,
) {
  await prisma.oAuthTransaction.create({
    data: {
      stateHash: digest(state),
      ...transaction,
      expiresAt: new Date(Date.now() + transactionTtlMs),
    },
  });
}

export async function takeOAuthTransaction(state: string): Promise<OAuthTransaction | undefined> {
  const rows = await prisma.$queryRaw<OAuthTransaction[]>(Prisma.sql`
    DELETE FROM "OAuthTransaction"
    WHERE "stateHash" = ${digest(state)}
      AND "expiresAt" > NOW()
    RETURNING "browserHash", "nonce", "verifier", "challengeHash"
  `);

  return rows[0];
}

export async function createOAuthDelivery(
  code: string,
  delivery: OAuthDelivery,
) {
  await prisma.oAuthDelivery.create({
    data: {
      codeHash: digest(code),
      challengeHash: delivery.challenge,
      userId: delivery.userId,
      expiresAt: new Date(Date.now() + deliveryTtlMs),
    },
  });
}

export async function takeOAuthDelivery(code: string): Promise<OAuthDelivery | undefined> {
  const rows = await prisma.$queryRaw<OAuthDelivery[]>(Prisma.sql`
    DELETE FROM "OAuthDelivery"
    WHERE "codeHash" = ${digest(code)}
      AND "expiresAt" > NOW()
    RETURNING "challengeHash" AS "challenge", "userId"
  `);

  return rows[0];
}
