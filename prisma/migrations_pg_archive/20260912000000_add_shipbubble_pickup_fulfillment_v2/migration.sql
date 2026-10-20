-- Add fulfillment fields to Order table for Shipbubble delivery and customer pickup safely.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "fulfillmentMethod" TEXT NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'UNFULFILLED',
  ADD COLUMN IF NOT EXISTS "pickupLocationId" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupBrand" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCourier" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCourierCode" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCourierId" TEXT,
  ADD COLUMN IF NOT EXISTS "shipbubbleRateToken" TEXT,
  ADD COLUMN IF NOT EXISTS "shipbubbleQuotedCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "courierActualCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "shipbubbleOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "shipbubbleTrackingCode" TEXT,
  ADD COLUMN IF NOT EXISTS "shipbubbleWaybillUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupReadyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pickupCollectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

-- Add index on fulfillmentMethod and fulfillmentStatus for query performance
CREATE INDEX IF NOT EXISTS "Order_fulfillmentMethod_idx" ON "Order"("fulfillmentMethod");
CREATE INDEX IF NOT EXISTS "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");
