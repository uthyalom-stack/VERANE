import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXTENSION_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function getFileType(file) {
  if (ALLOWED_TYPES.has(file.type)) return file.type;

  const extension = file.name?.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TYPES[extension] || "";
}

export async function POST(request) {
  try {
    if (
      !process.env.R2_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_PUBLIC_URL
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Image storage is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "No file selected." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Image must be smaller than 10MB." },
        { status: 400 }
      );
    }

    const contentType = getFileType(file);

    if (!contentType) {
      return NextResponse.json(
        {
          success: false,
          error: "Only JPG, PNG, WEBP, GIF and AVIF images are supported.",
        },
        { status: 400 }
      );
    }

    const extension = contentType === "image/jpeg"
      ? "jpg"
      : contentType.split("/")[1];

    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

    const key = `uploads/${filename}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const bucketName = process.env.R2_BUCKET_NAME || "verane";

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;

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
        error: "Failed to upload image to storage.",
      },
      { status: 500 }
    );
  }
}
