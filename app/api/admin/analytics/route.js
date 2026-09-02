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
============================================================ */

function money(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "object") {
    if (typeof value.toNumber === "function") {
      const number = value.toNumber();
      return Number.isFinite(number) ? number : 0;
    }

    if (typeof value.toString === "function") {
      value = value.toString();
    }
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getProductPrice(product) {
  return money(product?.price);
}

function getItemPrice(item) {
  const itemPrice = money(item?.price);
  if (itemPrice > 0) {
    return itemPrice;
  }
  return getProductPrice(item?.product);
}

/* ============================================================
   DATE & NIGERIA TIMEZONE (WAT - UTC+1) HELPERS
============================================================ */

function getWATDateString(dateObj) {
  return new Date(dateObj).toLocaleDateString("en-CA", {
    timeZone: "Africa/Lagos",
  });
}

function getWATDateRange(range, customStart, customEnd) {
  const now = new Date();

  if (range === "custom" && customStart && customEnd) {
    const start = new Date(`${customStart}T00:00:00+01:00`);
    const end = new Date(`${customEnd}T23:59:59.999+01:00`);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end };
    }
  }

  // Get current date string in WAT (YYYY-MM-DD)
  const todayWatStr = getWATDateString(now);
  const end = new Date(`${todayWatStr}T23:59:59.999+01:00`);

  let start = new Date(`${todayWatStr}T00:00:00+01:00`);

  switch (range) {
    case "today":
      // start is already midnight today WAT
      break;

    case "7d": {
      const d = new Date(end);
      d.setDate(d.getDate() - 6);
      const watStr = getWATDateString(d);
      start = new Date(`${watStr}T00:00:00+01:00`);
      break;
    }

    case "30d": {
      const d = new Date(end);
      d.setDate(d.getDate() - 29);
      const watStr = getWATDateString(d);
      start = new Date(`${watStr}T00:00:00+01:00`);
      break;
    }

    case "90d": {
      const d = new Date(end);
      d.setDate(d.getDate() - 89);
      const watStr = getWATDateString(d);
      start = new Date(`${watStr}T00:00:00+01:00`);
      break;
    }

    case "1y": {
      const d = new Date(end);
      d.setFullYear(d.getFullYear() - 1);
      const watStr = getWATDateString(d);
      start = new Date(`${watStr}T00:00:00+01:00`);
      break;
    }

    default: {
      const d = new Date(end);
      d.setDate(d.getDate() - 29);
      const watStr = getWATDateString(d);
      start = new Date(`${watStr}T00:00:00+01:00`);
      break;
    }
  }

  return { start, end };
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

function formatDayWAT(dateObj) {
  return new Date(dateObj).toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
  });
}

/* ============================================================
   GET ANALYTICS
============================================================ */

