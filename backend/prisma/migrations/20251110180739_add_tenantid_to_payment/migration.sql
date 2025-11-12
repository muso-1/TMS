-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_rentBillId_fkey";

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "tenantId" INTEGER,
ALTER COLUMN "rentBillId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."TenantBalance" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantBalance_tenantId_key" ON "public"."TenantBalance"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "public"."Payment"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_rentBillId_fkey" FOREIGN KEY ("rentBillId") REFERENCES "public"."RentBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantBalance" ADD CONSTRAINT "TenantBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
