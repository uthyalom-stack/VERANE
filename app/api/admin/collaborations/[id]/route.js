import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeAction(value) {
  if (!value) return null;

  const action = String(value).trim().toUpperCase();

  const actions = {
    ACCEPT: "ACCEPTED",
    ACCEPTED: "ACCEPTED",

    DECLINE: "DECLINED",
    DECLINED: "DECLINED",

    REJECT: "DECLINED",
    REJECTED: "DECLINED",

    CANCEL: "CANCELLED",
    CANCELLED: "CANCELLED",

    WITHDRAW: "CANCELLED",
    WITHDRAWN: "CANCELLED",
  };

  return actions[action] || null;
}

function brandName(brand) {
  if (brand === "UTHY" || brand === "UTHY_LUXURY") {
    return "UTHY LUXURY";
  }

  if (
    brand === "ALOMZIEE" ||
    brand === "ALOMZIEE_FOOTIES"
  ) {
    return "ALOMZIEE FOOTIES";
  }

  return brand;
}

/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
| Accept / decline / cancel collaboration request
|--------------------------------------------------------------------------
*/

export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const requestedAction =
      body?.action ??
      body?.status ??
      body?.decision;

    const normalizedStatus =
      normalizeAction(requestedAction);

    if (!normalizedStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid collaboration action.",
          received: requestedAction ?? null,
          allowedActions: [
            "ACCEPT",
            "ACCEPTED",
            "DECLINE",
            "DECLINED",
            "REJECT",
            "REJECTED",
            "CANCEL",
            "CANCELLED",
            "WITHDRAW",
            "WITHDRAWN",
          ],
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find the request
    |--------------------------------------------------------------------------
    */

    const collaborationRequest =
      await prisma.collaborationRequest.findUnique({
        where: {
          id,
        },
      });

    if (!collaborationRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration request not found.",
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | ACCEPT
    |--------------------------------------------------------------------------
    |
    | This is the important part.
    |
    | Accepting a request automatically creates the real
    | Collaboration record.
    |
    */

    if (normalizedStatus === "ACCEPTED") {
      /*
       * Prevent accepting an already accepted request again.
       */

      if (
        collaborationRequest.status === "ACCEPTED" &&
        collaborationRequest.collaborationId
      ) {
        const existing =
          await prisma.collaboration.findUnique({
            where: {
              id: collaborationRequest.collaborationId,
            },
            include: {
              requests: true,
              products: {
                include: {
                  productA: true,
                  productB: true,
                },
              },
            },
          });

        return NextResponse.json({
          success: true,
          status: "ACCEPTED",
          request: collaborationRequest,
          collaboration: existing,
          alreadyAccepted: true,
        });
      }

      /*
       * Check whether these brands already have
       * an active collaboration.
       */

      const existingCollaboration =
        await prisma.collaboration.findFirst({
          where: {
            status: "active",
            OR: [
              {
                brandA:
                  collaborationRequest.fromBrand,
                brandB:
                  collaborationRequest.toBrand,
              },
              {
                brandA:
                  collaborationRequest.toBrand,
                brandB:
                  collaborationRequest.fromBrand,
              },
            ],
          },
          include: {
            products: {
              include: {
                productA: true,
                productB: true,
              },
            },
          },
        });

      /*
       * Use a transaction so the request and collaboration
       * can never get out of sync.
       */

      const result =
        await prisma.$transaction(async (tx) => {
          let collaboration =
            existingCollaboration;

          /*
           * Create the actual collaboration if one
           * doesn't already exist.
           */

          if (!collaboration) {
            collaboration =
              await tx.collaboration.create({
                data: {
                  name:
                    collaborationRequest.title ||
                    `${brandName(
                      collaborationRequest.fromBrand
                    )} × ${brandName(
                      collaborationRequest.toBrand
                    )}`,

                  description:
                    collaborationRequest.message ||
                    null,

                  brandA:
                    collaborationRequest.fromBrand,

                  brandB:
                    collaborationRequest.toBrand,

                  status: "active",
                },

                include: {
                  products: {
                    include: {
                      productA: true,
                      productB: true,
                    },
                  },
                },
              });
          }

          /*
           * Mark request as accepted and connect it
           * to the collaboration.
           */

          const updatedRequest =
            await tx.collaborationRequest.update({
              where: {
                id,
              },

              data: {
                status: "ACCEPTED",
                collaborationId:
                  collaboration.id,
              },
            });

          /*
           * Notify the brand that originally sent
           * the request.
           */

          await tx.adminNotification.create({
            data: {
              recipientBrand:
                collaborationRequest.fromBrand,

              type: "COLLABORATION_ACCEPTED",

              title:
                `${brandName(
                  collaborationRequest.toBrand
                )} accepted your collaboration request`,

              message:
                `Your collaboration request "${collaborationRequest.title}" has been accepted.`,

              requestId: updatedRequest.id,
            },
          });

          return {
            collaboration,
            updatedRequest,
          };
        });

      /*
       * Return the actual collaboration so the UI
       * can immediately display it.
       */

      const fullCollaboration =
        await prisma.collaboration.findUnique({
          where: {
            id: result.collaboration.id,
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
        });

      return NextResponse.json({
        success: true,
        status: "ACCEPTED",
        request: result.updatedRequest,
        collaboration: fullCollaboration,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DECLINE
    |--------------------------------------------------------------------------
    */

    if (normalizedStatus === "DECLINED") {
      const updated =
        await prisma.collaborationRequest.update({
          where: {
            id,
          },

          data: {
            status: "DECLINED",
          },
        });

      await prisma.adminNotification.create({
        data: {
          recipientBrand:
            collaborationRequest.fromBrand,

          type: "COLLABORATION_DECLINED",

          title:
            `${brandName(
              collaborationRequest.toBrand
            )} declined your collaboration request`,

          message:
            `Your collaboration request "${collaborationRequest.title}" was declined.`,

          requestId: updated.id,
        },
      });

      return NextResponse.json({
        success: true,
        status: "DECLINED",
        request: updated,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CANCEL / WITHDRAW
    |--------------------------------------------------------------------------
    */

    if (normalizedStatus === "CANCELLED") {
      const updated =
        await prisma.collaborationRequest.update({
          where: {
            id,
          },

          data: {
            status: "CANCELLED",
          },
        });

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        request: updated,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported collaboration action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "COLLABORATION ACTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to update collaboration.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration ID is required.",
        },
        { status: 400 }
      );
    }

    const collaborationRequest =
      await prisma.collaborationRequest.findUnique({
        where: {
          id,
        },

        include: {
          collaboration: {
            include: {
              requests: true,

              products: {
                include: {
                  productA: true,
                  productB: true,
                },
              },
            },
          },

          notifications: true,
        },
      });

    if (!collaborationRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration request not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: collaborationRequest,
      collaboration:
        collaborationRequest.collaboration,
    });
  } catch (error) {
    console.error(
      "GET COLLABORATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to load collaboration.",
      },
      { status: 500 }
    );
  }
}