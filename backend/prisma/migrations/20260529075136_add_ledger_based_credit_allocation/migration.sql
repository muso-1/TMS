/*
  Warnings:

  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "amount",
ADD COLUMN     "amountReceived" DOUBLE PRECISION,
ADD COLUMN     "totalAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unappliedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."PaymentAllocation" ADD COLUMN     "isReversed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3);
