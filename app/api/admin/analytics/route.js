import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_BRANDS = ["UTHY", "ALOMZIEE"];

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

function getDateRange(range) {
  const now = new Date();

  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;

    case "7d":
      start.setDate(start.getDate() - 6);
      break;

    case "30d":
      start.setDate(start.getDate() - 29);
      break;

    case "90d":
      start.setDate(start.getDate() - 89);
      break;

    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      break;

    default:
      start.setDate(start.getDate() - 29);
      break;
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

function getItemPrice(item) {
  const orderItemPrice =
    Number(item?.price) || 0;

  const productPrice =
    Number(item?.product?.price) || 0;

  return orderItemPrice > 0
    ? orderItemPrice
    : productPrice;
}

export async function GET(request) {
  try {
    /*
     * ========================================================
     * 1. ADMIN SESSION
     * ========================================================
     */

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

    /*
     * ========================================================
     * 2. DETERMINE ADMIN BRAND
     * ========================================================
     */

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

    /*
     * ========================================================
     * 3. REQUESTED BRAND
     * ========================================================
     */

    const { searchParams } =
      new URL(request.url);

    const requestedBrand =
      searchParams.get("brand");

    const brand =
      normalizeBrand(requestedBrand) ||
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

    /*
     * ========================================================
     * 4. DATE RANGE
     * ========================================================
     */

    const range =
      searchParams.get("range") || "30d";

    const { start, end } =
      getDateRange(range);

    /*
     * ========================================================
     * 5. GET PRODUCTS DIRECTLY FROM DATABASE
     *
     * IMPORTANT:
     * NO Prisma brand filter here.
     *
     * We get everything and normalize in JS.
     * ========================================================
     */

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

    /*
     * ========================================================
     * 6. FILTER PRODUCTS
     * ========================================================
     */

    const products =
      allProducts.filter((product) => {
        return (
          normalizeBrand(product.brand) ===
          brand
        );
      });

    /*
     * ========================================================
     * 7. PRODUCT COUNTS
     * ========================================================
     */

    const totalProducts =
      products.length;

    const activeProducts =
      products.filter(
        (product) =>
          Number(product.inventory) > 0
      ).length;

    const outOfStockProducts =
      products.filter(
        (product) =>
          Number(product.inventory) <= 0
      );

    const outOfStock =
      outOfStockProducts.length;

    const lowStockProducts =
      products.filter((product) => {
        const inventory =
          Number(product.inventory) || 0;

        return (
          inventory > 0 &&
          inventory <= 5
        );
      });

    /*
     * ========================================================
     * 8. INVENTORY
     * ========================================================
     */

    const totalInventoryUnits =
      products.reduce(
        (total, product) =>
          total +
          (Number(product.inventory) || 0),
        0
      );

    const inventoryValue =
      products.reduce(
        (total, product) => {
          const inventory =
            Number(product.inventory) || 0;

          const price =
            Number(product.price) || 0;

          return (
            total +
            inventory * price
          );
        },
        0
      );

    /*
     * ========================================================
     * 9. STOCK HEALTH
     * ========================================================
     */

    const stockHealth =
      totalProducts > 0
        ? Math.round(
            (activeProducts /
              totalProducts) *
              100
          )
        : 0;

    /*
     * ========================================================
     * 10. PRODUCT PERFORMANCE
     * ========================================================
     */

    const productStats =
      new Map();

    for (const product of products) {
      productStats.set(product.id, {
        id: product.id,

        name:
          product.name || "Unnamed Product",

        brand:
          normalizeBrand(product.brand),

        databaseBrand:
          product.brand,

        price:
          Number(product.price) || 0,

        inventory:
          Number(product.inventory) || 0,

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
          Number(product.inventory) <= 0
            ? "out_of_stock"
            : Number(product.inventory) <= 5
              ? "low_stock"
              : "in_stock",

        image:
          product.images || "",
      });
    }

    /*
     * ========================================================
     * 11. ORDERS
     * ========================================================
     */

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

    /*
     * ========================================================
     * 12. BRAND ORDER ITEMS
     * ========================================================
     */

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

    /*
     * ========================================================
     * 13. VALID ORDERS
     * ========================================================
     */

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

    /*
     * ========================================================
     * 14. REVENUE
     * ========================================================
     */

    let revenue = 0;
    let unitsSold = 0;

    for (const item of validOrderItems) {
      const quantity =
        Number(item.quantity) || 0;

      const price =
        getItemPrice(item);

      unitsSold += quantity;

      revenue +=
        price * quantity;

      const existing =
        productStats.get(
          item.productId
        );

      if (existing) {
        existing.unitsSold +=
          quantity;

        existing.revenue +=
          price * quantity;

        existing.orders += 1;
      }
    }

    const orderCount =
      validOrders.length;

    const averageOrderValue =
      orderCount > 0
        ? revenue / orderCount
        : 0;

    /*
     * ========================================================
     * 15. CUSTOMERS
     * ========================================================
     */

    const customerIds =
      new Set(
        validOrders
          .map(
            (order) =>
              order.userId
          )
          .filter(Boolean)
      );

    const customerCount =
      customerIds.size;

    /*
     * ========================================================
     * 16. PRODUCT PERFORMANCE
     * ========================================================
     */

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

    /*
     * ========================================================
     * 17. BEST SELLERS
     * ========================================================
     */

    const bestSellers =
      productPerformance
        .filter(
          (product) =>
            product.unitsSold > 0
        )
        .slice(0, 10);

    /*
     * ========================================================
     * 18. DAILY ANALYTICS
     * ========================================================
     */

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
        Number(item.quantity) || 0;

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

    /*
     * ========================================================
     * 19. CATEGORIES
     * ========================================================
     */

    const categoryMap =
      new Map();

    for (const item of validOrderItems) {
      const category =
        item.product
          ?.categoryRef?.name ||
        item.product?.category ||
        "Uncategorized";

      const quantity =
        Number(item.quantity) || 0;

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

    /*
     * ========================================================
     * 20. COLLECTIONS
     * ========================================================
     */

    const collectionMap =
      new Map();

    for (const item of validOrderItems) {
      const collection =
        item.product
          ?.collection?.name ||
        "No Collection";

      const quantity =
        Number(item.quantity) || 0;

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

    /*
     * ========================================================
     * 21. ORDER STATUSES
     * ========================================================
     */

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

    /*
     * ========================================================
     * 22. RECENT ORDERS
     * ========================================================
     */

    const recentOrders =
      brandOrders
        .slice(0, 10)
        .map((order) => {
          let total = 0;
          let units = 0;

          for (const item of order.items) {
            const quantity =
              Number(item.quantity) || 0;

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

    /*
     * ========================================================
     * 23. FINAL RESPONSE
     * ========================================================
     */

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

          products:
            totalProducts,

          activeProducts,

          outOfStock,

          lowStock:
            lowStockProducts.length,

          inventoryValue,

          totalInventoryUnits,

          stockHealth,
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
                  Number(
                    product.inventory
                  ) || 0,

                price:
                  Number(
                    product.price
                  ) || 0,

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
                  Number(
                    product.inventory
                  ) || 0,

                price:
                  Number(
                    product.price
                  ) || 0,

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
         *
         * KEEP THIS FOR NOW.
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

                price:
                  Number(
                    product.price
                  ) || 0,

                inventory:
                  Number(
                    product.inventory
                  ) || 0,
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