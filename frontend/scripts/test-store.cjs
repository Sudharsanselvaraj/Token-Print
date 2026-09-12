const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const output = fs.mkdtempSync(path.join(os.tmpdir(), "token-print-store-"));
const tsc = require.resolve("typescript/bin/tsc");

try {
  execFileSync(process.execPath, [
    tsc,
    "--outDir", output,
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--target", "es2022",
    "--esModuleInterop",
    "--skipLibCheck",
    "--jsx", "preserve",
    "tests/store/slices.test.ts",
  ], { stdio: "inherit" });
  execFileSync(process.execPath, ["--test", path.join(output, "tests/store/slices.test.js")], {
    stdio: "inherit",
    env: { ...process.env, NODE_PATH: path.join(process.cwd(), "node_modules") },
  });
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
