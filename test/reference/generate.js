// Генерирует test/fixtures/slime-chunks.json эталонной реализацией на Java.
// Нужен JDK 8+ (javac и java в PATH).
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const buildDir = join(dir, "build");
const output = join(dir, "..", "fixtures", "slime-chunks.json");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

mkdirSync(buildDir, { recursive: true });
run("javac", ["-d", buildDir, join(dir, "SlimeReference.java")]);
run("java", ["-cp", buildDir, "SlimeReference", output]);
console.log(`Fixtures written to: ${output}`);
