# Reverso → Anki Saver — история чата (экстракт)

Дата выгрузки: 2026-02-01  
Репозиторий: `/Users/pashastrayt/code/utils/reverso-anki-saver`

## Важно (сырое, 100% полное)

В Cursor автоматически сохраняется **полный сырой транскрипт** (включая tool-логи). Он лежит по пути:

`/Users/pashastrayt/.cursor/projects/Users-pashastrayt-code-utils-reverso-anki-saver/agent-transcripts/74ae0fd7-1937-4100-9b08-4db0bc241f5e.txt`

Если тебе реально нужно «всё слово в слово» — просто скопируй этот файл на другой девайс.

Ниже — **удобный конспект** всего, что мы решили/сделали (то, что обычно и нужно, чтобы продолжить в новом чате).

## Задача

Сделать userscript (Tampermonkey) для страниц вида:

- `https://dictionary.reverso.net/english-definition/:word#translation=russian`

Функции:

- Кнопка **Add to Anki** на каждой карточке значения.
- Парсинг полей (Word, Definition, Example, Russian Translation) из DOM карточки, без HTML.
- Отправка в Anki через AnkiConnect.
- Тосты статуса (saving/saved/failed).
- Учет особенностей мобильного/узкого layout (<= 767px).
- Если слово уже есть в Anki — **всё равно добавлять** (это может быть другое значение), но показать отдельный тост про дубликат.
- Подготовка к HyperTTS: тег `needs_tts` (без прямого триггера на этом этапе).

## Выбранная архитектура

### Почему userscript, а не MV3 extension

- Для личного использования быстрее и проще: DOM-инъекция + тосты + запросы к localhost (AnkiConnect).

### Сборка

- **Vite** + `vite-plugin-monkey`
- **TypeScript**
- Менеджер пакетов: **Yarn**, смотрим `package.json.packageManager`

### Dev workflow (главное)

Одна команда:

```bash
yarn dev
```

Запускает сразу три процесса:

- watch build основного userscript
- watch build dev-loader userscript
- dev server, который раздает собранные `.user.js` по HTTP без кеша

Используем нестандартный порт:

- Dev server: `http://127.0.0.1:7744/`

Файлы, которые получаются:

- `dist/dev.reverso-anki-saver.user.js` — основной dev userscript
- `dist/loader-dev.user.js` — loader userscript (ставится один раз в Tampermonkey)

Идея loader’а: он через `GM_xmlhttpRequest` забирает свежий `dev.reverso-anki-saver.user.js` с dev server и `eval()`’ит его (обход кеша и проблем с file:// и mixed content).

## Интеграция с Anki

Используем AnkiConnect (Anki Desktop должен быть запущен).

- URL: `http://127.0.0.1:8765`
- Запросы делаем через `GM_xmlhttpRequest` (чтобы не упереться в CORS)

Текущая конфигурация Anki в проекте:

- Файл: `src/config.ts`
- Поля/маппинг:
  - `Word`, `Definition`, `Example`, `Back` (RU переводы), `Audio` (пока пусто)
- Теги:
  - `reverso`, `reverso::english-definition`, `needs_tts`

## UI: кнопка и тосты

- Кнопка добавляется **после** `.definition-example__actions` (новая строка).
- Сделали более компактный стиль кнопки, интегрированный в дизайн страницы.
- Реализована защита от запуска нескольких инстансов скрипта (global flag), чтобы ловить случаи, когда в Tampermonkey активны и dev, и prod скрипт одновременно.

## Badge “In Anki / Not in Anki”

Добавили статусный badge рядом с `.definition-list__blue-word`:

- Зеленый: `✓ In Anki`
- Красный: `✗ Not in Anki`

Логика:

- При заходе на слово проверяем по AnkiConnect (`findNotes`), есть ли заметка с таким Word.
- После успешного сохранения по кнопке — обновляем badge на “In Anki”.

SPA/перерисовки Reverso:

- Reverso перерисовывает DOM и может удалять наш badge.
- Решение: `MutationObserver` отслеживает удаление badge и пересоздает его через небольшую задержку, чтобы пережить обновление “дерева” страницы.

## Переводы в поле Back (переносы строк)

Проблема: несколько вариантов перевода сохранялись “в одну строку” в Anki.

Решение:

- В `src/reverso/parseCard.ts` переводы соединяем через `<br>` (а не `\n`), т.к. поля Anki по сути HTML:

```ts
const translation = translations.join("<br>");
```

## Ключевые файлы в проекте

- `package.json` — скрипты, `packageManager: yarn@...`, зависимости
- `vite.config.ts` — main userscript + dev server + middleware отдачи `dist/*.user.js`
- `vite.config.loader.ts` — сборка loader userscript
- `src/index.ts` — entrypoint, duplicate instance guard, проверки, старт observer
- `src/reverso/observe.ts` — инъекция кнопок, badge, MutationObserver
- `src/reverso/parseCard.ts` — парсинг карточки, сбор переводов
- `src/anki/ankiConnect.ts` — клиент AnkiConnect
- `src/ui/toast.ts` — тосты
- `src/loader.ts` — dev loader

## Что обсуждали про аудио (TTS)

Мы обсуждали 2 подхода:

- Оставить `needs_tts` и обрабатывать это внутри Anki через HyperTTS (в перспективе — отдельный bridge add-on).
- Альтернатива без HyperTTS: генерить mp3 извне и прикреплять в Anki через AnkiConnect (`storeMediaFile` или `addNote.audio.url`).

На текущем этапе решили не углубляться и оставить только тег `needs_tts`.
