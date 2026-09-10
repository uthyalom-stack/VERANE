import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchShipbubbleRates, getShipbubbleOriginAddressCode } from "@/lib/shipbubble";
import { calculateParcelPackageDetails } from "@/lib/shipping-weights";

/**
 * POST /api/checkout/get-shipping-rates
 *
 * Server-side endpoint to fetch courier shipping rates from Shipbubble using official v1 contract.
 * Calculates server-authoritative parcel weight SUM(product.weight * quantity) and package dimensions.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, receiverAddress } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    if (!receiverAddress || !receiverAddress.state || !receiverAddress.city) {
      return NextResponse.json(
        { success: false, error: "Complete delivery address (State and City/LGA) is required." },
        { status: 400 }
      );
    }

    const senderAddressCode = await getShipbubbleOriginAddressCode();

    const receiver = {
      name: `${receiverAddress.firstName || ""} ${receiverAddress.lastName || ""}`.trim() || "Customer",
      phone: receiverAddress.phone || "+2348000000000",
      email: receiverAddress.email || "customer@example.com",
      address: receiverAddress.address || receiverAddress.streetAddress || "Delivery Address",
      city: receiverAddress.city,
      state: receiverAddress.state,
      country: receiverAddress.country || "Nigeria",
    };

    // Load DB product references for authoritative weight and dimensions
    const itemsWithProducts = await Promise.all(
      items.map(async (it) => {
        const prodId = it.productId || it.id;
        let dbProd = null;
        if (prodId) {
          try {
            dbProd = await prisma.product.findUnique({ where: { id: prodId } });
          } catch {
            dbProd = null;
          }
        }
        return {
          ...it,
          product: dbProd,
        };
      })
    );

    const parcelDetails = calculateParcelPackageDetails(itemsWithProducts);

    const packageItems = itemsWithProducts.map((it) => ({
      name: it.product?.name || it.name || "Apparel Item",
      description: it.selectedSize || "Standard size",
      unit_price: Math.round(Number(it.price || it.product?.price || 0)),
      quantity: Number(it.qty || 1),
      weight: Number(it.product?.weight) > 0 ? Number(it.product.weight) : 0.5,
    }));

    const rateResult = await fetchShipbubbleRates({
      senderAddressCode,
      receiverAddress: receiver,
      packageItems,
      packageDimension: {
        length: parcelDetails.length,
        width: parcelDetails.width,
        height: parcelDetails.height,
      },
    });

    return NextResponse.json({
      success: true,
      requestToken: rateResult.request_token,
      couriers: rateResult.couriers,
      parcelDetails,
    });
  } catch (error) {
    console.error("Get shipping rates error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to calculate shipping rates.",
      },
      { status: 500 }
    );
  }
}
