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
