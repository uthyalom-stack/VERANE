import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-auth";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const DEFAULT_SECTIONS = [
  {
    key: "hero",
    sortOrder: 0,
    title: "TWO BRANDS. ONE EXPRESSION.",
    subtitle: "",
    description:
      "UTHY LUXURY and ALOMZIEE FOOTIES. Clothing, footwear and accessories made for people who refuse to look ordinary.",
    image: "",
    mobileImage: "",
    buttonText: "Explore Collection",
    buttonLink: "/catalog",
    secondaryButtonText: "Build Your Look",
    secondaryButtonLink: "/outfit-builder",
  },
  {
    key: "selected-pieces",
    sortOrder: 1,
    title: "Selected Pieces",
    subtitle: "Curated for you",
    description: "",
    image: "",
    mobileImage: "",
    buttonText: "View Collection",
    buttonLink: "/catalog",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
  {
    key: "uthy",
    sortOrder: 2,
    title: "CLOTHED DIFFERENTLY.",
    subtitle: "UTHY LUXURY",
    description:
      "Custom shirts, tailored trousers, hoodies and traditional pieces crafted to give your wardrobe its own identity.",
    image: "",
    mobileImage: "",
    buttonText: "Explore UTHY",
    buttonLink: "/catalog?brand=UTHY_LUXURY",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
  {
    key: "alomziee",
    sortOrder: 3,
    title: "FROM THE GROUND UP.",
    subtitle: "ALOMZIEE FOOTIES",
    description:
      "Handmade footwear and accessories built with character — shoes, sandals, slides, boots, belts and bags.",
    image: "",
    mobileImage: "",
    buttonText: "Explore Alomziee",
    buttonLink: "/catalog?brand=ALOMZIEE_FOOTIES",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
  {
    key: "outfit-builder",
    sortOrder: 4,
    title: "BUILD YOUR LOOK.",
    subtitle: "Your wardrobe. Your rules.",
    description:
      "Mix UTHY clothing with ALOMZIEE footwear and accessories. Build the outfit in real time and see the complete look before you buy.",
    image: "",
    mobileImage: "",
    buttonText: "Enter Outfit Builder",
    buttonLink: "/outfit-builder",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
  {
    key: "new-arrivals",
    sortOrder: 5,
    title: "New Arrivals",
    subtitle: "Just dropped",
    description: "",
    image: "",
    mobileImage: "",
    buttonText: "View Everything",
    buttonLink: "/catalog",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
  {
    key: "story",
    sortOrder: 6,
    title: "CRAFTED WITH INTENTION.",
    subtitle: "The philosophy",
    description:
      "Two expressions. One philosophy. Pieces created with intention for people who don't want to look like everybody else.",
    image: "",
    mobileImage: "",
    buttonText: "Discover the Story",
    buttonLink: "/about",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
  {
    key: "newsletter",
    sortOrder: 7,
    title: "JOIN THE LIST.",
    subtitle: "Stay close",
    description:
      "New drops, exclusive pieces and early access.",
    image: "",
    mobileImage: "",
    buttonText: "Subscribe",
    buttonLink: "",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },
];

export async function GET() {
  try {
    let sections = await prisma.homepageSection.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    if (sections.length === 0) {
      await prisma.homepageSection.createMany({
        data: DEFAULT_SECTIONS,
      });

      sections = await prisma.homepageSection.findMany({
        orderBy: {
          sortOrder: "asc",
        },
      });
    }

    return NextResponse.json({
      success: true,
      sections,
    });
  } catch (error) {
    console.error("GET HOMEPAGE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load homepage sections",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (!admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Site-level homepage sections are managed by Super Admin only.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!Array.isArray(body.sections)) {
      return NextResponse.json(
        {
          error: "sections must be an array",
        },
        {
          status: 400,
        }
      );
    }

    const updatedSections = [];

    for (let index = 0; index < body.sections.length; index++) {
      const section = body.sections[index];

      if (!section.key) {
        continue;
      }

      const updated = await prisma.homepageSection.upsert({
        where: {
          key: section.key,
        },

        update: {
          enabled:
            section.enabled !== undefined
              ? Boolean(section.enabled)
              : true,

          sortOrder: index,

          title: section.title ?? "",
          subtitle: section.subtitle ?? "",
          description: section.description ?? "",

          image: section.image ?? "",
          mobileImage: section.mobileImage ?? "",

          buttonText: section.buttonText ?? "",
          buttonLink: section.buttonLink ?? "",

          secondaryButtonText:
            section.secondaryButtonText ?? "",

          secondaryButtonLink:
            section.secondaryButtonLink ?? "",
        },

        create: {
          key: section.key,

          enabled:
            section.enabled !== undefined
              ? Boolean(section.enabled)
              : true,

          sortOrder: index,

          title: section.title ?? "",
          subtitle: section.subtitle ?? "",
          description: section.description ?? "",

          image: section.image ?? "",
          mobileImage: section.mobileImage ?? "",

          buttonText: section.buttonText ?? "",
          buttonLink: section.buttonLink ?? "",

          secondaryButtonText:
            section.secondaryButtonText ?? "",

          secondaryButtonLink:
            section.secondaryButtonLink ?? "",
        },
      });

      updatedSections.push(updated);
    }

    return NextResponse.json({
      success: true,
      sections: updatedSections,
    });
  } catch (error) {
    console.error("SAVE HOMEPAGE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to save homepage sections",
      },
      {
        status: 500,
      }
    );
  }
}