export async function GET(request) {
  try {
    /* ========================================================
       1. SESSION & AUTHENTICATION
    ======================================================== */

    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/session`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      }
    );

    const sessionData = await sessionResponse.json().catch(() => null);

    if (!sessionResponse.ok || !sessionData?.admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    const admin = sessionData.admin;

    // Explicitly reject SUPERADMIN access
    if (admin.role === "SUPERADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "SUPERADMIN is not authorized to access brand analytics.",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* ========================================================
       2. ADMIN BRAND & REQUEST AUTHORIZATION
    ======================================================== */

    const adminBrand = normalizeBrand(admin.brand || admin.role);

    if (!VALID_BRANDS.includes(adminBrand)) {
      return NextResponse.json(
        {
          success: false,
          error: "Analytics are only available to UTHY and ALOMZIEE administrators.",
          adminBrand,
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedBrand = searchParams.get("brand");
    const normalizedRequestedBrand = normalizeBrand(requestedBrand);
    const brand = normalizedRequestedBrand || adminBrand;

    if (brand !== adminBrand) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to view this brand's analytics.",
          adminBrand,
          requestedBrand: brand,
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* ========================================================
       3. DATE RANGE (WAT TIMEZONE)
    ======================================================== */

    const range = searchParams.get("range") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const { start, end } = getWATDateRange(range, startDateParam, endDateParam);

    /* ========================================================
       4. LOAD BRAND PRODUCTS
    ======================================================== */

    const allProducts = await prisma.product.findMany({
      include: {
        categoryRef: true,
        collection: true,
        variants: {
          include: {
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const products = allProducts.filter(
      (product) => normalizeBrand(product.brand) === brand
    );

    const productIds = products.map((product) => product.id);

    /* ========================================================
       5. PRODUCT & INVENTORY METRICS
    ======================================================== */

    const totalProducts = products.length;

    const activeProducts = products.filter(
      (product) => money(product.inventory) > 0
    ).length;

    const outOfStockProducts = products.filter(
      (product) => money(product.inventory) <= 0
    );

    const outOfStock = outOfStockProducts.length;

    const lowStockProducts = products.filter((product) => {
      const inventory = money(product.inventory);
      return inventory > 0 && inventory <= 5;
    });

    const totalInventoryUnits = products.reduce(
      (total, product) => total + money(product.inventory),
      0
    );

    const inventoryValue = products.reduce((total, product) => {
      const inventory = money(product.inventory);
      const price = getProductPrice(product);
      return total + inventory * price;
    }, 0);

    const stockHealth =
      totalProducts > 0
        ? Math.round((activeProducts / totalProducts) * 100)
        : 0;

    /* ================================================= scheme
       6. PRODUCT STATS MAP
    ======================================================== */

    const productStats = new Map();

    for (const product of products) {
      productStats.set(product.id, {
        id: product.id,
        name: product.name || "Unnamed Product",
        brand: normalizeBrand(product.brand),
        databaseBrand: product.brand,
        price: getProductPrice(product),
        inventory: money(product.inventory),
        category: product.categoryRef?.name || product.category || "Uncategorized",
        collection: product.collection?.name || "No Collection",
        unitsSold: 0,
        revenue: 0,
        orders: 0,
        status:
          money(product.inventory) <= 0
            ? "out_of_stock"
            : money(product.inventory) <= 5
              ? "low_stock"
              : "in_stock",
        image: product.images || "",
      });
    }

    /* ========================================================
       7. ORDERS & BRAND ORDER ITEMS
    ======================================================== */

    let orders = [];

    if (productIds.length > 0) {
      orders = await prisma.order.findMany({
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
        orderBy: { createdAt: "desc" },
      });
    }

    const brandOrders = [];
    const brandOrderItems = [];

    for (const order of orders) {
      const itemsForBrand = order.items.filter(
        (item) => normalizeBrand(item.product?.brand) === brand
      );

      if (itemsForBrand.length === 0) {
        continue;
      }

      brandOrders.push({
        ...order,
        items: itemsForBrand,
      });

      for (const item of itemsForBrand) {
        brandOrderItems.push({
          ...item,
          orderStatus: order.status,
          orderCreatedAt: order.createdAt,
          customerId: order.userId,
        });
      }
    }

    const validOrders = brandOrders.filter(
      (order) => !isCancelledStatus(order.status)
    );

    const validOrderItems = brandOrderItems.filter(
      (item) => !isCancelledStatus(item.orderStatus)
    );

    /* ========================================================
       8. REVENUE & UNITS SOLD CALCULATIONS
    ======================================================== */

    let revenue = 0;
    let unitsSold = 0;

    for (const item of validOrderItems) {
      const quantity = money(item.quantity);
      const price = getItemPrice(item);
      const itemRevenue = price * quantity;

      unitsSold += quantity;
      revenue += itemRevenue;

      const existing = productStats.get(item.productId);
      if (existing) {
        existing.unitsSold += quantity;
        existing.revenue += itemRevenue;
        existing.orders += 1;
      }
    }

    const orderCount = validOrders.length;
    const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    /* ========================================================
       9. CUSTOMER ANALYTICS BREAKDOWN
       - New Registered Customers: Users registered within range
       - First-Time Buyers: Customers whose first ever valid order for this brand fell in range
       - Returning Buyers: Customers with a valid order in range who also ordered before range
    ======================================================== */

    const newRegisteredCustomers = await prisma.user.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const currentPeriodCustomerIds = Array.from(
      new Set(validOrders.map((o) => o.userId).filter(Boolean))
    );

    let firstTimeBuyers = 0;
    let returningBuyers = 0;

    if (currentPeriodCustomerIds.length > 0) {
      // Find all prior valid orders for these customers for this brand prior to `start`
      const priorOrdersCount = await prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: currentPeriodCustomerIds },
          createdAt: { lt: start },
          items: {
            some: {
              productId: { in: productIds },
            },
          },
          status: {
            notIn: [
              "cancelled", "canceled", "refunded", "refund", "failed", "rejected",
            ],
          },
        },
        _count: { id: true },
      });

      const priorUserSet = new Set(priorOrdersCount.map((p) => p.userId));

      for (const customerId of currentPeriodCustomerIds) {
        if (priorUserSet.has(customerId)) {
          returningBuyers += 1;
        } else {
          firstTimeBuyers += 1;
        }
      }
    }

    const customerOverview = {
      totalActiveCustomers: currentPeriodCustomerIds.length,
      newRegistered: newRegisteredCustomers,
      firstTimeBuyers,
      returningBuyers,
    };

    /* ========================================================
       10. PRE-ORDER / WAITING LIST STATS
    ======================================================== */

    let waitingListStats = {
      totalRequests: 0,
      topProducts: [],
    };

    if (productIds.length > 0) {
      const waitingListEntries = await prisma.waitingList.findMany({
        where: {
          productId: { in: productIds },
          createdAt: { gte: start, lte: end },
        },
        include: {
          product: true,
          variant: true,
        },
        orderBy: { createdAt: "desc" },
      });

      waitingListStats.totalRequests = waitingListEntries.length;

      const wlMap = new Map();
      for (const entry of waitingListEntries) {
        const pId = entry.productId;
        const existing = wlMap.get(pId) || {
          id: pId,
          name: entry.product?.name || "Product",
          count: 0,
          image: entry.product?.images || "",
          price: getProductPrice(entry.product),
        };
        existing.count += 1;
        wlMap.set(pId, existing);
      }

      waitingListStats.topProducts = Array.from(wlMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    /* ========================================================
       11. PRODUCT PERFORMANCE & BEST SELLERS
    ======================================================== */

    const productPerformance = Array.from(productStats.values()).sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }
      return b.unitsSold - a.unitsSold;
    });

    const bestSellers = productPerformance
      .filter((product) => product.unitsSold > 0)
      .slice(0, 10);

    /* ========================================================
       12. DAILY TIME-SERIES ANALYTICS (WAT)
    ======================================================== */

    const dailyMap = new Map();

    // Fill daily buckets from `start` to `end` in WAT
    const currDate = new Date(start);
    while (currDate <= end) {
      const key = getWATDateString(currDate);
      dailyMap.set(key, {
        date: key,
        label: formatDayWAT(currDate),
        revenue: 0,
        orders: 0,
        unitsSold: 0,
        aov: 0,
      });
      currDate.setDate(currDate.getDate() + 1);
    }

    for (const order of validOrders) {
      const key = getWATDateString(order.createdAt);
      const day = dailyMap.get(key);
      if (day) {
        day.orders += 1;
      }
    }

    for (const item of validOrderItems) {
      const key = getWATDateString(item.orderCreatedAt);
      const day = dailyMap.get(key);
      if (day) {
        const quantity = money(item.quantity);
        const price = getItemPrice(item);
        day.unitsSold += quantity;
        day.revenue += price * quantity;
      }
    }

    // Compute daily AOV
    const dailyAnalytics = Array.from(dailyMap.values()).map((day) => ({
      ...day,
      aov: day.orders > 0 ? day.revenue / day.orders : 0,
    }));

    /* ========================================================
       13. CATEGORY PERFORMANCE
    ======================================================== */

    const categoryMap = new Map();

    for (const item of validOrderItems) {
      const category =
        item.product?.categoryRef?.name ||
        item.product?.category ||
        "Uncategorized";

      const quantity = money(item.quantity);
      const price = getItemPrice(item);

      const existing = categoryMap.get(category) || {
        name: category,
        unitsSold: 0,
        revenue: 0,
      };

      existing.unitsSold += quantity;
      existing.revenue += price * quantity;
      categoryMap.set(category, existing);
    }

    const topCategories = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    /* ========================================================
       14. ORDER STATUS BREAKDOWN
    ======================================================== */

    const statusMap = new Map();

    for (const order of brandOrders) {
      const status = String(order.status || "pending").toLowerCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }

    const orderStatuses = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
      })
    );

    /* ========================================================
       15. RECENT ORDERS
    ======================================================== */

    const recentOrders = brandOrders.slice(0, 10).map((order) => {
      let total = 0;
      let units = 0;

      for (const item of order.items) {
        const quantity = money(item.quantity);
        const price = getItemPrice(item);
        units += quantity;
        total += price * quantity;
      }

      return {
        id: order.id,
        status: order.status,
        total,
        units,
        customer: {
          id: order.user?.id || null,
          name: order.user?.name || "Customer",
          email: order.user?.email || "",
        },
        createdAt: order.createdAt,
      };
    });

    /* ========================================================
       16. RESPONSE (BACKWARDS COMPATIBLE + UPGRADED)
    ======================================================== */

    return NextResponse.json(
      {
        success: true,
        brand,
        range,
        period: { start, end },

        // Maintain compatibility for StatsBar & existing consumers
        overview: {
          revenue,
          orders: orderCount,
          unitsSold,
          averageOrderValue,
          customers: customerOverview.totalActiveCustomers,
          products: totalProducts,
          activeProducts,
          outOfStock,
          lowStock: lowStockProducts.length,
          inventoryValue,
          totalInventoryUnits,
          stockHealth,
          // StatsBar mappings
          totalRevenue: revenue,
          totalOrders: orderCount,
          totalProducts: totalProducts,
          totalCustomers: customerOverview.totalActiveCustomers,
          totalSubscribers: 0,
        },

        customers: customerOverview,

        waitingList: waitingListStats,

        analytics: {
          daily: dailyAnalytics,
          orderStatuses,
          bestSellers,
          topCategories,
        },

        inventory: {
          lowStock: lowStockProducts.map((product) => ({
            id: product.id,
            name: product.name,
            inventory: money(product.inventory),
            price: getProductPrice(product),
            image: product.images || "",
          })),
          outOfStock,
          outOfStockProducts: outOfStockProducts.map((product) => ({
            id: product.id,
            name: product.name,
            inventory: money(product.inventory),
            price: getProductPrice(product),
            image: product.images || "",
          })),
        },

        products: productPerformance,
        recentOrders,
        generatedAt: new Date(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("ADMIN ANALYTICS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load analytics.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
