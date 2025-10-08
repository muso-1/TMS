/*
  Warnings:

  - You are about to drop the column `tenantId` on the `RentBill` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."RentBill" DROP CONSTRAINT "RentBill_tenantId_fkey";

-- DropIndex
DROP INDEX "public"."RentBill_tenantId_idx";

-- AlterTable
ALTER TABLE "public"."RentBill" DROP COLUMN "tenantId";
