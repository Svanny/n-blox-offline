import {
  applyBinding,
  defaultBindings,
  keyName,
  loadBindings,
  saveBindings
} from "../shared/bindings.js";
import { AutoShift, FREE_TETRIS_TIMING } from "../game/auto-shift.js";

const STORAGE_KEY = "tetris-n-blox-swf-bindings-v1";
const SWF_URL = "assets/tetris-n-blox.swf";

const ACTIONS = [
  { id: "left", label: "Move left", defaultCode: "ArrowLeft" },
  { id: "right", label: "Move right", defaultCode: "ArrowRight" },
  { id: "down", label: "Soft drop", defaultCode: "ArrowDown" },
  { id: "rotate", label: "Rotate", defaultCode: "ArrowUp" },
  { id: "drop", label: "Hard drop", defaultCode: "Space" },
  { id: "pause", label: "Pause", defaultCode: "KeyP" },
  { id: "options", label: "Options", defaultCode: "KeyO" }
];

const SWF_TARGET_CODES = {
  left: "ArrowLeft",
  right: "ArrowRight",
  down: "ArrowDown",
  rotate: "ArrowUp",
  drop: "Space",
  pause: "KeyP"
};

function codeToKey(code) {
  if (code === "Space") return " ";
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code;
  return code;
}

function createMappedKeyboardEvent(original, nextCode) {
  return new KeyboardEvent(original.type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    code: nextCode,
    key: codeToKey(nextCode),
    repeat: Boolean(original.repeat)
  });
}

function envDiagnostics() {
  const bootErrors = Array.isArray(window.__tetrisBootErrors) ? window.__tetrisBootErrors : [];
  const fetchErrors = Array.isArray(window.__tetrisFetchErrors) ? window.__tetrisFetchErrors : [];

  const parts = [
    `UA: ${navigator.userAgent}`,
    `WebAssembly: ${typeof WebAssembly !== "undefined" ? "yes" : "no"}`,
    `customElements: ${typeof customElements !== "undefined" ? "yes" : "no"}`,
    `FinalizationRegistry: ${typeof FinalizationRegistry !== "undefined" ? "yes" : "no"}`,
    `bootErrors: ${bootErrors.length}`,
    `fetchErrors: ${fetchErrors.length}`
  ];

  if (bootErrors.length > 0) {
    parts.push("", "boot errors:");
    bootErrors.slice(-5).forEach((error) => parts.push(`- ${error}`));
  }

  if (fetchErrors.length > 0) {
    parts.push("", "fetch errors:");
    fetchErrors.slice(-8).forEach((error) => parts.push(`- ${error}`));
  }

  return parts.join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForRuffleSource({ timeoutMs }) {
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    const global = window.RufflePlayer;
    if (global) {
      try {
        const source = typeof global.newest === "function" ? global.newest() : global;
        if (source?.createPlayer) return source;
      } catch {
        // ignore and keep waiting
      }
    }

    // Some builds expose the custom element first.
    if (typeof customElements !== "undefined" && customElements.get("ruffle-player")) {
      return "custom-element";
    }

    await sleep(50);
  }

  return null;
}

function setStatus(statusEl, message) {
  if (!statusEl) return;
  statusEl.textContent = message;
}

async function mountRufflePlayer({ container, statusEl }) {
  setStatus(statusEl, "Loading Ruffle…");

  const timeoutMs = 15000;
  let elapsedSeconds = 0;
  const timer = window.setInterval(() => {
    elapsedSeconds += 1;
    setStatus(statusEl, `Loading Ruffle… (${elapsedSeconds}s)`);
  }, 1000);

  const source = await waitForRuffleSource({ timeoutMs });
  window.clearInterval(timer);
  if (!source) {
    setStatus(statusEl, `Ruffle failed to initialize.\n\n${envDiagnostics()}`);
    return null;
  }

  let player;
  try {
    if (source === "custom-element") {
      player = document.createElement("ruffle-player");
      player.setAttribute("tabindex", "0");
    } else {
      player = source.createPlayer();
      player.setAttribute("tabindex", "0");
    }
  } catch (error) {
    setStatus(statusEl, `Ruffle failed to start.\n\n${String(error)}\n\n${envDiagnostics()}`);
    return null;
  }

  player.style.width = "100%";
  player.style.height = "100%";
  container.append(player);

  // Important: Ruffle expects the element to be connected before loading/playing.
  try {
    if (source === "custom-element") {
      player.setAttribute("src", SWF_URL);
    } else {
      const result = player.load(SWF_URL);
      if (result && typeof result.then === "function") {
        await result;
      }
    }
  } catch (error) {
    setStatus(statusEl, `Ruffle failed to load SWF.\n\n${String(error)}\n\n${envDiagnostics()}`);
    return null;
  }

  if (statusEl) statusEl.remove();
  return player;
}

