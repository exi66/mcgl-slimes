# mcgl-slimes

Userscript для Tampermonkey, который отображает слизневые чанки на карте проекта [mcgl.ru](https://minecraft-galaxy.ru/ru/)

## Установка

1. Установите [Tampermonkey](https://www.tampermonkey.net/)
2. Скачайте `out.js` из [последнего релиза](../../releases/latest)
3. Откройте панель Tampermonkey → Создать новый скрипт
4. Вставьте содержимое `out.js` и сохраните

На карте появится кнопка **Слизни**. Нажмите чтобы показать/скрыть слой чанков. Кнопка **Ввести сид** позволяет указать сид вручную.

## Сборка

Требуется [Node.js](https://nodejs.org/) и [ldc2](https://github.com/ldc-developers/ldc/releases).

```bash
npm run build
```

Результат сборки в `dist/out.js`.

## Сиды

Известные сиды миров хранятся в объекте `SEEDS` в файле `userscript.js`. Добавьте id мира и сид туда если он отсутствует.
