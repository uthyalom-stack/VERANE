import jsPDF from "jspdf";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| Dynamic 2-Page VÉRANE PDF Receipt Generator
|--------------------------------------------------------------------------
*/

/**
 * Extract image dimensions (width/height) from JPEG or PNG buffer header
 * to calculate exact natural aspect ratio.
 * @param {Buffer} buffer
 * @param {string} format
 * @returns {{width: number, height: number, aspectRatio: number}|null}
 */
function getImageDimensions(buffer, format) {
  try {
    if (!buffer || buffer.length < 8) return null;

    // PNG dimension extraction
    if (
      format === "PNG" &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return { width, height, aspectRatio: width / height };
      }
    }

    // JPEG dimension extraction
    if (format === "JPEG" && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) {
            return { width, height, aspectRatio: width / height };
          }
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch {
    // If header parsing fails, return fallback
  }
  return null;
}

/**
 * Safely fetches a remote or data-URL image and converts it into a base64 Data URI
 * with aspect ratio information suitable for jsPDF.addImage().
 * @param {string} url
 * @returns {Promise<{data: string, format: string, aspectRatio: number}|null>}
 */
async function fetchAndPrepareImageData(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    let buffer;
    let format = "PNG";
    let dataUri = trimmed;

    if (trimmed.startsWith("data:image/")) {
      const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.*)$/i);
      if (match) {
        format = match[1].toLowerCase() === "jpg" ? "JPEG" : match[1].toUpperCase();
        buffer = Buffer.from(match[2], "base64");
      } else {
        return null;
      }
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`Receipt PDF image fetch failed (${res.status}): ${trimmed}`);
        return null;
      }

      const contentType = res.headers.get("content-type") || "";
      buffer = Buffer.from(await res.arrayBuffer());

      if (!buffer || buffer.length === 0) return null;

      if (contentType.includes("jpeg") || contentType.includes("jpg")) {
        format = "JPEG";
      } else if (contentType.includes("png")) {
        format = "PNG";
      } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        format = "JPEG";
      } else if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        format = "PNG";
      }

      const base64 = buffer.toString("base64");
      dataUri = `data:image/${format.toLowerCase()};base64,${base64}`;
    }

    const dims = getImageDimensions(buffer, format);
    const aspectRatio = dims?.aspectRatio || (format === "PNG" ? 3.5 : 3.0);

    return {
      data: dataUri,
      format,
      aspectRatio,
    };
  } catch (err) {
    console.warn(`Receipt PDF logo fetch error (${trimmed}):`, err.message);
    return null;
  }
}

