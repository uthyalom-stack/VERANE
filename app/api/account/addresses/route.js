import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyCustomerSession, getCustomerCookieName } from "@/lib/auth/customer";

/**
 * Retrieves the authenticated customer from the session cookie.
 * @return {Object|null} The authenticated customer, or `null` when the session is invalid or has no user ID.
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCustomerCookieName())?.value;
  const user = verifyCustomerSession(token);
  if (!user || !user.id) {
    return null;
  }
  return user;
}

/**
 * Retrieve the authenticated user's saved addresses.
 * @returns {Promise<import("next/server").NextResponse>} A response containing the saved addresses, or an authentication or server error.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const addresses = await prisma.savedAddress.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error("GET /api/account/addresses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch saved addresses." },
      { status: 500 }
    );
  }
}

/**
 * Creates a saved address for the authenticated customer.
 * @param {Request} request - The request containing the address details.
 * @return {Promise<NextResponse>} A response containing the created address, or an error status.
 */
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const country = String(body.country || "Nigeria").trim();
    const state = String(body.state || "").trim();
    const city = String(body.city || "").trim();
    const streetAddress = String(body.streetAddress || "").trim();
    const isDefaultInput = Boolean(body.isDefault);

    if (!fullName || !phone || !state || !city || !streetAddress) {
      return NextResponse.json(
        { success: false, error: "All address fields (Name, Phone, State, City/LGA, Street) are required." },
        { status: 400 }
      );
    }

    // Check if customer already has any saved addresses
    const existingCount = await prisma.savedAddress.count({
      where: { userId: user.id },
    });

    // Automatically make this address default if it is the first saved address, or if explicitly requested
    const shouldBeDefault = existingCount === 0 || isDefaultInput;

    const newAddress = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.savedAddress.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }

      return tx.savedAddress.create({
        data: {
          userId: user.id,
          fullName,
          phone,
          country,
          state,
          city,
          streetAddress,
          isDefault: shouldBeDefault,
        },
      });
    });

    return NextResponse.json({ success: true, address: newAddress }, { status: 201 });
  } catch (error) {
    console.error("POST /api/account/addresses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create saved address." },
      { status: 500 }
    );
  }
}

/**
 * Updates an authenticated user's saved address or marks it as the default address.
 * @param {Request} request - The request containing the address ID and update data.
 * @return {Promise<Response>} A JSON response with the updated address or the operation result.
 */
export async function PUT(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = String(body.id || "").trim();
    const action = String(body.action || "update").trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Address ID is required." },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.savedAddress.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Saved address not found or access denied." },
        { status: 404 }
      );
    }

    if (action === "setDefault") {
      await prisma.$transaction([
        prisma.savedAddress.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        }),
        prisma.savedAddress.update({
          where: { id },
          data: { isDefault: true },
        }),
      ]);

      return NextResponse.json({ success: true, message: "Default address updated." });
    }

    const fullName = String(body.fullName || existing.fullName).trim();
    const phone = String(body.phone || existing.phone).trim();
    const country = String(body.country || existing.country).trim();
    const state = String(body.state || existing.state).trim();
    const city = String(body.city || existing.city).trim();
    const streetAddress = String(body.streetAddress || existing.streetAddress).trim();
    const isDefaultInput = body.isDefault !== undefined ? Boolean(body.isDefault) : existing.isDefault;

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (isDefaultInput && !existing.isDefault) {
        await tx.savedAddress.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }

      return tx.savedAddress.update({
        where: { id },
        data: {
          fullName,
          phone,
          country,
          state,
          city,
          streetAddress,
          isDefault: isDefaultInput,
        },
      });
    });

    return NextResponse.json({ success: true, address: updatedAddress });
  } catch (error) {
    console.error("PUT /api/account/addresses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update saved address." },
      { status: 500 }
    );
  }
}

/**
 * Deletes an authenticated user's saved address and promotes the newest remaining address when the deleted address was the default.
 * @return {Response} A JSON response indicating success or the relevant authentication, validation, not-found, or server error.
 */
export async function DELETE(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Address ID is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.savedAddress.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Address not found or access denied." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.savedAddress.delete({ where: { id } });

      // If deleted address was default, promote another address if available
      if (existing.isDefault) {
        const nextAddress = await tx.savedAddress.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (nextAddress) {
          await tx.savedAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Address deleted." });
  } catch (error) {
    console.error("DELETE /api/account/addresses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete saved address." },
      { status: 500 }
    );
  }
}
