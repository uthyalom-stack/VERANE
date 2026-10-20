-- Add order fulfillment metadata for Shipbubble delivery and customer pickup.
CREATE TABLE IF NOT EXISTS "OrderFulfillment" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "waybillGeneratedAt" DATETIME,
    "pickupBrand" TEXT,
    "pickupAddress" TEXT,
    "pickupInstructions" TEXT,
    "requestedPickupDate" TEXT,
    "isImmediatePickup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderFulfillment_orderId_key" ON "OrderFulfillment"("orderId");
CREATE INDEX IF NOT EXISTS "OrderFulfillment_fulfillmentType_idx" ON "OrderFulfillment"("fulfillmentType");
CREATE INDEX IF NOT EXISTS "OrderFulfillment_fulfillmentStatus_idx" ON "OrderFulfillment"("fulfillmentStatus");
