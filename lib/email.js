import nodemailer from "nodemailer";

/*
|--------------------------------------------------------------------------
| VÉRANE Email Dispatcher
|--------------------------------------------------------------------------
*/

function getTransporter() {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!host || !user) {
    return null; // Return null if SMTP credentials not provided
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendWelcomeEmail({ email, name }) {
  const transporter = getTransporter();
  const customerName = name || "Valued Customer";
  const from = process.env.SMTP_FROM || `"VÉRANE" <noreply@verane.com>`;

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
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://verane.com'}/catalog" style="display: inline-block; margin-top: 30px; background-color: #f5b942; color: #000; padding: 14px 30px; border-radius: 30px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-decoration: none;">
            Explore Catalog
          </a>
        </div>
      </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[EMAIL LOG - SMTP NOT CONFIGURED] Welcome email generated for: ${email}`);
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Welcome to VÉRANE — Account Created",
      html,
    });
  } catch (error) {
    console.error("Welcome email send error:", error);
  }
}

export async function sendOrderReceiptEmail({ order, pdfBuffer }) {
  const transporter = getTransporter();
  const customerName = [order.firstName, order.lastName].filter(Boolean).join(" ") || "Valued Customer";
  const customerEmail = order.email || order.user?.email;
  const from = process.env.SMTP_FROM || `"VÉRANE Orders" <orders@verane.com>`;

  if (!customerEmail) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="background-color: #000; color: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #222; border-radius: 20px; padding: 40px; background-color: #0a0a0a;">
          <p style="color: #f5b942; font-size: 10px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase;">VÉRANE — ORDER CONFIRMATION</p>
          <h1 style="font-size: 28px; font-weight: 900; margin-top: 10px; letter-spacing: -1px;">ORDER #${order.orderNumber} CONFIRMED</h1>
          <p style="color: #aaa; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Dear ${customerName},<br/><br/>
            Your payment was successful. We have attached your official 2-page VÉRANE PDF Receipt and item specifications to this email.
          </p>
          <div style="margin-top: 30px; padding: 20px; border-radius: 12px; background-color: #111; text-align: left;">
            <p style="font-size: 12px; color: #777; margin: 0;">TOTAL PAID</p>
            <p style="font-size: 20px; font-weight: bold; color: #f5b942; margin: 5px 0 0 0;">₦${Number(order.total || 0).toLocaleString('en-NG')}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://verane.com'}/orders?order=${order.orderNumber}" style="display: inline-block; margin-top: 30px; background-color: #ffffff; color: #000; padding: 14px 30px; border-radius: 30px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-decoration: none;">
            View Order Status
          </a>
        </div>
      </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[EMAIL LOG - SMTP NOT CONFIGURED] Order receipt email generated for order: ${order.orderNumber}`);
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to: customerEmail,
      subject: `VÉRANE — Payment Confirmed for Order #${order.orderNumber}`,
      html,
      attachments: pdfBuffer ? [
        {
          filename: `VERANE-Receipt-${order.orderNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ] : [],
    });
  } catch (error) {
    console.error("Order receipt email send error:", error);
  }
}
