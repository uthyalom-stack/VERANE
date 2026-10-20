-- CreateTable
CREATE TABLE "OrderBrandTracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderBrandTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderBrandTracking_orderId_idx" ON "OrderBrandTracking"("orderId");

-- CreateIndex
CREATE INDEX "OrderBrandTracking_brand_idx" ON "OrderBrandTracking"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "OrderBrandTracking_orderId_brand_key" ON "OrderBrandTracking"("orderId", "brand");

-- AddForeignKey
ALTER TABLE "OrderBrandTracking" ADD CONSTRAINT "OrderBrandTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
