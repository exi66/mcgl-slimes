import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Random;

/**
 * Эталон для тестов: генерирует test/fixtures/slime-chunks.json настоящим
 * java.util.Random — тем же кодом, что использует Minecraft.
 *
 * Запуск: npm run fixtures (нужен JDK 8+).
 */
public class SlimeReference {
    /** Chunk#getRandomWithSeed(987234911L) из Minecraft. */
    static boolean isSlimeChunk(long seed, int x, int z) {
        return new Random(seed
                + (long) (x * x * 0x4c1906)
                + (long) (x * 0x5ac0db)
                + (long) (z * z) * 0x4307a7L
                + (long) (z * 0x5f24f) ^ 0x3ad8025fL).nextInt(10) == 0;
    }

    static final long[] SEEDS = {
            0L,
            1L,
            -1L,
            Long.MIN_VALUE,
            Long.MAX_VALUE,
            12345L,
            -987654321012345L,
            731071247875520L,
            2552571698694622912L,
            6545740237426441299L,
    };

    /** Левые верхние углы квадратных областей (в чанках). */
    static final int[][] REGIONS = {
            {-16, -16},             // вокруг (0, 0)
            {1874984, -1875000},    // у границы мира (±30 000 000 блоков)
            {-46350, 46330},        // x * x переполняет int
            {123456, -654321},
    };

    /**
     * Сид, при котором в чанке (0, 0) первый next(31) внутри nextInt(10)
     * отбраковывается (переполнение int в bits - val + 9), а второй даёт 0.
     * Случайно такое встречается с вероятностью ~4e-9, поэтому подбираем:
     * задаём состояние после первого шага LCG и откатываем его назад.
     */
    static long rejectionSeed() {
        long mask = (1L << 48) - 1;
        long multiplier = 0x5DEECE66DL;
        long inverse = BigInteger.valueOf(multiplier)
                .modInverse(BigInteger.ONE.shiftLeft(48)).longValue();
        for (long low = 0; low < (1L << 17); low++) {
            long state1 = (0x7FFFFFFFL << 17) | low; // next(31) = Integer.MAX_VALUE
            long state2 = (state1 * multiplier + 0xBL) & mask;
            if ((int) (state2 >>> 17) % 10 != 0) continue;
            long state0 = ((state1 - 0xBL) * inverse) & mask;
            // Random(s): state0 = s ^ multiplier; для чанка (0, 0): s = seed ^ 0x3ad8025f
            long seed = state0 ^ multiplier ^ 0x3ad8025fL;
            if (!isSlimeChunk(seed, 0, 0)) throw new IllegalStateException("bad rejection seed");
            return seed;
        }
        throw new IllegalStateException("rejection seed not found");
    }

    static final int REGION_SIZE = 32;
    static final int POINTS_PER_SEED = 100;

    public static void main(String[] args) throws IOException {
        StringBuilder json = new StringBuilder();
        json.append("{\n  \"seeds\": [");
        for (int i = 0; i < SEEDS.length; i++) {
            json.append(i == 0 ? "" : ", ").append('"').append(SEEDS[i]).append('"');
        }
        json.append("],\n  \"regionSize\": ").append(REGION_SIZE);

        // Области: клетки по x (внешний цикл), затем по z; 4 клетки на hex-цифру,
        // первая клетка — старший бит.
        json.append(",\n  \"regions\": [\n");
        boolean first = true;
        for (int s = 0; s < SEEDS.length; s++) {
            for (int[] region : REGIONS) {
                StringBuilder hex = new StringBuilder();
                int nibble = 0, count = 0;
                for (int x = region[0]; x < region[0] + REGION_SIZE; x++) {
                    for (int z = region[1]; z < region[1] + REGION_SIZE; z++) {
                        nibble = (nibble << 1) | (isSlimeChunk(SEEDS[s], x, z) ? 1 : 0);
                        if (++count == 4) {
                            hex.append(Character.forDigit(nibble, 16));
                            nibble = 0;
                            count = 0;
                        }
                    }
                }
                json.append(first ? "" : ",\n").append("    {\"seed\": ").append(s)
                        .append(", \"minX\": ").append(region[0])
                        .append(", \"minZ\": ").append(region[1])
                        .append(", \"bits\": \"").append(hex).append("\"}");
                first = false;
            }
        }

        // Случайные точки: половина в пределах мира, половина — по всему диапазону int.
        json.append("\n  ],\n  \"points\": [\n");
        Random random = new Random(42);
        first = true;
        for (int s = 0; s < SEEDS.length; s++) {
            for (int i = 0; i < POINTS_PER_SEED; i++) {
                boolean inWorld = i % 2 == 0;
                int x = inWorld ? random.nextInt(3750000) - 1875000 : random.nextInt();
                int z = inWorld ? random.nextInt(3750000) - 1875000 : random.nextInt();
                json.append(first ? "" : ",\n").append("    [").append(s)
                        .append(", ").append(x).append(", ").append(z)
                        .append(", ").append(isSlimeChunk(SEEDS[s], x, z) ? 1 : 0).append(']');
                first = false;
            }
        }
        json.append("\n  ],\n  \"rejection\": {\"seed\": \"").append(rejectionSeed())
                .append("\", \"x\": 0, \"z\": 0, \"slime\": 1}\n}\n");

        try (Writer out = new OutputStreamWriter(new FileOutputStream(args[0]), StandardCharsets.UTF_8)) {
            out.write(json.toString());
        }
    }
}
