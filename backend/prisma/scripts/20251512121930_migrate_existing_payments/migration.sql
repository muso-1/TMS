-- Rent allocations
INSERT INTO "PaymentAllocation" ("paymentId", "billType", "billId", "amount", "createdAt")
SELECT
  id,
  'rent',
  "rentBillId",
  amount,
  NOW()
FROM "Payment"
WHERE "rentBillId" IS NOT NULL;

-- Water allocations
INSERT INTO "PaymentAllocation" ("paymentId", "billType", "billId", "amount", "createdAt")
SELECT
  id,
  'water',
  "waterBillId",
  amount,
  NOW()
FROM "Payment"
WHERE "waterBillId" IS NOT NULL;