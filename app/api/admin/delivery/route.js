import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

/*
|--------------------------------------------------------------------------
| SUPERADMIN Delivery Locations API
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. SUPERADMIN access required." },
        { status: 403 }
      );
    }

    const locations = await prisma.deliveryLocation.findMany({
      orderBy: [
        { country: "asc" },
        { state: "asc" },
        { city: "asc" },
      ],
    });

    return NextResponse.json({ success: true, locations });
  } catch (error) {
    console.error("GET /api/admin/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch delivery locations." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminSession();

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. SUPERADMIN access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const country = String(body.country || "Nigeria").trim();
    const state = String(body.state || "").trim();
    const city = String(body.city || "").trim();
    const zone = body.zone ? String(body.zone).trim() : null;
    const fee = Number(body.fee || 0);

    if (!country || !state || !city) {
      return NextResponse.json(
        { success: false, error: "Country, state, and city are required." },
        { status: 400 }
      );
    }

    const location = await prisma.deliveryLocation.create({
      data: {
        country,
        state,
        city,
        zone,
        fee: fee >= 0 ? fee : 0,
        enabled: body.enabled !== false,
      },
    });

    return NextResponse.json({ success: true, location }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create delivery location." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAdminSession();

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. SUPERADMIN access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Location ID is required." },
        { status: 400 }
      );
    }

    await prisma.deliveryLocation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete delivery location." },
      { status: 500 }
    );
  }
}
