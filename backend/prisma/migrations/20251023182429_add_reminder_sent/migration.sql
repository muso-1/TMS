-- AlterTable
ALTER TABLE "public"."RentBill" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."WaterBill" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;
