import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(subscribers);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  const { email } = await request.json();
  try {
    const subscriber = await prisma.subscriber.create({
      data: { email },
    });
    return NextResponse.json(subscriber);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}