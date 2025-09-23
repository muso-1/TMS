/*
  Warnings:

  - Made the column `leaseId` on table `RentBill` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."RentBill" DROP CONSTRAINT "RentBill_leaseId_fkey";

-- AlterTable
ALTER TABLE "public"."RentBill" ALTER COLUMN "leaseId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."RentBill" ADD CONSTRAINT "RentBill_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "public"."Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
