import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_BRANDS = ["UTHY", "ALOMZIEE"];

/**
 * Normalizes supported brand names and aliases to their canonical values.
 * @param {*} value - The brand value to normalize.
 * @return {string} The canonical brand name, the trimmed uppercase value, or an empty string for missing input.
 */
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

/**
 * Gets database string variants for a normalized brand name.
 * @param {string} brand
 * @returns {string[]}
 */
function getBrandDbNames(brand) {
  if (brand === "UTHY") {
    return ["UTHY", "UTHY_LUXURY", "UTHY LUXURY"];
  }
  if (brand === "ALOMZIEE") {
    return ["ALOMZIEE", "ALOMZIEE_FOOTIES", "ALOMZIEE FOOTIES"];
  }
  return [brand];
}

/**
 * Converts a numeric, string, or decimal-like value to a finite number.
 * @param {*} value - The value to convert.
 * @return {number} The converted number, or `0` when the value is null, undefined, or not finite.
 */
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

/**
 * Converts a product's price to a finite numeric value.
 * @param {object} product - The product whose price should be converted.
 * @return {number} The converted product price.
 */
function getProductPrice(product) {
  return money(product?.price);
}

/**
 * Resolves an order item's price, falling back to its product price when needed.
 * @param {Object} item - The order item containing an optional price and product.
 * @return {number} The item's positive price or the associated product price.
 */
function getItemPrice(item) {
  const itemPrice = money(item?.price);

  if (itemPrice > 0) {
    return itemPrice;
  }

  return getProductPrice(item?.product);
}

/**
 * Calculates the start and end dates for a predefined or custom analytics period.
 * @param {string} range - The period identifier, such as `today`, `7d`, `30d`, `90d`, `1y`, or `custom`.
 * @param {string|Date} [customStartDate] - The beginning of a custom period.
 * @param {string|Date} [customEndDate] - The end of a custom period; defaults to the current date.
 * @return {{start: Date, end: Date}} The date range with the start set to the beginning of its day and the end set to the end of its day.
 */
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

/**
 * Formats a date as a short month and day using the Nigerian English locale.
 * @param {Date|string|number} date - The date to format.
 * @return {string} The localized month-and-day representation.
 */
function formatDay(date) {
  return new Date(date).toLocaleDateString(
    "en-NG",
    {
      month: "short",
      day: "numeric",
    }
  );
}

/**
 * Generates brand-scoped administrator analytics for a selected reporting period.
 * @param {Request} request - The request containing optional `brand`, `range`, `startDate`, and `endDate` query parameters.
 * @return {Promise<NextResponse>} A JSON response containing analytics data, or an authorization or server-error response.
 */
