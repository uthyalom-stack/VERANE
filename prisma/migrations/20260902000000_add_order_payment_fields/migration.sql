-- Migration: 20260902000000_add_order_payment_fields
-- Safely add missing payment, shipping, and order identification fields to the Order table.

-- 1. Add missing columns with proper defaults
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "paymentReference" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pendingCheckoutData" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS "zone" TEXT,
  ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

-- 2. Backfill orderNumber for any pre-existing order rows that have NULL orderNumber
UPDATE "Order"
SET "orderNumber" = 'ORD-' || UPPER(SUBSTRING("id" FROM 1 FOR 8))
WHERE "orderNumber" IS NULL;

-- 3. Enforce NOT NULL constraint on orderNumber to match prisma/schema.prisma
ALTER TABLE "Order"
  ALTER COLUMN "orderNumber" SET NOT NULL;

-- 4. Create unique indexes for paymentReference and orderNumber
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentReference_key" ON "Order"("paymentReference");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
