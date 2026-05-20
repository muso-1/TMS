-- CreateEnum
CREATE TYPE "public"."LeaseStatus" AS ENUM ('active', 'terminated', 'expired', 'pending');

-- AlterTable
ALTER TABLE "public"."Lease" ADD COLUMN     "status" "public"."LeaseStatus" NOT NULL DEFAULT 'active';
