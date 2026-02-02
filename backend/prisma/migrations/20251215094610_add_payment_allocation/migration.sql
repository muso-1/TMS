/*
  Warnings:

  - You are about to drop the column `rentBillId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `waterBillId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paid` on the `RentBill` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `WaterBill` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_rentBillId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_waterBillId_fkey";

-- DropIndex
DROP INDEX "public"."Payment_rentBillId_idx";

-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "rentBillId",
DROP COLUMN "waterBillId";

-- AlterTable
ALTER TABLE "public"."RentBill" DROP COLUMN "paid",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."WaterBill" DROP COLUMN "status";

-- CreateTable
CREATE TABLE "public"."PaymentAllocation" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "billType" TEXT NOT NULL,
    "billId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "public"."PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_billType_billId_idx" ON "public"."PaymentAllocation"("billType", "billId");

-- AddForeignKey
ALTER TABLE "public"."PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
