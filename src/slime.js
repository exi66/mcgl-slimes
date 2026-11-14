const RANDOM_MULTIPLIER = 0x5deece66dn;
const RANDOM_MASK = (1n << 48n) - 1n;

/**
 * Порт проверки слайм-чанка из Minecraft:
 * new Random(seed + f(x, z) ^ 0x3ad8025f).nextInt(10) == 0.
 * Эталон — test/reference/SlimeReference.java.
 *
 * Произведения считаются в Java int (с переполнением), отсюда Math.imul.
 * Сумма в Java считается в long, но дальше используются только младшие
 * 48 бит, а BigInt даёт те же младшие биты, поэтому asIntN не нужен.
 *
 * @param {bigint} worldSeed
 * @param {number} x чанковая координата X
 * @param {number} z чанковая координата Z
 */
export function isSlimeChunk(worldSeed, x, z) {
  const seed =
    (worldSeed +
      BigInt(Math.imul(Math.imul(x, x), 0x4c1906)) +
      BigInt(Math.imul(x, 0x5ac0db)) +
      BigInt(Math.imul(z, z)) * 0x4307a7n +
      BigInt(Math.imul(z, 0x5f24f))) ^
    0x3ad8025fn;

  // java.util.Random: начальное перемешивание и nextInt(10).
  let state = (seed ^ RANDOM_MULTIPLIER) & RANDOM_MASK;
  let bits, value;
  do {
    state = (state * RANDOM_MULTIPLIER + 0xbn) & RANDOM_MASK;
    bits = Number(state >> 17n);
    value = bits % 10;
  } while (((bits - value + 9) | 0) < 0);
  return value === 0;
}

/**
 * Все слайм-чанки в области (границы включительно).
 *
 * @param {bigint} seed
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} region
 * @returns {{ x: number, z: number }[]}
 */
export function findSlimeChunks(seed, { minX, maxX, minZ, maxZ }) {
  const chunks = [];
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (isSlimeChunk(seed, x, z)) chunks.push({ x, z });
    }
  }
  return chunks;
}
