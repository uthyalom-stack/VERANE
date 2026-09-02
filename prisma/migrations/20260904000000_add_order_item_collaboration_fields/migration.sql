-- Migration: 20260904000000_add_order_item_collaboration_fields
-- Add collaborationProductId and collaborationVariantId to OrderItem table

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "collaborationProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "collaborationVariantId" TEXT;

CREATE INDEX IF NOT EXISTS "OrderItem_collaborationProductId_idx" ON "OrderItem"("collaborationProductId");
CREATE INDEX IF NOT EXISTS "OrderItem_collaborationVariantId_idx" ON "OrderItem"("collaborationVariantId");

-- Foreign key constraints for collaborationProduct and collaborationVariant
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
