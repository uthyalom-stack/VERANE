-- Migration: 20260913000000_cleanup_legacy_delivery
-- Safely drop legacy location-based delivery tables and clean up obsolete Shipbubble columns if present.

DROP TABLE IF EXISTS "DeliveryCity" CASCADE;
DROP TABLE IF EXISTS "DeliveryState" CASCADE;
DROP TABLE IF EXISTS "DeliveryLocation" CASCADE;

-- Safely drop legacy Shipbubble and fulfillment columns if present from Order table
ALTER TABLE "Order"
  DROP COLUMN IF EXISTS "fulfillmentMethod",
  DROP COLUMN IF EXISTS "fulfillmentStatus",
  DROP COLUMN IF EXISTS "pickupLocationId",
  DROP COLUMN IF EXISTS "pickupBrand",
  DROP COLUMN IF EXISTS "shippingCourier",
  DROP COLUMN IF EXISTS "shippingCourierCode",
  DROP COLUMN IF EXISTS "shippingCourierId",
  DROP COLUMN IF EXISTS "shipbubbleRateToken",
  DROP COLUMN IF EXISTS "shipbubbleQuotedCost",
  DROP COLUMN IF EXISTS "courierActualCost",
  DROP COLUMN IF EXISTS "shipbubbleOrderId",
  DROP COLUMN IF EXISTS "shipbubbleTrackingCode",
  DROP COLUMN IF EXISTS "shipbubbleWaybillUrl",
  DROP COLUMN IF EXISTS "pickupReadyAt",
  DROP COLUMN IF EXISTS "pickupCollectedAt",
  DROP COLUMN IF EXISTS "shippedAt",
  DROP COLUMN IF EXISTS "deliveredAt";

-- Safely drop indexes if present
DROP INDEX IF EXISTS "Order_fulfillmentMethod_idx";
DROP INDEX IF EXISTS "Order_fulfillmentStatus_idx";
