-- AlterTable
ALTER TABLE "public"."RentBill" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."WaterBill" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
