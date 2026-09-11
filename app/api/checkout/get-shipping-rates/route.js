import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchShipbubbleRates, getShipbubbleOriginAddress } from "@/lib/shipbubble";
import { calculateParcelPackageDetails, resolveItemUnitWeight } from "@/lib/shipping-weights";

/**
 * POST /api/checkout/get-shipping-rates
 *
 * Server-side endpoint to fetch courier shipping rates from Shipbubble using official v1 contract.
 * Uses configured physical delivery origin address dynamically from SiteSetting.
 * Calculates server-authoritative parcel weight SUM(resolvedWeight * quantity) using Category.shippingWeight or Product.weight.
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

    const senderAddress = await getShipbubbleOriginAddress();

    const receiver = {
      name: `${receiverAddress.firstName || ""} ${receiverAddress.lastName || ""}`.trim() || "Customer",
      phone: receiverAddress.phone || "+2348000000000",
      email: receiverAddress.email || "customer@example.com",
      address: receiverAddress.address || receiverAddress.streetAddress || "Delivery Address",
      city: receiverAddress.city,
      state: receiverAddress.state,
      country: receiverAddress.country || "Nigeria",
    };

    // Load DB product references including categoryRef for authoritative weight resolution
    const itemsWithProducts = await Promise.all(
      items.map(async (it) => {
        const prodId = it.productId || it.id;
        const collabId = it.collaborationProductId || (it.isCollaboration ? it.id : null);

        let dbProd = null;
        if (collabId) {
          try {
            const collabProd = await prisma.collaborationProduct.findUnique({
              where: { id: collabId },
              include: {
                productA: { include: { categoryRef: true } },
                productB: { include: { categoryRef: true } },
              },
            });

            if (collabProd) {
              const weightA = collabProd.productA?.weight ?? collabProd.productA?.categoryRef?.shippingWeight;
              const weightB = collabProd.productB?.weight ?? collabProd.productB?.categoryRef?.shippingWeight;
              const resolvedCollabWeight = weightA ?? weightB ?? 0.5;

              dbProd = {
                name: collabProd.name,
                price: collabProd.price,
                weight: resolvedCollabWeight,
                packageLength: collabProd.productA?.packageLength || 20,
                packageWidth: collabProd.productA?.packageWidth || 20,
                packageHeight: collabProd.productA?.packageHeight || 5,
              };
            }
          } catch {
            dbProd = null;
          }
        } else if (prodId) {
          try {
            dbProd = await prisma.product.findUnique({
              where: { id: prodId },
              include: { categoryRef: true },
            });
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

    const packageItems = itemsWithProducts.map((it) => {
      const unitWeight = resolveItemUnitWeight(it.product || it);
      return {
        name: it.product?.name || it.name || "Apparel Item",
        description: it.selectedSize || "Standard size",
        unit_price: Math.round(Number(it.price || it.product?.price || 0)),
        quantity: Number(it.qty || 1),
        weight: unitWeight,
      };
    });

    const rateResult = await fetchShipbubbleRates({
      senderAddress,
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
