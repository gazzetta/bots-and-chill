-- DropForeignKey
ALTER TABLE "ExchangeKey" DROP CONSTRAINT "ExchangeKey_userId_fkey";

-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "baseOrderSize" DOUBLE PRECISION NOT NULL,
    "maxSafetyOrders" INTEGER NOT NULL,
    "priceDeviation" DOUBLE PRECISION NOT NULL,
    "safetyOrderSize" DOUBLE PRECISION NOT NULL,
    "safetyOrderPriceStep" DOUBLE PRECISION NOT NULL,
    "safetyOrderVolumeStep" DOUBLE PRECISION NOT NULL,
    "takeProfit" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bot_userId_idx" ON "Bot"("userId");

-- CreateIndex
CREATE INDEX "Bot_pairId_idx" ON "Bot"("pairId");

-- AddForeignKey
ALTER TABLE "ExchangeKey" ADD CONSTRAINT "ExchangeKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "TradingPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
