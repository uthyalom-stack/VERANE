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
     PAGE 1: LUXURY HOUSE PURCHASE DOCUMENT & SELECTION CERTIFICATE
  ========================================================================= */

  drawWatermark();

  // Double Ultra-Fine Luxury Border Frame
  doc.setDrawColor(212, 175, 55); // Atelier Gold
  doc.setLineWidth(0.4);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  doc.setLineWidth(0.15);
  doc.setDrawColor(230, 230, 230);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // 1. PRIMARY VÉRANE HOUSE IDENTITY
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
    doc.setFontSize(28);
    doc.text(veraneName.toUpperCase(), pageWidth / 2, 32, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("TWO BRANDS. ONE EXPRESSION.", pageWidth / 2, headerLogoSuccess ? 39 : 39, { align: "center" });

  // Subtle separator line
  doc.setDrawColor(230, 225, 215);
  doc.setLineWidth(0.3);
  doc.line(40, 45, pageWidth - 40, 45);

  // 2. REFINED LUXURY HEADLINE & STATEMENT
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 15, 15);
  doc.text("AN EXPRESSION, CHOSEN FOR YOU.", pageWidth / 2, 60, { align: "center" });

  // 3. CUSTOMER SALUTATION & ELEGANT EDITORIAL MESSAGE
  const customerName =
    [order.firstName, order.lastName].filter(Boolean).join(" ") ||
    order.user?.name ||
    "Valued Patron";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`Dear ${customerName},`, 28, 76);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  const message = `We are honored to confirm your order with VÉRANE. Every item in your selection has been curated with intention, embodying the craft and distinction of our atelier for those who refuse to look ordinary.`;
  const splitMsg = doc.splitTextToSize(message, pageWidth - 56);
  doc.text(splitMsg, 28, 83, { lineHeightFactor: 1.35 });

  // 4. SUBTLE BRAND IDENTIFICATION
  let brandBadgeSuccess = false;
  const brandY = 104;

  try {
    if (hasUthy && !hasAlomziee && uthyLogoImg?.data) {
      // UTHY ONLY
      const maxW = 42;
      const maxH = 11;
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
      // ALOMZIEE ONLY
      const maxW = 42;
      const maxH = 11;
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
    } else if (hasUthy && hasAlomziee) {
      // BOTH BRANDS COMBINED
      if (uthyLogoImg?.data && alomzieeLogoImg?.data) {
        const maxW = 32;
        const maxH = 10;

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
        doc.text("×", pageWidth / 2, brandY + 6.5, { align: "center" });

        doc.addImage(alomzieeLogoImg.data, alomzieeLogoImg.format, alomX, brandY, wB, hB);
        brandBadgeSuccess = true;
      }
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
    doc.text(brandText, pageWidth / 2, brandY + 6, { align: "center" });
  }

  // Divider below brand area
  doc.setDrawColor(240, 235, 225);
  doc.line(28, 122, pageWidth - 28, 122);

  // 5. EDITORIAL OPEN ORDER DETAILS GRID (NO HEAVY BOXES)
  const gridTop = 132;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 140, 70);
  doc.text("PURCHASE SPECIFICATIONS", 28, gridTop);

  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.3);
  doc.line(28, gridTop + 3, pageWidth - 28, gridTop + 3);

  const col1 = 28;
  const col2 = pageWidth / 2 + 8;
  let rowY = gridTop + 13;

  // Row 1: Order Number & Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("ORDER NUMBER", col1, rowY);
  doc.text("ORDER DATE", col2, rowY);

  rowY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 15, 15);
  doc.text(order.orderNumber, col1, rowY);
  doc.setFont("helvetica", "normal");
  doc.text(
    new Date(order.createdAt).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    col2,
    rowY
  );

  // Row 2: Payment Status & Method
  rowY += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("PAYMENT STATUS", col1, rowY);
  doc.text("PAYMENT METHOD", col2, rowY);

  rowY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(34, 139, 34); // Confirmed green
  doc.text(order.paymentStatus ? order.paymentStatus.toUpperCase() : "PAID", col1, rowY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text((order.paymentMethod || "Card / Paystack").toUpperCase(), col2, rowY);

  // Row 3: Payment Reference & Total Paid
  rowY += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text("PAYMENT REFERENCE", col1, rowY);
  doc.text("TOTAL PAID", col2, rowY);

  rowY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.text(order.paymentReference || "N/A", col1, rowY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(180, 140, 30);
  doc.text(formatPrice(order.total), col2, rowY);

  // 6. DELIVERY DESTINATION (UNBOXED & EDITORIAL)
  rowY += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 140, 70);
  doc.text("DELIVERY DESTINATION", col1, rowY);

  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.3);
  doc.line(col1, rowY + 3, pageWidth - 28, rowY + 3);

  rowY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);

  const destParts = [
    order.address,
    order.city ? `${order.city}${order.state ? `, ${order.state}` : ""}` : order.state,
    order.country || "Nigeria",
  ]
    .filter(Boolean)
    .join("\n");

  const splitDest = doc.splitTextToSize(destParts, pageWidth - 56);
  doc.text(splitDest, col1, rowY, { lineHeightFactor: 1.3 });

  // 7. CLOSING STATEMENT & HOUSE FOOTNOTE
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(110, 110, 110);
  doc.text("Thank you for refusing to look ordinary.", pageWidth / 2, 246, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text("VÉRANE — HOUSE OF LUXURY", pageWidth / 2, 253, { align: "center" });

  // 8. PAGE INDICATOR
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 140, 70);
  doc.text("PAGE 1 OF 2   —   ORDER CONFIRMATION", pageWidth / 2, 276, { align: "center" });


  /* =========================================================================
     PAGE 2: DETAILED ITEMIZED SPECIFICATIONS & PURCHASE RECEIPT
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
  doc.text("PURCHASE SPECIFICATIONS & RECEIPT", pageWidth - 22, 24, { align: "right" });

  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.3);
  doc.line(22, 29, pageWidth - 22, 29);

  // Customer & Delivery Details Summary Block (Fine Unboxed Layout)
  const infoTop = 35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 140, 70);
  doc.text("CUSTOMER & DELIVER-TO INFORMATION", 22, infoTop);

  doc.setDrawColor(235, 230, 220);
  doc.setLineWidth(0.2);
  doc.line(22, infoTop + 2.5, pageWidth - 22, infoTop + 2.5);

  const colA = 22;
  const colB = pageWidth / 2 + 5;
  let infoY = infoTop + 9;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 15, 15);
  doc.text(`Customer: ${customerName}`, colA, infoY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Email: ${order.email || order.user?.email || "—"}`, colA, infoY + 5);
  doc.text(`Phone: ${order.phone || "—"}`, colA, infoY + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 15, 15);
  doc.text(`Address: ${order.address || "—"}`, colB, infoY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `City / State: ${order.city || "—"}${order.state ? `, ${order.state}` : ""}`,
    colB,
    infoY + 5
  );
  doc.text(`Country: ${order.country || "Nigeria"}`, colB, infoY + 10);

  // Itemized Table Header
  const tableTop = 64;
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
    doc.text(productName, 26, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(180, 140, 30);
    doc.text(brandTag.toUpperCase(), 26, y + 4);

    // Color & Size Specs
    const specs = [
      item.selectedColor ? `Color: ${item.selectedColor}` : "",
      item.selectedSize ? `Size: ${item.selectedSize}` : "",
    ].filter(Boolean).join("   |   ");

    if (specs) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(specs, 26, y + 8);
    }

    if (item.customMeasurements) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 90, 0);
      doc.text(`Sizing: ${item.customMeasurements}`, 26, y + 12);
    }

    // Numerical Values
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 15, 15);
    doc.text(String(qty), 122, y);
    doc.text(formatPrice(price), 145, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatPrice(lineSubtotal), pageWidth - 26, y, { align: "right" });

    y += item.customMeasurements ? 17 : 13;
    doc.setDrawColor(240, 235, 225);
    doc.setLineWidth(0.2);
    doc.line(22, y - 3, pageWidth - 22, y - 3);
  }

  // Financial Summary Block
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
  doc.text("PAGE 2 OF 2   —   ITEMIZED SPECIFICATIONS", pageWidth / 2, 276, { align: "center" });

  // Output ArrayBuffer Buffer for Email / Stream
  const pdfArrayBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfArrayBuffer);
}
