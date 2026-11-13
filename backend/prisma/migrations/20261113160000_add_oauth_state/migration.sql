-- CreateTable
CREATE TABLE "OAuthTransaction" (
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthTransaction_pkey" PRIMARY KEY ("stateHash")
);

-- CreateTable
CREATE TABLE "OAuthDelivery" (
    "codeHash" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthDelivery_pkey" PRIMARY KEY ("codeHash")
);

-- CreateIndex
CREATE INDEX "OAuthTransaction_expiresAt_idx" ON "OAuthTransaction"("expiresAt");

-- CreateIndex
CREATE INDEX "OAuthDelivery_expiresAt_idx" ON "OAuthDelivery"("expiresAt");

-- AddForeignKey
ALTER TABLE "OAuthDelivery" ADD CONSTRAINT "OAuthDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
