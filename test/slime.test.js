import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findSlimeChunks, isSlimeChunk } from "../src/slime.js";

// Эталон сгенерирован test/reference/SlimeReference.java (npm run fixtures).
const fixtures = JSON.parse(
  readFileSync(
    new URL("./fixtures/slime-chunks.json", import.meta.url),
    "utf8",
  ),
);
const seeds = fixtures.seeds.map(BigInt);
const size = fixtures.regionSize;

/** Раскодирует hex-строку области в Set "x,z" слайм-чанков. */
function decodeRegion({ minX, minZ, bits }) {
  const slimes = new Set();
  for (let i = 0; i < size * size; i++) {
    const nibble = Number.parseInt(bits[i >> 2], 16);
    if ((nibble >> (3 - (i & 3))) & 1) {
      slimes.add(`${minX + Math.floor(i / size)},${minZ + (i % size)}`);
    }
  }
  return slimes;
}

test("эталон содержит и слайм-чанки, и обычные", () => {
  const total = fixtures.points.length;
  const slimes = fixtures.points.filter((p) => p[3] === 1).length;
  // ~10% чанков — слаймовые; защищает от вырожденного эталона.
  assert.ok(
    slimes > total * 0.05 && slimes < total * 0.2,
    `${slimes}/${total}`,
  );
});

test("findSlimeChunks совпадает с Java по областям", async (t) => {
  for (const region of fixtures.regions) {
    const seed = seeds[region.seed];
    await t.test(
      `seed ${seed}, область от (${region.minX}, ${region.minZ})`,
      () => {
        const expected = decodeRegion(region);
        const actual = findSlimeChunks(seed, {
          minX: region.minX,
          maxX: region.minX + size - 1,
          minZ: region.minZ,
          maxZ: region.minZ + size - 1,
        });
        assert.deepEqual(
          new Set(actual.map(({ x, z }) => `${x},${z}`)),
          expected,
        );
      },
    );
  }
});

test("isSlimeChunk совпадает с Java в случайных точках", () => {
  const mismatches = fixtures.points
    .filter(
      ([s, x, z, slime]) => isSlimeChunk(seeds[s], x, z) !== (slime === 1),
    )
    .map(([s, x, z, slime]) => ({
      seed: fixtures.seeds[s],
      x,
      z,
      expected: slime,
    }));
  assert.deepEqual(mismatches, []);
});

test("isSlimeChunk повторяет бросок nextInt при переполнении, как Java", () => {
  // Редкий случай (~4e-9): первый next(31) отбраковывается, решает второй.
  const { seed, x, z, slime } = fixtures.rejection;
  assert.equal(isSlimeChunk(BigInt(seed), x, z), slime === 1);
});

test("findSlimeChunks включает границы области", () => {
  const region = fixtures.regions[0];
  const seed = seeds[region.seed];
  const point = [...decodeRegion(region)][0].split(",").map(Number);
  const [x, z] = point;
  assert.deepEqual(
    findSlimeChunks(seed, { minX: x, maxX: x, minZ: z, maxZ: z }),
    [{ x, z }],
  );
});
