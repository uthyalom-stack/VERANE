-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "description" TEXT,
    "images" TEXT NOT NULL,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "colors" TEXT,
    "style" TEXT,
    "occasion" TEXT,
    "outfitLayer" TEXT NOT NULL DEFAULT 'none',
    "outfitCompatible" BOOLEAN NOT NULL DEFAULT false,
    "mannequinAsset" TEXT,
    "collectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT,
    "builderAssetUrl" TEXT,
    "builderPositionX" REAL NOT NULL DEFAULT 0,
    "builderPositionY" REAL NOT NULL DEFAULT 0,
    "builderScale" REAL NOT NULL DEFAULT 1,
    "initialInventory" INTEGER NOT NULL DEFAULT 0,
    "customSizingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fulfillmentTime" TEXT,
    "preOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sizeType" TEXT,
    "sizeGuideImage" TEXT,
    "weight" REAL,
    "packageLength" REAL DEFAULT 15,
    "packageWidth" REAL DEFAULT 15,
    "packageHeight" REAL DEFAULT 15,
    "archivedAt" DATETIME,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sizeType" TEXT NOT NULL DEFAULT 'none',
    "shippingWeight" REAL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brand" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HomepageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "mobileImage" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL DEFAULT '',
    "buttonLink" TEXT NOT NULL DEFAULT '',
    "secondaryButtonText" TEXT NOT NULL DEFAULT '',
    "secondaryButtonLink" TEXT NOT NULL DEFAULT '',
    "products" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentReference" TEXT,
    "paymentMethod" TEXT,
    "paidAt" DATETIME,
    "pendingCheckoutData" TEXT,
    "total" REAL NOT NULL,
    "shippingFee" REAL NOT NULL DEFAULT 0,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT DEFAULT 'Nigeria',
    "state" TEXT,
    "city" TEXT,
    "zone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderNumber" TEXT NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderBrandTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderBrandTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "customMeasurements" TEXT,
    "selectedColor" TEXT,
    "selectedColorHex" TEXT,
    "selectedSize" TEXT,
    "variantId" TEXT,
    "collaborationProductId" TEXT,
    "collaborationVariantId" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_collaborationVariantId_fkey" FOREIGN KEY ("collaborationVariantId") REFERENCES "CollaborationVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedLook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "products" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedLook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brand" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minOrderValue" REAL,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialStock" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT,
    "colorId" TEXT,
    CONSTRAINT "ProductVariant_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductColor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WaitingList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "selectedColor" TEXT,
    "selectedColorHex" TEXT,
    "selectedSize" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitingList_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WaitingList_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollaborationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromBrand" TEXT NOT NULL,
    "toBrand" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "collaborationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollaborationRequest_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Collaboration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brandA" TEXT NOT NULL,
    "brandB" TEXT NOT NULL,
    "creatorBrand" TEXT,
    "creatorRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollaborationProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collaborationId" TEXT NOT NULL,
    "productAId" TEXT NOT NULL,
    "productBId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollaborationProduct_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollaborationProduct_productAId_fkey" FOREIGN KEY ("productAId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CollaborationProduct_productBId_fkey" FOREIGN KEY ("productBId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollaborationVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollaborationVariant_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollaborationVariant_productAVariantId_fkey" FOREIGN KEY ("productAVariantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CollaborationVariant_productBVariantId_fkey" FOREIGN KEY ("productBVariantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientBrand" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" DATETIME,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNotification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CollaborationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'Other',
    "source" TEXT,
    "medium" TEXT,
    "destination" TEXT NOT NULL DEFAULT '/',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CampaignVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "destination" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderAttribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "visitorId" TEXT,
    "attributionModel" TEXT NOT NULL DEFAULT 'last_touch',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderAttribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderAttribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstAttempt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SavedAddress_userId_idx" ON "SavedAddress"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_collectionId_idx" ON "Product"("collectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_archivedAt_idx" ON "Product"("archivedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Category_brand_idx" ON "Category"("brand");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Category_brand_slug_key" ON "Category"("brand", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collection_brand_idx" ON "Collection"("brand");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomepageSection_key_key" ON "HomepageSection"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentReference_key" ON "Order"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderBrandTracking_orderId_idx" ON "OrderBrandTracking"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderBrandTracking_brand_idx" ON "OrderBrandTracking"("brand");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrderBrandTracking_orderId_brand_key" ON "OrderBrandTracking"("orderId", "brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_collaborationProductId_idx" ON "OrderItem"("collaborationProductId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_collaborationVariantId_idx" ON "OrderItem"("collaborationVariantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscriber_brand_idx" ON "Subscriber"("brand");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_email_brand_key" ON "Subscriber"("email", "brand");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Discount_code_key" ON "Discount"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Discount_brand_idx" ON "Discount"("brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_colorId_idx" ON "ProductVariant"("colorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_size_idx" ON "ProductVariant"("productId", "size");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_colorId_idx" ON "ProductVariant"("productId", "colorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductColor_productId_idx" ON "ProductColor"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WaitingList_productId_idx" ON "WaitingList"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WaitingList_variantId_idx" ON "WaitingList"("variantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WaitingList_userId_idx" ON "WaitingList"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WaitingList_email_idx" ON "WaitingList"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationRequest_fromBrand_idx" ON "CollaborationRequest"("fromBrand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationRequest_toBrand_idx" ON "CollaborationRequest"("toBrand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationRequest_status_idx" ON "CollaborationRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationRequest_collaborationId_idx" ON "CollaborationRequest"("collaborationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collaboration_brandA_idx" ON "Collaboration"("brandA");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collaboration_brandB_idx" ON "Collaboration"("brandB");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collaboration_creatorBrand_idx" ON "Collaboration"("creatorBrand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collaboration_creatorRole_idx" ON "Collaboration"("creatorRole");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collaboration_status_idx" ON "Collaboration"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationProduct_collaborationId_idx" ON "CollaborationProduct"("collaborationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationProduct_productAId_idx" ON "CollaborationProduct"("productAId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationProduct_productBId_idx" ON "CollaborationProduct"("productBId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationProduct_status_idx" ON "CollaborationProduct"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationVariant_collaborationProductId_idx" ON "CollaborationVariant"("collaborationProductId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationVariant_productAVariantId_idx" ON "CollaborationVariant"("productAVariantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollaborationVariant_productBVariantId_idx" ON "CollaborationVariant"("productBVariantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminNotification_recipientBrand_idx" ON "AdminNotification"("recipientBrand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminNotification_readAt_idx" ON "AdminNotification"("readAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminNotification_requestId_idx" ON "AdminNotification"("requestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Wishlist_productId_idx" ON "Wishlist"("productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_brand_idx" ON "Campaign"("brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_slug_idx" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignVisit_campaignId_idx" ON "CampaignVisit"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignVisit_brand_idx" ON "CampaignVisit"("brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignVisit_visitorId_idx" ON "CampaignVisit"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrderAttribution_orderId_key" ON "OrderAttribution"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderAttribution_orderId_idx" ON "OrderAttribution"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderAttribution_campaignId_idx" ON "OrderAttribution"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderAttribution_brand_idx" ON "OrderAttribution"("brand");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateLimit_updatedAt_idx" ON "RateLimit"("updatedAt");
