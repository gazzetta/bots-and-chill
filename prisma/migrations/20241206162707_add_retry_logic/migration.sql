-- AlterEnum
ALTER TYPE "HistoryType" ADD VALUE 'WARNING';

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "actualSafetyOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warningMessage" TEXT;
