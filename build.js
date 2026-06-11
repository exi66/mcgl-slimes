import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const dist = join(dir, "dist");

const wasmPath = join(dist, "wasm.wasm");
const inputPath = join(dir, "userscript.js");

const outputPath = join(dist, "index.user.js");
const metaOutputPath = join(dist, "index.meta.js");

/**
 * Определяет версию на основе Git-тега из CI или возвращает локальную заглушку
 */
function getVersion() {
  const gitTag = process.env.GITHUB_REF_NAME;
  return gitTag ? gitTag.replace(/^v/, "") : "1.0.0-local";
}

/**
 * Генерирует текстовый блок метаданных ==UserScript== для Tampermonkey
 */
function generateUserScriptHeader(meta) {
  const lines = ["// ==UserScript=="];
  for (const [key, value] of Object.entries(meta)) {
    const formattedKey = `@${key}`.padEnd(16);
    if (Array.isArray(value)) {
      value.forEach((val) => lines.push(`// ${formattedKey} ${val}`));
    } else {
      lines.push(`// ${formattedKey} ${value}`);
    }
  }
  lines.push("// ==/UserScript==\n");
  return lines.join("\n");
}

/**
 * Компилирует D-код в WebAssembly с помощью ldc2
 */
function compileWasm() {
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
    console.error("Error: ldc2 compilation failed.");
    process.exit(1);
  }
}

/**
 * Главная функция сборки
 */
function main() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const metaData = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  metaData.version = getVersion();

  // 2. Компилируем WASM и переводим его в Base64 string
  compileWasm();
  const base64 = readFileSync(wasmPath).toString("base64");
  const wasmJs = `const WASM_BASE64 = "${base64}";`;

  const source = readFileSync(inputPath, "utf8");
  const output = source.replace(/const WASM_BASE64 = ["'][^"']*["'];/, wasmJs);

  if (output === source) {
    console.error("Error: Marker 'WASM_BASE64' not found in userscript.js");
    process.exit(1);
  }

  // 4. Генерируем заголовок Tampermonkey
  const userscriptHeader = generateUserScriptHeader(metaData);

  // 5. Записываем итоговые файлы в dist/
  writeFileSync(metaOutputPath, userscriptHeader);
  console.log(
    `[1/2] Metadata written to: dist/index.meta.js (Version: ${metaData.version})`,
  );
  writeFileSync(outputPath, userscriptHeader + output);
  console.log(`[2/2] Full userscript written to: ${outputPath}`);

  console.log("Build successfully finished!");
}

main();
