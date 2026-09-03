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
  const startTime = Date.now();

  const configStatus = {
    R2_ACCOUNT_ID: Boolean(process.env.R2_ACCOUNT_ID?.trim()),
    R2_ACCESS_KEY_ID: Boolean(process.env.R2_ACCESS_KEY_ID?.trim()),
    R2_SECRET_ACCESS_KEY: Boolean(process.env.R2_SECRET_ACCESS_KEY?.trim()),
    R2_PUBLIC_URL: Boolean(process.env.R2_PUBLIC_URL?.trim()),
    R2_BUCKET_NAME: Boolean(process.env.R2_BUCKET_NAME?.trim()),
  };

  console.log(`[R2 UPLOAD] Config check at ${new Date(startTime).toISOString()}:`, JSON.stringify(configStatus));

  if (
    !process.env.R2_ACCOUNT_ID?.trim() ||
    !process.env.R2_ACCESS_KEY_ID?.trim() ||
    !process.env.R2_SECRET_ACCESS_KEY?.trim() ||
    !process.env.R2_PUBLIC_URL?.trim()
  ) {
    console.error(`[R2 UPLOAD] Missing required environment variables at ${Date.now() - startTime}ms`);
    return NextResponse.json(
      {
        success: false,
        error: "Image storage is not configured on the server.",
      },
      { status: 500 }
    );
  }

  try {
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

    console.log(`[R2 UPLOAD] Prepared buffer (${buffer.length} bytes) in ${Date.now() - startTime}ms. Initializing S3Client...`);

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
      },
      maxAttempts: 2,
    });

    const bucketName = process.env.R2_BUCKET_NAME?.trim() || "verane";

    console.log(`[R2 UPLOAD] Sending PutObjectCommand to bucket '${bucketName}' at ${Date.now() - startTime}ms...`);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL.trim().replace(/\/$/, "")}/${key}`;

    console.log(`[R2 UPLOAD] Upload completed successfully in ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
    });
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    console.error(`[R2 UPLOAD ERROR] Failed after ${errorDuration}ms:`, {
      name: error?.name,
      message: error?.message,
      code: error?.code,
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to upload image to storage.",
      },
      { status: 500 }
    );
  }
}
