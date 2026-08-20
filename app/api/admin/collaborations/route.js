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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedBrand =
      searchParams.get("brand");

    const brand =
      normalizeBrand(requestedBrand);

    /*
     * No brand supplied:
     * return everything.
     *
     * Useful for Super Admin.
     */

    if (!brand || brand === "SUPERADMIN") {
      const [
        requests,
        collaborations,
      ] = await Promise.all([
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

    /*
     * Incoming:
     * other brand -> this brand
     */

    const incoming =
      await prisma.collaborationRequest.findMany({
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

    /*
     * Sent:
     * this brand -> other brand
     */

    const sent =
      await prisma.collaborationRequest.findMany({
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

    /*
     * Active collaborations where this brand
     * is either brandA or brandB.
     */

    const active =
      await prisma.collaboration.findMany({
        where: {
          status: "active",
          OR: [
            {
              brandA: brand,
            },
            {
              brandB: brand,
            },
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
              (incomingRequest) =>
                incomingRequest.id ===
                sentRequest.id
            )
        ),
      ],

      active,
      collaborations: active,
    });
  } catch (error) {
    console.error(
      "GET COLLABORATIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to load collaborations.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Creates a collaboration request.
|
| Example:
|
| {
|   fromBrand: "UTHY",
|   toBrand: "ALOMZIEE",
|   title: "Summer Collaboration",
|   message: "..."
| }
|
*/

export async function POST(request) {
  try {
    const body = await request.json();

    const fromBrand =
      normalizeBrand(body?.fromBrand);

    const toBrand =
      normalizeBrand(body?.toBrand);

    const title =
      String(body?.title || "").trim();

    const message =
      String(body?.message || "").trim();

    if (!fromBrand) {
      return NextResponse.json(
        {
          success: false,
          error: "Sending brand is required.",
        },
        { status: 400 }
      );
    }

    if (!toBrand) {
      return NextResponse.json(
        {
          success: false,
          error: "Receiving brand is required.",
        },
        { status: 400 }
      );
    }

    if (fromBrand === toBrand) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A brand cannot collaborate with itself.",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Collaboration title is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Prevent multiple pending requests
     * between the same brands.
     */

    const existing =
      await prisma.collaborationRequest.findFirst({
        where: {
          fromBrand,
          toBrand,
          status: "pending",
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You already have a pending collaboration request with this brand.",
          request: existing,
        },
        { status: 409 }
      );
    }

    /*
     * Check whether the brands already have
     * an active collaboration.
     */

    const existingCollaboration =
      await prisma.collaboration.findFirst({
        where: {
          status: "active",
          OR: [
            {
              brandA: fromBrand,
              brandB: toBrand,
            },
            {
              brandA: toBrand,
              brandB: fromBrand,
            },
          ],
        },
      });

    if (existingCollaboration) {
      return NextResponse.json(
        {
          success: false,
          error:
            "These brands already have an active collaboration.",
          collaboration:
            existingCollaboration,
        },
        { status: 409 }
      );
    }

    /*
     * Create the request.
     */

    const collaborationRequest =
      await prisma.collaborationRequest.create({
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

    const notification =
      await prisma.adminNotification.create({
        data: {
          recipientBrand: toBrand,
          type: "COLLABORATION_REQUEST",
          title:
            `New collaboration request from ${brandName(
              fromBrand
            )}`,
          message:
            message ||
            `${brandName(
              fromBrand
            )} wants to collaborate with ${brandName(
              toBrand
            )}.`,
          requestId:
            collaborationRequest.id,
        },
      });

    return NextResponse.json(
      {
        success: true,
        request: collaborationRequest,
        notification,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE COLLABORATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to create collaboration request.",
      },
      {
        status: 500,
      }
    );
  }
}