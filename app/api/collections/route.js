import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const collections =
      await prisma.collection.findMany({
        where: {
          enabled: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(collections);
  } catch (error) {
    console.error(
      "GET /api/collections error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load collections.",
      },
      {
        status: 500,
      }
    );
  }
}