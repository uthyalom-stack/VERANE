import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    // Start of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Start of tomorrow
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of next month
    const startOfNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    // Start of previous month
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const [
      totalProducts,
      totalOrders,
      totalSubscribers,
      totalCustomers,

      totalRevenue,
      todayRevenue,
      monthRevenue,
      previousMonthRevenue,

      todayOrders,
      monthOrders,
      previousMonthOrders,

      recentOrders,
      lowStock,
      outOfStock,

      recentCustomers,
    ] = await Promise.all([
      // PRODUCTS
      prisma.product.count(),

      // ORDERS
      prisma.order.count(),

      // SUBSCRIBERS
      prisma.subscriber.count(),

      // CUSTOMERS
      prisma.user.count(),

      // ALL-TIME REVENUE
      prisma.order.aggregate({
        _sum: {
          total: true,
        },
      }),

      // TODAY'S REVENUE
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        _sum: {
          total: true,
        },
      }),

      // THIS MONTH'S REVENUE
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: {
          total: true,
        },
      }),

      // PREVIOUS MONTH'S REVENUE
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfPreviousMonth,
            lt: startOfMonth,
          },
        },
        _sum: {
          total: true,
        },
      }),

      // TODAY'S ORDERS
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
      }),

      // THIS MONTH'S ORDERS
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
      }),

      // PREVIOUS MONTH'S ORDERS
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfPreviousMonth,
            lt: startOfMonth,
          },
        },
      }),

      // RECENT ORDERS
      prisma.order.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      // LOW STOCK
      prisma.product.findMany({
        where: {
          inventory: {
            gt: 0,
            lte: 5,
          },
        },
        orderBy: {
          inventory: "asc",
        },
        take: 8,
      }),

      // OUT OF STOCK
      prisma.product.count({
        where: {
          inventory: {
            lte: 0,
          },
        },
      }),

      // RECENT CUSTOMERS
      prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);

    // Convert Prisma Decimal values into regular numbers
    const revenue = Number(totalRevenue._sum.total || 0);
    const todayRevenueAmount = Number(todayRevenue._sum.total || 0);
    const monthRevenueAmount = Number(monthRevenue._sum.total || 0);
    const previousMonthRevenueAmount = Number(
      previousMonthRevenue._sum.total || 0
    );

    // Average order value
    const averageOrderValue =
      totalOrders > 0 ? revenue / totalOrders : 0;

    // Month-over-month revenue percentage
    let revenueGrowth = 0;

    if (previousMonthRevenueAmount > 0) {
      revenueGrowth =
        ((monthRevenueAmount - previousMonthRevenueAmount) /
          previousMonthRevenueAmount) *
        100;
    }

    // Month-over-month order percentage
    let orderGrowth = 0;

    if (previousMonthOrders > 0) {
      orderGrowth =
        ((monthOrders - previousMonthOrders) /
          previousMonthOrders) *
        100;
    }

    return NextResponse.json({
      success: true,

      overview: {
        totalProducts,
        totalOrders,
        totalSubscribers,
        totalCustomers,

        totalRevenue: revenue,
        todayRevenue: todayRevenueAmount,
        monthRevenue: monthRevenueAmount,

        todayOrders,
        monthOrders,

        averageOrderValue,

        revenueGrowth: Number(revenueGrowth.toFixed(2)),
        orderGrowth: Number(orderGrowth.toFixed(2)),
      },

      inventory: {
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock,

        lowStock,
      },

      recentOrders,

      recentCustomers,

      meta: {
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD API ERROR:", error);

    return NextResponse.json(
      {
        success: false,

        overview: {
          totalProducts: 0,
          totalOrders: 0,
          totalSubscribers: 0,
          totalCustomers: 0,

          totalRevenue: 0,
          todayRevenue: 0,
          monthRevenue: 0,

          todayOrders: 0,
          monthOrders: 0,

          averageOrderValue: 0,

          revenueGrowth: 0,
          orderGrowth: 0,
        },

        inventory: {
          lowStockCount: 0,
          outOfStockCount: 0,
          lowStock: [],
        },

        recentOrders: [],
        recentCustomers: [],

        meta: {
          generatedAt: new Date().toISOString(),
        },
      },
      {
        status: 500,
      }
    );
  }
}