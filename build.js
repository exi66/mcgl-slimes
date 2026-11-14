import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const dist = join(dir, "dist");

const entryPath = join(dir, "src", "main.js");
const outputPath = join(dist, "index.user.js");
const metaOutputPath = join(dist, "index.meta.js");

/**
 * Версия из Git-тега в CI (v1.2.3 → 1.2.3) или локальная заглушка.
 */
function getVersion() {
  const gitTag = process.env.GITHUB_REF_NAME;
  return gitTag ? gitTag.replace(/^v/, "") : "1.0.0-local";
}

/**
 * Блок метаданных ==UserScript== для Tampermonkey.
 */
function generateUserScriptHeader(meta) {
  const lines = ["// ==UserScript=="];
  for (const [key, value] of Object.entries(meta)) {
    const formattedKey = `@${key}`.padEnd(16);
    for (const val of [value].flat()) {
      lines.push(`// ${formattedKey} ${val}`);
    }
  }
  lines.push("// ==/UserScript==\n");
  return lines.join("\n");
}

async function main() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
  meta.version = getVersion();
  const header = generateUserScriptHeader(meta);

  writeFileSync(metaOutputPath, header);
  console.log(
    `[1/2] Metadata written to: ${metaOutputPath} (version ${meta.version})`,
  );

  // Без минификации: пользователи и каталоги скриптов должны видеть читаемый код.
  await build({
    entryPoints: [entryPath],
    outfile: outputPath,
    bundle: true,
    format: "iife",
    target: "es2022",
    charset: "utf8",
    banner: { js: header },
    logLevel: "warning",
  });
  console.log(`[2/2] Userscript written to: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
