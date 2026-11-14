# mcgl-slimes

Userscript для Tampermonkey, который отображает слайм-чанки на карте проекта [Minecraft Galaxy](https://minecraft-galaxy.ru/ru/). Сиды основных игровых планет уже встроены в скрипт, для КМ доступен функционал мануального ввода

## Установка

1. Установите [Tampermonkey](https://www.tampermonkey.net/)
2. Откройте ссылку [index.user.js](https://github.com/exi66/mcgl-slimes/releases/latest/download/index.user.js) из последнего релиза — Tampermonkey предложит установить скрипт
3. Нажмите «Установить»

Скрипт будет обновляться автоматически при выходе новых релизов.

На карте появится кнопка **Слизни**. Нажмите чтобы показать/скрыть слой слайм-чанков. Кнопка **Ввести сид** позволяет указать сид вручную для текущего мира.

## Разработка

Требуется [Node.js](https://nodejs.org/) 22+.

```bash
npm install
npm run build          # сборка в dist/
npm test               # тесты
npm run lint           # ESLint
npm run format         # Prettier
```

Релиз собирается в GitHub Actions при пуше тега вида `v1.2.3`.

Структура:

- `src/main.js` — точка входа: кнопки, слой на карте, отслеживание сдвига и зума
- `src/slime.js` — алгоритм слайм-чанков
- `src/geometry.js` — перевод координат мира в пиксели карты и видимая область
- `src/seeds.js` — сиды известных миров

### Тесты

Алгоритм сверяется с эталоном на Java — тем же кодом, что использует Minecraft (`test/reference/SlimeReference.java`). Результаты эталона лежат в `test/fixtures/slime-chunks.json`, поэтому для `npm test` Java не нужна. Перегенерировать их (нужен JDK 8+):

```bash
npm run fixtures
```

## Сиды

Известные сиды миров хранятся в объекте `SEEDS` в файле `src/seeds.js`. Добавьте id мира и сид туда если он отсутствует.
