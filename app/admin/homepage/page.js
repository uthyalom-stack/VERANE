import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85",
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
    image:
      "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1800&q=85",
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
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
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
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85",
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
      sections,
    });
  } catch (error) {
    console.error("GET homepage sections error:", error);

    return NextResponse.json(
      {
        error: "Failed to load homepage sections.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.sections)) {
      return NextResponse.json(
        {
          error: "Invalid sections data.",
        },
        {
          status: 400,
        }
      );
    }

    for (let index = 0; index < body.sections.length; index++) {
      const section = body.sections[index];

      if (!section.id) {
        continue;
      }

      await prisma.homepageSection.update({
        where: {
          id: section.id,
        },
        data: {
          enabled: Boolean(section.enabled),
          sortOrder: index,

          title: section.title || "",
          subtitle: section.subtitle || "",
          description: section.description || "",

          image: section.image || "",
          mobileImage: section.mobileImage || "",

          buttonText: section.buttonText || "",
          buttonLink: section.buttonLink || "",

          secondaryButtonText:
            section.secondaryButtonText || "",

          secondaryButtonLink:
            section.secondaryButtonLink || "",
        },
      });
    }

    const sections = await prisma.homepageSection.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json({
      sections,
    });
  } catch (error) {
    console.error("PUT homepage sections error:", error);

    return NextResponse.json(
      {
        error: "Failed to save homepage sections.",
      },
      {
        status: 500,
      }
    );
  }
}