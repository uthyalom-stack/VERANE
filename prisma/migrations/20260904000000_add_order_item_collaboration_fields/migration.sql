-- Migration: 20260904000000_add_order_item_collaboration_fields
-- 1. Create missing CollaborationVariant table
CREATE TABLE IF NOT EXISTS "CollaborationVariant" (
    "id" TEXT NOT NULL,
    "collaborationProductId" TEXT NOT NULL,
    "productAVariantId" TEXT,
    "productBVariantId" TEXT,
    "productASize" TEXT,
    "productAColor" TEXT,
    "productAColorHex" TEXT,
    "productBSize" TEXT,
    "productBColor" TEXT,
    "productBColorHex" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "initialStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborationVariant_pkey" PRIMARY KEY ("id")
);

-- 2. Create CollaborationVariant indexes
CREATE INDEX IF NOT EXISTS "CollaborationVariant_collaborationProductId_idx" ON "CollaborationVariant"("collaborationProductId");
CREATE INDEX IF NOT EXISTS "CollaborationVariant_productAVariantId_idx" ON "CollaborationVariant"("productAVariantId");
CREATE INDEX IF NOT EXISTS "CollaborationVariant_productBVariantId_idx" ON "CollaborationVariant"("productBVariantId");

-- 3. Create CollaborationVariant foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CollaborationVariant_collaborationProductId_fkey'
  ) THEN
    ALTER TABLE "CollaborationVariant" ADD CONSTRAINT "CollaborationVariant_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CollaborationVariant_productAVariantId_fkey'
  ) THEN
    ALTER TABLE "CollaborationVariant" ADD CONSTRAINT "CollaborationVariant_productAVariantId_fkey" FOREIGN KEY ("productAVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CollaborationVariant_productBVariantId_fkey'
  ) THEN
    ALTER TABLE "CollaborationVariant" ADD CONSTRAINT "CollaborationVariant_productBVariantId_fkey" FOREIGN KEY ("productBVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Add OrderItem collaboration columns
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "collaborationProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "collaborationVariantId" TEXT;

-- 5. Create OrderItem indexes
CREATE INDEX IF NOT EXISTS "OrderItem_collaborationProductId_idx" ON "OrderItem"("collaborationProductId");
CREATE INDEX IF NOT EXISTS "OrderItem_collaborationVariantId_idx" ON "OrderItem"("collaborationVariantId");

-- 6. Create OrderItem foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_collaborationProductId_fkey'
  ) THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_collaborationVariantId_fkey'
  ) THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_collaborationVariantId_fkey" FOREIGN KEY ("collaborationVariantId") REFERENCES "CollaborationVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
