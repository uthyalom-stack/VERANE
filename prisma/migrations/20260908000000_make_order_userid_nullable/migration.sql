-- Make Order.userId nullable to properly support guest checkout without schema violations
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
