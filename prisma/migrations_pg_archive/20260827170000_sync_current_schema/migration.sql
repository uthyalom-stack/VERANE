-- Sync the production database with the current Prisma schema.
-- These fields are already present in prisma/schema.prisma but were missing
-- from the migration history, which caused Prisma reads to fail in production.

ALTER TABLE "Category"
ADD COLUMN "sizeType" TEXT NOT NULL DEFAULT 'none';

ALTER TABLE "Product"
ADD COLUMN "sizeGuideImage" TEXT;
