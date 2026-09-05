import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();
const mockHeadersPath = path.join(repoRoot, "tests/mock_next_headers.js");
const mockPrismaPath = path.join(repoRoot, "tests/mock_prisma.js");
const mockJsPDFPath = path.join(repoRoot, "tests/mock_jspdf.js");

/**
 * Resolves test imports to mock modules and repository-root path aliases.
 * @param {string} specifier - The module specifier to resolve.
 * @param {object} context - The module resolution context.
 * @param {Function} nextResolve - The resolver used for final module resolution.
 * @return {Promise<object>} The resolved module information.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "jspdf") {
    return nextResolve(pathToFileURL(mockJsPDFPath).href, context);
  }
  if (specifier === "next/headers") {
    return nextResolve(pathToFileURL(mockHeadersPath).href, context);
  }
  if (specifier === "next/server" || specifier.startsWith("next/server")) {
    return nextResolve(pathToFileURL(path.join(repoRoot, "node_modules/next/server.js")).href, context);
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
