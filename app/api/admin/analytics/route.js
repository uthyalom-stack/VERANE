import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_BRANDS = ["UTHY", "ALOMZIEE"];

/* ============================================================
   BRAND NORMALIZATION
============================================================ */

function normalizeBrand(value) {
  if (!value) return "";

  const brand = String(value)
    .trim()
    .toUpperCase();

  if (
    brand === "UTHY" ||
    brand === "UTHY_LUXURY"
  ) {
    return "UTHY";
  }

  if (
    brand === "ALOMZIEE" ||
    brand === "ALOMZIEE_FOOTIES"
  ) {
    return "ALOMZIEE";
  }

  return brand;
}

/* ============================================================
   MONEY NORMALIZATION

   Analytics must NEVER arbitrarily multiply monetary values.

   Product prices are read directly as stored.

   We also protect against the common situation where a
   monetary value arrives as a Decimal/string/object.
============================================================ */

function money(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "object") {
    if (
      typeof value.toNumber === "function"
    ) {
      const number = value.toNumber();

      return Number.isFinite(number)
        ? number
        : 0;
    }

    if (
      typeof value.toString === "function"
    ) {
      value = value.toString();
    }
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/*
 * Product price is the authoritative price for product
 * analytics and inventory valuation.
 */
function getProductPrice(product) {
  return money(product?.price);
}

/*
 * Order item price:
 *
 * Prefer the stored order-item price because an order may
 * have been placed at a historical/sale price.
 *
 * If that value is missing or invalid, fall back to the
 * product price.
 */
function getItemPrice(item) {
  const itemPrice = money(item?.price);

  if (itemPrice > 0) {
    return itemPrice;
  }

  return getProductPrice(item?.product);
}

/* ============================================================
   DATE HELPERS
============================================================ */

function getDateRange(range, customStartDate, customEndDate) {
  const now = new Date();

  const end = new Date(now);
  const start = new Date(now);

  if (range === "custom" && customStartDate) {
    const s = new Date(customStartDate);
    if (!isNaN(s.getTime())) {
      s.setHours(0, 0, 0, 0);
      const e = customEndDate ? new Date(customEndDate) : new Date();
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
      } else {
        e.setTime(now.getTime());
      }
      return { start: s, end: e };
    }
  }

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "7d":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;

    case "30d":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;

    case "90d":
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;

    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;

    default:
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return {
    start,
    end,
  };
}

function isCancelledStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  return [
    "cancelled",
    "canceled",
    "refunded",
    "refund",
    "failed",
    "rejected",
  ].includes(value);
}

function formatDate(date) {
  return new Date(date)
    .toISOString()
    .slice(0, 10);
}

function formatDay(date) {
  return new Date(date).toLocaleDateString(
    "en-NG",
    {
      month: "short",
      day: "numeric",
    }
  );
}

/* ============================================================
   GET ANALYTICS
============================================================ */

