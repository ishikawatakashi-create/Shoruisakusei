/**
 * Patch Prisma client to fix #main-entry-point import map issue
 * with non-ASCII (Japanese) directory paths on Windows.
 * Node.js subpath imports (`#xxx`) fail when the package path contains non-ASCII chars.
 */
const fs = require("fs");
const path = require("path");

const defaultJsPath = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client",
  "default.js"
);

if (fs.existsSync(defaultJsPath)) {
  let content = fs.readFileSync(defaultJsPath, "utf-8");
  if (content.includes("#main-entry-point")) {
    content = content.replace(
      "require('#main-entry-point')",
      "require('./index.js')"
    );
    fs.writeFileSync(defaultJsPath, content, "utf-8");
    console.log("Patched .prisma/client/default.js (Japanese path workaround)");
  }
}
