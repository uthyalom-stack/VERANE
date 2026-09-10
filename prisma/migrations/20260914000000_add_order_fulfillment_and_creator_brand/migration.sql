-- Migration: 20260914000000_add_order_fulfillment_and_creator_brand
-- Safely add OrderFulfillment table, Collaboration.creatorBrand, Collaboration.creatorRole, Category.shippingWeight, Product.weight.

-- 1. Add creatorBrand and creatorRole to Collaboration
ALTER TABLE "Collaboration" ADD COLUMN IF NOT EXISTS "creatorBrand" TEXT;
ALTER TABLE "Collaboration" ADD COLUMN IF NOT EXISTS "creatorRole" TEXT;
CREATE INDEX IF NOT EXISTS "Collaboration_creatorBrand_idx" ON "Collaboration"("creatorBrand");
CREATE INDEX IF NOT EXISTS "Collaboration_creatorRole_idx" ON "Collaboration"("creatorRole");

-- 2. Add shippingWeight to Category and weight to Product if missing, and remove default values
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "shippingWeight" DOUBLE PRECISION;
ALTER TABLE "Category" ALTER COLUMN "shippingWeight" DROP DEFAULT;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;
ALTER TABLE "Product" ALTER COLUMN "weight" DROP DEFAULT;

-- 3. Create OrderFulfillment table
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
