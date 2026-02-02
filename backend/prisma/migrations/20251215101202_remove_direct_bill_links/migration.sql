/*
  Warnings:

  - You are about to drop the column `rentBillId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `waterBillId` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "rentBillId",
DROP COLUMN "waterBillId";
