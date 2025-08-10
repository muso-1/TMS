-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" SERIAL NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "tenantId" INTEGER,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RentBill" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "RentBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WaterBill" (
    "id" SERIAL NOT NULL,
    "previousReading" DOUBLE PRECISION NOT NULL,
    "currentReading" DOUBLE PRECISION NOT NULL,
    "usage" DOUBLE PRECISION NOT NULL,
    "ratePerUnit" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "WaterBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Maintenance" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cost" DOUBLE PRECISION NOT NULL,
    "tenantId" INTEGER,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "public"."Tenant"("email");

-- AddForeignKey
ALTER TABLE "public"."Unit" ADD CONSTRAINT "Unit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RentBill" ADD CONSTRAINT "RentBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WaterBill" ADD CONSTRAINT "WaterBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Maintenance" ADD CONSTRAINT "Maintenance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
