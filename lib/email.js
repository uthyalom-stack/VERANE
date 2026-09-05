import { Resend } from "resend";

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
  const from = getSenderAddress();
  const baseUrl = getCanonicalBaseUrl();

  if (!customerEmail) {
    console.error("sendOrderReceiptEmail error: No customer email address present on order.", { orderId: order.id });
    return { success: false, error: "No recipient email address on order." };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="background-color: #000; color: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #222; border-radius: 20px; padding: 40px; background-color: #0a0a0a;">
          <p style="color: #f5b942; font-size: 10px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">VÉRANE — ORDER CONFIRMATION</p>
          <h1 style="font-size: 28px; font-weight: 900; margin-top: 10px; letter-spacing: -1px;">ORDER #${order.orderNumber} CONFIRMED</h1>
          <p style="color: #aaa; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Dear ${customerName},<br/><br/>
            Your payment was successful. We have attached your official VÉRANE PDF Receipt and item specifications to this email.
          </p>
          <div style="margin-top: 30px; padding: 20px; border-radius: 12px; background-color: #111; text-align: left;">
            <p style="font-size: 12px; color: #777; margin: 0;">TOTAL PAID</p>
            <p style="font-size: 20px; font-weight: bold; color: #f5b942; margin: 5px 0 0 0;">₦${Number(order.total || 0).toLocaleString('en-NG')}</p>
          </div>
          <a href="${baseUrl}/orders?order=${order.orderNumber}" style="display: inline-block; margin-top: 30px; background-color: #ffffff; color: #000; padding: 14px 30px; border-radius: 30px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-decoration: none;">
            View Order Status
          </a>
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
