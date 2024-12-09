/*
  Warnings:

  - You are about to alter the column `baseOrderSize` on the `Bot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `priceDeviation` on the `Bot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `safetyOrderSize` on the `Bot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `safetyOrderPriceStep` on the `Bot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `safetyOrderVolumeStep` on the `Bot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `takeProfit` on the `Bot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `currentQuantity` on the `Deal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `averagePrice` on the `Deal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `totalCost` on the `Deal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `currentProfit` on the `Deal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `quantity` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `price` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `filled` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `remaining` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `cost` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `minQuantity` on the `TradingPair` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `maxQuantity` on the `TradingPair` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `stepSize` on the `TradingPair` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `minNotional` on the `TradingPair` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.

*/
-- AlterTable
ALTER TABLE "Bot" ALTER COLUMN "baseOrderSize" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "priceDeviation" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "safetyOrderSize" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "safetyOrderPriceStep" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "safetyOrderVolumeStep" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "takeProfit" SET DATA TYPE DECIMAL(20,8);

-- AlterTable
ALTER TABLE "Deal" ALTER COLUMN "currentQuantity" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "averagePrice" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "currentProfit" SET DATA TYPE DECIMAL(20,8);

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "filled" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "remaining" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "cost" SET DATA TYPE DECIMAL(20,8);

-- AlterTable
ALTER TABLE "TradingPair" ALTER COLUMN "minQuantity" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "maxQuantity" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "stepSize" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "minNotional" SET DATA TYPE DECIMAL(20,8);
