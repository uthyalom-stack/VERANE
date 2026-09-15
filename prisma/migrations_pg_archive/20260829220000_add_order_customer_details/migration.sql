-- Add customer and delivery details captured during checkout.
ALTER TABLE "Order"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT;
