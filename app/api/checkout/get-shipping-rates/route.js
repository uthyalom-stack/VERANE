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

    const customerName = `${receiverAddress?.firstName || ""} ${receiverAddress?.lastName || ""}`.trim();
    const customerPhone = String(receiverAddress?.phone || "").trim();
    const customerEmail = String(receiverAddress?.email || "").trim();
    const customerStreet = String(receiverAddress?.address || receiverAddress?.streetAddress || "").trim();
    const customerCity = String(receiverAddress?.city || "").trim();
    const customerState = String(receiverAddress?.state || "").trim();

    if (!customerName || !customerPhone || !customerEmail || !customerStreet || !customerCity || !customerState) {
      return NextResponse.json(
        { success: false, error: "Complete delivery contact and destination details (Name, Phone, Email, Address, City, State) are required." },
        { status: 400 }
      );
    }

    const senderAddress = await getShipbubbleOriginAddress();

    const receiver = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerStreet,
      city: customerCity,
      state: customerState,
      country: String(receiverAddress?.country || "Nigeria").trim(),
    };

    // Server-authoritative DB product/collaboration product resolution
    const itemsWithProducts = await Promise.all(
      items.map(async (it) => {
        const prodId = it.productId || it.id;
        const collabId = it.collaborationProductId || (it.isCollaboration ? it.id : null);

        if (collabId) {
          const collabProd = await prisma.collaborationProduct.findUnique({
            where: { id: collabId },
            include: {
              productA: { include: { categoryRef: true } },
              productB: { include: { categoryRef: true } },
            },
          });

          if (!collabProd) {
            throw new Error(`Collaboration product with ID "${collabId}" not found in database.`);
          }

          let resolvedCollabWeight = null;
          if (collabProd.productA) {
            try {
              resolvedCollabWeight = resolveItemUnitWeight(collabProd.productA);
            } catch {
              // Check productB if productA weight is unconfigured
            }
          }
          if (!resolvedCollabWeight && collabProd.productB) {
            resolvedCollabWeight = resolveItemUnitWeight(collabProd.productB);
          }

          if (!resolvedCollabWeight) {
            throw new Error(`Shipping weight configuration missing for collaboration product "${collabProd.name}".`);
          }

          return {
            ...it,
            product: {
              name: collabProd.name,
              price: collabProd.price,
              weight: resolvedCollabWeight,
              packageLength: collabProd.productA?.packageLength || 20,
              packageWidth: collabProd.productA?.packageWidth || 20,
              packageHeight: collabProd.productA?.packageHeight || 5,
            },
          };
        }

        if (!prodId) {
          throw new Error("Product ID is required for shipping calculation.");
        }

        const dbProd = await prisma.product.findUnique({
          where: { id: prodId },
          include: { categoryRef: true },
        });

        if (!dbProd) {
          throw new Error(`Product with ID "${prodId}" not found in database.`);
        }

        return {
          ...it,
          product: dbProd,
        };
      })
    );

    const parcelDetails = calculateParcelPackageDetails(itemsWithProducts);

    const packageItems = itemsWithProducts.map((it) => {
      const dbProduct = it.product;
      const unitWeight = resolveItemUnitWeight(dbProduct);
      return {
        name: dbProduct.name,
        description: it.selectedSize || "Standard size",
        unit_price: Math.round(Number(dbProduct.price)),
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
    console.error("Get shipping rates server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to calculate shipping rates. Please try again.",
      },
      { status: 500 }
    );
  }
}