export async function GET(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
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

    const brandDbNames = getBrandDbNames(brand);

    const range = searchParams.get("range") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const { start, end } = getDateRange(range, startDateParam, endDateParam);

    const products = await prisma.product.findMany({
      where: {
        brand: { in: brandDbNames },
      },
      include: {
        categoryRef: true,
        collection: true,
        variants: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalProducts = products.length;

    const getPct = (p) => {
      const inv = money(p.inventory);
      const initInv = money(p.initialInventory) || inv;
      return initInv > 0 ? (inv / initInv) * 100 : (inv > 0 ? 100 : 0);
    };

    const outOfStockProducts = products.filter((p) => money(p.inventory) <= 0);
    const fewLeftProducts = products.filter((p) => {
      const inv = money(p.inventory);
      const pct = getPct(p);
      return inv > 0 && pct <= 25;
    });
    const almostSoldOutProducts = products.filter((p) => {
      const inv = money(p.inventory);
      const pct = getPct(p);
      return inv > 0 && pct > 25 && pct <= 50;
    });
    const availableProducts = products.filter((p) => {
      const inv = money(p.inventory);
      const pct = getPct(p);
      return inv > 0 && pct > 50;
    });

    const activeProducts = products.filter((p) => money(p.inventory) > 0).length;
    const outOfStock = outOfStockProducts.length;

    const lowStockProducts = products.filter((product) => {
      const inventory = money(product.inventory);
      return inventory > 0 && inventory <= 10;
    });

    const totalInventoryUnits =
      products.reduce(
        (total, product) =>
          total +
          money(product.inventory),
        0
      );

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

    const stockHealth =
      totalProducts > 0
        ? Math.round(
            (activeProducts /
              totalProducts) *
              100
          )
        : 0;

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

    const brandItemWhereClause = {
      OR: [
        { product: { brand: { in: brandDbNames } } },
        {
          collaborationProduct: {
            OR: [
              { productA: { brand: { in: brandDbNames } } },
              { productB: { brand: { in: brandDbNames } } },
            ],
          },
        },
      ],
    };

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        items: {
          some: brandItemWhereClause,
        },
      },
      include: {
        user: true,
        items: {
          where: brandItemWhereClause,
          include: {
            product: {
              include: {
                categoryRef: true,
                collection: true,
              },
            },
            collaborationProduct: {
              include: {
                productA: true,
                productB: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const brandOrders = orders;
    const brandOrderItems = [];

    for (const order of brandOrders) {
      for (const item of order.items) {
        brandOrderItems.push({
          ...item,
          orderStatus: order.status,
          orderCreatedAt: order.createdAt,
          customerId: order.userId,
        });
      }
    }

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

      if (item.productId) {
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
    }

    const orderCount =
      validOrders.length;

    const averageOrderValue =
      orderCount > 0
        ? revenue / orderCount
        : 0;

    const customerIds = new Set(
      validOrders
        .map((order) => order.userId)
        .filter(Boolean)
    );

    const customerCount = customerIds.size;

    let newCustomers = 0;
    let firstTimeBuyers = 0;
    let returningBuyers = 0;

    if (customerIds.size > 0) {
      newCustomers = await prisma.user.count({
        where: {
          id: { in: Array.from(customerIds) },
          createdAt: { gte: start, lte: end },
        },
      });

      const historicalOrders = await prisma.order.findMany({
        where: {
          userId: { in: Array.from(customerIds) },
          status: { notIn: ["cancelled", "canceled", "refunded", "refund", "failed", "rejected"] },
          items: {
            some: brandItemWhereClause,
          },
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

    // Isolate new users in range strictly to those associated with this brand via order activity
    const newUsersInRange = await prisma.user.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        orders: {
          some: {
            items: {
              some: brandItemWhereClause,
            },
          },
        },
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const userSignupDailyMap = new Map();
    for (const u of newUsersInRange) {
      const key = formatDate(u.createdAt);
      userSignupDailyMap.set(key, (userSignupDailyMap.get(key) || 0) + 1);
    }

    const customerPerformanceMap = new Map();

    for (const order of validOrders) {
      const uId = order.userId;
      if (!uId) continue;

      const existing = customerPerformanceMap.get(uId) || {
        id: uId,
        name: order.user?.name || order.firstName || "Customer",
        email: order.user?.email || order.email || "No email",
        orders: 0,
        units: 0,
        revenue: 0,
        firstOrderDate: order.createdAt,
        lastOrderDate: order.createdAt,
      };

      existing.orders += 1;

      if (new Date(order.createdAt) < new Date(existing.firstOrderDate)) {
        existing.firstOrderDate = order.createdAt;
      }
      if (new Date(order.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.createdAt;
      }

      for (const item of order.items) {
        const qty = money(item.quantity);
        const prc = getItemPrice(item);
        existing.units += qty;
        existing.revenue += qty * prc;
      }

      customerPerformanceMap.set(uId, existing);
    }

    const customerPerformanceList = Array.from(customerPerformanceMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );

    let singleOrderCustomers = 0;
    let repeatOrderCustomers = 0;

    for (const cp of customerPerformanceList) {
      if (cp.orders === 1) singleOrderCustomers += 1;
      else if (cp.orders > 1) repeatOrderCustomers += 1;
    }

    const productIds = products.map((p) => p.id);

    let waitingListEntries = [];
    if (productIds.length > 0) {
      waitingListEntries = await prisma.waitingList.findMany({
        where: {
          productId: { in: productIds },
        },
        include: {
          product: {
            include: { categoryRef: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    const waitingListCount = waitingListEntries.length;

    const waitingListByProductMap = new Map();
    const waitingListByCategoryMap = new Map();

    for (const entry of waitingListEntries) {
      const pId = entry.productId;
      const pName = entry.product?.name || "Product";
      const catName = entry.product?.categoryRef?.name || entry.product?.category || "Uncategorized";

      waitingListByProductMap.set(pId, {
        id: pId,
        name: pName,
        count: (waitingListByProductMap.get(pId)?.count || 0) + 1,
      });

      waitingListByCategoryMap.set(catName, {
        name: catName,
        count: (waitingListByCategoryMap.get(catName)?.count || 0) + 1,
      });
    }

    const demandByProduct = Array.from(waitingListByProductMap.values()).sort((a, b) => b.count - a.count);
    const demandByCategory = Array.from(waitingListByCategoryMap.values()).sort((a, b) => b.count - a.count);

    const restockPriorityList = products.map((prod) => {
      const pId = prod.id;
      const pName = prod.name;
      const inv = money(prod.inventory);
      const stats = productStats.get(pId) || { unitsSold: 0, revenue: 0 };
      const demand = waitingListByProductMap.get(pId)?.count || 0;

      const priorityScore = demand * 5 + stats.unitsSold * 2 - inv;

      return {
        id: pId,
        name: pName,
        category: prod.categoryRef?.name || prod.category || "Uncategorized",
        inventory: inv,
        price: getProductPrice(prod),
        unitsSold: stats.unitsSold,
        revenue: stats.revenue,
        waitingListDemand: demand,
        priorityScore,
        urgencyBadge: inv <= 0 && demand > 0 ? "Critical Restock" : inv <= 10 ? "Low Stock Risk" : "Normal",
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);

    const topInventoryHoldings = products
      .map((prod) => ({
        id: prod.id,
        name: prod.name,
        inventory: money(prod.inventory),
        valuation: money(prod.inventory) * getProductPrice(prod),
      }))
      .sort((a, b) => b.inventory - a.inventory)
      .slice(0, 10);

    const velocityComparison = products
      .map((prod) => {
        const stats = productStats.get(prod.id) || { unitsSold: 0 };
        return {
          id: prod.id,
          name: prod.name,
          unitsSold: stats.unitsSold,
          currentStock: money(prod.inventory),
        };
      })
      .filter((p) => p.unitsSold > 0 || p.currentStock > 0)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

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

    const bestSellers =
      productPerformance
        .filter(
          (product) =>
            product.unitsSold > 0
        )
        .slice(0, 10);

    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    let prevRevenue = 0;
    let prevOrderCount = 0;
    let prevUnitsSold = 0;

    const prevOrdersList = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: prevStart,
          lte: prevEnd,
        },
        items: {
          some: brandItemWhereClause,
        },
      },
      include: {
        items: {
          where: brandItemWhereClause,
          include: {
            product: true,
            collaborationProduct: {
              include: {
                productA: true,
                productB: true,
              },
            },
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
        const qty = money(pi.quantity);
        const prc = getItemPrice(pi);
        prevUnitsSold += qty;
        prevRevenue += qty * prc;
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

        newSignups: userSignupDailyMap.get(key) || 0,
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

    return NextResponse.json(
      {
        success: true,

        brand,

        range,

        period: {
          start,
          end,
        },

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

          fewLeft:
            fewLeftProducts.length,

          almostSoldOut:
            almostSoldOutProducts.length,

          available:
            availableProducts.length,

          lowStock:
            lowStockProducts.length,

          inventoryValue,

          totalInventoryUnits,

          stockHealth,

          comparisons,
        },

        inventoryData: {
          statusBreakdown: [
            { name: "Sold Out", value: outOfStock },
            { name: "Few Left (1–25%)", value: fewLeftProducts.length },
            { name: "Almost Sold Out (26–50%)", value: almostSoldOutProducts.length },
            { name: "Available (>50%)", value: availableProducts.length },
          ],
          topHoldings: topInventoryHoldings,
          velocityComparison,
          restockPriority: restockPriorityList,
          demandByProduct,
          demandByCategory,
        },

        analytics: {
          daily:
            dailyAnalytics,

          orderStatuses,

          bestSellers,

          topCategories,

          topCollections,
        },

        marketingSummary: await (async () => {
          const campaigns = await prisma.campaign.findMany({
            where: { brand },
            include: {
              visits: { where: { createdAt: { gte: start, lte: end } } },
              orders: {
                where: { createdAt: { gte: start, lte: end } },
                include: {
                  order: {
                    include: {
                      items: {
                        where: brandItemWhereClause,
                        include: { product: true },
                      },
                    },
                  },
                },
              },
            },
          });

          let totalVisits = 0;
          const visitorSet = new Set();
          let attributedOrdersCount = 0;
          let attributedRevenue = 0;

          for (const c of campaigns) {
            totalVisits += c.visits.length;
            for (const v of c.visits) visitorSet.add(v.visitorId);

            const validAttrs = c.orders.filter(
              (o) => o.order && !isCancelledStatus(o.order.status)
            );

            attributedOrdersCount += validAttrs.length;

            for (const attr of validAttrs) {
              for (const item of attr.order.items) {
                const qty = money(item.quantity);
                const prc = getItemPrice(item);
                attributedRevenue += qty * prc;
              }
            }
          }

          const uniqueVisitors = visitorSet.size;
          const conversionRate = uniqueVisitors > 0 ? ((attributedOrdersCount / uniqueVisitors) * 100).toFixed(1) : 0;

          return {
            visits: totalVisits,
            uniqueVisitors,
            orders: attributedOrdersCount,
            revenue: attributedRevenue,
            conversionRate,
          };
        })(),

        customersData: {
          list: customerPerformanceList,
          singleOrderCustomers,
          repeatOrderCustomers,
          avgOrdersPerCustomer: customerCount > 0 ? (orderCount / customerCount).toFixed(1) : 0,
          avgSpendPerCustomer: customerCount > 0 ? revenue / customerCount : 0,
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
