-- Migration: 20260902120000_add_location_based_delivery_tables
-- Create DeliveryState and DeliveryCity tables for location-based shipping pricing.

CREATE TABLE IF NOT EXISTS "DeliveryState" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "state" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'STATE_DEFAULT',
    "defaultFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DeliveryCity" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryCity_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryState_state_key" ON "DeliveryState"("state");
CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryCity_stateId_city_key" ON "DeliveryCity"("stateId", "city");

-- Indexes
CREATE INDEX IF NOT EXISTS "DeliveryState_country_idx" ON "DeliveryState"("country");
CREATE INDEX IF NOT EXISTS "DeliveryState_state_idx" ON "DeliveryState"("state");
CREATE INDEX IF NOT EXISTS "DeliveryCity_stateId_idx" ON "DeliveryCity"("stateId");
CREATE INDEX IF NOT EXISTS "DeliveryCity_city_idx" ON "DeliveryCity"("city");

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeliveryCity_stateId_fkey'
  ) THEN
    ALTER TABLE "DeliveryCity" ADD CONSTRAINT "DeliveryCity_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "DeliveryState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