export async function generateOrderReceiptPDF(orderId) {
  // 1. Fetch order details with items, product, user, etc.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: true,
          variant: { include: { color: true } },
          collaborationProduct: true,
          collaborationVariant: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order not found for PDF generation: ${orderId}`);
  }

  // 2. Fetch site branding settings
  const settingRows = await prisma.siteSetting.findMany();
  const settings = {};
  settingRows.forEach((r) => { settings[r.key] = r.value; });

  const veraneName = settings.veraneName || settings.siteName || "VÉRANE";
  const uthyName = settings.uthyName || "UTHY LUXURY";
  const alomzieeName = settings.alomzieeName || "ALOMZIEE FOOTIES";

  // Load configured logos in parallel safely
  const [veraneLogoImg, uthyLogoImg, alomzieeLogoImg] = await Promise.all([
    fetchAndPrepareImageData(settings.veraneLogo),
    fetchAndPrepareImageData(settings.uthyLogo),
    fetchAndPrepareImageData(settings.alomzieeLogo),
  ]);

  // 3. Analyze brand items in order
  const hasUthy = order.items.some(
    (i) => i.product?.brand === "UTHY_LUXURY" || i.collaborationProduct
  );
  const hasAlomziee = order.items.some(
    (i) => i.product?.brand === "ALOMZIEE_FOOTIES" || i.collaborationProduct
  );

  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper for subtle background watermark
  function drawWatermark() {
    doc.saveGraphicsState();
    doc.setTextColor(240, 240, 240); // Very light grey watermark
    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);

    // Repeated angled brand watermark
    doc.text("V É R A N E   L U X U R Y", pageWidth / 2, 70, { align: "center", angle: 30 });
    doc.text("V É R A N E   L U X U R Y", pageWidth / 2, 160, { align: "center", angle: 30 });
    doc.text("V É R A N E   L U X U R Y", pageWidth / 2, 250, { align: "center", angle: 30 });

    doc.restoreGraphicsState();
  }

  function formatPrice(val) {
    return "NGN " + Number(val || 0).toLocaleString("en-NG");
  }

  /* =========================================================================
     PAGE 1: THE BRAND GREETING & PURCHASE SPECIFICATIONS
  ========================================================================= */

  drawWatermark();

  // Double Ultra-Fine Luxury Border Frame
  doc.setDrawColor(212, 175, 55); // Atelier Gold
  doc.setLineWidth(0.4);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  doc.setLineWidth(0.15);
  doc.setDrawColor(230, 230, 230);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // 1. PRIMARY HEADER SETUP
  let headerLogoSuccess = false;

  if (veraneLogoImg?.data) {
    try {
      const maxW = 55;
      const maxH = 14;
      const ar = veraneLogoImg.aspectRatio || 3.5;
      let w = maxW;
      let h = w / ar;
      if (h > maxH) {
        h = maxH;
        w = h * ar;
      }
      const logoX = (pageWidth - w) / 2;
      doc.addImage(veraneLogoImg.data, veraneLogoImg.format, logoX, 22, w, h);
      headerLogoSuccess = true;
    } catch (err) {
      console.warn("Error embedding veraneLogoImg in PDF:", err.message);
    }
  }

  if (!headerLogoSuccess) {
    doc.setTextColor(10, 10, 10);
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text("V É R A N E   L U X U R Y", pageWidth / 2, 30, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("TWO BRANDS. ONE EXPRESSION.", pageWidth / 2, 38, { align: "center" });

  // Subtle separator line
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.3);
  doc.line(40, 44, pageWidth - 40, 44);

  // 2. THE THANK YOU MESSAGE
  const customerName =
    [order.firstName, order.lastName].filter(Boolean).join(" ") ||
    order.user?.name ||
    "Valued Patron";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`Dear ${customerName},`, 28, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);

  const greetingParagraphs = [
    "Thank you for refusing to look ordinary.",
    "Your order is officially confirmed. We’re already working on getting your pieces sorted, packed, and ready to ship out.",
    "We build everything with a specific vision in mind, and we're glad you appreciate the craft. Your full purchase details are listed right below.",
    "Welcome to the House.",
  ];

  let msgY = 64;
  for (const paragraph of greetingParagraphs) {
    const splitP = doc.splitTextToSize(paragraph, pageWidth - 56);
    doc.text(splitP, 28, msgY, { lineHeightFactor: 1.35 });
    msgY += splitP.length * 5 + 3;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 15, 15);
  doc.text("— VÉRANE", 28, msgY + 2);

  // 3. SUBTLE BRAND IDENTIFICATION
  let brandBadgeSuccess = false;
  const brandY = msgY + 12;

  try {
    if (hasUthy && !hasAlomziee && uthyLogoImg?.data) {
      const maxW = 42;
      const maxH = 10;
      const ar = uthyLogoImg.aspectRatio || 3.0;
      let w = maxW;
      let h = w / ar;
      if (h > maxH) {
        h = maxH;
        w = h * ar;
      }
      const logoX = (pageWidth - w) / 2;
      doc.addImage(uthyLogoImg.data, uthyLogoImg.format, logoX, brandY, w, h);
      brandBadgeSuccess = true;
    } else if (!hasUthy && hasAlomziee && alomzieeLogoImg?.data) {
      const maxW = 42;
      const maxH = 10;
      const ar = alomzieeLogoImg.aspectRatio || 3.0;
      let w = maxW;
      let h = w / ar;
      if (h > maxH) {
        h = maxH;
        w = h * ar;
      }
      const logoX = (pageWidth - w) / 2;
      doc.addImage(alomzieeLogoImg.data, alomzieeLogoImg.format, logoX, brandY, w, h);
      brandBadgeSuccess = true;
    } else if (hasUthy && hasAlomziee && uthyLogoImg?.data && alomzieeLogoImg?.data) {
      const maxW = 32;
      const maxH = 9;

      const arA = uthyLogoImg.aspectRatio || 3.0;
      let wA = maxW;
      let hA = wA / arA;
      if (hA > maxH) {
        hA = maxH;
        wA = hA * arA;
      }

      const arB = alomzieeLogoImg.aspectRatio || 3.0;
      let wB = maxW;
      let hB = wB / arB;
      if (hB > maxH) {
        hB = maxH;
        wB = hB * arB;
      }

      const uthyX = pageWidth / 2 - wA - 8;
      const alomX = pageWidth / 2 + 8;

      doc.addImage(uthyLogoImg.data, uthyLogoImg.format, uthyX, brandY, wA, hA);

      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(180, 140, 30);
      doc.text("×", pageWidth / 2, brandY + 6, { align: "center" });

      doc.addImage(alomzieeLogoImg.data, alomzieeLogoImg.format, alomX, brandY, wB, hB);
      brandBadgeSuccess = true;
    }
  } catch (badgeErr) {
    console.warn("Error embedding brand logos in receipt PDF:", badgeErr.message);
  }

  if (!brandBadgeSuccess) {
    let brandText = "VÉRANE SELECTION";
    if (hasUthy && !hasAlomziee) brandText = `${uthyName.toUpperCase()} SELECTION`;
    if (!hasUthy && hasAlomziee) brandText = `${alomzieeName.toUpperCase()} SELECTION`;
    if (hasUthy && hasAlomziee) brandText = `${uthyName.toUpperCase()}   ×   ${alomzieeName.toUpperCase()}`;

    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(180, 140, 30);
    doc.text(brandText, pageWidth / 2, brandY + 5, { align: "center" });
  }

  // Divider below brand area
  const sepY = brandY + (brandBadgeSuccess ? 14 : 12);
  doc.setDrawColor(240, 235, 225);
  doc.line(28, sepY, pageWidth - 28, sepY);

  // 4. PURCHASE SPECIFICATIONS
  const gridTop = sepY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(160, 140, 70);
  doc.text("PURCHASE SPECIFICATIONS", 28, gridTop);

  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.3);
  doc.line(28, gridTop + 3, pageWidth - 28, gridTop + 3);

  const col1 = 28;
  const col2 = pageWidth / 2 + 8;
  let rowY = gridTop + 13;

  const orderDateFormatted = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const paymentMethodFormatted = (order.paymentMethod || "CARD / PAYSTACK").toUpperCase();

  // Row 1: Order Number & Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("ORDER NUMBER", col1, rowY);
  doc.text("DATE", col2, rowY);

  rowY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 15, 15);
  doc.text(order.orderNumber, col1, rowY);
  doc.setFont("helvetica", "normal");
  doc.text(orderDateFormatted, col2, rowY);

  // Row 2: Payment Status & Method
  rowY += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("PAYMENT", col1, rowY);
  doc.text("REFERENCE", col2, rowY);

  rowY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(34, 139, 34); // Green
  doc.text(`🟢 PAID VIA ${paymentMethodFormatted}`, col1, rowY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(order.paymentReference || "N/A", col2, rowY);

  // Row 3: Total
  rowY += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("TOTAL", col1, rowY);

  rowY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(180, 140, 30);
  doc.text(formatPrice(order.total), col1, rowY);

  // Closing House Footnote
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(110, 110, 110);
  doc.text("Thank you for refusing to look ordinary.", pageWidth / 2, 246, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text("VÉRANE — HOUSE OF LUXURY", pageWidth / 2, 253, { align: "center" });

  // Page Indicator
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 140, 70);
  doc.text("PAGE 1 OF 2   —   BRAND GREETING", pageWidth / 2, 276, { align: "center" });


  /* =========================================================================
     PAGE 2: LOGISTICS & RECEIPT
  ========================================================================= */

  doc.addPage();
  drawWatermark();

  // Double Ultra-Fine Luxury Border Frame
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  doc.setLineWidth(0.15);
  doc.setDrawColor(230, 230, 230);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Top Header Logo / Branding
  let page2LogoSuccess = false;

  if (veraneLogoImg?.data) {
    try {
      const maxW = 38;
      const maxH = 10;
      const ar = veraneLogoImg.aspectRatio || 3.5;
      let w = maxW;
      let h = w / ar;
      if (h > maxH) {
        h = maxH;
        w = h * ar;
      }
      doc.addImage(veraneLogoImg.data, veraneLogoImg.format, 22, 18, w, h);
      page2LogoSuccess = true;
    } catch (err) {
      console.warn("Error embedding veraneLogoImg on Page 2:", err.message);
    }
  }

  if (!page2LogoSuccess) {
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 15, 15);
    doc.text(veraneName.toUpperCase(), 22, 24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(160, 140, 70);
  doc.text("LOGISTICS & RECEIPT", pageWidth - 22, 24, { align: "right" });

  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.3);
  doc.line(22, 29, pageWidth - 22, 29);

  // 1. DELIVERY DESTINATION
  const infoTop = 35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(160, 140, 70);
  doc.text("📦 DELIVERY DESTINATION", 22, infoTop);

  doc.setDrawColor(235, 230, 220);
  doc.setLineWidth(0.2);
  doc.line(22, infoTop + 2.5, pageWidth - 22, infoTop + 2.5);

  let infoY = infoTop + 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(`Customer: ${customerName}`, 22, infoY);

  const contactStr = `Contact: ${order.email || order.user?.email || "—"} | ${order.phone || "—"}`;
  doc.text(contactStr, 22, infoY + 5.5);

  const cityState = [order.city, order.state].filter(Boolean).join(", ");
  const fullAddress = [order.address, cityState, order.country || "Nigeria"].filter(Boolean).join(", ");
  doc.text(`Shipping To: ${fullAddress}`, 22, infoY + 11);

  // 2. ITEMIZED BREAKDOWN TABLE
  const tableTop = infoY + 20;
  doc.setFillColor(15, 15, 15);
  doc.rect(22, tableTop, pageWidth - 44, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("ITEM SPECIFICATION", 26, tableTop + 4.8);
  doc.text("QTY", 120, tableTop + 4.8);
  doc.text("PRICE", 145, tableTop + 4.8);
  doc.text("SUBTOTAL", pageWidth - 26, tableTop + 4.8, { align: "right" });

  let y = tableTop + 13;

  for (const item of order.items) {
    const productName = item.product?.name || item.collaborationProduct?.name || "Product Item";
    const brandTag = item.product?.brand === "UTHY_LUXURY"
      ? uthyName
      : item.product?.brand === "ALOMZIEE_FOOTIES"
      ? alomzieeName
      : "VÉRANE COLLABORATION";

    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const lineSubtotal = qty * price;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 15, 15);
    doc.text(`${productName}   ${brandTag}`, 26, y);

    // Color & Size Specs
    const specs = [
      item.selectedColor ? `Color: ${item.selectedColor}` : "",
      item.selectedSize ? `Size: ${item.selectedSize}` : "",
    ].filter(Boolean).join("   |   ");

    if (specs) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(specs, 26, y + 4.5);
    }

    if (item.customMeasurements) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 90, 0);
      doc.text(`Sizing: ${item.customMeasurements}`, 26, y + (specs ? 8.5 : 4.5));
    }

    // Numerical Values
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 15, 15);
    doc.text(String(qty), 122, y);
    doc.text(formatPrice(price), 145, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatPrice(lineSubtotal), pageWidth - 26, y, { align: "right" });

    const extraLines = (specs ? 1 : 0) + (item.customMeasurements ? 1 : 0);
    y += 10 + extraLines * 4;
    doc.setDrawColor(240, 235, 225);
    doc.setLineWidth(0.2);
    doc.line(22, y - 3, pageWidth - 22, y - 3);
  }

  // 3. FINANCIAL SUMMARY
  y += 4;
  doc.setDrawColor(210, 205, 195);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2, y, pageWidth - 22, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", pageWidth / 2 + 10, y);
  doc.setTextColor(30, 30, 30);
  doc.text(formatPrice(order.total - order.shippingFee), pageWidth - 26, y, { align: "right" });

  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Delivery Fee:", pageWidth / 2 + 10, y);
  doc.setTextColor(30, 30, 30);
  doc.text(formatPrice(order.shippingFee), pageWidth - 26, y, { align: "right" });

  y += 7.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 15, 15);
  doc.text("Total Paid:", pageWidth / 2 + 10, y);
  doc.setTextColor(180, 140, 30);
  doc.text(formatPrice(order.total), pageWidth - 26, y, { align: "right" });

  // 4. SUPPORT HOOK BLOCK
  const whatsappNumber = settings.whatsapp
    ? String(settings.whatsapp).replace(/[^0-9]/g, "")
    : "";
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=Order%20${order.orderNumber}`
    : `https://wa.me/${order.orderNumber}`;

  y += 16;
  const hookWidth = pageWidth - 44;
  const hookHeight = 22;
  const hookX = 22;

  // Dark background container
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(hookX, y, hookWidth, hookHeight, 3, 3, "F");

  // Question text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Need help with your delivery or have a question?", pageWidth / 2, y + 8, { align: "center" });

  // WhatsApp Action Link
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 211, 102); // #25D366 WhatsApp Green
  doc.text("Chat with us on WhatsApp →", pageWidth / 2, y + 15, { align: "center" });
  if (typeof doc.link === "function") {
    doc.link(hookX, y, hookWidth, hookHeight, { url: whatsappUrl });
  }

  // Footer Contact info dynamically omitting empty values
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);

  const contactLines = [
    settings.veraneWebsite || settings.uthyWebsite || settings.alomzieeWebsite || "",
    settings.veraneEmail || settings.uthyEmail || settings.alomzieeEmail || "",
    settings.veranePhone || settings.uthyPhone || settings.alomzieePhone || "",
  ]
    .filter(Boolean)
    .join("   •   ");

  if (contactLines) {
    doc.text(contactLines, pageWidth / 2, 268, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 140, 70);
  doc.text("PAGE 2 OF 2   —   LOGISTICS & RECEIPT", pageWidth / 2, 276, { align: "center" });

  // Output ArrayBuffer Buffer for Email / Stream
  const pdfArrayBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfArrayBuffer);
}
