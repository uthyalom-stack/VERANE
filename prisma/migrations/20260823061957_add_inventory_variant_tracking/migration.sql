-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "initialInventory" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "color" TEXT,
ADD COLUMN     "initialStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "size" TEXT;

-- CreateIndex
CREATE INDEX "ProductVariant_productId_color_idx" ON "ProductVariant"("productId", "color");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_size_idx" ON "ProductVariant"("productId", "size");
