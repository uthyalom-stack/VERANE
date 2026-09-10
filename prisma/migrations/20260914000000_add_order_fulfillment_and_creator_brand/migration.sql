-- Migration: 20260914000000_add_order_fulfillment_and_creator_brand
-- Safely add OrderFulfillment table and Collaboration.creatorBrand column.

-- 1. Add creatorBrand to Collaboration
ALTER TABLE "Collaboration" ADD COLUMN IF NOT EXISTS "creatorBrand" TEXT;
CREATE INDEX IF NOT EXISTS "Collaboration_creatorBrand_idx" ON "Collaboration"("creatorBrand");

-- 2. Create OrderFulfillment table
CREATE TABLE IF NOT EXISTS "OrderFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fulfillmentType" TEXT NOT NULL DEFAULT 'delivery',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'unfulfilled',
    "courierId" TEXT,
    "courierName" TEXT,
    "serviceCode" TEXT,
    "serviceName" TEXT,
    "rateToken" TEXT,
    "waybillNumber" TEXT,
    "labelUrl" TEXT,
    "trackingUrl" TEXT,
    "waybillGeneratedAt" TIMESTAMP(3),
    "pickupBrand" TEXT,
    "pickupAddress" TEXT,
    "pickupInstructions" TEXT,
    "requestedPickupDate" TEXT,
    "isImmediatePickup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFulfillment_pkey" PRIMARY KEY ("id")
);

-- Unique index on orderId
CREATE UNIQUE INDEX IF NOT EXISTS "OrderFulfillment_orderId_key" ON "OrderFulfillment"("orderId");

-- Indexes for queries
CREATE INDEX IF NOT EXISTS "OrderFulfillment_orderId_idx" ON "OrderFulfillment"("orderId");
CREATE INDEX IF NOT EXISTS "OrderFulfillment_fulfillmentType_idx" ON "OrderFulfillment"("fulfillmentType");
CREATE INDEX IF NOT EXISTS "OrderFulfillment_fulfillmentStatus_idx" ON "OrderFulfillment"("fulfillmentStatus");

-- Foreign key constraint to Order table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'OrderFulfillment_orderId_fkey'
    ) THEN
        ALTER TABLE "OrderFulfillment"
        ADD CONSTRAINT "OrderFulfillment_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
