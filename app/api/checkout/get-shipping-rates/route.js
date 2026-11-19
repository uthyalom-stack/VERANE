import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchShipbubbleRates, getShipbubbleOriginAddress } from "@/lib/shipbubble";
import { resolveOrderPickupBrand } from "@/lib/pickup-resolver";
import { calculateParcelPackageDetails, resolveItemUnitWeight } from "@/lib/shipping-weights";

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, receiverAddress } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const customerName = String(
      receiverAddress?.name || `${receiverAddress?.firstName || ""} ${receiverAddress?.lastName || ""}`
    ).trim();
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

    const pickupBrand = await resolveOrderPickupBrand(items).catch(() => null);
    const senderAddress = await getShipbubbleOriginAddress(pickupBrand);

    const receiver = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerStreet, // Pass complete normalized physical address
      city: customerCity,
      state: customerState,
      country: String(receiverAddress?.country || "Nigeria").trim(),
    };

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
              // Check productB
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

    if (!rateResult.couriers || rateResult.couriers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No delivery services are currently available for this address.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      requestToken: rateResult.request_token,
      couriers: rateResult.couriers,
      parcelDetails,
    });
  } catch (error) {
    const rawError = String(error?.message || error || "");
    console.error("Get shipping rates server structured error log:", {
      message: rawError,
      stack: error?.stack,
    });

    let customerErrorMessage = "We couldn't retrieve delivery options right now. Please try again shortly.";

    if (rawError.includes("RECEIVER_ADDRESS_VALIDATION_FAILED") || rawError.toLowerCase().includes("address")) {
      customerErrorMessage = "We couldn't validate this delivery address. Please check the selected address or choose another suggestion.";
    } else if (rawError.includes("SENDER_ADDRESS_VALIDATION_FAILED") || rawError.includes("CATEGORY_RESOLUTION_FAILED") || rawError.includes("origin address is incomplete")) {
      customerErrorMessage = "Delivery is temporarily unavailable. Please try again later.";
    }

    return NextResponse.json(
      {
        success: false,
        error: customerErrorMessage,
      },
      { status: 400 }
    );
  }
}