class SwfTetrisApp {
  constructor() {
    this.optionsPanel = document.querySelector("[data-options-panel]");
    this.toggleOptionsButton = document.querySelector("[data-toggle-options]");
    this.bindings = loadBindings(STORAGE_KEY, ACTIONS);
    // Use Free Tetris feel for SWF movement (DAS/ARR).
    this.autoShift = new AutoShift(FREE_TETRIS_TIMING);
    this.waitingForAction = null;
    this.player = null;
    this.container = document.querySelector("#swf-container");
    this.statusEl = document.querySelector("#swf-status");
    this.lastFrameTime = 0;

    this.bindUI();
    this.renderBindings();
    void this.initPlayer();
    requestAnimationFrame((time) => this.frame(time));
  }

  async initPlayer() {
    this.player = await mountRufflePlayer({ container: this.container, statusEl: this.statusEl });
  }

  bindUI() {
    this.toggleOptionsButton.addEventListener("click", () => this.toggleOptions());

    document.querySelector("[data-reset-bindings]").addEventListener("click", () => this.resetBindings());
    document.querySelector("[data-focus-game]").addEventListener("click", () => this.focusGame());

    document.querySelectorAll("[data-bind-action]").forEach((button) => {
      button.addEventListener("click", () => {
        this.waitingForAction = button.dataset.bindAction;
        this.renderBindings();
      });
    });

    // Capture so we can remap before Ruffle sees the raw key.
    window.addEventListener("keydown", (event) => this.handleKey(event), { capture: true });
    window.addEventListener("keyup", (event) => this.handleKey(event), { capture: true });
  }

  focusGame() {
    if (this.player?.focus) this.player.focus();
  }

  toggleOptions() {
    const collapsed = this.optionsPanel.classList.toggle("collapsed");
    this.toggleOptionsButton.textContent = collapsed ? "Show" : "Hide";
  }

  saveBindings() {
    saveBindings(STORAGE_KEY, this.bindings);
  }

  setBinding(actionId, code) {
    this.bindings = applyBinding({ bindings: this.bindings, actions: ACTIONS, actionId, code });
    this.waitingForAction = null;
    this.saveBindings();
    this.renderBindings();
  }

  resetBindings() {
    this.bindings = defaultBindings(ACTIONS);
    this.waitingForAction = null;
    this.saveBindings();
    this.renderBindings();
  }

  renderBindings() {
    document.querySelectorAll("[data-bind-action]").forEach((button) => {
      const actionId = button.dataset.bindAction;
      button.textContent = this.waitingForAction === actionId
        ? "Press a key..."
        : keyName(this.bindings[actionId]);
      button.classList.toggle("listening", this.waitingForAction === actionId);
    });
  }

  shouldIgnore(event) {
    if (!event.isTrusted) return true;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button, input, textarea, select, a"));
  }

  dispatchToRuffle(type, code, repeat = false) {
    const event = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      code,
      key: codeToKey(code),
      repeat: Boolean(repeat)
    });
    window.dispatchEvent(event);
  }

  frame(time) {
    const clamped = Math.min(time, this.lastFrameTime + 100) || time;
    this.lastFrameTime = clamped;

    this.autoShift.update(time, (direction) => {
      const code = SWF_TARGET_CODES[direction];
      if (!code) return;
      this.dispatchToRuffle("keydown", code, true);
    });

    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  handleKey(event) {
    if (this.waitingForAction) {
      // When rebinding, the focused element is usually the button itself; do not ignore.
      if (!event.code) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "keydown" && !event.repeat) {
        this.setBinding(this.waitingForAction, event.code);
      }
      return;
    }

    if (this.shouldIgnore(event)) return;

    const boundAction = ACTIONS.find((action) => this.bindings[action.id] === event.code);
    if (!boundAction) return;

    // Toggle options locally.
    if (boundAction.id === "options") {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "keydown" && !event.repeat) this.toggleOptions();
      return;
    }

    // Custom DAS/ARR for horizontal movement.
    if (boundAction.id === "left" || boundAction.id === "right") {
      event.preventDefault();
      event.stopPropagation();
      const direction = boundAction.id;
      const now = performance.now();
      if (event.type === "keydown") {
        if (!event.repeat) {
          this.autoShift.press(direction, now, (dir) => this.dispatchToRuffle("keydown", SWF_TARGET_CODES[dir], false));
        }
      } else if (event.type === "keyup") {
        this.autoShift.release(direction, now, (dir) => this.dispatchToRuffle("keydown", SWF_TARGET_CODES[dir], false));
        this.dispatchToRuffle("keyup", SWF_TARGET_CODES[direction], false);
      }
      return;
    }

    const mappedCode = SWF_TARGET_CODES[boundAction.id];
    if (!mappedCode) return;

    // If the key already matches the SWF's expected code, just prevent scrolling.
    if (event.code === mappedCode) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dispatchToRuffle(event.type, mappedCode, Boolean(event.repeat));
  }
}

new SwfTetrisApp();
