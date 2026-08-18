import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_PAGES = [
  {
    key: "about",
    name: "About Page",
    content: "",
  },
  {
    key: "contact",
    name: "Contact Page",
    content: "",
  },
  {
    key: "faq",
    name: "FAQ Page",
    content: "",
  },
];

export async function GET() {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: "pageContent" },
    });

    if (row?.value) {
      try {
        const savedPages = JSON.parse(row.value);

        if (Array.isArray(savedPages)) {
          const mergedPages = DEFAULT_PAGES.map((defaultPage) => {
            const savedPage = savedPages.find(
              (page) => page.key === defaultPage.key
            );

            return {
              ...defaultPage,
              ...(savedPage || {}),
              key: defaultPage.key,
              name: savedPage?.name || defaultPage.name,
              content: savedPage?.content || "",
            };
          });

          return NextResponse.json(mergedPages);
        }
      } catch {
        // Fall back to default pages if saved content is invalid JSON.
      }
    }

    return NextResponse.json(DEFAULT_PAGES);
  } catch (error) {
    console.error("Pages API GET error:", error);

    return NextResponse.json(DEFAULT_PAGES);
  }
}