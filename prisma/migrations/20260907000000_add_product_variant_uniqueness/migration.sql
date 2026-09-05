-- Lock dependent tables to prevent concurrent insert/update races during consolidation
LOCK TABLE "ProductVariant", "OrderItem", "WaitingList", "CollaborationVariant" IN EXCLUSIVE MODE;

-- Consolidation of duplicate ProductVariant rows before index creation
DO $$
DECLARE
    dup_record RECORD;
    canonical_id TEXT;
    total_stock INT;
    total_initial_stock INT;
BEGIN
    FOR dup_record IN
        SELECT
            "productId",
            COALESCE("size", '') AS norm_size,
            COALESCE("colorId", '') AS norm_color_id,
            ARRAY_AGG("id" ORDER BY "createdAt" ASC, "id" ASC) AS variant_ids
        FROM "ProductVariant"
        GROUP BY "productId", COALESCE("size", ''), COALESCE("colorId", '')
        HAVING COUNT(*) > 1
    LOOP
        canonical_id := dup_record.variant_ids[1];

        -- Calculate combined stock and initialStock across all duplicates in group
        SELECT
            COALESCE(SUM("stock"), 0),
            COALESCE(SUM("initialStock"), 0)
        INTO
            total_stock,
            total_initial_stock
        FROM "ProductVariant"
        WHERE "id" = ANY(dup_record.variant_ids);

        -- Update canonical variant with summed stock
        UPDATE "ProductVariant"
        SET
            "stock" = total_stock,
            "initialStock" = total_initial_stock
        WHERE "id" = canonical_id;

        -- Re-link OrderItem references from duplicate variants to canonical_id
        UPDATE "OrderItem"
        SET "variantId" = canonical_id
        WHERE "variantId" = ANY(dup_record.variant_ids[2:array_length(dup_record.variant_ids, 1)]);

        -- Re-link WaitingList references from duplicate variants to canonical_id
        UPDATE "WaitingList"
        SET "variantId" = canonical_id
        WHERE "variantId" = ANY(dup_record.variant_ids[2:array_length(dup_record.variant_ids, 1)]);

        -- Re-link CollaborationVariant.productAVariantId references
        UPDATE "CollaborationVariant"
        SET "productAVariantId" = canonical_id
        WHERE "productAVariantId" = ANY(dup_record.variant_ids[2:array_length(dup_record.variant_ids, 1)]);

        -- Re-link CollaborationVariant.productBVariantId references
        UPDATE "CollaborationVariant"
        SET "productBVariantId" = canonical_id
        WHERE "productBVariantId" = ANY(dup_record.variant_ids[2:array_length(dup_record.variant_ids, 1)]);

        -- Safely delete duplicate non-canonical variants
        DELETE FROM "ProductVariant"
        WHERE "id" = ANY(dup_record.variant_ids[2:array_length(dup_record.variant_ids, 1)]);
    END LOOP;
END $$;

-- CreateUniqueIndexOnProductVariant
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_productId_size_colorId_key"
ON "ProductVariant" ("productId", COALESCE("size", ''), COALESCE("colorId", ''));
