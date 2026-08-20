import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function DELETE(request, { params }) {
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

    const { id } = await params;

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id,
        ...(admin.isSuperAdmin
          ? {}
          : { brand: admin.brand }),
      },
    });

    if (!subscriber) {
      return NextResponse.json(
        {
          success: false,
          error: "Subscriber not found.",
        },
        { status: 404 }
      );
    }

    await prisma.subscriber.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/subscribers/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to delete subscriber.",
      },
      { status: 500 }
    );
  }
}