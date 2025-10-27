-- AlterTable
ALTER TABLE "public"."RentBill" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."WaterBill" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
