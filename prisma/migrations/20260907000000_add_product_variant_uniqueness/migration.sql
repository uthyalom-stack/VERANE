-- CreateUniqueIndexOnProductVariant
CREATE UNIQUE INDEX "ProductVariant_productId_size_colorId_key"
ON "ProductVariant" ("productId", COALESCE("size", ''), COALESCE("colorId", ''));
