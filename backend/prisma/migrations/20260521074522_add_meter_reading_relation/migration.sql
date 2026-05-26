/*
  Warnings:

  - A unique constraint covering the columns `[meterReadingId]` on the table `WaterBill` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."WaterBill" ADD COLUMN     "meterReadingId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "WaterBill_meterReadingId_key" ON "public"."WaterBill"("meterReadingId");

-- AddForeignKey
ALTER TABLE "public"."WaterBill" ADD CONSTRAINT "WaterBill_meterReadingId_fkey" FOREIGN KEY ("meterReadingId") REFERENCES "public"."WaterMeterReading"("id") ON DELETE SET NULL ON UPDATE CASCADE;
