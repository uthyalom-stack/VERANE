import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

/*
|--------------------------------------------------------------------------
| Paystack Helper Module
|--------------------------------------------------------------------------
*/

export async function initializePaystackTransaction({ email, amountInKobo, reference, callbackUrl, metadata }) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is not configured.");
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountInKobo,
      reference,
      callback_url: callbackUrl,
      metadata,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || "Failed to initialize Paystack transaction.");
  }

  return data.data; // { authorization_url, access_code, reference }
}

export async function verifyPaystackTransaction(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is not configured.");
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || "Failed to verify Paystack transaction.");
  }

  return data.data; // { status: "success", reference, channel, paid_at, ... }
}

/**
 * Verifies a Paystack webhook signature against the request body.
 * @param {string} requestBodyText - The raw webhook request body.
 * @param {string} signatureHeader - The signature supplied with the request.
 * @return {boolean} `true` if the signature matches, `false` otherwise.
 */
export function verifyPaystackWebhookSignature(requestBodyText, signatureHeader) {
  if (!PAYSTACK_SECRET_KEY || !signatureHeader) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(requestBodyText)
    .digest("hex");

  return hash === signatureHeader;
}

/*
|--------------------------------------------------------------------------
| Server-Side Order & Delivery Price Calculation Helper
|--------------------------------------------------------------------------
*/

import prisma from "@/lib/prisma";
import { fetchShipbubbleRates, getShipbubbleOriginAddress } from "@/lib/shipbubble";
import { getPickupDetailsForCart, resolveOrderPickupBrand } from "@/lib/pickup-resolver";
import { calculateParcelPackageDetails, resolveItemUnitWeight } from "@/lib/shipping-weights";

