/*
  Warnings:

  - Added the required column `exchangeKeyId` to the `Bot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "exchangeKeyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Bot_exchangeKeyId_idx" ON "Bot"("exchangeKeyId");

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_exchangeKeyId_fkey" FOREIGN KEY ("exchangeKeyId") REFERENCES "ExchangeKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
