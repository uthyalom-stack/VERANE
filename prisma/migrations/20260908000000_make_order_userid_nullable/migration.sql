-- Make Order.userId optional to support guest checkout securely
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
