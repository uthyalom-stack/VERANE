export function productRequiresOptions(product) {
  if (!product) return false;

  // 1. Product Colors
  const productColors = Array.isArray(product.productColors)
    ? product.productColors
    : [];

  if (productColors.length > 0) {
    return true;
  }

  // 2. Variants (Size, Color, or Multiple Variants)
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length > 1) {
    return true;
  }

  if (variants.length === 1) {
    const v = variants[0];
    const hasSize = Boolean(v.size || v.name || v.value || v.label);
    const hasColor = Boolean(v.colorId || v.color);
    if (hasSize || hasColor) {
      return true;
    }
  }

  // 3. Custom Sizing
  if (Boolean(product.customSizingEnabled)) {
    return true;
  }

  // 4. Explicit sizeType configuration
  if (product.sizeType && product.sizeType !== "none") {
    return true;
  }

  return false;
}

export function getProductStockStatus(product) {
  if (!product) {
    return {
      label: "SOLD OUT",
      isSoldOut: true,
      colorClass: "border-red-500/40 bg-black/80 text-red-400",
    };
  }

  // 1. Pre-Order takes precedence
  if (product.preOrderEnabled || product.isPreOrder) {
    return {
      label: "PRE-ORDER",
      isPreOrder: true,
      colorClass: "border-amber-400/40 bg-amber-400 text-black",
    };
  }

  // 2. Compute stock source of truth from variants or parent inventory
  let inventory = Number(product.inventory ?? product.stock ?? 0);

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const variantSum = product.variants.reduce((sum, v) => {
      const vStock = v.stock ?? v.inventory;
      return vStock !== undefined && vStock !== null
        ? sum + Math.max(0, Number(vStock))
        : sum;
    }, 0);

    // If variants specify explicit inventory numbers, use variant total
    const hasExplicitVariantStock = product.variants.some(
      (v) => (v.stock ?? v.inventory) !== undefined && (v.stock ?? v.inventory) !== null
    );

    if (hasExplicitVariantStock) {
      inventory = variantSum;
    }
  }

  inventory = Math.max(0, inventory);

  // 3. Thresholds
  if (inventory <= 0) {
    return {
      label: "SOLD OUT",
      isSoldOut: true,
      colorClass: "border-red-500/40 bg-black/80 text-red-400",
    };
  }

  if (inventory <= 10) {
    return {
      label: "FEW LEFT",
      isFewLeft: true,
      colorClass: "border-orange-400/40 bg-black/80 text-orange-400",
    };
  }

  if (inventory <= 40) {
    return {
      label: "ALMOST SOLD OUT",
      isAlmostSoldOut: true,
      colorClass: "border-amber-400/40 bg-black/80 text-amber-400",
    };
  }

  return {
    label: "AVAILABLE",
    isAvailable: true,
    colorClass: "border-emerald-400/40 bg-black/80 text-emerald-400",
  };
}
