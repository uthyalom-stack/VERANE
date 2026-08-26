-- Add manually configured sizing behavior to categories.
-- Existing categories default to no sizing and existing product sizing is untouched.
ALTER TABLE "Category"
ADD COLUMN "sizeType" TEXT NOT NULL DEFAULT 'none';
