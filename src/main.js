import { SEEDS } from "./seeds.js";
import { findSlimeChunks } from "./slime.js";
import {
  CHUNK_PX,
  chunkToPx,
  containsRegion,
  expandRegion,
  visibleRegion,
} from "./geometry.js";

/** Запас вокруг видимой области в чанках, чтобы мелкие сдвиги не вызывали перерисовку. */
const MARGIN_CHUNKS = 8;

const LAYER_ID = "slime-layer";
const SVG_NS = "http://www.w3.org/2000/svg";
const UI_WAIT_INTERVAL_MS = 200;
const UI_WAIT_TIMEOUT_MS = 30_000;
const UPDATE_DEBOUNCE_MS = 150;

let visible = false;
/** Сид, введённый вручную, привязан к миру, для которого его ввели. */
let manualSeed = null; // { worldId, seed }
/** Что сейчас нарисовано: { seed, region } или null. */
let rendered = null;
let debounceTimer = null;
let wrapperObserver = null;

function getWrapper() {
  return document.querySelector(".wrapper");
}

/** Масштаб карты: она пишет его в --map-zoom и в transform: scale(...). */
function getZoom(wrapper) {
  const fromVar = Number.parseFloat(
    wrapper.style.getPropertyValue("--map-zoom"),
  );
  if (fromVar > 0) return fromVar;
  const fromTransform = /scale\(([\d.]+)\)/.exec(wrapper.style.transform);
  return fromTransform ? Number.parseFloat(fromTransform[1]) : 1;
}

/**
 * Видимая область. Берём целевые left/top из inline-стиля, а не
 * getBoundingClientRect, чтобы во время CSS-анимации сдвига сразу
 * получить конечную позицию.
 */
function getVisibleRegion(wrapper) {
  const viewport = wrapper.parentElement;
  return visibleRegion({
    left: Number.parseFloat(wrapper.style.left) || 0,
    top: Number.parseFloat(wrapper.style.top) || 0,
    zoom: getZoom(wrapper),
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  });
}

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Хэш карты имеет вид #x/z/worldId/... — нужен только id мира. */
function getWorldId() {
  return toInt(window.location.hash.slice(1).split("/")[2], null);
}

function askSeed(message) {
  const input = prompt(message);
  if (input === null || input.trim() === "") return null;
  try {
    return BigInt(input.trim());
  } catch {
    alert("Сид должен быть целым числом.");
    return null;
  }
}

function resolveSeed(worldId) {
  if (manualSeed && manualSeed.worldId === worldId) return manualSeed.seed;
  if (worldId !== null && Object.hasOwn(SEEDS, worldId)) return SEEDS[worldId];

  const seed = askSeed(
    `Неизвестный мир (id: ${worldId}).\nВведите сид для этого мира:`,
  );
  if (seed !== null) manualSeed = { worldId, seed };
  return seed;
}

function removeLayer() {
  document.getElementById(LAYER_ID)?.remove();
  rendered = null;
}

function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => update(), UPDATE_DEBOUNCE_MS);
}

/** Перерисовка при сдвиге и зуме карты: оба меняют inline-стиль обёртки. */
function startTracking(wrapper) {
  wrapperObserver = new MutationObserver(scheduleUpdate);
  wrapperObserver.observe(wrapper, {
    attributes: true,
    attributeFilter: ["style"],
  });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);
}

function stopTracking() {
  clearTimeout(debounceTimer);
  wrapperObserver?.disconnect();
  wrapperObserver = null;
  window.removeEventListener("resize", scheduleUpdate);
  window.removeEventListener("hashchange", scheduleUpdate);
}

function setVisible(value) {
  visible = value;
  document.getElementById("slime-ui")?.classList.toggle("ui-checked", value);
  stopTracking();
  if (!visible) {
    removeLayer();
    return;
  }

  const wrapper = getWrapper();
  if (!wrapper) {
    console.warn("Не найден контейнер карты .wrapper");
    return;
  }
  startTracking(wrapper);
  update();
}

function update() {
  if (!visible) return;
  const wrapper = getWrapper();
  if (!wrapper) return;

  const seed = resolveSeed(getWorldId());
  if (seed === null) {
    console.warn("Сид не задан, слой слизней выключен.");
    setVisible(false);
    return;
  }

  const region = getVisibleRegion(wrapper);
  if (
    rendered &&
    rendered.seed === seed &&
    containsRegion(rendered.region, region)
  ) {
    return; // видимая часть уже нарисована
  }

  const expanded = expandRegion(region, MARGIN_CHUNKS);
  render(wrapper, expanded, findSlimeChunks(seed, expanded));
  rendered = { seed, region: expanded };
}

/** Рисует все чанки области одним SVG-путём. */
function render(wrapper, region, chunks) {
  removeLayer();

  // Левый верхний угол области: максимальный Z (ось инвертирована) и минимальный X.
  const origin = chunkToPx(region.minX, region.maxZ);

  // Сдвиг на 0.5 и сторона 15 — чтобы обводка в 1px легла внутрь
  // квадрата 16×16, как border при box-sizing: border-box.
  const inner = CHUNK_PX - 1;
  const d = chunks
    .map(({ x, z }) => {
      const { left, top } = chunkToPx(x, z);
      return `M${left - origin.left + 0.5} ${top - origin.top + 0.5}h${inner}v${inner}h-${inner}z`;
    })
    .join("");

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.id = LAYER_ID;
  svg.setAttribute("width", (region.maxZ - region.minZ + 1) * CHUNK_PX);
  svg.setAttribute("height", (region.maxX - region.minX + 1) * CHUNK_PX);
  Object.assign(svg.style, {
    position: "absolute",
    left: `${origin.left}px`,
    top: `${origin.top}px`,
    zIndex: 105,
    pointerEvents: "none",
  });

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "rgba(0, 255, 0, 0.4)");
  path.setAttribute("stroke", "green");
  svg.appendChild(path);

  wrapper.appendChild(svg);
}

function addButton(id, label, onClick) {
  window.addMoreUiElement(
    "first",
    `<div class="${id} ui-block" id="${id}"><div class="title"><a href="" class="button">${label}</a></div></div>`,
  );
  document.querySelector(`#${id} .title a`).addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });
}

function createUi() {
  addButton("slime-ui", "Слизни", () => setVisible(!visible));
  addButton("slime-seed-ui", "Ввести сид", () => {
    const seed = askSeed("Введите сид:");
    if (seed === null) return;
    manualSeed = { worldId: getWorldId(), seed };
    update();
  });
}

/** Ждёт, пока карта определит addMoreUiElement, и добавляет кнопки. */
function waitForMapUi() {
  const startedAt = Date.now();
  const interval = setInterval(() => {
    if (typeof window.addMoreUiElement === "function") {
      clearInterval(interval);
      createUi();
    } else if (Date.now() - startedAt > UI_WAIT_TIMEOUT_MS) {
      clearInterval(interval);
      console.warn(
        "Слизни: не дождались addMoreUiElement, кнопки не добавлены.",
      );
    }
  }, UI_WAIT_INTERVAL_MS);
}

waitForMapUi();
