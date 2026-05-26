-- AlterTable
ALTER TABLE "public"."WaterBill" ADD COLUMN     "unitId" INTEGER;

-- CreateTable
CREATE TABLE "public"."WaterMeterReading" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "reading" INTEGER NOT NULL,
    "readingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterMeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaterMeterReading_unitId_readingDate_idx" ON "public"."WaterMeterReading"("unitId", "readingDate");

-- AddForeignKey
ALTER TABLE "public"."WaterBill" ADD CONSTRAINT "WaterBill_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaterMeterReading" ADD CONSTRAINT "WaterMeterReading_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
