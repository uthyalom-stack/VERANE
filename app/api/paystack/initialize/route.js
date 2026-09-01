import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { initializePaystackTransaction } from "@/lib/paystack";

async function getSession(request) {
  const response = await fetch(new URL("/api/auth/session", request.url), {
    headers: { cookie: request.headers.get("cookie") || "" },
    cache: "no-store",
  });
  return response.json();
}

function generateReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `VR-REF-${date}-${random}`;
}

export async function POST(request) {
  try {
    const session = await getSession(request);

    if (!session.authenticated || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Please login before completing checkout." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      items,
      subtotal,
      shippingFee,
      total,
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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    if (!email || !address || !state || !city) {
      return NextResponse.json(
        { success: false, error: "Missing required delivery or contact information." },
        { status: 400 }
      );
    }

    const reference = generateReference();
    const grandTotal = Number(total || 0);
    const amountInKobo = Math.round(grandTotal * 100);

    const origin = request.nextUrl.origin;
    const callbackUrl = `${origin}/api/paystack/verify?reference=${reference}`;

    // Create a pending Order with pendingCheckoutData attached
    const pendingCheckoutData = JSON.stringify({
      items,
      subtotal,
      shippingFee,
      total: grandTotal,
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
        userId: session.user.id,
        orderNumber: reference.replace("VR-REF-", "VR-"),
        paymentReference: reference,
        paymentStatus: "pending",
        status: "pending",
        total: grandTotal,
        shippingFee: Number(shippingFee || 0),
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
        userId: session.user.id,
        email,
        shippingFee,
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
