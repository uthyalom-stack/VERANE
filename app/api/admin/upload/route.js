import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
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
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 10MB." },
        { status: 400 }
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension =
      extension === "jpeg" ? "jpg" : extension;

    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${safeExtension}`;

    const key = `uploads/${filename}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await s3.send(
      new PutObjectCommand({
        Bucket: "verane",
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicUrl =
      `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
    });
  } catch (error) {
    console.error("R2 UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload image.",
      },
      { status: 500 }
    );
  }
}