export async function calculateOrderTotalsServer({ items, fulfillmentType = "delivery", selectedCourier, requestedPickupDate, receiverAddress }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty.");
  }

  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid cart item format.");
    }

    const qty = Number(item.qty || item.quantity || 1);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("Invalid quantity requested.");
    }

    let unitPrice = 0;
    let productId = item.productId || item.id || null;
    let variantId = item.variantId || null;
    let collaborationProductId = item.collaborationProductId || null;
    let collaborationVariantId = item.collaborationVariantId || null;
    let isCollaboration = Boolean(item.isCollaboration || collaborationProductId);
    let isPreOrder = false;
    let product = null;
    let collabProduct = null;

    if (isCollaboration || collaborationProductId) {
      if (!collaborationProductId) {
        throw new Error("Collaboration product ID is required for collaboration items.");
      }

      collabProduct = await prisma.collaborationProduct.findUnique({
        where: { id: collaborationProductId },
        include: {
          collaboration: true,
          productA: { include: { categoryRef: true } },
          productB: { include: { categoryRef: true } },
          variants: true,
        },
      });

      if (!collabProduct) {
        throw new Error("Collaboration product not found.");
      }

      if (collabProduct.status !== "published" && collabProduct.status !== "active") {
        throw new Error(`Collaboration product "${collabProduct.name}" is not currently available.`);
      }

      unitPrice = Number(collabProduct.price);
      productId = collabProduct.productAId; // Reference primary product

      if (Array.isArray(collabProduct.variants) && collabProduct.variants.length > 0) {
        if (!collaborationVariantId) {
          throw new Error(`A valid collaboration variant is required for "${collabProduct.name}".`);
        }

        const collabVariant = await prisma.collaborationVariant.findUnique({
          where: { id: collaborationVariantId },
        });

        if (!collabVariant) {
          throw new Error("Collaboration variant not found.");
        }

        if (collabVariant.collaborationProductId !== collaborationProductId) {
          throw new Error("Collaboration variant does not belong to the specified collaboration product.");
        }

        if (collabVariant.stock < qty) {
          throw new Error(`Insufficient stock for "${collabProduct.name}".`);
        }
      }
    } else {
      if (!productId) {
        throw new Error("Product ID is required for cart item.");
      }

      product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true, categoryRef: true },
      });

      if (!product) {
        throw new Error("Product not found.");
      }

      unitPrice = Number(product.price);
      // Pre-order is DERIVED EXCLUSIVELY from DB product record
      isPreOrder = Boolean(product.preOrderEnabled);

      if (variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: variantId },
        });

        if (!variant) {
          throw new Error("Requested product variant not found.");
        }

        if (variant.productId !== productId) {
          throw new Error("Variant does not belong to the specified product.");
        }

        if (variant.stock < qty && !isPreOrder) {
          throw new Error(`Insufficient stock for product "${product.name}".`);
        }
      } else if (Array.isArray(product.variants) && product.variants.length > 0) {
        // Product has variants: variant stock is authoritative
        const totalVariantStock = product.variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0);
        if (totalVariantStock < qty && !isPreOrder) {
          throw new Error(`Insufficient stock for product "${product.name}".`);
        }
      } else {
        // Product has no variants: product.inventory is authoritative
        if (product.inventory < qty && !isPreOrder) {
          throw new Error(`Insufficient inventory for product "${product.name}".`);
        }
      }
    }

    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;

    let collabProductRef = null;
    if (isCollaboration && product) {
      collabProductRef = product;
    } else if (isCollaboration && collabProduct) {
      let resolvedCollabWeight = null;
      if (collabProduct.productA) {
        try {
          resolvedCollabWeight = resolveItemUnitWeight(collabProduct.productA);
        } catch {
          // Keep checking productB if productA weight is unconfigured
        }
      }
      if (!resolvedCollabWeight && collabProduct.productB) {
        resolvedCollabWeight = resolveItemUnitWeight(collabProduct.productB);
      }

      collabProductRef = {
        name: collabProduct.name || "Collaboration Item",
        price: unitPrice,
        weight: resolvedCollabWeight,
        packageLength: collabProduct.productA?.packageLength || 20,
        packageWidth: collabProduct.productA?.packageWidth || 20,
        packageHeight: collabProduct.productA?.packageHeight || 5,
      };
    }

    validatedItems.push({
      ...item,
      id: productId,
      productId,
      variantId,
      collaborationProductId,
      collaborationVariantId,
      isCollaboration,
      qty,
      price: unitPrice,
      isPreOrder, // Server-derived authoritative boolean
      product: isCollaboration ? collabProductRef : product,
      selectedColor: item.selectedColor || null,
      selectedSize: item.selectedSize || null,
      customSizing: item.customSizing || item.customMeasurements || null,
    });
  }

  let shippingFee = 0;
  let fulfillmentDetails = {};

  const normalizedMode = String(fulfillmentType || "delivery").toLowerCase();

  if (normalizedMode === "pickup") {
    // CUSTOMER PICKUP: Delivery fee is strictly 0
    shippingFee = 0;
    const pickupDetails = await getPickupDetailsForCart(validatedItems);

    if (!pickupDetails.configured || !pickupDetails.available) {
      throw new Error(pickupDetails.error || `Pickup is not configured for ${pickupDetails.pickupBrandDisplayName}.`);
    }

    const isImmediate = requestedPickupDate === "IMMEDIATE";
    if (isImmediate && !pickupDetails.immediatePickupEnabled) {
      throw new Error(`Immediate pickup is not currently available for ${pickupDetails.pickupBrandDisplayName}.`);
    }

    const validDateMatch = pickupDetails.availableDates?.find((d) => d.value === requestedPickupDate);
    if (!validDateMatch && requestedPickupDate) {
      throw new Error("Invalid pickup date selected.");
    }

    fulfillmentDetails = {
      fulfillmentType: "pickup",
      pickupBrand: pickupDetails.pickupBrand,
      pickupBrandDisplayName: pickupDetails.pickupBrandDisplayName,
      pickupLocationName: pickupDetails.pickupLocationName,
      pickupAddress: pickupDetails.pickupAddress,
      pickupContactName: pickupDetails.pickupContactName,
      pickupContactPhone: pickupDetails.pickupContactPhone,
      pickupTimeframe: pickupDetails.pickupTimeframe,
      pickupInstructions: pickupDetails.pickupInstructions,
      requestedPickupDate: requestedPickupDate || (pickupDetails.availableDates[0]?.value || "2-3 Days"),
      isImmediatePickup: isImmediate,
    };
  } else {
    // DELIVERY: Calculate/verify Shipbubble courier quote server-side
    if (!selectedCourier || !selectedCourier.courier_id || !selectedCourier.service_code) {
      throw new Error("Please select a valid courier shipping option.");
    }

    const recName = String(
      receiverAddress?.name || `${receiverAddress?.firstName || ""} ${receiverAddress?.lastName || ""}`
    ).trim();
    const recPhone = String(receiverAddress?.phone || "").trim();
    const recEmail = String(receiverAddress?.email || "").trim();
    const recStreet = String(receiverAddress?.address || receiverAddress?.streetAddress || "").trim();
    const recCity = String(receiverAddress?.city || "").trim();
    const recState = String(receiverAddress?.state || "").trim();

    if (!recName || !recPhone || !recEmail || !recStreet || !recCity || !recState) {
      throw new Error("Complete delivery contact and destination details (Name, Phone, Email, Address, City, State) are required.");
    }

    const orderBrand = await resolveOrderPickupBrand(validatedItems).catch(() => null);
    const senderAddress = await getShipbubbleOriginAddress(orderBrand);

    const receiver = {
      name: recName,
      phone: recPhone,
      email: recEmail,
      address: recStreet,
      city: recCity,
      state: recState,
      country: String(receiverAddress?.country || "Nigeria").trim(),
    };

    const parcelDetails = calculateParcelPackageDetails(validatedItems);

    const packageItems = validatedItems.map((it) => {
      const dbProdRef = it.product || it;
      const unitWeight = resolveItemUnitWeight(dbProdRef);
      return {
        name: dbProdRef.name || it.name || "Apparel Item",
        description: it.selectedSize || "Standard size",
        unit_price: Math.round(Number(it.price)), // it.price is strictly the server DB product price
        quantity: Number(it.qty || 1),
        weight: unitWeight,
      };
    });

    let freshRates;
    try {
      freshRates = await fetchShipbubbleRates({
        senderAddress,
        receiverAddress: receiver,
        packageItems,
        packageDimension: {
          length: parcelDetails.length,
          width: parcelDetails.width,
          height: parcelDetails.height,
        },
      });
    } catch (ratesErr) {
      console.error("Paystack server re-quoting error:", ratesErr);
      throw new Error("Unable to calculate shipping rates for this address. Please try again.");
    }

    if (!freshRates || !Array.isArray(freshRates.couriers) || freshRates.couriers.length === 0) {
      throw new Error("No courier shipping options are available for this destination.");
    }

    const matched = freshRates.couriers.find(
      (c) => String(c.courier_id) === String(selectedCourier.courier_id) && String(c.service_code) === String(selectedCourier.service_code)
    );

    if (!matched) {
      throw new Error("Selected courier shipping option is no longer available. Please recalculate shipping rates.");
    }

    // Customer shipping fee strictly uses rate_card_amount from fresh quote
    shippingFee = Math.max(0, Number(matched.rate_card_amount ?? matched.total ?? 0));

    fulfillmentDetails = {
      fulfillmentType: "delivery",
      courierId: matched.courier_id,
      courierName: matched.courier_name,
      serviceCode: matched.service_code,
      serviceName: matched.service_type,
      rateToken: freshRates.request_token,
      shippingFee,
    };
  }

  const grandTotal = subtotal + shippingFee;

  return {
    subtotal,
    shippingFee,
    total: grandTotal,
    items: validatedItems,
    fulfillmentType: normalizedMode,
    fulfillmentDetails,
  };
}

