import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getAdminSession } from "@/lib/admin-auth";

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

/**
 * Determines the allowed image MIME type for a file.
 * @param {File} file - The file whose MIME type or filename extension is checked.
 * @return {string} The recognized MIME type, or an empty string for unsupported files.
 */
function getFileType(file) {
  if (ALLOWED_TYPES.has(file.type)) return file.type;

  const extension = file.name?.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TYPES[extension] || "";
}

/**
 * Authenticates an admin and uploads a supported image to R2 storage.
 * @param {Request} request - The request containing the image in multipart form data.
 * @return {Promise<Response>} A response containing the uploaded image URL and key, or an error status.
 */
export async function POST(request) {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verify magic bytes signature
    function isValidImageSignature(buf, type) {
      if (!buf || buf.length < 4) return false;
      if (type === "image/jpeg") {
        return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      }
      if (type === "image/png") {
        return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      }
      if (type === "image/gif") {
        return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
      }
      if (type === "image/webp") {
        return (
          buf.length >= 12 &&
          buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
        );
      }
      if (type === "image/avif") {
        return (
          buf.length >= 12 &&
          buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
        );
      }
      return false;
    }

    if (!isValidImageSignature(buffer, contentType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file content: signature does not match declared image type.",
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
