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
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin does not manage store collections.",
        },
        { status: 403 }
      );
    }

    const collections = await prisma.collection.findMany({
      where: {
        brand: admin.brand,
      },
      include: {
        products: {
          where: {
            brand: admin.brand,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error(
      "GET /api/admin/collections error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch collections.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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
            "Super Admin does not create store collections.",
        },
        { status: 403 }
      );
    }

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

    const productIds = Array.isArray(body.products)
      ? body.products.filter(
          (id) =>
            typeof id === "string" &&
            id.trim()
        )
      : [];

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection name is required.",
        },
        { status: 400 }
      );
    }

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
        const createdCollection =
          await tx.collection.create({
            data: {
              brand: admin.brand,
              name,
              description: description || null,
              image: image || null,
              enabled,
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
              collectionId:
                createdCollection.id,
            },
          });
        }

        return tx.collection.findUnique({
          where: {
            id: createdCollection.id,
          },
          include: {
            products: true,
          },
        });
      }
    );

    return NextResponse.json(collection, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/collections error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to create collection.",
      },
      { status: 500 }
    );
  }
}