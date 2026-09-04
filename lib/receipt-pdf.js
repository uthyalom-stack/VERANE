import jsPDF from "jspdf";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| Dynamic 2-Page VÉRANE PDF Receipt Generator
|--------------------------------------------------------------------------
*/

/**
 * Safely fetches a remote or data-URL image and converts it into a base64 Data URI
 * suitable for jsPDF.addImage().
 * @param {string} url
 * @returns {Promise<{data: string, format: string}|null>}
 */
async function fetchAndPrepareImageData(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("data:image/")) {
      const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
      const format = match
        ? match[1].toLowerCase() === "jpg"
          ? "JPEG"
          : match[1].toUpperCase()
        : "PNG";
      return { data: trimmed, format };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(trimmed, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Receipt PDF image fetch failed (${res.status}): ${trimmed}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    const buffer = Buffer.from(await res.arrayBuffer());

    if (!buffer || buffer.length === 0) return null;

    let format = "PNG";
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
    const dataUri = `data:image/${format.toLowerCase()};base64,${base64}`;

    return {
      data: dataUri,
      format,
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
     PAGE 1: ORDER CONFIRMATION / THANK YOU CERTIFICATE
  ========================================================================= */

  drawWatermark();

  // Outer Luxury Border Frame
  doc.setDrawColor(212, 175, 55); // Gold border
  doc.setLineWidth(0.6);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Top Header Brand Crest
  let headerLogoSuccess = false;

  if (veraneLogoImg?.data) {
    try {
      // Centered primary VÉRANE logo (45mm x 12mm)
      const logoW = 45;
      const logoH = 12;
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(veraneLogoImg.data, veraneLogoImg.format, logoX, 20, logoW, logoH);
      headerLogoSuccess = true;
    } catch (err) {
      console.warn("Error embedding veraneLogoImg in PDF:", err.message);
    }
  }

  if (!headerLogoSuccess) {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text(veraneName.toUpperCase(), pageWidth / 2, 32, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("TWO BRANDS. ONE EXPRESSION.", pageWidth / 2, headerLogoSuccess ? 36 : 38, { align: "center" });

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(30, 44, pageWidth - 30, 44);

  // Hero Thank You
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("THANK YOU FOR YOUR ORDER", pageWidth / 2, 62, { align: "center" });

  // Customer Salutation
  const customerName = [order.firstName, order.lastName].filter(Boolean).join(" ") || order.user?.name || "Valued Customer";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Dear ${customerName},`, 25, 78);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const message = `We are delighted to confirm your order with VÉRANE. Each piece in your selection has been crafted with intention and precision for those who refuse to look ordinary.`;
  const splitMsg = doc.splitTextToSize(message, pageWidth - 50);
  doc.text(splitMsg, 25, 86);

  // House Brand Crest Badges / Logos
  let badgeText = "OFFICIAL SELECTION";
  if (hasUthy && !hasAlomziee) badgeText = `${uthyName.toUpperCase()} SELECTION`;
  if (!hasUthy && hasAlomziee) badgeText = `${alomzieeName.toUpperCase()} SELECTION`;
  if (hasUthy && hasAlomziee) badgeText = `${uthyName.toUpperCase()}  ×  ${alomzieeName.toUpperCase()}`;

  doc.setFillColor(248, 246, 240);
  doc.roundedRect(25, 108, pageWidth - 50, 18, 3, 3, "F");

  let brandBadgeSuccess = false;

  try {
    if (hasUthy && !hasAlomziee && uthyLogoImg?.data) {
      // UTHY ONLY
      const logoW = 32;
      const logoH = 10;
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(uthyLogoImg.data, uthyLogoImg.format, logoX, 112, logoW, logoH);
      brandBadgeSuccess = true;
    } else if (!hasUthy && hasAlomziee && alomzieeLogoImg?.data) {
      // ALOMZIEE ONLY
      const logoW = 32;
      const logoH = 10;
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(alomzieeLogoImg.data, alomzieeLogoImg.format, logoX, 112, logoW, logoH);
      brandBadgeSuccess = true;
    } else if (hasUthy && hasAlomziee) {
      // BOTH BRANDS COMBINED
      const logoW = 28;
      const logoH = 9;

      if (uthyLogoImg?.data && alomzieeLogoImg?.data) {
        const uthyX = pageWidth / 2 - 36;
        const alomX = pageWidth / 2 + 8;
        doc.addImage(uthyLogoImg.data, uthyLogoImg.format, uthyX, 112.5, logoW, logoH);

        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.setTextColor(180, 140, 30);
        doc.text("×", pageWidth / 2, 119, { align: "center" });

        doc.addImage(alomzieeLogoImg.data, alomzieeLogoImg.format, alomX, 112.5, logoW, logoH);
        brandBadgeSuccess = true;
      }
    }
  } catch (badgeErr) {
    console.warn("Error embedding brand logos in receipt PDF badge:", badgeErr.message);
  }

  if (!brandBadgeSuccess) {
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(180, 140, 30);
    doc.text(badgeText, pageWidth / 2, 119, { align: "center" });
  }

  // Order Summary Card
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(25, 134, pageWidth - 50, 85, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("ORDER CONFIRMATION OVERVIEW", 32, 146);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const leftX = 32;
  const rightX = pageWidth / 2 + 10;

  doc.text("Order Number:", leftX, 158);
  doc.setFont("helvetica", "bold");
  doc.text(order.orderNumber, leftX + 32, 158);

  doc.setFont("helvetica", "normal");
  doc.text("Date:", leftX, 168);
  doc.text(new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "long" }), leftX + 32, 168);

  doc.text("Payment Status:", leftX, 178);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 139, 34); // Green paid status
  doc.text(order.paymentStatus ? order.paymentStatus.toUpperCase() : "PAID", leftX + 32, 178);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Payment Ref:", rightX, 158);
  doc.text(order.paymentReference || "N/A", rightX + 28, 158);

  doc.text("Method:", rightX, 168);
  doc.text((order.paymentMethod || "Card / Paystack").toUpperCase(), rightX + 28, 168);

  doc.text("Total Paid:", rightX, 178);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(formatPrice(order.total), rightX + 28, 178);

  // Address Preview
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Delivery Destination:", leftX, 196);
  doc.setTextColor(40, 40, 40);
  const dest = `${order.address || ""}, ${order.city || ""}, ${order.state || ""}, ${order.country || "Nigeria"}`;
  doc.text(doc.splitTextToSize(dest, pageWidth - 70), leftX, 203);

  // Bottom Signature / House Note
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for refusing to look ordinary.", pageWidth / 2, 245, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("VÉRANE HOUSE OF LUXURY", pageWidth / 2, 252, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 120, 40);
  doc.text("PAGE 1 OF 2  —  ORDER CONFIRMATION", pageWidth / 2, 275, { align: "center" });


  /* =========================================================================
     PAGE 2: DETAILED ITEMIZED ORDER RECEIPT
  ========================================================================= */

  doc.addPage();
  drawWatermark();

  // Page 2 Frame
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Top Header
  let page2LogoSuccess = false;

  if (veraneLogoImg?.data) {
    try {
      doc.addImage(veraneLogoImg.data, veraneLogoImg.format, 20, 16, 32, 9);
      page2LogoSuccess = true;
    } catch (err) {
      console.warn("Error embedding veraneLogoImg on Page 2:", err.message);
    }
  }

  if (!page2LogoSuccess) {
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(veraneName.toUpperCase(), 20, 24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(180, 140, 30);
  doc.text("OFFICIAL RECEIPT & ITEM SPECIFICATIONS", pageWidth - 20, 24, { align: "right" });

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 28, pageWidth - 20, 28);

  // Customer & Delivery Address Block
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(20, 32, pageWidth - 40, 38, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("CUSTOMER & DELIVERY INFORMATION", 25, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Customer: ${customerName}`, 25, 48);
  doc.text(`Email: ${order.email || order.user?.email || "—"}`, 25, 54);
  doc.text(`Phone: ${order.phone || "—"}`, 25, 60);

  doc.text(`Address: ${order.address || "—"}`, pageWidth / 2, 48);
  doc.text(`City / State: ${order.city || "—"}, ${order.state || "—"} (${order.zone || "Zone N/A"})`, pageWidth / 2, 54);
  doc.text(`Country: ${order.country || "Nigeria"}`, pageWidth / 2, 60);

  // Itemized Table Header
  const tableTop = 76;
  doc.setFillColor(0, 0, 0);
  doc.rect(20, tableTop, pageWidth - 40, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("ITEM SPECIFICATION", 24, tableTop + 5.5);
  doc.text("QTY", 120, tableTop + 5.5);
  doc.text("PRICE", 145, tableTop + 5.5);
  doc.text("SUBTOTAL", pageWidth - 24, tableTop + 5.5, { align: "right" });

  let y = tableTop + 14;

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
    doc.setTextColor(0, 0, 0);
    doc.text(productName, 24, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 120, 30);
    doc.text(brandTag.toUpperCase(), 24, y + 4);

    // Color & Size Specs
    const specs = [
      item.selectedColor ? `Color: ${item.selectedColor}` : "",
      item.selectedSize ? `Size: ${item.selectedSize}` : "",
    ].filter(Boolean).join("  |  ");

    if (specs) {
      doc.setTextColor(100, 100, 100);
      doc.text(specs, 24, y + 8);
    }

    if (item.customMeasurements) {
      doc.setTextColor(120, 80, 0);
      doc.text(`Sizing: ${item.customMeasurements}`, 24, y + 12);
    }

    // Values
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(String(qty), 122, y);
    doc.text(formatPrice(price), 145, y);
    doc.text(formatPrice(lineSubtotal), pageWidth - 24, y, { align: "right" });

    y += item.customMeasurements ? 18 : 14;
    doc.setDrawColor(240, 240, 240);
    doc.line(20, y - 4, pageWidth - 20, y - 4);
  }

  // Financial Summary Block
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth / 2, y, pageWidth - 20, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal:", pageWidth / 2 + 10, y);
  doc.text(formatPrice(order.total - order.shippingFee), pageWidth - 24, y, { align: "right" });

  y += 6;
  doc.text("Delivery Fee:", pageWidth / 2 + 10, y);
  doc.text(formatPrice(order.shippingFee), pageWidth - 24, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Total Paid:", pageWidth / 2 + 10, y);
  doc.setTextColor(180, 140, 30);
  doc.text(formatPrice(order.total), pageWidth - 24, y, { align: "right" });

  // Footer Contact info dynamically omitting empty values
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);

  const contactLines = [
    settings.veraneWebsite || settings.uthyWebsite || settings.alomzieeWebsite || "",
    settings.veraneEmail || settings.uthyEmail || settings.alomzieeEmail || "",
    settings.veranePhone || settings.uthyPhone || settings.alomzieePhone || "",
  ].filter(Boolean).join("   •   ");

  if (contactLines) {
    doc.text(contactLines, pageWidth / 2, 268, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 120, 40);
  doc.text("PAGE 2 OF 2  —  ITEMIZED SPECIFICATIONS", pageWidth / 2, 275, { align: "center" });

  // Output ArrayBuffer Buffer for Email / Stream
  const pdfArrayBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfArrayBuffer);
}
