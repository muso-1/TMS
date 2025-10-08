/*
  Warnings:

  - Made the column `tenantId` on table `Lease` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unitId` on table `Lease` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Lease" DROP CONSTRAINT "Lease_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Lease" DROP CONSTRAINT "Lease_unitId_fkey";

-- AlterTable
ALTER TABLE "public"."Lease" ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "unitId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
