/*
  Warnings:

  - You are about to drop the column `paid` on the `WaterBill` table. All the data in the column will be lost.
  - You are about to drop the column `ratePerUnit` on the `WaterBill` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `WaterBill` table. All the data in the column will be lost.
  - You are about to drop the column `usage` on the `WaterBill` table. All the data in the column will be lost.
  - You are about to alter the column `previousReading` on the `WaterBill` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `currentReading` on the `WaterBill` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `amount` to the `WaterBill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitsUsed` to the `WaterBill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."WaterBill" DROP COLUMN "paid",
DROP COLUMN "ratePerUnit",
DROP COLUMN "totalAmount",
DROP COLUMN "usage",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "unitsUsed" INTEGER NOT NULL,
ALTER COLUMN "previousReading" SET DEFAULT 0,
ALTER COLUMN "previousReading" SET DATA TYPE INTEGER,
ALTER COLUMN "currentReading" SET DATA TYPE INTEGER;
