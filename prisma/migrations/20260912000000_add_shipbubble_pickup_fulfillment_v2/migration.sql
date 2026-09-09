-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierActualCost" DOUBLE PRECISION,
ADD COLUMN     "fulfillmentMethod" TEXT NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "fulfillmentStatus" TEXT NOT NULL DEFAULT 'UNFULFILLED',
ADD COLUMN     "pickupBrand" TEXT,
ADD COLUMN     "pickupCollectedAt" TIMESTAMP(3),
ADD COLUMN     "pickupLocationId" TEXT,
ADD COLUMN     "pickupReadyAt" TIMESTAMP(3),
ADD COLUMN     "shipbubbleOrderId" TEXT,
ADD COLUMN     "shipbubbleQuotedCost" DOUBLE PRECISION,
ADD COLUMN     "shipbubbleRateToken" TEXT,
ADD COLUMN     "shipbubbleTrackingCode" TEXT,
ADD COLUMN     "shipbubbleWaybillUrl" TEXT,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingCourier" TEXT,
ADD COLUMN     "shippingCourierCode" TEXT,
ADD COLUMN     "shippingCourierId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Order_fulfillmentMethod_idx" ON "Order"("fulfillmentMethod");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");
