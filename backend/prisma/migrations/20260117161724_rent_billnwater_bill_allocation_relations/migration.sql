/*
  Warnings:

  - You are about to drop the column `billId` on the `PaymentAllocation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."PaymentAllocation_billType_billId_idx";

-- AlterTable
ALTER TABLE "public"."PaymentAllocation" DROP COLUMN "billId",
ADD COLUMN     "rentBillId" INTEGER,
ADD COLUMN     "waterBillId" INTEGER;

-- CreateIndex
CREATE INDEX "PaymentAllocation_billType_idx" ON "public"."PaymentAllocation"("billType");

-- AddForeignKey
ALTER TABLE "public"."PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_rentBillId_fkey" FOREIGN KEY ("rentBillId") REFERENCES "public"."RentBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_waterBillId_fkey" FOREIGN KEY ("waterBillId") REFERENCES "public"."WaterBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
