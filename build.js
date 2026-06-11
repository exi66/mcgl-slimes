import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const dist = join(dir, "dist");

const wasmPath = join(dist, "wasm.wasm");
const inputPath = join(dir, "userscript.js");
const outputPath = join(dist, "out.js");

mkdirSync(dist, { recursive: true });

const result = spawnSync(
  "ldc2",
  [
    "-mtriple=wasm32-unknown-unknown-wasm",
    "-Oz",
    "-betterC",
    "-L--allow-undefined",
    "-L--no-entry",
    "-L--strip-all",
    join(dir, "wasm", "wasm.d"),
    `-of=${wasmPath}`,
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(1);
}

const base64 = readFileSync(wasmPath).toString("base64");
const wasmJs = `const WASM_BASE64 = "${base64}";`;

const source = readFileSync(inputPath, "utf8");

const output = source.replace(/const WASM_BASE64 = ["'][^"']*["'];/, wasmJs);

if (output === source) {
  console.error("Marker 'WASM_BASE64' not found in index.js");
  process.exit(1);
}

writeFileSync(outputPath, output);
console.log("Done! Written to dist/out.js");
