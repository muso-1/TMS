/*
  Warnings:

  - You are about to drop the `TenantBalance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TenantBalance" DROP CONSTRAINT "TenantBalance_tenantId_fkey";

-- DropTable
DROP TABLE "public"."TenantBalance";
