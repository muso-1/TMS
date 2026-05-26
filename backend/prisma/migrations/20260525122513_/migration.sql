/*
  Warnings:

  - You are about to drop the column `paid` on the `RentBill` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `WaterBill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."RentBill" DROP COLUMN "paid";

-- AlterTable
ALTER TABLE "public"."WaterBill" DROP COLUMN "status";
