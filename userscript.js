// ==UserScript==
// @name         Слизневые чанки
// @description  Предоставляет слой слизневых чанков на веб-карте проекта mcgl.ru
// @match        *://map.minecraft-galaxy.ru/*
// @grant        none
// @namespace    https://github.com/exi66/mcgl-slimes
// @author       exi66
// @run-at       document-start
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/exi66/mcgl-slimes
// @supportURL   https://github.com/exi66/mcgl-slimes/issues
// ==/UserScript==

(function () {
  ("use strict");

  const WASM_BASE64 = "";
  const WASM_BINARY = Uint8Array.from(atob(WASM_BASE64), (c) =>
    c.charCodeAt(0),
  );

  const RADIUS = 45;
  const X_OFFSET = 8 + 11 * 16;
  const Z_OFFSET = 8 + 12 * 16;

  /**
   * all seeds disassembled by helix
   */
  const SEEDS = {
    1: 2552571698694622912n,
    2: 6440098095557914520n,
    3: 3410408095559623462n,
    5: 4774995934882917873n,
    6: 3939963751951129418n,
    7: 5535783523556492609n,
    8: 317009015037168389n,
    10: 760624166489254381n,
    11: 731071247875520n,
    12: 310712375757118509n,
    13: 515151582541616663n,
    14: 1909976837709356564n,
    16: 90997683770935656n,
    17: 9099768377093556n,
    20: 9099768377093556n,
    22: 6545740237426441299n,
    25: 54574023742644129n,
    26: 65457402374264n,
    28: 5457402374265n,
    29: 654574023742645n,
    30: 654574023742691n,
  };

  const slimeChunks = [];
  let wasmExports = null;
  let lastHash = "";
  let timeout = null;
  let slimeVisible = false;
  let manualSeed = null;

  const importObject = {
    env: {
      foundPatternCallback: (x, z, w, h) => {
        slimeChunks.push({
          x: Number(x),
          z: Number(z),
          w: Number(w),
          h: Number(h),
        });
      },
      progressCallback: (percent) => console.debug("Прогресс: ", percent),
    },
  };

  function parseHash() {
    const hash = window.location.hash.substring(1);
    const parts = hash.split("/");
    return {
      x: parts.length >= 1 ? parseInt(parts[0]) : 0,
      z: parts.length >= 2 ? parseInt(parts[1]) : 0,
      worldId: parts.length >= 3 ? parseInt(parts[2]) : null,
    };
  }

  function resolveSeed(worldId) {
    if (manualSeed !== null) return manualSeed;
    if (worldId !== null && SEEDS[worldId] !== undefined) return SEEDS[worldId];
    const input = prompt(
      `Неизвестный мир (id: ${worldId}).\nВведите сид для этого мира:`,
    );
    if (input === null || input.trim() === "") {
      disableSlime();
      return null;
    }
    try {
      return BigInt(input.trim());
    } catch {
      disableSlime();
      return null;
    }
  }

  function disableSlime() {
    slimeVisible = false;
    const layer = document.getElementById("slime-layer");
    if (layer) layer.remove();
    const ui = document.getElementById("slime-ui");
    if (ui) ui.classList.remove("ui-checked");
  }

  function runSearch() {
    if (!slimeVisible) return;

    const { x, z, worldId } = parseHash();

    const seed = resolveSeed(worldId);
    console.log(seed);
    if (seed === null) {
      console.warn("Сид не задан, поиск отменён.");
      return;
    }

    slimeChunks.length = 0;
    wasmExports.findSlimeChunks(seed, RADIUS, 100_000, x, z);
    renderSlimeChunks();
  }

  function renderSlimeChunks() {
    const existing = document.getElementById("slime-layer");
    if (existing) existing.remove();

    if (!slimeVisible) return;

    const slimeLayer = document.createElement("div");
    slimeLayer.id = "slime-layer";
    Object.assign(slimeLayer.style, {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 999,
    });
    document.querySelector(".wrapper").appendChild(slimeLayer);

    slimeChunks.forEach((chunk) => {
      const rotatedX = -chunk.z;
      const rotatedZ = chunk.x;

      const pixelX = rotatedX * 16 + X_OFFSET;
      const pixelZ = rotatedZ * 16 + Z_OFFSET;

      const div = document.createElement("div");
      div.className = "slime-chunk";
      Object.assign(div.style, {
        position: "absolute",
        left: pixelX + "px",
        top: pixelZ + "px",
        width: "16px",
        height: "16px",
        backgroundColor: "rgba(0, 255, 0, 0.4)",
        border: "1px solid green",
        boxSizing: "border-box",
        pointerEvents: "none",
      });
      slimeLayer.appendChild(div);
    });
  }

  function createSlimeToggle() {
    const interval = setInterval(() => {
      if (typeof addMoreUiElement !== "function") return;
      clearInterval(interval);

      addMoreUiElement(
        "first",
        '<div class="slime-ui ui-block" id="slime-ui"><div class="title"><a href="" class="button">Слизни</a></div></div>',
      );

      const slimeUi = document.getElementById("slime-ui");
      const title = slimeUi.querySelector(".title a");

      title.addEventListener("click", function (e) {
        e.preventDefault();
        slimeVisible = !slimeVisible;
        button.toggleClass("ui-checked", slimeVisible);
        if (slimeVisible) {
          runSearch();
        } else {
          disableSlime();
        }
      });

      addMoreUiElement(
        "first",
        '<div class="slime-seed-ui ui-block" id="slime-seed-ui"><div class="title"><a href="" class="button">Ввести сид</a></div></div>',
      );

      const seedUi = document.getElementById("slime-seed-ui");
      const seedTitle = seedUi.querySelector(".title a");

      seedTitle.addEventListener("click", function (e) {
        e.preventDefault();
        const input = prompt("Введите сид:");
        if (input === null || input.trim() === "") return;
        try {
          manualSeed = BigInt(input.trim());
        } catch {
          return;
        }
        if (slimeVisible) runSearch();
      });
    }, 200);
  }

  WebAssembly.instantiate(WASM_BINARY, importObject).then((result) => {
    wasmExports = result.instance.exports;
    wasmExports.createPatternArray(1);
    wasmExports.setPattern(0, 1, 1);

    createSlimeToggle();

    window.addEventListener("hashchange", () => {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(() => {
        const currentHash = window.location.hash;
        if (currentHash !== lastHash) {
          lastHash = currentHash;
          runSearch();
        }
      }, 150);
    });
  });
})();
