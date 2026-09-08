function sanitizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:")) return ""; // Exclude heavy embedded base64 data URIs to protect homepage ISR payload size
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return "";
  return trimmed;
}

function getProductImage(images) {
  if (!images) return null;

  let first = null;

  if (Array.isArray(images)) {
    first = images[0] || null;
  } else if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);

      if (Array.isArray(parsed)) {
        first = parsed[0] || null;
      } else if (typeof parsed === "string") {
        first = parsed;
      }
    } catch {
      first = images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)[0] || null;
    }
  }

  const clean = sanitizeImageUrl(first);
  return clean && clean !== "[]" ? clean : null;
}

module.exports = {
  sanitizeImageUrl,
  getProductImage,
};
