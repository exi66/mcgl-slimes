import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHUNK_PX,
  chunkToPx,
  containsRegion,
  expandRegion,
  visibleRegion,
} from "../src/geometry.js";

// Формулы самой карты (script.js на map.minecraft-galaxy.ru): setCenter
// выставляет left/top обёртки, getCoords переводит экранную точку в блоки.
const TILE_SIZE = 400;

function mapSetCenter(x, z, zoom, width, height) {
  return {
    top: Math.ceil(0 - (x + TILE_SIZE / 2) * zoom + height / 2),
    left: Math.ceil(0 - (0 - z + TILE_SIZE / 2) * zoom + width / 2),
  };
}

function mapGetCoords(clientX, clientY, { left, top, zoom }) {
  const px = (clientX - left) / zoom;
  const py = (clientY - top) / zoom;
  return {
    x: Math.ceil(py - TILE_SIZE / 2),
    z: Math.ceil(0 - px + TILE_SIZE / 2),
  };
}

const VIEWS = [
  { x: 0, z: 0, zoom: 1, width: 1920, height: 1080 },
  { x: 5000, z: -12000, zoom: 3, width: 1920, height: 1080 },
  { x: -29_999_000, z: 29_999_000, zoom: 0.25, width: 1920, height: 1080 },
  { x: 123, z: -77, zoom: 1.75, width: 400, height: 450 },
  { x: -1, z: 1, zoom: 0.5, width: 3840, height: 2160 },
];

for (const view of VIEWS) {
  const { x, z, zoom, width, height } = view;
  const name = `центр (${x}, ${z}), зум ${zoom}, окно ${width}×${height}`;

  test(`visibleRegion покрывает весь экран: ${name}`, () => {
    const pos = { ...mapSetCenter(x, z, zoom, width, height), zoom };
    const region = visibleRegion({ ...pos, width, height });

    const step = 5;
    for (let sx = 0; sx <= width; sx += step) {
      for (let sy = 0; sy <= height; sy += step) {
        const block = mapGetCoords(sx, sy, pos);
        const chunk = {
          minX: Math.floor(block.x / CHUNK_PX),
          maxX: Math.floor(block.x / CHUNK_PX),
          minZ: Math.floor(block.z / CHUNK_PX),
          maxZ: Math.floor(block.z / CHUNK_PX),
        };
        // getCoords карты округляет вверх, поэтому на стыке чанков точка
        // может уйти в соседний чанк — допускаем запас в 1 чанк.
        assert.ok(
          containsRegion(expandRegion(region, 1), chunk),
          `точка экрана (${sx}, ${sy}) → чанк (${chunk.minX}, ${chunk.minZ}) вне области`,
        );
      }
    }
  });

  test(`visibleRegion не сильно больше экрана: ${name}`, () => {
    const pos = mapSetCenter(x, z, zoom, width, height);
    const region = visibleRegion({ ...pos, zoom, width, height });
    const chunksAcross = width / zoom / CHUNK_PX;
    const chunksDown = height / zoom / CHUNK_PX;
    assert.ok(region.maxZ - region.minZ + 1 <= Math.ceil(chunksAcross) + 1);
    assert.ok(region.maxX - region.minX + 1 <= Math.ceil(chunksDown) + 1);
  });
}

test("chunkToPx: чанк (0, 0) у начала координат карты, оси повёрнуты", () => {
  assert.deepEqual(chunkToPx(0, 0), { left: 200 - 16, top: 200 });
  // +X мира — вниз по экрану, +Z — влево.
  assert.deepEqual(chunkToPx(1, 0), { left: 184, top: 216 });
  assert.deepEqual(chunkToPx(0, 1), { left: 168, top: 200 });
});

test("containsRegion и expandRegion", () => {
  const r = { minX: 0, maxX: 10, minZ: -5, maxZ: 5 };
  assert.ok(containsRegion(expandRegion(r, 2), r));
  assert.ok(!containsRegion(r, expandRegion(r, 1)));
  assert.ok(containsRegion(r, r));
});
