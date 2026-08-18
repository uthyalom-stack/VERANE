import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const rawEmail = formData.get("email");

    const email =
      typeof rawEmail === "string"
        ? rawEmail.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.redirect(
        new URL("/?subscribed=error", request.url)
      );
    }

    await prisma.subscriber.create({
      data: {
        email,
      },
    });

    return NextResponse.redirect(
      new URL("/?subscribed=success", request.url)
    );
  } catch (error) {
    console.error(
      "Newsletter subscription failed:",
      error
    );

    return NextResponse.redirect(
      new URL("/?subscribed=error", request.url)
    );
  }
}