-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "rentBillId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_rentBillId_idx" ON "public"."Payment"("rentBillId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "public"."Payment"("paidAt");

-- CreateIndex
CREATE INDEX "RentBill_tenantId_idx" ON "public"."RentBill"("tenantId");

-- CreateIndex
CREATE INDEX "RentBill_dueDate_idx" ON "public"."RentBill"("dueDate");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_rentBillId_fkey" FOREIGN KEY ("rentBillId") REFERENCES "public"."RentBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
