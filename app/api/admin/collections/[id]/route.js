import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function PUT(request, { params }) {
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
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin does not manage store collections.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const image =
      typeof body.image === "string"
        ? body.image.trim()
        : "";

    const enabled = body.enabled !== false;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection name is required.",
        },
        { status: 400 }
      );
    }

    const existingCollection =
      await prisma.collection.findFirst({
        where: {
          id,
          brand: admin.brand,
        },
      });

    if (!existingCollection) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection not found.",
        },
        { status: 404 }
      );
    }

    const productIds = Array.isArray(body.products)
      ? body.products.filter(
          (productId) =>
            typeof productId === "string" &&
            productId.trim()
        )
      : [];

    const validProducts =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: {
              id: {
                in: productIds,
              },
              brand: admin.brand,
            },
            select: {
              id: true,
            },
          })
        : [];

    const validProductIds = validProducts.map(
      (product) => product.id
    );

    const collection = await prisma.$transaction(
      async (tx) => {
        await tx.product.updateMany({
          where: {
            collectionId: id,
            brand: admin.brand,
          },
          data: {
            collectionId: null,
          },
        });

        if (validProductIds.length > 0) {
          await tx.product.updateMany({
            where: {
              id: {
                in: validProductIds,
              },
              brand: admin.brand,
            },
            data: {
              collectionId: id,
            },
          });
        }

        return tx.collection.update({
          where: {
            id,
          },
          data: {
            name,
            description: description || null,
            image: image || null,
            enabled,
          },
          include: {
            products: true,
          },
        });
      }
    );

    return NextResponse.json(collection);
  } catch (error) {
    console.error(
      "PUT /api/admin/collections/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to update collection.",
      },
      { status: 500 }
    );
  }
}

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

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin does not manage store collections.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingCollection =
      await prisma.collection.findFirst({
        where: {
          id,
          brand: admin.brand,
        },
      });

    if (!existingCollection) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection not found.",
        },
        { status: 404 }
      );
    }

    await prisma.collection.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/collections/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to delete collection.",
      },
      { status: 500 }
    );
  }
}