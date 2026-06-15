/*
  Warnings:

  - A unique constraint covering the columns `[unitId,billingCycle]` on the table `WaterBill` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[unitId,billingCycle]` on the table `WaterMeterReading` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billingCycle` to the `WaterBill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ratePerUnit` to the `WaterBill` table without a default value. This is not possible if the table is not empty.
  - Made the column `outstandingAmount` on table `WaterBill` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `billingCycle` to the `WaterMeterReading` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'accountant', 'user');

-- AlterTable
ALTER TABLE "WaterBill" ADD COLUMN     "billingCycle" TEXT NOT NULL,
ADD COLUMN     "ratePerUnit" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "outstandingAmount" SET NOT NULL;

-- AlterTable
ALTER TABLE "WaterMeterReading" ADD COLUMN     "billingCycle" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WaterBill_unitId_billingCycle_key" ON "WaterBill"("unitId", "billingCycle");

-- CreateIndex
CREATE UNIQUE INDEX "WaterMeterReading_unitId_billingCycle_key" ON "WaterMeterReading"("unitId", "billingCycle");
