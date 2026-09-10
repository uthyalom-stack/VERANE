-- Repair schema drift from the Shipbubble delivery / pickup implementation.
-- Only adds objects required by the current Prisma schema that are missing
-- from the physical database.

ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "shippingWeight" DOUBLE PRECISION;

ALTER TABLE "Collaboration"
  ADD COLUMN IF NOT EXISTS "creatorRole" TEXT;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "packageLength" DOUBLE PRECISION DEFAULT 15;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "packageWidth" DOUBLE PRECISION DEFAULT 15;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "packageHeight" DOUBLE PRECISION DEFAULT 15;

CREATE INDEX IF NOT EXISTS "Collaboration_creatorRole_idx"
  ON "Collaboration"("creatorRole");
