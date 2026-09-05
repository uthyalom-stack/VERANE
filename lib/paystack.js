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
import { NIGERIAN_STATES, NIGERIA_LOCATIONS } from "@/lib/nigeria-locations";

/**
 * Validates cart items, calculates their subtotal, and determines the applicable delivery fee.
 * Server-owned product.preOrderEnabled is strictly authoritative for pre-order eligibility.
 * Client-supplied item.isPreOrder flags are completely ignored.
 *
 * @param {Object} options - Cart and delivery information.
 * @param {Array} options.items - Items included in the cart.
 * @param {string} [options.country] - Delivery country.
 * @param {string} [options.state] - Delivery state, required for Nigerian deliveries.
 * @param {string} [options.city] - Delivery city.
 * @param {string} [options.zone] - Delivery zone.
 * @returns {Promise<Object>} The subtotal, shipping fee, total, and validated cart items.
 */
export async function calculateOrderTotalsServer({ items, country, state, city, zone }) {
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

    if (isCollaboration || collaborationProductId) {
      if (!collaborationProductId) {
        throw new Error("Collaboration product ID is required for collaboration items.");
      }

      const collabProduct = await prisma.collaborationProduct.findUnique({
        where: { id: collaborationProductId },
        include: { collaboration: true, productA: true, productB: true, variants: true },
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

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true },
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
      selectedColor: item.selectedColor || null,
      selectedSize: item.selectedSize || null,
      customSizing: item.customSizing || item.customMeasurements || null,
    });
  }

  // Recalculate Shipping Fee Server-Side
  let shippingFee = 0;
  const reqCountry = String(country || "Nigeria").trim();
  const reqState = String(state || "").trim();
  const reqCity = String(city || "").trim();

  if (reqCountry.toLowerCase() === "nigeria") {
    if (!reqState) {
      throw new Error("Delivery state is required for shipping calculation.");
    }

    const matchedStateKey = NIGERIAN_STATES.find(
      (s) => s.toLowerCase() === reqState.toLowerCase()
    );

    if (!matchedStateKey) {
      throw new Error(`Invalid Nigerian state "${reqState}" supplied for delivery.`);
    }

    try {
      const dbState = await prisma.deliveryState.findUnique({
        where: { state: matchedStateKey },
        include: {
          cities: { where: { enabled: true } },
        },
      });

      if (dbState && dbState.enabled) {
        if (dbState.pricingMode === "CITY_SPECIFIC" && reqCity) {
          const matchedCity = dbState.cities.find(
            (c) => c.city.toLowerCase() === reqCity.toLowerCase()
          );

          if (matchedCity && matchedCity.fee !== null && matchedCity.fee !== undefined) {
            const rawFee = Number(matchedCity.fee);
            if (!Number.isFinite(rawFee) || rawFee < 0) {
              throw new Error(`Invalid delivery fee configured for city "${matchedCity.city}".`);
            }
            shippingFee = rawFee;
          } else {
            if (dbState.defaultFee === null || dbState.defaultFee === undefined) {
              throw new Error(`Delivery fee for city "${reqCity}" in "${matchedStateKey}" is not configured.`);
            }
            const rawDefaultFee = Number(dbState.defaultFee);
            if (!Number.isFinite(rawDefaultFee) || rawDefaultFee < 0) {
              throw new Error(`Delivery fee for city "${reqCity}" in "${matchedStateKey}" is not configured.`);
            }
            shippingFee = rawDefaultFee;
          }
        } else {
          const rawDefaultFee = Number(dbState.defaultFee);
          if (!Number.isFinite(rawDefaultFee) || rawDefaultFee < 0) {
            throw new Error(`Delivery fee for "${matchedStateKey}" is missing or malformed.`);
          }
          shippingFee = rawDefaultFee;
        }
      } else {
        throw new Error(`Delivery rates for "${matchedStateKey}" are currently unconfigured or disabled.`);
      }
    } catch (dbErr) {
      console.error("Delivery state database lookup error:", dbErr);
      throw new Error("Failed to calculate delivery rates due to a server database error.");
    }
  } else {
    try {
      const matchedIntl = await prisma.deliveryLocation.findFirst({
        where: {
          country: { equals: reqCountry, mode: "insensitive" },
          enabled: true,
        },
      });

      if (!matchedIntl) {
        throw new Error(`International delivery to "${reqCountry}" is currently unconfigured or unsupported.`);
      }

      const rawIntlFee = Number(matchedIntl.fee);
      if (!Number.isFinite(rawIntlFee) || rawIntlFee < 0) {
        throw new Error(`Invalid international delivery fee configured for "${reqCountry}".`);
      }

      shippingFee = rawIntlFee;
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes("unconfigured or unsupported")) {
        throw dbErr;
      }
      console.error("Delivery location international lookup error:", dbErr);
      throw new Error("Failed to calculate international delivery rates due to a server database error.");
    }
  }

  const grandTotal = subtotal + shippingFee;

  return {
    subtotal,
    shippingFee,
    total: grandTotal,
    items: validatedItems,
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

    // D. Transition Order status to paid / processing
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
