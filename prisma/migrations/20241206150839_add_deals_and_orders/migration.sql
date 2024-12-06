-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('BASE', 'SAFETY', 'TAKE_PROFIT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PLACED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "HistoryType" AS ENUM ('DEAL_CREATED', 'ORDER_PLACED', 'ORDER_FILLED', 'SAFETY_ORDER_TRIGGERED', 'TP_UPDATED', 'DEAL_CLOSED', 'ERROR');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "currentQuantity" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "currentProfit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "side" "OrderSide" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "symbol" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "filled" DOUBLE PRECISION NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "filledAt" TIMESTAMP(3),
    "exchangeOrderId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "HistoryType" NOT NULL,
    "orderId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_botId_idx" ON "Deal"("botId");

-- CreateIndex
CREATE INDEX "Order_dealId_idx" ON "Order"("dealId");

-- CreateIndex
CREATE INDEX "DealHistory_dealId_idx" ON "DealHistory"("dealId");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealHistory" ADD CONSTRAINT "DealHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
