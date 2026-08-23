import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        outfitCompatible: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const items = {
      top: [],
      bottom: [],
      feet: [],
      waist: [],
      hand: [],
    };

    for (const product of products) {
      const layer = String(product.outfitLayer || "").toLowerCase();

      const images = (() => {
        try {
          if (Array.isArray(product.images)) {
            return product.images;
          }

          if (typeof product.images === "string") {
            const parsed = JSON.parse(product.images);
            return Array.isArray(parsed) ? parsed : [];
          }

          return [];
        } catch {
          return [];
        }
      })();

      const item = {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.price,
        images,
        assetUrl: product.builderAssetUrl || product.mannequinAsset || null,
        positionX: product.builderPositionX || 0,
        positionY: product.builderPositionY || 0,
        scale: product.builderScale || 1,
      };

      if (items[layer]) {
        items[layer].push(item);
      }
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Outfit Builder API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load Outfit Builder products.",
      },
      {
        status: 500,
      }
    );
  }
}