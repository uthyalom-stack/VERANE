-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'Other',
    "source" TEXT,
    "medium" TEXT,
    "destination" TEXT NOT NULL DEFAULT '/',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignVisit" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "destination" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAttribution" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "visitorId" TEXT,
    "attributionModel" TEXT NOT NULL DEFAULT 'last_touch',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_brand_idx" ON "Campaign"("brand");

-- CreateIndex
CREATE INDEX "Campaign_slug_idx" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "CampaignVisit_campaignId_idx" ON "CampaignVisit"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignVisit_brand_idx" ON "CampaignVisit"("brand");

-- CreateIndex
CREATE INDEX "CampaignVisit_visitorId_idx" ON "CampaignVisit"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAttribution_orderId_key" ON "OrderAttribution"("orderId");

-- CreateIndex
CREATE INDEX "OrderAttribution_orderId_idx" ON "OrderAttribution"("orderId");

-- CreateIndex
CREATE INDEX "OrderAttribution_campaignId_idx" ON "OrderAttribution"("campaignId");

-- CreateIndex
CREATE INDEX "OrderAttribution_brand_idx" ON "OrderAttribution"("brand");

-- AddForeignKey
ALTER TABLE "CampaignVisit" ADD CONSTRAINT "CampaignVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttribution" ADD CONSTRAINT "OrderAttribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttribution" ADD CONSTRAINT "OrderAttribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
