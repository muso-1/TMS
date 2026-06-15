-- CreateEnum
CREATE TYPE "public"."BillStatus" AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue', 'voided');

-- AlterTable
ALTER TABLE "public"."RentBill" ADD COLUMN     "outstandingAmount" DOUBLE PRECISION,
ADD COLUMN     "status" "public"."BillStatus" NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."WaterBill" ADD COLUMN     "outstandingAmount" DOUBLE PRECISION,
ADD COLUMN     "status" "public"."BillStatus" NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;
