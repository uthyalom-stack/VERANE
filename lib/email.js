import { Resend } from "resend";
import prisma from "@/lib/prisma";

/**
 * Creates a Resend client when an API key is configured.
 * @return {Resend|null} A Resend client, or `null` when `RESEND_API_KEY` is unavailable.
 */

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || "";

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

/**
 * Selects the configured sender address for outgoing email.
 * @return {string} The configured sender address, or the default VÉRANE address.
 */
function getSenderAddress() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    '"VÉRANE" <orders@orders.yemmzz.name.ng>'
  );
}

/**
 * Gets the canonical base URL for public links and metadata.
 * @return {string}
 */
function getCanonicalBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://verane.vercel.app"
  );
}

/**
 * Sends a branded welcome email to a newly registered customer.
 * @param {string} email - The recipient's email address.
 * @param {string} name - The recipient's name, or a default greeting name when omitted.
 * @return {{success: boolean, id?: string, error?: unknown}} The delivery result, including the email ID on success or error details on failure.
 */
export async function sendWelcomeEmail({ email, name }) {
  const resend = getResendClient();
  const customerName = name || "Valued Customer";
  const from = getSenderAddress();
  const baseUrl = getCanonicalBaseUrl();

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="background-color: #000; color: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #222; border-radius: 20px; padding: 40px; background-color: #0a0a0a;">
          <p style="color: #f5b942; font-size: 10px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">VÉRANE</p>
          <h1 style="font-size: 32px; font-weight: 900; margin-top: 10px; letter-spacing: -1px;">WELCOME TO VÉRANE</h1>
          <p style="color: #aaa; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Dear ${customerName},<br/><br/>
            Thank you for creating an account with VÉRANE. You now have access to exclusive capsule releases from <strong>UTHY LUXURY</strong> and <strong>ALOMZIEE FOOTIES</strong>.
          </p>
          <a href="${baseUrl}/catalog" style="display: inline-block; margin-top: 30px; background-color: #f5b942; color: #000; padding: 14px 30px; border-radius: 30px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-decoration: none;">
            Explore Catalog
          </a>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    const errorMsg = "[EMAIL LOG - RESEND_API_KEY NOT CONFIGURED] Welcome email suppressed.";
    console.warn(errorMsg, { email });
    return { success: false, error: "RESEND_API_KEY is not configured in environment variables." };
  }

  try {
    const response = await resend.emails.send({
      from,
      to: [email],
      subject: "Welcome to VÉRANE — Account Created",
      html,
    });

    if (response.error) {
      console.error("Resend API welcome email error:", JSON.stringify(response.error, null, 2));
      return { success: false, error: response.error?.message || response.error };
    }

    console.log(`✓ Welcome email sent via Resend API. Email ID: ${response.data?.id}`);
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("Resend SDK welcome email send exception:", error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Sends an order confirmation email with payment details and an optional PDF receipt.
 * @param {Object} order - The order containing customer, order number, and total information.
 * @param {Buffer} [pdfBuffer] - Optional PDF receipt content to attach.
 * @returns {Promise<Object>} An object indicating whether the email was sent, with an email ID on success or an error on failure.
 */
export async function sendOrderReceiptEmail({ order, pdfBuffer }) {
  const resend = getResendClient();
  const customerName = [order.firstName, order.lastName].filter(Boolean).join(" ") || "Valued Customer";
  const customerEmail = order.email || order.user?.email;
  const customerPhone = order.phone || "—";
  const from = getSenderAddress();

  if (!customerEmail) {
    console.error("sendOrderReceiptEmail error: No customer email address present on order.", { orderId: order.id });
    return { success: false, error: "No recipient email address on order." };
  }

  // Fetch site settings for WhatsApp link if needed
  let whatsappNumber = "";
  try {
    if (prisma?.siteSetting) {
      const waSetting = await prisma.siteSetting.findUnique({ where: { key: "whatsapp" } });
      if (waSetting?.value) {
        whatsappNumber = String(waSetting.value).replace(/[^0-9]/g, "");
      }
    }
  } catch {
    // Fall back to orderId / orderNumber
  }

  const orderDateFormatted = new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const paymentMethod = (order.paymentMethod || "CARD / PAYSTACK").toUpperCase();
  const paymentRef = order.paymentReference || "N/A";
  const totalFormatted = "NGN " + Number(order.total || 0).toLocaleString("en-NG");
  const subtotalFormatted = "NGN " + Number((order.total || 0) - (order.shippingFee || 0)).toLocaleString("en-NG");
  const deliveryFeeFormatted = "NGN " + Number(order.shippingFee || 0).toLocaleString("en-NG");

  const cityState = [order.city, order.state].filter(Boolean).join(", ");
  const fullAddress = [order.address, cityState, order.country || "Nigeria"].filter(Boolean).join(", ");

  // Itemized breakdown rows
  const itemRowsHtml = (order.items || []).map((item) => {
    const productName = item.product?.name || item.collaborationProduct?.name || "Product Item";
    const brandTag = item.product?.brand === "UTHY_LUXURY"
      ? "UTHY LUXURY"
      : item.product?.brand === "ALOMZIEE_FOOTIES"
      ? "ALOMZIEE FOOTIES"
      : "VÉRANE COLLABORATION";
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const lineSubtotal = qty * price;

    return `
      <tr style="border-bottom: 1px solid #222;">
        <td style="padding: 12px 8px; font-size: 13px; color: #fff;">
          <strong>${productName}</strong> <span style="color: #d4af37; font-size: 11px;">${brandTag}</span>
          ${item.selectedColor || item.selectedSize ? `<br/><span style="color: #888; font-size: 11px;">${[item.selectedColor && `Color: ${item.selectedColor}`, item.selectedSize && `Size: ${item.selectedSize}`].filter(Boolean).join(' | ')}</span>` : ''}
          ${item.customMeasurements ? `<br/><span style="color: #d4af37; font-size: 11px;">Sizing: ${item.customMeasurements}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #fff; text-align: center;">${qty}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #fff; text-align: right;">NGN ${price.toLocaleString('en-NG')}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #d4af37; font-weight: bold; text-align: right;">NGN ${lineSubtotal.toLocaleString('en-NG')}</td>
      </tr>
    `;
  }).join("");

  const waTarget = whatsappNumber || order.orderNumber || order.id;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="background-color: #000000; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #222222; border-radius: 8px; padding: 30px; background-color: #0a0a0a;">

          <!-- Header Setup -->
          <div style="text-align: center; border-bottom: 1px solid #222222; padding-bottom: 20px; margin-bottom: 25px;">
            <h1 style="font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #ffffff; margin: 0 0 6px 0; text-transform: uppercase;">V É R A N E   L U X U R Y</h1>
            <p style="font-size: 11px; letter-spacing: 2px; color: #888888; margin: 0; text-transform: uppercase;">TWO BRANDS. ONE EXPRESSION.</p>
          </div>

          <!-- Thank You Message -->
          <div style="margin-bottom: 30px;">
            <p style="font-size: 15px; font-weight: bold; color: #ffffff; margin-bottom: 16px;">Dear ${customerName},</p>
            <p style="font-size: 14px; color: #cccccc; margin-bottom: 12px;">Thank you for refusing to look ordinary.</p>
            <p style="font-size: 14px; color: #cccccc; margin-bottom: 12px;">Your order is officially confirmed. We’re already working on getting your pieces sorted, packed, and ready to ship out.</p>
            <p style="font-size: 14px; color: #cccccc; margin-bottom: 16px;">We build everything with a specific vision in mind, and we're glad you appreciate the craft. Your full purchase details are listed right below.</p>
            <p style="font-size: 14px; font-weight: bold; color: #ffffff; margin-bottom: 4px;">Welcome to the House.</p>
            <p style="font-size: 14px; font-weight: bold; color: #d4af37; margin-top: 0;">— VÉRANE</p>
          </div>

          <!-- Purchase Specifications -->
          <div style="background-color: #111111; border: 1px solid #222222; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
            <h2 style="font-size: 12px; font-weight: bold; letter-spacing: 2px; color: #d4af37; text-transform: uppercase; margin: 0 0 14px 0;">Purchase Specifications</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #888888;">Order Number:</td>
                <td style="padding: 6px 0; color: #ffffff; font-weight: bold; text-align: right;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888888;">Date:</td>
                <td style="padding: 6px 0; color: #ffffff; text-align: right;">${orderDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888888;">Payment:</td>
                <td style="padding: 6px 0; color: #22c55e; font-weight: bold; text-align: right;">🟢 PAID VIA ${paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888888;">Reference:</td>
                <td style="padding: 6px 0; color: #ffffff; text-align: right;">${paymentRef}</td>
              </tr>
              <tr style="border-top: 1px solid #222222;">
                <td style="padding: 10px 0 4px 0; color: #888888; font-weight: bold;">Total:</td>
                <td style="padding: 10px 0 4px 0; color: #d4af37; font-size: 16px; font-weight: bold; text-align: right;">${totalFormatted}</td>
              </tr>
            </table>
          </div>

          <!-- Delivery Destination -->
          <div style="background-color: #111111; border: 1px solid #222222; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
            <h2 style="font-size: 12px; font-weight: bold; letter-spacing: 2px; color: #d4af37; text-transform: uppercase; margin: 0 0 14px 0;">📦 Delivery Destination</h2>
            <p style="font-size: 13px; color: #ffffff; margin: 0 0 6px 0;"><strong>Customer:</strong> ${customerName}</p>
            <p style="font-size: 13px; color: #cccccc; margin: 0 0 6px 0;"><strong>Contact:</strong> ${customerEmail} | ${customerPhone}</p>
            <p style="font-size: 13px; color: #cccccc; margin: 0;"><strong>Shipping To:</strong> ${fullAddress}</p>
          </div>

          <!-- Itemized Breakdown -->
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 12px; font-weight: bold; letter-spacing: 2px; color: #d4af37; text-transform: uppercase; margin: 0 0 14px 0;">🛒 Itemized Breakdown</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #111111; color: #ffffff; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px 8px;">Item Specification</th>
                  <th style="padding: 10px 8px; text-align: center;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right;">Price</th>
                  <th style="padding: 10px 8px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>

            <div style="margin-top: 16px; text-align: right; font-size: 13px; color: #cccccc;">
              <p style="margin: 4px 0;">Subtotal: <strong style="color: #ffffff;">${subtotalFormatted}</strong></p>
              <p style="margin: 4px 0;">Delivery Fee: <strong style="color: #ffffff;">${deliveryFeeFormatted}</strong></p>
              <p style="margin: 8px 0 0 0; font-size: 15px; color: #d4af37;">Total Paid: <strong style="color: #d4af37;">${totalFormatted}</strong></p>
            </div>
          </div>

          <!-- Support Hook -->
          <div style="background-color: #000000; color: #ffffff; padding: 16px; text-align: center; border-radius: 4px; margin-top: 20px; border: 1px solid #222222;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">Need help with your delivery or have a question?</p>
            <a href="https://wa.me${waTarget}"
               target="_blank"
               style="color: #25D366; font-weight: bold; text-decoration: none; font-size: 14px; text-transform: uppercase;">
               Chat with us on WhatsApp →
            </a>
          </div>

        </div>
      </body>
    </html>
  `;

  if (!resend) {
    const errorMsg = "[EMAIL LOG - RESEND_API_KEY NOT CONFIGURED] Order receipt email suppressed.";
    console.warn(errorMsg, { orderNumber: order.orderNumber, email: customerEmail });
    return { success: false, error: "RESEND_API_KEY is not configured in environment variables." };
  }

  const attachments = [];
  if (pdfBuffer) {
    const bufferContent = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    attachments.push({
      filename: `VERANE-Receipt-${order.orderNumber}.pdf`,
      content: bufferContent,
    });
  }

  try {
    const response = await resend.emails.send({
      from,
      to: [customerEmail],
      subject: `VÉRANE — Payment Confirmed for Order #${order.orderNumber}`,
      html,
      attachments,
    });

    if (response.error) {
      console.error("Resend API order receipt email error:", JSON.stringify(response.error, null, 2));
      return { success: false, error: response.error?.message || response.error };
    }

    console.log(`✓ Order receipt email sent via Resend API. Email ID: ${response.data?.id}`);
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("Resend SDK order receipt email send exception:", error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
}
