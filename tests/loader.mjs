import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();
const mockHeadersPath = path.join(repoRoot, "tests/mock_next_headers.js");
const mockPrismaPath = path.join(repoRoot, "tests/mock_prisma.js");
const mockJsPDFPath = path.join(repoRoot, "tests/mock_jspdf.js");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "jspdf") {
    return nextResolve(pathToFileURL(mockJsPDFPath).href, context);
  }
  if (specifier === "next/headers") {
    return nextResolve(pathToFileURL(mockHeadersPath).href, context);
  }
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier === "@/lib/prisma" || specifier === "@/lib/prisma.js" || specifier === "./lib/prisma" || specifier === "./lib/prisma.js") {
    return nextResolve(pathToFileURL(mockPrismaPath).href, context);
  }
  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2);
    let absolutePath = path.join(repoRoot, relativePath);

    if (!fs.existsSync(absolutePath)) {
      if (fs.existsSync(absolutePath + ".js")) {
        absolutePath = absolutePath + ".js";
      } else if (fs.existsSync(absolutePath + ".jsx")) {
        absolutePath = absolutePath + ".jsx";
      } else if (fs.existsSync(path.join(absolutePath, "index.js"))) {
        absolutePath = path.join(absolutePath, "index.js");
      }
    }

    return nextResolve(pathToFileURL(absolutePath).href, context);
  }
  return nextResolve(specifier, context);
}