/**
 * Finalizes a Paystack payment and updates the associated order atomically.
 * Pre-order status and inventory source of truth are derived re-querying DB records inside transaction.
 *
 * @param {Object} params - Finalization parameters.
 * @param {string} params.reference - Paystack payment reference associated with the order.
 * @param {Object} params.txData - Verified Paystack transaction data.
 * @returns {Promise<Object>} An object containing the finalization result, idempotency status, and order.
 * @throws {Error} If the reference or verified checkout items are missing, the order cannot be found, the transaction is unsuccessful, the amount does not match, or inventory is insufficient.
 */
export async function finalizePaystackOrder({ reference, txData }) {
  if (!reference) {
    throw new Error("Payment reference is required for finalization.");
  }

  // 1. Fetch Order from Prisma
  const existingOrder = await prisma.order.findUnique({
    where: { paymentReference: reference },
    include: { items: true },
  });

  if (!existingOrder) {
    throw new Error(`Order not found for reference "${reference}".`);
  }

  // 2. IDEMPOTENCY CHECK: If order is already paid, return early safely
  if (existingOrder.paymentStatus === "paid") {
    return {
      success: true,
      alreadyPaid: true,
      order: existingOrder,
    };
  }

  // 3. Verify Paystack transaction status and amount matching
  const status = txData?.status;
  const paystackAmountKobo = Number(txData?.amount || 0);
  const expectedAmountKobo = Math.round(Number(existingOrder.total) * 100);

  if (status !== "success") {
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: "failed",
        status: "cancelled",
      },
    });

    throw new Error("Paystack transaction status was not successful.");
  }

  if (paystackAmountKobo !== expectedAmountKobo) {
    console.error(
      `PAYSTACK AMOUNT MISMATCH! Expected ${expectedAmountKobo} kobo, got ${paystackAmountKobo} kobo for order ${existingOrder.id}`
    );

    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: "amount_mismatch",
        status: "cancelled",
      },
    });

    throw new Error("Paystack transaction amount does not match order total.");
  }

  // 4. Parse verified items snapshot from pendingCheckoutData
  let checkoutData = {};
  try {
    if (existingOrder.pendingCheckoutData) {
      checkoutData = JSON.parse(existingOrder.pendingCheckoutData);
    }
  } catch {
    checkoutData = {};
  }

  const items = Array.isArray(checkoutData.items) ? checkoutData.items : [];

  if (items.length === 0) {
    throw new Error("No verified items found in pending checkout data.");
  }

  // 5. ATOMIC TRANSACTION: Check stock, create OrderItems, decrement stock, update Order status
  const finalizedOrder = await prisma.$transaction(async (tx) => {
    // Re-verify idempotency inside transaction block
    const currentOrder = await tx.order.findUnique({
      where: { id: existingOrder.id },
      include: { items: true },
    });

    if (currentOrder.paymentStatus === "paid") {
      return currentOrder;
    }

    // A. Re-verify inventory & stock availability atomically before decrementing
    for (const item of items) {
      const qty = Number(item.qty || item.quantity || 1);

      if (item.collaborationProductId) {
        const collabProduct = await tx.collaborationProduct.findUnique({
          where: { id: item.collaborationProductId },
          include: { variants: true },
        });

        if (!collabProduct) {
          throw new Error("Collaboration product not found during finalization.");
        }

        if (Array.isArray(collabProduct.variants) && collabProduct.variants.length > 0) {
          if (!item.collaborationVariantId) {
            throw new Error(`A valid collaboration variant is required for "${collabProduct.name}".`);
          }

          const collabVariant = await tx.collaborationVariant.findUnique({
            where: { id: item.collaborationVariantId },
          });

          if (!collabVariant) {
            throw new Error("Collaboration variant not found during finalization.");
          }

          if (collabVariant.collaborationProductId !== item.collaborationProductId) {
            throw new Error("Collaboration variant does not belong to the specified collaboration product.");
          }

          if (collabVariant.stock < qty) {
            throw new Error(`Insufficient stock for collaboration variant "${item.name}". Stock available: ${collabVariant.stock}`);
          }
        }
      } else {
        const targetProductId = item.productId || item.id;
        if (!targetProductId) {
          throw new Error("Target product ID missing on cart item.");
        }

        const productRef = await tx.product.findUnique({
          where: { id: targetProductId },
          include: { variants: true },
        });

        if (!productRef) {
          throw new Error(`Product not found for item "${item.name}".`);
        }

        // Pre-order status derived EXCLUSIVELY from current database Product record
        const isPreOrder = Boolean(productRef.preOrderEnabled);

        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });

          if (!variant) {
            throw new Error(`Product variant not found for item "${item.name}".`);
          }

          if (variant.productId !== productRef.id) {
            throw new Error(`Variant does not belong to product "${productRef.name}".`);
          }

          if (variant.stock < qty && !isPreOrder) {
            throw new Error(`Insufficient stock for product variant "${item.name}". Stock available: ${variant.stock}`);
          }
        } else if (Array.isArray(productRef.variants) && productRef.variants.length > 0) {
          // Product has variants: source of truth for stock is variants
          const totalVariantStock = productRef.variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0);
          if (totalVariantStock < qty && !isPreOrder) {
            throw new Error(`Insufficient stock for product "${productRef.name}".`);
          }
        } else {
          // Product has no variants: product.inventory is authoritative
          if (productRef.inventory < qty && !isPreOrder) {
            throw new Error(`Insufficient inventory for product "${item.name}". Inventory available: ${productRef.inventory}`);
          }
        }
      }
    }

    // B. Create OrderItems if not already created
    if (currentOrder.items.length === 0) {
      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: currentOrder.id,
          productId: item.isCollaboration ? item.productId || item.productAId : item.id,
          quantity: Number(item.qty || item.quantity || 1),
          price: Number(item.price || 0),
          selectedColor: item.selectedColor || null,
          selectedColorHex: item.selectedColorHex || null,
          selectedSize: item.selectedSize || null,
          variantId: item.variantId || null,
          collaborationProductId: item.collaborationProductId || null,
          collaborationVariantId: item.collaborationVariantId || null,
          customMeasurements: item.customSizing || item.customMeasurements || null,
        })),
      });

      // C. Decrement stock atomically
      for (const item of items) {
        const qty = Number(item.qty || item.quantity || 1);

        if (item.collaborationProductId) {
          // Strictly handle collaboration items
          if (item.collaborationVariantId) {
            const res = await tx.collaborationVariant.updateMany({
              where: {
                id: item.collaborationVariantId,
                stock: { gte: qty },
              },
              data: { stock: { decrement: qty } },
            });
            if (res.count === 0) {
              throw new Error(`Concurrent checkout error: insufficient stock for collaboration variant.`);
            }
          }
          // If collaborationProductId exists but collaborationVariantId does NOT exist,
          // DO NOT fall through into the normal product inventory branch.
        } else {
          // Genuinely non-collaboration product branch
          const targetProductId = item.productId || item.id;
          const productRef = await tx.product.findUnique({
            where: { id: targetProductId },
            include: { variants: true },
          });

          const isPreOrder = Boolean(productRef?.preOrderEnabled);

          if (item.variantId) {
            if (!isPreOrder) {
              const res = await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,
                  stock: { gte: qty },
                },
                data: { stock: { decrement: qty } },
              });
              if (res.count === 0) {
                throw new Error(`Concurrent checkout error: insufficient variant stock.`);
              }
            }
          } else if (Array.isArray(productRef?.variants) && productRef.variants.length > 0) {
            // Product has variants but no specific variantId was passed: decrement available variant stock
            if (!isPreOrder) {
              let remainingToDecrement = qty;
              for (const v of productRef.variants) {
                if (v.stock <= 0) continue;
                const dec = Math.min(v.stock, remainingToDecrement);
                const res = await tx.productVariant.updateMany({
                  where: { id: v.id, stock: { gte: dec } },
                  data: { stock: { decrement: dec } },
                });
                if (res.count > 0) {
                  remainingToDecrement -= dec;
                  if (remainingToDecrement <= 0) break;
                }
              }
              if (remainingToDecrement > 0) {
                throw new Error(`Concurrent checkout error: insufficient variant stock.`);
              }
            }
          } else if (productRef) {
            if (!isPreOrder) {
              const res = await tx.product.updateMany({
                where: {
                  id: productRef.id,
                  inventory: { gte: qty },
                },
                data: { inventory: { decrement: qty } },
              });
              if (res.count === 0) {
                throw new Error(`Concurrent checkout error: insufficient product inventory.`);
              }
            }
          }
        }
      }
    }

    // D. Create or update OrderFulfillment record based on verified pendingCheckoutData
    const fulDetails = checkoutData.fulfillmentDetails || {};
    const fulType = checkoutData.fulfillmentType || fulDetails.fulfillmentType || "delivery";

    await tx.orderFulfillment.upsert({
      where: { orderId: currentOrder.id },
      create: {
        orderId: currentOrder.id,
        fulfillmentType: fulType,
        fulfillmentStatus: "unfulfilled",
        courierId: fulDetails.courierId || null,
        courierName: fulDetails.courierName || null,
        serviceCode: fulDetails.serviceCode || null,
        serviceName: fulDetails.serviceName || null,
        rateToken: fulDetails.rateToken || null,
        pickupBrand: fulDetails.pickupBrand || null,
        pickupAddress: fulDetails.pickupAddress || null,
        pickupInstructions: fulDetails.pickupInstructions || null,
        requestedPickupDate: fulDetails.requestedPickupDate || null,
        isImmediatePickup: Boolean(fulDetails.isImmediatePickup),
      },
      update: {
        fulfillmentType: fulType,
        courierId: fulDetails.courierId || null,
        courierName: fulDetails.courierName || null,
        serviceCode: fulDetails.serviceCode || null,
        serviceName: fulDetails.serviceName || null,
        rateToken: fulDetails.rateToken || null,
        pickupBrand: fulDetails.pickupBrand || null,
        pickupAddress: fulDetails.pickupAddress || null,
        pickupInstructions: fulDetails.pickupInstructions || null,
        requestedPickupDate: fulDetails.requestedPickupDate || null,
        isImmediatePickup: Boolean(fulDetails.isImmediatePickup),
      },
    });

    // E. Transition Order status to paid / processing
    const updatedOrder = await tx.order.update({
      where: { id: currentOrder.id },
      data: {
        paymentStatus: "paid",
        status: "processing", // Intended fulfillment status
        paymentMethod: txData?.channel || "card",
        paidAt: txData?.paid_at ? new Date(txData.paid_at) : new Date(),
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            variant: true,
            collaborationProduct: true,
          },
        },
        fulfillment: true,
      },
    });

    return updatedOrder;
  });

  // 6. Dispatch receipt PDF and order confirmation email safely (awaited for serverless compatibility)
  try {
    const { generateOrderReceiptPDF } = await import("@/lib/receipt-pdf");
    const { sendOrderReceiptEmail } = await import("@/lib/email");

    const pdfBuffer = await generateOrderReceiptPDF(finalizedOrder.id);
    const emailResult = await sendOrderReceiptEmail({ order: finalizedOrder, pdfBuffer });

    if (!emailResult?.success) {
      console.error("Order receipt email dispatch returned failure:", {
        orderId: finalizedOrder.id,
        orderNumber: finalizedOrder.orderNumber,
        error: emailResult?.error,
      });
    }
  } catch (emailErr) {
    console.error("Order receipt generation/email dispatch exception:", {
      orderId: finalizedOrder.id,
      orderNumber: finalizedOrder.orderNumber,
      error: emailErr?.message || emailErr,
    });
  }

  return {
    success: true,
    alreadyPaid: false,
    order: finalizedOrder,
  };
}
