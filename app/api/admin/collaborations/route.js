import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeBrand(value) {
  if (!value) return null;

  const brand = String(value).trim().toUpperCase();

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

  if (brand === "SUPERADMIN") {
    return "SUPERADMIN";
  }

  return brand;
}

function brandName(brand) {
  if (brand === "UTHY") {
    return "UTHY LUXURY";
  }

  if (brand === "ALOMZIEE") {
    return "ALOMZIEE FOOTIES";
  }

  return brand;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Returns:
| - incoming requests
| - sent requests
| - active collaborations
|
| The brand is read from ?brand=
|
*/

import { getAdminSession } from "@/lib/admin-auth";

/**
 * Retrieves collaboration requests and active collaborations scoped to the authenticated administrator's brand.
 *
 * @param {Request} request - The request containing an optional brand filter for superadmins.
 * @returns {Response} A JSON response containing collaboration requests and collaborations, or an error response.
 */
export async function GET(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    let brand = null;
    if (session.role === "UTHY") {
      brand = "UTHY";
    } else if (session.role === "ALOMZIEE") {
      brand = "ALOMZIEE";
    } else if (session.role === "SUPERADMIN") {
      const requestedBrand = searchParams.get("brand");
      brand = normalizeBrand(requestedBrand);
    }

    if (!brand || brand === "SUPERADMIN") {
      const [requests, collaborations] = await Promise.all([
        prisma.collaborationRequest.findMany({
          include: {
            collaboration: true,
            notifications: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),

        prisma.collaboration.findMany({
          include: {
            requests: true,
            products: {
              include: {
                productA: true,
                productB: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        incoming: requests,
        sent: requests,
        requests,
        active: collaborations,
        collaborations,
      });
    }

    const incoming = await prisma.collaborationRequest.findMany({
      where: {
        toBrand: brand,
      },
      include: {
        collaboration: true,
        notifications: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const sent = await prisma.collaborationRequest.findMany({
      where: {
        fromBrand: brand,
      },
      include: {
        collaboration: true,
        notifications: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const active = await prisma.collaboration.findMany({
      where: {
        status: "active",
        OR: [
          { brandA: brand },
          { brandB: brand },
        ],
      },
      include: {
        requests: {
          orderBy: {
            createdAt: "desc",
          },
        },
        products: {
          include: {
            productA: true,
            productB: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      brand,
      incoming,
      sent,
      requests: [
        ...incoming,
        ...sent.filter(
          (sentRequest) =>
            !incoming.some(
              (incomingRequest) => incomingRequest.id === sentRequest.id
            )
        ),
      ],
      active,
      collaborations: active,
    });
  } catch (error) {
    console.error("GET COLLABORATIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load collaborations.",
      },
      { status: 500 }
    );
  }
}

/**
 * Creates a pending collaboration request between the authenticated brand and the opposing brand.
 * @returns {Promise<NextResponse>} A response containing the created request and notification, or an error status.
 */
export async function POST(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (session.role !== "UTHY" && session.role !== "ALOMZIEE") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Brand admin session required to request collaboration." },
        { status: 403 }
      );
    }

    const fromBrand = session.role;
    const toBrand = fromBrand === "UTHY" ? "ALOMZIEE" : "UTHY";

    const body = await request.json();

    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration title is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Check for an existing duplicate pending request for the same intended collaboration title
     */
    const existingPending = await prisma.collaborationRequest.findFirst({
      where: {
        fromBrand,
        toBrand,
        title: {
          equals: title,
          mode: "insensitive",
        },
        status: "pending",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have a pending collaboration request with this title.",
          request: existingPending,
        },
        { status: 409 }
      );
    }

    /*
     * Create the request.
     */
    const collaborationRequest = await prisma.collaborationRequest.create({
      data: {
        fromBrand,
        toBrand,
        title,
        message: message || null,
        status: "pending",
      },
    });

    /*
     * Create notification for receiving brand.
     */
    const notification = await prisma.adminNotification.create({
      data: {
        recipientBrand: toBrand,
        type: "COLLABORATION_REQUEST",
        title: `New collaboration request from ${brandName(fromBrand)}`,
        message:
          message ||
          `${brandName(fromBrand)} wants to collaborate with ${brandName(toBrand)}.`,
        requestId: collaborationRequest.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        request: collaborationRequest,
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE COLLABORATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create collaboration request.",
      },
      { status: 500 }
    );
  }
}