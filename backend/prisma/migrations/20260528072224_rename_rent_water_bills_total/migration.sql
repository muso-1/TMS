/*
  Warnings:

  - You are about to drop the column `totalPaid` on the `RentBill` table. All the data in the column will be lost.
  - You are about to drop the column `totalPaid` on the `WaterBill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."RentBill" DROP COLUMN "totalPaid",
ADD COLUMN     "totalRentPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."WaterBill" DROP COLUMN "totalPaid",
ADD COLUMN     "totalWaterPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;
