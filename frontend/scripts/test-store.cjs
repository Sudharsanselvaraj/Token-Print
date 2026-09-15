const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const output = fs.mkdtempSync(path.join(os.tmpdir(), "token-print-store-"));
const tsc = require.resolve("typescript/bin/tsc");

// The store slices use the "@/*" path alias (e.g. arch3dSlice value-imports
// `@/components/scenes/TransformerOperationGraph`), so a bare-tsc invocation
// cannot type-check them. Compile through a temporary tsconfig that extends
// the project config (honoring `paths`) while emitting CommonJS for node:test.
const tsconfigPath = path.join(output, "tsconfig.test.json");
fs.writeFileSync(
  tsconfigPath,
  JSON.stringify(
    {
      extends: path.relative(output, path.join(process.cwd(), "tsconfig.json")),
      compilerOptions: {
        outDir: output,
        module: "commonjs",
        moduleResolution: "node",
        target: "es2022",
        esModuleInterop: true,
        skipLibCheck: true,
        jsx: "react-jsx",
        noEmit: false,
        incremental: false,
        typeRoots: [path.join(process.cwd(), "node_modules/@types")],
      },
      include: [path.join(process.cwd(), "tests/store/slices.test.ts")],
      exclude: [],
    },
    null,
    2
  )
);

// tsc emits the "@/*" specifiers verbatim, so at runtime resolve them against
// the compiled output (the emitted .jsx graph modules live there too).
const preloadPath = path.join(output, "preload.cjs");
fs.writeFileSync(
  preloadPath,
  `const Module = require("node:module");
const path = require("node:path");
const fs = require("node:fs");
const outRoot = ${JSON.stringify(output)};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith("@/")) {
    const target = path.join(outRoot, request.slice(2));
    if (fs.existsSync(target + ".jsx")) request = target + ".jsx";
    else if (fs.existsSync(target + ".js")) request = target + ".js";
    else request = target;
  }
  return origResolve.call(this, request, ...args);
};
if (!Module._extensions[".jsx"]) {
  Module._extensions[".jsx"] = Module._extensions[".js"];
}
`
);

try {
  execFileSync(process.execPath, [tsc, "-p", tsconfigPath], { stdio: "inherit" });
  execFileSync(
    process.execPath,
    ["--require", preloadPath, "--test", path.join(output, "tests/store/slices.test.js")],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_PATH: path.join(process.cwd(), "node_modules") },
    }
  );
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}