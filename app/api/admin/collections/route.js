import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        products: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(collections, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch collections:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch collections",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  try {
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
          (id) => typeof id === "string" && id.trim()
        )
      : [];

    if (!name) {
      return NextResponse.json(
        {
          error: "Collection name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const collection = await prisma.$transaction(async (tx) => {
      const createdCollection = await tx.collection.create({
        data: {
          name,
          description,
          image,
          enabled,
        },
      });

      if (productIds.length > 0) {
        await tx.product.updateMany({
          where: {
            id: {
              in: productIds,
            },
          },
          data: {
            collectionId: createdCollection.id,
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
    });

    return NextResponse.json(collection, {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create collection:", error);

    return NextResponse.json(
      {
        error: "Failed to create collection.",
      },
      {
        status: 500,
      }
    );
  }
}