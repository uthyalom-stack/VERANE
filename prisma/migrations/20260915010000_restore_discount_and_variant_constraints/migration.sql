-- CreateTable IF NOT EXISTS for Discount
CREATE TABLE IF NOT EXISTS "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minOrderValue" REAL,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create UNIQUE index on Discount.code IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS "Discount_code_key" ON "Discount"("code");

-- Create index on Discount.brand IF NOT EXISTS
CREATE INDEX IF NOT EXISTS "Discount_brand_idx" ON "Discount"("brand");

-- Create ProductVariant unique expression index for normalized (productId, size, colorId)
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_size_colorId_key"
ON "ProductVariant"("productId", COALESCE("size", ''), COALESCE("colorId", ''));
