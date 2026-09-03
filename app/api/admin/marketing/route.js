import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_BRANDS = ["UTHY", "ALOMZIEE"];

function normalizeBrand(value) {
  if (!value) return "";
  const brand = String(value).trim().toUpperCase();
  if (brand === "UTHY" || brand === "UTHY_LUXURY") return "UTHY";
  if (brand === "ALOMZIEE" || brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE";
  return brand;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getAdminSession(request) {
  try {
    const res = await fetch(`${request.nextUrl.origin}/api/admin/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.authenticated && json?.admin) {
      return json.admin;
    }
  } catch (err) {
    console.error("Admin session error in /api/admin/marketing:", err);
  }
  return null;
}

function getDateRange(range, customStartDate, customEndDate) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (range === "custom" && customStartDate) {
    const s = new Date(customStartDate);
    if (!isNaN(s.getTime())) {
      s.setHours(0, 0, 0, 0);
      const e = customEndDate ? new Date(customEndDate) : new Date();
      if (!isNaN(e.getTime())) e.setHours(23, 59, 59, 999);
      else e.setTime(now.getTime());
      return { start: s, end: e };
    }
  }

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

export async function GET(request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const brand = normalizeBrand(admin.brand || admin.role);
    if (!VALID_BRANDS.includes(brand)) {
      return NextResponse.json({ success: false, error: "Marketing management is restricted to brand administrators." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const { start, end } = getDateRange(range, startDateParam, endDateParam);

    const campaigns = await prisma.campaign.findMany({
      where: { brand },
      include: {
        visits: {
          where: { createdAt: { gte: start, lte: end } },
        },
        orders: {
          where: { createdAt: { gte: start, lte: end } },
          include: {
            order: {
              include: { items: { include: { product: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedCampaigns = campaigns.map((c) => {
      const clicks = c.visits.length;
      const uniqueVisitors = new Set(c.visits.map((v) => v.visitorId)).size;
      const validOrders = c.orders.filter((o) => o.order && !["cancelled", "canceled", "refunded", "failed"].includes(o.order.status?.toLowerCase()));
      const orderCount = validOrders.length;

      let revenue = 0;
      let unitsSold = 0;

      for (const attr of validOrders) {
        if (!attr.order) continue;
        for (const item of attr.order.items) {
          if (normalizeBrand(item.product?.brand) === brand) {
            const qty = Number(item.quantity || 0);
            const prc = Number(item.price || item.product?.price || 0);
            unitsSold += qty;
            revenue += qty * prc;
          }
        }
      }

      const conversionRate = uniqueVisitors > 0 ? ((orderCount / uniqueVisitors) * 100).toFixed(1) : 0;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        platform: c.platform,
        source: c.source,
        medium: c.medium,
        destination: c.destination,
        active: c.active,
        createdAt: c.createdAt,
        clicks,
        uniqueVisitors,
        orders: orderCount,
        unitsSold,
        revenue,
        conversionRate,
      };
    });

    return NextResponse.json({
      success: true,
      brand,
      range,
      campaigns: formattedCampaigns,
    });
  } catch (error) {
    console.error("GET marketing API error:", error);
    return NextResponse.json({ success: false, error: "Failed to load marketing campaigns" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const brand = normalizeBrand(admin.brand || admin.role);
    if (!VALID_BRANDS.includes(brand)) {
      return NextResponse.json({ success: false, error: "Marketing management is restricted to brand administrators." }, { status: 403 });
    }

    const body = await request.json();
    const { name, platform, source, medium, destination } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Campaign name is required" }, { status: 400 });
    }

    const baseSlug = `${brand.toLowerCase()}-${slugify(platform || "campaign")}-${slugify(name)}`;
    let slug = baseSlug;
    let count = 1;

    while (await prisma.campaign.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count += 1;
    }

    const campaign = await prisma.campaign.create({
      data: {
        brand,
        name,
        slug,
        platform: platform || "Other",
        source: source || null,
        medium: medium || null,
        destination: destination || "/",
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("POST marketing API error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create campaign" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const brand = normalizeBrand(admin.brand || admin.role);
    if (!VALID_BRANDS.includes(brand)) {
      return NextResponse.json({ success: false, error: "Marketing management is restricted to brand administrators." }, { status: 403 });
    }

    const body = await request.json();
    const { id, active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 });
    }

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing || normalizeBrand(existing.brand) !== brand) {
      return NextResponse.json({ success: false, error: "Campaign not found or unauthorized" }, { status: 404 });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { active: Boolean(active) },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
    });
  } catch (error) {
    console.error("PUT marketing API error:", error);
    return NextResponse.json({ success: false, error: "Failed to update campaign status" }, { status: 500 });
  }
}
