// Геометрия карты (см. script.js карты): 1 блок = 1 пиксель обёртки .wrapper,
// точка (0, 0) мира — в пикселе TILE_SIZE / 2 = 200 по обеим осям.
// Карта повёрнута на 90°: ось X мира идёт вниз по экрану, ось Z — влево.

export const CHUNK_PX = 16;
export const MAP_ORIGIN_PX = 200;

/** Левый верхний угол чанка в пикселях обёртки карты. */
export function chunkToPx(x, z) {
  return {
    left: MAP_ORIGIN_PX - (z + 1) * CHUNK_PX,
    top: MAP_ORIGIN_PX + x * CHUNK_PX,
  };
}

/**
 * Область чанков, видимая в окне карты.
 *
 * @param {object} view
 * @param {number} view.left   css left обёртки, экранные пиксели
 * @param {number} view.top    css top обёртки, экранные пиксели
 * @param {number} view.zoom   масштаб обёртки (transform: scale)
 * @param {number} view.width  ширина окна карты
 * @param {number} view.height высота окна карты
 */
export function visibleRegion({ left, top, zoom, width, height }) {
  // Видимый прямоугольник в пикселях обёртки (= в блоках).
  const pxMinX = -left / zoom;
  const pxMaxX = (width - left) / zoom;
  const pxMinY = -top / zoom;
  const pxMaxY = (height - top) / zoom;

  return {
    minX: Math.floor((pxMinY - MAP_ORIGIN_PX) / CHUNK_PX),
    maxX: Math.floor((pxMaxY - MAP_ORIGIN_PX) / CHUNK_PX),
    minZ: Math.floor((MAP_ORIGIN_PX - pxMaxX) / CHUNK_PX),
    maxZ: Math.floor((MAP_ORIGIN_PX - pxMinX) / CHUNK_PX),
  };
}

export function expandRegion(r, by) {
  return {
    minX: r.minX - by,
    maxX: r.maxX + by,
    minZ: r.minZ - by,
    maxZ: r.maxZ + by,
  };
}

export function containsRegion(outer, inner) {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minZ >= outer.minZ &&
    inner.maxZ <= outer.maxZ
  );
}
