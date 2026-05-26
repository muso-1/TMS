/*
  Warnings:

  - Made the column `unitId` on table `WaterBill` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."WaterBill" DROP CONSTRAINT "WaterBill_unitId_fkey";

-- AlterTable
ALTER TABLE "public"."WaterBill" ALTER COLUMN "unitId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."WaterBill" ADD CONSTRAINT "WaterBill_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
