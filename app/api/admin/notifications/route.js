import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    const notifications =
      await prisma.adminNotification.findMany({
        where: {
          recipientBrand: admin.brand,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        include: {
          request: true,
        },
      });

    const unreadCount =
      notifications.filter(
        (notification) => !notification.readAt
      ).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/notifications error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load notifications.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({
        success: true,
      });
    }

    const body = await request.json();
    const action = body?.action;

    if (action === "readAll") {
      await prisma.adminNotification.updateMany({
        where: {
          recipientBrand: admin.brand,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "read") {
      const id = body?.id;

      if (!id) {
        return NextResponse.json(
          {
            success: false,
            error: "Notification ID is required.",
          },
          { status: 400 }
        );
      }

      const notification =
        await prisma.adminNotification.findFirst({
          where: {
            id,
            recipientBrand: admin.brand,
          },
        });

      if (!notification) {
        return NextResponse.json(
          {
            success: false,
            error: "Notification not found.",
          },
          { status: 404 }
        );
      }

      const updated =
        await prisma.adminNotification.update({
          where: {
            id,
          },
          data: {
            readAt: new Date(),
          },
        });

      return NextResponse.json({
        success: true,
        notification: updated,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid notification action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "PUT /api/admin/notifications error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update notification.",
      },
      { status: 500 }
    );
  }
}