/*
  Warnings:

  - The `status` column on the `Bot` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('RUNNING', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "OrderMethod" AS ENUM ('MARKET', 'LIMIT');

-- AlterTable
ALTER TABLE "Bot" DROP COLUMN "status",
ADD COLUMN     "status" "BotStatus" NOT NULL DEFAULT 'STOPPED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "method" "OrderMethod" NOT NULL DEFAULT 'LIMIT';
