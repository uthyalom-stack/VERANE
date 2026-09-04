import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { initializePaystackTransaction, calculateOrderTotalsServer } from "@/lib/paystack";
import { verifyCustomerSession, getCustomerCookieName } from "@/lib/auth/customer";

async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getCustomerCookieName())?.value;
    const user = verifyCustomerSession(token);
    if (user) {
      return { authenticated: true, user };
    }
  } catch (err) {
    console.error("Direct session verification error:", err);
  }
  return { authenticated: false, user: null };
}

function generateReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `VR-REF-${date}-${random}`;
}

/**
 * Initializes a Paystack payment transaction with server-side price calculation and order creation.
 * @param {Request} request - The Next.js request object containing cart items and delivery information.
 * @returns {Promise<NextResponse>} JSON response with Paystack authorization URL and payment reference.
 */
export async function POST(request) {
  try {
    const session = await getSession();

    let userId = session.user?.id || null;

    // If user is guest/unauthenticated, create or locate a user record using guest email
    if (!userId) {
      const bodyPreview = await request.clone().json().catch(() => ({}));
      const guestEmail = String(bodyPreview.email || "").trim().toLowerCase();
      if (!guestEmail) {
        return NextResponse.json(
          { success: false, error: "Email address is required for checkout." },
          { status: 400 }
        );
      }

      let guestUser = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (!guestUser) {
        guestUser = await prisma.user.create({
          data: {
            email: guestEmail,
            name: [bodyPreview.firstName, bodyPreview.lastName].filter(Boolean).join(" ") || "Guest Customer",
            password: "GUEST_CHECKOUT_ACCOUNT",
          },
        });
      }
      userId = guestUser.id;
    }

    const body = await request.json();

    const {
      items: rawItems,
      firstName,
      lastName,
      email,
      phone,
      country,
      state,
      city,
      zone,
      address,
    } = body;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    if (!email || !address || !state || !city) {
      return NextResponse.json(
        { success: false, error: "Missing required delivery or contact information." },
        { status: 400 }
      );
    }

    // 1. NEVER TRUST CLIENT MONEY: Recalculate merchandise subtotal, shipping fee, and total server-side
    const calculation = await calculateOrderTotalsServer({
      items: rawItems,
      country: country || "Nigeria",
      state,
      city,
      zone,
    });

    const trustedSubtotal = calculation.subtotal;
    const trustedShippingFee = calculation.shippingFee;
    const trustedGrandTotal = calculation.total;
    const validatedItems = calculation.items;

    const reference = generateReference();
    const amountInKobo = Math.round(trustedGrandTotal * 100);

    const origin = request.nextUrl.origin;
    const callbackUrl = `${origin}/api/paystack/verify?reference=${reference}`;

    // 2. Store server-calculated snapshot in pendingCheckoutData
    const pendingCheckoutData = JSON.stringify({
      items: validatedItems,
      subtotal: trustedSubtotal,
      shippingFee: trustedShippingFee,
      total: trustedGrandTotal,
      firstName,
      lastName,
      email,
      phone,
      country: country || "Nigeria",
      state,
      city,
      zone,
      address,
    });

    await prisma.order.create({
      data: {
        userId,
        orderNumber: reference.replace("VR-REF-", "VR-"),
        paymentReference: reference,
        paymentStatus: "pending",
        status: "pending",
        total: trustedGrandTotal,
        shippingFee: trustedShippingFee,
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        phone: phone || null,
        country: country || "Nigeria",
        state,
        city,
        zone: zone || null,
        address,
        pendingCheckoutData,
      },
    });

    // Initialize with Paystack API
    const paystackData = await initializePaystackTransaction({
      email,
      amountInKobo,
      reference,
      callbackUrl,
      metadata: {
        reference,
        userId,
        email,
        shippingFee: trustedShippingFee,
      },
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Paystack initialize error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to initialize payment.",
      },
      { status: 500 }
    );
  }
}
