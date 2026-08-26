import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const ALLOWED_BRANDS = [
  "UTHY_LUXURY",
  "ALOMZIEE_FOOTIES",
];

function normalizeBrand(value) {
  return String(value || "").trim().toUpperCase();
}

function makeSectionKey(brand, title) {
  const cleanTitle = String(title || "section")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

  return `brand-${brand.toLowerCase()}-${cleanTitle}-${Date.now()}`;
}

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const brand = normalizeBrand(searchParams.get("brand"));

    if (!ALLOWED_BRANDS.includes(brand)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid brand.",
        },
        { status: 400 }
      );
    }

    const sections = await prisma.homepageSection.findMany({
      where: {
        key: {
          startsWith: `brand-${brand.toLowerCase()}-`,
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    const products = await prisma.product.findMany({
      where: {
        brand,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const parsedSections = sections.map((section) => {
      let productIds = [];

      try {
        const parsed = JSON.parse(section.products || "[]");

        if (Array.isArray(parsed)) {
          productIds = parsed;
        }
      } catch {
        productIds = [];
      }

      return {
        ...section,
        products: productIds,
      };
    });

    return NextResponse.json({
      success: true,
      brand,
      sections: parsedSections,
      products,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/brand-sections error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load brand sections.",
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

    const body = await request.json();

    const brand = normalizeBrand(body.brand);
    const title = String(body.title || "").trim();
    const description = String(
      body.description || ""
    ).trim();

    const image = String(body.image || "").trim();

    const enabled =
      body.enabled !== false;

    const productIds = Array.isArray(body.products)
      ? body.products
      : [];

    if (!ALLOWED_BRANDS.includes(brand)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid brand.",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "Section name is required.",
        },
        { status: 400 }
      );
    }

    const validProducts = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        brand,
      },
      select: {
        id: true,
      },
    });

    const validProductIds = validProducts.map(
      (product) => product.id
    );

    const existingCount =
      await prisma.homepageSection.count({
        where: {
          key: {
            startsWith: `brand-${brand.toLowerCase()}-`,
          },
        },
      });

    const section =
      await prisma.homepageSection.create({
        data: {
          key: makeSectionKey(
            brand,
            title
          ),
          type: "product-grid",
          enabled,
          sortOrder: existingCount,
          title,
          description,
          image,
          mobileImage: "",
          buttonText: "",
          buttonLink: "",
          secondaryButtonText: "",
          secondaryButtonLink: "",
          products:
            JSON.stringify(validProductIds),
        },
      });

    return NextResponse.json({
      success: true,
      section: {
        ...section,
        products: validProductIds,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/admin/brand-sections error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create section.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
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

    const body = await request.json();

    const brand = normalizeBrand(body.brand);

    if (!ALLOWED_BRANDS.includes(brand)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid brand.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.sections)) {
      return NextResponse.json(
        {
          success: false,
          error: "Sections must be an array.",
        },
        { status: 400 }
      );
    }

    const brandPrefix =
      `brand-${brand.toLowerCase()}-`;

    const existingSections =
      await prisma.homepageSection.findMany({
        where: {
          key: {
            startsWith: brandPrefix,
          },
        },
        select: {
          id: true,
        },
      });

    const existingIds = new Set(
      existingSections.map(
        (section) => section.id
      )
    );

    const incomingIds = new Set(
      body.sections
        .map((section) => section.id)
        .filter(Boolean)
    );

    const idsToDelete =
      existingSections
        .filter(
          (section) =>
            !incomingIds.has(section.id)
        )
        .map((section) => section.id);

    if (idsToDelete.length > 0) {
      await prisma.homepageSection.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    for (
      let index = 0;
      index < body.sections.length;
      index++
    ) {
      const section = body.sections[index];

      const title = String(
        section.title || ""
      ).trim();

      if (!title) {
        continue;
      }

      const productIds = Array.isArray(
        section.products
      )
        ? section.products
        : [];

      const validProducts =
        await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
            brand,
          },
          select: {
            id: true,
          },
        });

      const validProductIds =
        validProducts.map(
          (product) => product.id
        );

      const data = {
        title,
        description: String(
          section.description || ""
        ).trim(),
        image: String(
          section.image || ""
        ).trim(),
        enabled:
          section.enabled !== false,
        sortOrder: index,
        type: "product-grid",
        products:
          JSON.stringify(validProductIds),
      };

      if (
        section.id &&
        existingIds.has(section.id)
      ) {
        await prisma.homepageSection.update({
          where: {
            id: section.id,
          },
          data,
        });
      }
    }

    const savedSections =
      await prisma.homepageSection.findMany({
        where: {
          key: {
            startsWith: brandPrefix,
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      sections:
        savedSections.map((section) => ({
          ...section,
          products: (() => {
            try {
              const parsed = JSON.parse(
                section.products || "[]"
              );

              return Array.isArray(parsed)
                ? parsed
                : [];
            } catch {
              return [];
            }
          })(),
        })),
    });
  } catch (error) {
    console.error(
      "PUT /api/admin/brand-sections error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save brand sections.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
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

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Section ID is required.",
        },
        { status: 400 }
      );
    }

    await prisma.homepageSection.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/brand-sections error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete section.",
      },
      { status: 500 }
    );
  }
}