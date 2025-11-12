-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "waterBillId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_waterBillId_fkey" FOREIGN KEY ("waterBillId") REFERENCES "public"."WaterBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
