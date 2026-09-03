import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isValidDestination(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  const path = urlStr.trim();

  // Protect against open redirect attacks by ensuring path starts with / and not //
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  return true;
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const campaign = await prisma.campaign.findUnique({
      where: { slug: String(slug).toLowerCase() },
    });

    // If campaign is missing or inactive, safely redirect to homepage or brand storefront
    if (!campaign || !campaign.active) {
      const fallbackUrl = campaign?.brand === "ALOMZIEE" ? "/alomziee" : campaign?.brand === "UTHY" ? "/uthy" : "/";
      return NextResponse.redirect(new URL(fallbackUrl, request.url));
    }

    // Determine target destination
    const rawDest = campaign.destination || "/";
    const targetDest = isValidDestination(rawDest) ? rawDest : "/";

    // Anonymous visitor ID tracking via cookies
    const cookieStore = await cookies();
    let visitorId = cookieStore.get("verane_visitor_id")?.value;

    if (!visitorId) {
      visitorId = "v_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }

    // Record CampaignVisit asynchronously / safely
    try {
      await prisma.campaignVisit.create({
        data: {
          campaignId: campaign.id,
          brand: campaign.brand,
          visitorId,
          destination: targetDest,
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
          userAgent: request.headers.get("user-agent") || null,
        },
      });
    } catch (err) {
      console.error("Campaign visit recording error:", err);
    }

    // Prepare redirect response
    const redirectUrl = new URL(targetDest, request.url);
    const response = NextResponse.redirect(redirectUrl, 307);

    // Set 30-day visitor ID cookie
    response.cookies.set({
      name: "verane_visitor_id",
      value: visitorId,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });

    // Set 30-day Last-Touch Campaign Attribution cookie
    const attrPayload = JSON.stringify({
      campaignId: campaign.id,
      slug: campaign.slug,
      brand: campaign.brand,
      visitorId,
      timestamp: Date.now(),
    });

    response.cookies.set({
      name: "verane_campaign_attr",
      value: attrPayload,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Tracking redirect error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
