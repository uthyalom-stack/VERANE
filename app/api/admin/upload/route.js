import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file selected" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads"
    );

    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}