export async function GET(request) {
  try {
    /* ========================================================
       1. SESSION
    ======================================================== */

    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/session`,
      {
        headers: {
          cookie:
            request.headers.get("cookie") || "",
        },
        cache: "no-store",
      }
    );

    const sessionData =
      await sessionResponse
        .json()
        .catch(() => null);

    if (
      !sessionResponse.ok ||
      !sessionData?.admin
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const admin = sessionData.admin;

    /* ========================================================
       2. ADMIN BRAND
    ======================================================== */

    const adminBrand = normalizeBrand(
      admin.brand || admin.role
    );

    if (!VALID_BRANDS.includes(adminBrand)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Analytics are only available to UTHY and ALOMZIEE administrators.",
          adminBrand,
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ========================================================
       3. REQUESTED BRAND
    ======================================================== */

    const { searchParams } =
      new URL(request.url);

    const requestedBrand =
      searchParams.get("brand");

    const normalizedRequestedBrand =
      normalizeBrand(requestedBrand);

    const brand =
      normalizedRequestedBrand ||
      adminBrand;

    if (brand !== adminBrand) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to view this brand's analytics.",
          adminBrand,
          requestedBrand: brand,
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ========================================================
       4. DATE RANGE
    ======================================================== */

    const range = searchParams.get("range") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const { start, end } = getDateRange(range, startDateParam, endDateParam);

    /* ========================================================
       5. LOAD PRODUCTS
    ======================================================== */

    const allProducts =
      await prisma.product.findMany({
        include: {
          categoryRef: true,
          collection: true,
          variants: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    /* ========================================================
       6. NORMALIZE/FILTER PRODUCTS
    ======================================================== */

    const products =
      allProducts.filter((product) => {
        return (
          normalizeBrand(product.brand) ===
          brand
        );
      });

    /* ========================================================
       7. PRODUCT COUNTS
    ======================================================== */

    const totalProducts =
      products.length;

    const activeProducts =
      products.filter(
        (product) =>
          money(product.inventory) > 0
      ).length;

    const outOfStockProducts =
      products.filter(
        (product) =>
          money(product.inventory) <= 0
      );

    const outOfStock =
      outOfStockProducts.length;

    const lowStockProducts =
      products.filter((product) => {
        const inventory =
          money(product.inventory);

        return (
          inventory > 0 &&
          inventory <= 5
        );
      });

    /* ========================================================
       8. INVENTORY
    ======================================================== */

    const totalInventoryUnits =
      products.reduce(
        (total, product) =>
          total +
          money(product.inventory),
        0
      );

    /*
     * IMPORTANT:
     * Product price is used directly.
     *
     * There is NO ×10 multiplication here.
     */
    const inventoryValue =
      products.reduce(
        (total, product) => {
          const inventory =
            money(product.inventory);

          const price =
            getProductPrice(product);

          return (
            total +
            inventory * price
          );
        },
        0
      );

    /* ========================================================
       9. STOCK HEALTH
    ======================================================== */

    const stockHealth =
      totalProducts > 0
        ? Math.round(
            (activeProducts /
              totalProducts) *
              100
          )
        : 0;

    /* ========================================================
       10. PRODUCT PERFORMANCE MAP
    ======================================================== */

    const productStats =
      new Map();

    for (const product of products) {
      productStats.set(product.id, {
        id: product.id,

        name:
          product.name ||
          "Unnamed Product",

        brand:
          normalizeBrand(product.brand),

        databaseBrand:
          product.brand,

        /*
         * ALWAYS expose the actual product price.
         */
        price:
          getProductPrice(product),

        inventory:
          money(product.inventory),

        category:
          product.categoryRef?.name ||
          product.category ||
          "Uncategorized",

        collection:
          product.collection?.name ||
          "No Collection",

        unitsSold: 0,

        revenue: 0,

        orders: 0,

        status:
          money(product.inventory) <= 0
            ? "out_of_stock"
            : money(product.inventory) <= 5
              ? "low_stock"
              : "in_stock",

        image:
          product.images || "",
      });
    }

    /* ========================================================
       11. ORDERS
    ======================================================== */

    const productIds =
      products.map(
        (product) => product.id
      );

    let orders = [];

    if (productIds.length > 0) {
      orders =
        await prisma.order.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },

            items: {
              some: {
                productId: {
                  in: productIds,
                },
              },
            },
          },

          include: {
            user: true,

            items: {
              include: {
                product: {
                  include: {
                    categoryRef: true,
                    collection: true,
                  },
                },
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });
    }

    /* ========================================================
       12. BRAND ORDER ITEMS
    ======================================================== */

    const brandOrders = [];
    const brandOrderItems = [];

    for (const order of orders) {
      const itemsForBrand =
        order.items.filter(
          (item) =>
            normalizeBrand(
              item.product?.brand
            ) === brand
        );

      if (
        itemsForBrand.length === 0
      ) {
        continue;
      }

      brandOrders.push({
        ...order,
        items: itemsForBrand,
      });

      for (const item of itemsForBrand) {
        brandOrderItems.push({
          ...item,

          orderStatus:
            order.status,

          orderCreatedAt:
            order.createdAt,

          customerId:
            order.userId,
        });
      }
    }

    /* ========================================================
       13. VALID ORDERS
    ======================================================== */

    const validOrders =
      brandOrders.filter(
        (order) =>
          !isCancelledStatus(
            order.status
          )
      );

    const validOrderItems =
      brandOrderItems.filter(
        (item) =>
          !isCancelledStatus(
            item.orderStatus
          )
      );

    /* ========================================================
       14. REVENUE
    ======================================================== */

    let revenue = 0;
    let unitsSold = 0;

    for (const item of validOrderItems) {
      const quantity =
        money(item.quantity);

      const price =
        getItemPrice(item);

      const itemRevenue =
        price * quantity;

      unitsSold += quantity;

      revenue += itemRevenue;

      const existing =
        productStats.get(
          item.productId
        );

      if (existing) {
        existing.unitsSold +=
          quantity;

        existing.revenue +=
          itemRevenue;

        existing.orders += 1;
      }
    }

    const orderCount =
      validOrders.length;

    const averageOrderValue =
      orderCount > 0
        ? revenue / orderCount
        : 0;

    /* ========================================================
       15. CUSTOMERS
    ======================================================== */

    const customerIds = new Set(
      validOrders
        .map((order) => order.userId)
        .filter(Boolean)
    );

    const customerCount = customerIds.size;

    // Additional customer performance breakdown
    let newCustomers = 0;
    let firstTimeBuyers = 0;
    let returningBuyers = 0;

    if (customerIds.size > 0) {
      // Find user registration dates in range
      newCustomers = await prisma.user.count({
        where: {
          id: { in: Array.from(customerIds) },
          createdAt: { gte: start, lte: end },
        },
      });

      // Find total historical valid orders for these customers to determine first-time vs returning
      const historicalOrders = await prisma.order.findMany({
        where: {
          userId: { in: Array.from(customerIds) },
          status: { notIn: ["cancelled", "canceled", "refunded", "refund", "failed", "rejected"] },
        },
        select: { userId: true, createdAt: true },
      });

      const userOrderCounts = new Map();
      for (const ho of historicalOrders) {
        if (!ho.userId) continue;
        userOrderCounts.set(ho.userId, (userOrderCounts.get(ho.userId) || 0) + 1);
      }

      for (const userId of customerIds) {
        const count = userOrderCounts.get(userId) || 1;
        if (count === 1) {
          firstTimeBuyers += 1;
        } else {
          returningBuyers += 1;
        }
      }
    }

    /* ========================================================
       15B. DEMAND / WAITING LIST
    ======================================================== */

    let waitingListCount = 0;
    if (productIds.length > 0) {
      waitingListCount = await prisma.waitingList.count({
        where: {
          productId: { in: productIds },
        },
      });
    }

    /* ========================================================
       16. PRODUCT PERFORMANCE
    ======================================================== */

    const productPerformance =
      Array.from(
        productStats.values()
      ).sort((a, b) => {
        if (
          b.revenue !==
          a.revenue
        ) {
          return (
            b.revenue -
            a.revenue
          );
        }

        return (
          b.unitsSold -
          a.unitsSold
        );
      });

    /* ========================================================
       17. BEST SELLERS
    ======================================================== */

    const bestSellers =
      productPerformance
        .filter(
          (product) =>
            product.unitsSold > 0
        )
        .slice(0, 10);

    /* ========================================================
       17B. PREVIOUS PERIOD COMPARISON
    ======================================================== */

    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    let prevRevenue = 0;
    let prevOrderCount = 0;
    let prevUnitsSold = 0;

    if (productIds.length > 0) {
      const prevOrdersList = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: prevStart,
            lte: prevEnd,
          },
          items: {
            some: {
              productId: {
                in: productIds,
              },
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      const validPrevOrders = prevOrdersList.filter(
        (o) => !isCancelledStatus(o.status)
      );

      prevOrderCount = validPrevOrders.length;

      for (const po of validPrevOrders) {
        for (const pi of po.items) {
          if (normalizeBrand(pi.product?.brand) === brand) {
            const qty = money(pi.quantity);
            const prc = getItemPrice(pi);
            prevUnitsSold += qty;
            prevRevenue += qty * prc;
          }
        }
      }
    }

    const prevAOV = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

    const comparisons = {
      prevRevenue,
      prevOrders: prevOrderCount,
      prevUnitsSold,
      prevAOV,
      revenueChange: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      ordersChange: prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : null,
      unitsChange: prevUnitsSold > 0 ? ((unitsSold - prevUnitsSold) / prevUnitsSold) * 100 : null,
      aovChange: prevAOV > 0 ? ((averageOrderValue - prevAOV) / prevAOV) * 100 : null,
    };

    /* ========================================================
       18. DAILY ANALYTICS
    ======================================================== */

    const dailyMap =
      new Map();

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(
        date.getDate() + 1
      )
    ) {
      const key =
        formatDate(date);

      dailyMap.set(key, {
        date: key,

        label:
          formatDay(date),

        revenue: 0,

        orders: 0,

        unitsSold: 0,
      });
    }

    for (const order of validOrders) {
      const key =
        formatDate(
          order.createdAt
        );

      const day =
        dailyMap.get(key);

      if (day) {
        day.orders += 1;
      }
    }

    for (const item of validOrderItems) {
      const key =
        formatDate(
          item.orderCreatedAt
        );

      const day =
        dailyMap.get(key);

      if (!day) {
        continue;
      }

      const quantity =
        money(item.quantity);

      const price =
        getItemPrice(item);

      day.unitsSold += quantity;

      day.revenue +=
        price * quantity;
    }

    const dailyAnalytics =
      Array.from(
        dailyMap.values()
      );

    /* ========================================================
       19. CATEGORIES
    ======================================================== */

    const categoryMap =
      new Map();

    for (const item of validOrderItems) {
      const category =
        item.product
          ?.categoryRef?.name ||
        item.product?.category ||
        "Uncategorized";

      const quantity =
        money(item.quantity);

      const price =
        getItemPrice(item);

      const existing =
        categoryMap.get(
          category
        ) || {
          name: category,
          unitsSold: 0,
          revenue: 0,
        };

      existing.unitsSold +=
        quantity;

      existing.revenue +=
        price * quantity;

      categoryMap.set(
        category,
        existing
      );
    }

    const topCategories =
      Array.from(
        categoryMap.values()
      )
        .sort(
          (a, b) =>
            b.revenue -
            a.revenue
        )
        .slice(0, 10);

    /* ========================================================
       20. COLLECTIONS
    ======================================================== */

    const collectionMap =
      new Map();

    for (const item of validOrderItems) {
      const collection =
        item.product
          ?.collection?.name ||
        "No Collection";

      const quantity =
        money(item.quantity);

      const price =
        getItemPrice(item);

      const existing =
        collectionMap.get(
          collection
        ) || {
          name: collection,
          unitsSold: 0,
          revenue: 0,
        };

      existing.unitsSold +=
        quantity;

      existing.revenue +=
        price * quantity;

      collectionMap.set(
        collection,
        existing
      );
    }

    const topCollections =
      Array.from(
        collectionMap.values()
      )
        .sort(
          (a, b) =>
            b.revenue -
            a.revenue
        )
        .slice(0, 10);

    /* ========================================================
       21. ORDER STATUSES
    ======================================================== */

    const statusMap =
      new Map();

    for (const order of brandOrders) {
      const status =
        String(
          order.status ||
            "pending"
        ).toLowerCase();

      statusMap.set(
        status,
        (statusMap.get(status) || 0) +
          1
      );
    }

    const orderStatuses =
      Array.from(
        statusMap.entries()
      ).map(
        ([status, count]) => ({
          status,
          count,
        })
      );

    /* ========================================================
       22. RECENT ORDERS
    ======================================================== */

    const recentOrders =
      brandOrders
        .slice(0, 10)
        .map((order) => {
          let total = 0;
          let units = 0;

          for (const item of order.items) {
            const quantity =
              money(item.quantity);

            const price =
              getItemPrice(item);

            units += quantity;

            total +=
              price * quantity;
          }

          return {
            id: order.id,

            status:
              order.status,

            total,

            units,

            customer: {
              id:
                order.user?.id ||
                null,

              name:
                order.user?.name ||
                "Customer",

              email:
                order.user?.email ||
                "",
            },

            createdAt:
              order.createdAt,
          };
        });

    /* ========================================================
       23. RESPONSE
    ======================================================== */

    return NextResponse.json(
      {
        success: true,

        brand,

        range,

        period: {
          start,
          end,
        },

        /*
         * THIS IS THE STRUCTURE USED BY THE DASHBOARD.
         */
        overview: {
          revenue,

          orders:
            orderCount,

          unitsSold,

          averageOrderValue,

          customers:
            customerCount,

          newCustomers,

          firstTimeBuyers,

          returningBuyers,

          waitingListCount,

          products:
            totalProducts,

          activeProducts,

          outOfStock,

          lowStock:
            lowStockProducts.length,

          inventoryValue,

          totalInventoryUnits,

          stockHealth,

          comparisons,
        },

        analytics: {
          daily:
            dailyAnalytics,

          orderStatuses,

          bestSellers,

          topCategories,

          topCollections,
        },

        inventory: {
          lowStock:
            lowStockProducts.map(
              (product) => ({
                id: product.id,

                name:
                  product.name,

                inventory:
                  money(
                    product.inventory
                  ),

                price:
                  getProductPrice(
                    product
                  ),

                image:
                  product.images || "",
              })
            ),

          outOfStock,

          outOfStockProducts:
            outOfStockProducts.map(
              (product) => ({
                id: product.id,

                name:
                  product.name,

                inventory:
                  money(
                    product.inventory
                  ),

                price:
                  getProductPrice(
                    product
                  ),

                image:
                  product.images || "",
              })
            ),
        },

        products:
          productPerformance,

        recentOrders,

        /*
         * ======================================================
         * DEBUG
         * ======================================================
         */

        debug: {
          databaseProductCount:
            allProducts.length,

          matchingBrandProductCount:
            products.length,

          requestedBrand:
            requestedBrand || null,

          normalizedBrand:
            brand,

          adminBrand,

          databaseBrandsFound:
            [
              ...new Set(
                allProducts
                  .map(
                    (product) =>
                      product.brand
                  )
                  .filter(Boolean)
              ),
            ],

          matchingProducts:
            products.map(
              (product) => ({
                id:
                  product.id,

                name:
                  product.name,

                brand:
                  product.brand,

                normalizedBrand:
                  normalizeBrand(
                    product.brand
                  ),

                /*
                 * THIS SHOULD NOW MATCH THE
                 * ACTUAL PRODUCT PRICE.
                 */
                price:
                  getProductPrice(
                    product
                  ),

                inventory:
                  money(
                    product.inventory
                  ),

                inventoryValue:
                  money(
                    product.inventory
                  ) *
                  getProductPrice(
                    product
                  ),
              })
            ),
        },

        generatedAt:
          new Date(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "ADMIN ANALYTICS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Failed to load analytics.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}