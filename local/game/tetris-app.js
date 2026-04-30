import { COLS, ROWS, PIECES, TetrisEngine } from "./tetris-engine.js";
import { AutoShift, FREE_TETRIS_TIMING, NBLOX_FAST_TIMING } from "./auto-shift.js";
import { NBLOX_STAGE, NBLOX_UI, getBlockStyle } from "./nblox-assets.js";
import {
  applyBinding,
  defaultBindings,
  keyName as formatKeyName,
  loadBindings,
  saveBindings
} from "../shared/bindings.js";

const STORAGE_KEY = "tetris-n-blox-html5-bindings-v1";
const TIMING_STORAGE_KEY = "tetris-n-blox-html5-timing-v1";

const { board: BOARD, side: SIDE, nextBox: NEXT_BOX, stats: STATS_BOX } = NBLOX_STAGE;
const IMAGE_ASSETS = {
  logo: "resources/nblox/logo-25.svg",
  panel: "resources/nblox/panel-57.svg",
  stats: "resources/nblox/stats-41.svg",
  startBox: "resources/nblox/start-box-18.svg",
  arrow: "resources/nblox/arrow-20.svg",
  footerBand: "resources/nblox/footer-27.svg",
  playfieldBorder: "resources/nblox/playfield-border-58.svg"
};

const ACTIONS = [
  { id: "left", label: "Move left", defaultCode: "ArrowLeft" },
  { id: "right", label: "Move right", defaultCode: "ArrowRight" },
  { id: "down", label: "Soft drop", defaultCode: "ArrowDown" },
  { id: "rotate", label: "Rotate", defaultCode: "ArrowUp" },
  { id: "drop", label: "Hard drop", defaultCode: "Space" },
  { id: "pause", label: "Pause", defaultCode: "KeyP" },
  { id: "fastKeys", label: "Fast keys", defaultCode: "KeyK" }
];

class TetrisApp {
  constructor() {
    this.canvas = document.querySelector("#game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.engine = new TetrisEngine();
    this.bindings = this.loadBindings();
    this.timing = this.loadTiming();
    this.autoShift = new AutoShift(this.timing);
    this.waitingForAction = null;
    this.lastTime = 0;
    this.dropAccumulator = 0;
    this.softDropAccumulator = 0;
    this.softDropHeld = false;
    this.started = false;
    this.startLevel = 1;
    this.quitPrompt = false;
    this.flashMessage = "";
    this.images = {};

    this.bindUI();
    this.loadAssetImages();
    this.resizeCanvas();
    this.renderBindings();
    this.renderTiming();
    requestAnimationFrame((time) => this.frame(time));
  }

  loadBindings() {
    return loadBindings(STORAGE_KEY, ACTIONS);
  }

  saveBindings() {
    saveBindings(STORAGE_KEY, this.bindings);
  }

  loadTiming() {
    try {
      return { ...FREE_TETRIS_TIMING, ...JSON.parse(localStorage.getItem(TIMING_STORAGE_KEY) || "{}") };
    } catch {
      return { ...FREE_TETRIS_TIMING };
    }
  }

  saveTiming() {
    localStorage.setItem(TIMING_STORAGE_KEY, JSON.stringify(this.timing));
  }

  bindUI() {
    window.addEventListener("resize", () => this.resizeCanvas());
    window.addEventListener("keydown", (event) => this.handleKeydown(event));
    window.addEventListener("keyup", (event) => this.handleKeyup(event));
    this.canvas.addEventListener("pointerdown", (event) => this.handleCanvasPointer(event));

    const hostStart = document.querySelector("[data-game-start]");
    const hostPause = document.querySelector("[data-game-pause]");
    const hostReset = document.querySelector("[data-game-reset]");
    if (hostStart) hostStart.addEventListener("click", () => this.start());
    if (hostPause) hostPause.addEventListener("click", () => this.togglePause());
    if (hostReset) hostReset.addEventListener("click", () => this.reset());
    document.querySelector("[data-reset-bindings]").addEventListener("click", () => this.resetBindings());
    document.querySelector("[data-timing-preset='free-tetris']").addEventListener("click", () => {
      this.setTiming(FREE_TETRIS_TIMING, "Free Tetris timing");
    });
    document.querySelector("[data-timing-preset='nblox-fast']").addEventListener("click", () => {
      this.setTiming(NBLOX_FAST_TIMING, "N-BLOX fast keys");
    });

    document.querySelectorAll("[data-timing]").forEach((input) => {
      input.addEventListener("change", () => {
        const value = Number.parseInt(input.value, 10);
        this.setTiming({ [input.dataset.timing]: Number.isFinite(value) ? Math.max(0, value) : 0 });
      });
    });

    document.querySelectorAll("[data-bind-action]").forEach((button) => {
      button.addEventListener("click", () => {
        this.waitingForAction = button.dataset.bindAction;
        this.renderBindings();
      });
    });

    document.querySelectorAll("[data-touch-action]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.runAction(button.dataset.touchAction, false);
      });
    });
  }

  loadAssetImages() {
    Object.entries(IMAGE_ASSETS).forEach(([key, src]) => {
      const image = new Image();
      image.onload = () => {
        this.images[key] = image;
      };
      image.src = src;
    });
  }

  drawAsset(key, x, y, width, height) {
    const image = this.images[key];
    if (!image) return false;
    this.ctx.drawImage(image, x, y, width, height);
    return true;
  }

  resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = NBLOX_STAGE.width * ratio;
    this.canvas.height = NBLOX_STAGE.height * ratio;
    this.canvas.style.aspectRatio = `${NBLOX_STAGE.width} / ${NBLOX_STAGE.height}`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  handleCanvasPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * NBLOX_STAGE.width;
    const y = ((event.clientY - rect.top) / rect.height) * NBLOX_STAGE.height;

    if (!this.started) {
      if (this.pointInRect(x, y, 115, 190, 28, 26)) this.changeStartLevel(-1);
      if (this.pointInRect(x, y, 219, 190, 28, 26)) this.changeStartLevel(1);
      if (this.pointInRect(x, y, 130, 256, 102, 28)) this.start();
      return;
    }

    if (this.engine.gameOver) {
      if (this.pointInRect(x, y, 70, 82, 90, 28)) this.start();
      return;
    }

    if (this.quitPrompt) {
      if (this.pointInRect(x, y, 76, 110, 32, 20)) this.reset();
      if (this.pointInRect(x, y, 124, 110, 32, 20)) this.quitPrompt = false;
      return;
    }

    if (this.pointInRect(x, y, 239, NBLOX_STAGE.menuY - 13, 48, 22)) {
      this.togglePause();
      return;
    }
    if (this.pointInRect(x, y, 294, NBLOX_STAGE.menuY - 13, 34, 22)) {
      this.toggleQuitPrompt();
    }
  }

  pointInRect(x, y, left, top, width, height) {
    return x >= left && x <= left + width && y >= top && y <= top + height;
  }

  changeStartLevel(delta) {
    this.startLevel = Math.min(15, Math.max(1, this.startLevel + delta));
  }

  handleKeydown(event) {
    if (this.waitingForAction) {
      this.setBinding(this.waitingForAction, event.code);
      event.preventDefault();
      return;
    }

    const action = ACTIONS.find((candidate) => this.bindings[candidate.id] === event.code);
    if (!action) return;

    event.preventDefault();
    this.runAction(action.id, event.repeat, performance.now());
  }

  handleKeyup(event) {
    const action = ACTIONS.find((candidate) => this.bindings[candidate.id] === event.code);
    if (!action) return;

    event.preventDefault();
    if (action.id === "left" || action.id === "right") {
      this.autoShift.release(action.id, performance.now(), (direction) => this.moveDirection(direction));
    }
    if (action.id === "down") {
      this.softDropHeld = false;
    }
  }

  runAction(action, repeat, time = performance.now()) {
    if (!this.started) {
      if (action === "rotate" && !repeat) this.changeStartLevel(1);
      if (action === "down" && !repeat) this.changeStartLevel(-1);
      if ((action === "drop" || action === "left" || action === "right") && !repeat) this.start();
      return;
    }

    if (this.quitPrompt) {
      if (!repeat && (action === "left" || action === "right" || action === "rotate" || action === "drop")) {
        this.quitPrompt = false;
      }
      if (!repeat && action === "pause") {
        this.togglePause();
      }
      return;
    }

    if (action === "pause") {
      if (!repeat) this.togglePause();
      return;
    }
    if (action === "fastKeys") {
      if (!repeat) this.toggleFastKeys();
      return;
    }

    if (this.engine.gameOver && action !== "pause") {
      this.start();
      return;
    }

    if ((action === "left" || action === "right") && !repeat) {
      this.autoShift.press(action, time, (direction) => this.moveDirection(direction));
    }
    if (action === "down") {
      this.softDropHeld = true;
      if (!repeat) this.engine.softDrop();
    }
    if (action === "rotate" && !repeat) this.engine.rotate(1);
    if (action === "drop" && !repeat) this.engine.hardDrop();
    this.flashMessage = "";
  }

  moveDirection(direction) {
    this.engine.move(direction === "left" ? -1 : 1);
  }

  start() {
    this.engine.reset();
    this.engine.level = this.startLevel;
    this.engine.lines = (this.startLevel - 1) * 10;
    this.engine.paused = false;
    this.engine.gameOver = false;
    this.started = true;
    this.quitPrompt = false;
    this.dropAccumulator = 0;
    this.softDropAccumulator = 0;
    this.softDropHeld = false;
    this.autoShift.reset();
    this.flashMessage = "";
  }

  togglePause() {
    if (!this.started || this.engine.gameOver) return;
    this.engine.togglePause();
    if (!this.engine.paused) this.quitPrompt = false;
    this.flashMessage = this.engine.paused ? "Paused" : "";
  }

  toggleQuitPrompt() {
    if (!this.started || this.engine.gameOver) return;
    this.quitPrompt = !this.quitPrompt;
    if (this.quitPrompt && !this.engine.paused) this.engine.togglePause();
    if (!this.quitPrompt && this.engine.paused) this.engine.togglePause();
  }

  reset() {
    this.engine.reset();
    this.engine.paused = false;
    this.engine.gameOver = false;
    this.started = false;
    this.quitPrompt = false;
    this.dropAccumulator = 0;
    this.softDropAccumulator = 0;
    this.softDropHeld = false;
    this.autoShift.reset();
    this.flashMessage = "";
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
        : this.keyName(this.bindings[actionId]);
      button.classList.toggle("listening", this.waitingForAction === actionId);
    });
  }

  setTiming(nextTiming, message = "") {
    this.timing = { ...this.timing, ...nextTiming };
    this.autoShift.setTiming(this.timing);
    this.saveTiming();
    this.renderTiming();
    this.flashMessage = message;
  }

  toggleFastKeys() {
    const isFast = this.timing.das === NBLOX_FAST_TIMING.das && this.timing.arr === NBLOX_FAST_TIMING.arr;
    this.setTiming(isFast ? FREE_TETRIS_TIMING : NBLOX_FAST_TIMING, isFast ? "Slower keys" : "Faster keys");
  }

  renderTiming() {
    document.querySelectorAll("[data-timing]").forEach((input) => {
      input.value = this.timing[input.dataset.timing];
    });
    const timingLabel = document.querySelector("[data-current-timing]");
    if (timingLabel) {
      timingLabel.textContent = `DAS ${this.timing.das}ms / ARR ${this.timing.arr}ms`;
    }
  }

  keyName(code) {
    return formatKeyName(code);
  }

  frame(time) {
    const delta = Math.min(50, time - this.lastTime || 0);
    this.lastTime = time;

    if (this.started && !this.engine.blocked) {
      this.autoShift.update(time, (direction) => this.moveDirection(direction));

      if (this.softDropHeld) {
        this.softDropAccumulator += delta;
        if (this.softDropAccumulator >= this.timing.softDrop) {
          this.engine.softDrop();
          this.softDropAccumulator = 0;
        }
      } else {
        this.softDropAccumulator = 0;
      }

      this.dropAccumulator += delta;
      if (this.dropAccumulator >= this.engine.dropInterval) {
        this.engine.tick();
        this.dropAccumulator = 0;
      }
    }

    this.draw();
    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  draw() {
    this.drawStage();
    if (this.started) {
      this.drawBoard();
      this.drawSidebar();
      this.drawFooter(false);
      this.drawOverlay();
    } else {
      this.drawStartScreen();
      this.drawFooter(true);
    }
  }

  drawStage() {
    this.ctx.fillStyle = NBLOX_UI.panel.stage;
    this.ctx.fillRect(0, 0, NBLOX_STAGE.width, NBLOX_STAGE.height);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let x = -NBLOX_STAGE.height; x < NBLOX_STAGE.width; x += 6) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + NBLOX_STAGE.height, NBLOX_STAGE.height);
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = "rgba(117, 132, 165, 0.08)";
      this.ctx.stroke();
    }
  }

  drawBoard() {
    if (!this.drawAsset("playfieldBorder", BOARD.x - 1, BOARD.y - 1, BOARD.cols * BOARD.cell + 4, BOARD.rows * BOARD.cell + 4)) {
      this.drawPanel(
        BOARD.x,
        BOARD.y,
        BOARD.cols * BOARD.cell + 2,
        BOARD.rows * BOARD.cell + 2,
        { fill: "#e5eef8", inner: "#eaf2fb" }
      );
    }

    this.ctx.fillStyle = "#eaf2fb";
    this.ctx.fillRect(BOARD.x + 1, BOARD.y + 1, BOARD.cols * BOARD.cell, BOARD.rows * BOARD.cell);

    this.engine.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) this.drawBlock(BOARD.x + 1 + x * BOARD.cell, BOARD.y + 1 + y * BOARD.cell, cell.id, cell.color);
      });
    });

    if (!this.engine.paused && !this.engine.gameOver) {
      this.drawCells(this.engine.getCells());
    }
  }

  drawCells(cells, alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    cells.forEach(({ x, y, id, color }) => {
      if (y >= 0) this.drawBlock(BOARD.x + 1 + x * BOARD.cell, BOARD.y + 1 + y * BOARD.cell, id, color);
    });
    this.ctx.restore();
  }

  drawBlock(x, y, pieceId, fallbackColor) {
    const style = pieceId ? getBlockStyle(pieceId) : {
      base: fallbackColor,
      highlight: "#ffffff",
      shadow: fallbackColor,
      outline: "rgba(0, 0, 0, 0.45)"
    };

    this.ctx.fillStyle = style.outline;
    this.ctx.fillRect(x, y, BOARD.cell, BOARD.cell);

    this.ctx.fillStyle = style.base;
    this.ctx.fillRect(x + 1, y + 1, BOARD.cell - 2, BOARD.cell - 2);

    this.ctx.fillStyle = style.highlight;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 1, y + 1);
    this.ctx.lineTo(x + BOARD.cell - 1, y + 1);
    this.ctx.lineTo(x + BOARD.cell - 3, y + 3);
    this.ctx.lineTo(x + 3, y + 3);
    this.ctx.lineTo(x + 3, y + BOARD.cell - 3);
    this.ctx.lineTo(x + 1, y + BOARD.cell - 1);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = style.shadow;
    this.ctx.beginPath();
    this.ctx.moveTo(x + BOARD.cell - 1, y + 1);
    this.ctx.lineTo(x + BOARD.cell - 1, y + BOARD.cell - 1);
    this.ctx.lineTo(x + 1, y + BOARD.cell - 1);
    this.ctx.lineTo(x + 3, y + BOARD.cell - 3);
    this.ctx.lineTo(x + BOARD.cell - 3, y + BOARD.cell - 3);
    this.ctx.lineTo(x + BOARD.cell - 3, y + 3);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = style.base;
    this.ctx.fillRect(x + 3, y + 3, BOARD.cell - 6, BOARD.cell - 6);
  }

  drawSidebar() {
    this.drawPanel(SIDE.x, SIDE.y, SIDE.width, SIDE.height);
    if (!this.drawAsset("panel", NEXT_BOX.x, NEXT_BOX.y, NEXT_BOX.width, NEXT_BOX.height)) {
      this.drawPanel(NEXT_BOX.x, NEXT_BOX.y, NEXT_BOX.width, NEXT_BOX.height);
    }
    if (!this.drawAsset("stats", STATS_BOX.x, STATS_BOX.y, STATS_BOX.width, STATS_BOX.height)) {
      this.drawPanel(STATS_BOX.x, STATS_BOX.y, STATS_BOX.width, STATS_BOX.height);
    }

    this.drawStatRow(NBLOX_UI.labels.level, this.engine.level, STATS_BOX.y + 16);
    this.drawStatRow(NBLOX_UI.labels.score, this.engine.score, STATS_BOX.y + 46);
    this.drawStatRow(NBLOX_UI.labels.lines, this.engine.lines, STATS_BOX.y + 76);

    this.drawNextPiece();
    this.drawSoundIcon(220, NBLOX_STAGE.menuY);
    this.drawMenuText();
    this.drawGameLogo();
  }

  drawPanel(x, y, width, height, { fill = "#dce8f5", inner = "#dce8f5" } = {}) {
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeStyle = NBLOX_UI.panel.border;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.strokeStyle = NBLOX_UI.panel.highlight;
    this.ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    this.ctx.fillStyle = inner;
    this.ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
  }

  drawStatRow(label, value, y) {
    this.drawText(label, STATS_BOX.x + 8, y, 12, NBLOX_UI.panel.textDark, {
      display: true,
      align: "left"
    });
    this.drawText(String(value), STATS_BOX.x + STATS_BOX.width - 8, y, 12, NBLOX_UI.panel.textDark, {
      display: true,
      align: "right"
    });

    this.ctx.strokeStyle = NBLOX_UI.panel.border;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(STATS_BOX.x + 2, y + 14);
    this.ctx.lineTo(STATS_BOX.x + STATS_BOX.width - 2, y + 14);
    this.ctx.stroke();
  }

  drawNextPiece() {
    const id = this.engine.queue[0];
    if (!id) return;
    PIECES[id].cells[0].forEach(([x, y]) => {
      this.drawBlock(NEXT_BOX.x + 42 + x * BOARD.cell, NEXT_BOX.y + 18 + y * BOARD.cell, id, PIECES[id].color);
    });
  }

  drawSoundIcon(x, y) {
    this.ctx.strokeStyle = NBLOX_UI.panel.border;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 3);
    this.ctx.lineTo(x + 6, y + 3);
    this.ctx.lineTo(x + 11, y - 2);
    this.ctx.lineTo(x + 11, y + 16);
    this.ctx.lineTo(x + 6, y + 11);
    this.ctx.lineTo(x, y + 11);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(x + 13, y + 7, 6, -0.7, 0.7);
    this.ctx.stroke();
  }

  drawMenuText() {
    const activePause = this.engine.paused && !this.quitPrompt;
    const activeQuit = this.quitPrompt;
    this.drawBulletLabel(240, NBLOX_STAGE.menuY + 5, NBLOX_UI.labels.pauseMenu, activePause);
    this.drawBulletLabel(295, NBLOX_STAGE.menuY + 5, NBLOX_UI.labels.quitMenu, activeQuit);
  }

  drawGameLogo() {
    const { x, y, width } = NBLOX_STAGE.logo;
    if (this.drawAsset("logo", x + 2, y + 2, width - 4, NBLOX_STAGE.logo.height - 2)) return;
    const gradient = this.ctx.createLinearGradient(x, y, x, y + 54);
    gradient.addColorStop(0, "#ff8d34");
    gradient.addColorStop(0.55, "#ffce2f");
    gradient.addColorStop(1, "#fff600");
    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = "#6f7fa1";
    this.ctx.lineWidth = 3;
    this.ctx.font = `800 38px ${NBLOX_UI.fontUi}`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "alphabetic";
    this.ctx.strokeText("TETRIS", x + 5, y + 40);
    this.ctx.fillText("TETRIS", x + 5, y + 40);
    this.drawText("N-BLOX", x + 28, y + 62, 29, "#eef4ff", { display: true });
  }

  drawFooter(startScreen) {
    const footerY = NBLOX_STAGE.footer.y;
    if (!this.drawAsset("footerBand", -10, footerY, NBLOX_STAGE.width + 20, NBLOX_STAGE.footer.height)) {
      this.ctx.fillStyle = "rgba(255,255,255,0.45)";
      this.ctx.fillRect(0, footerY, NBLOX_STAGE.width, NBLOX_STAGE.footer.height);
    }
  }

  drawFooterLine(prefix, link, y) {
    this.ctx.font = `700 10px ${NBLOX_UI.fontUi}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = NBLOX_UI.panel.text;
    if (!link) {
      this.ctx.fillText(prefix, NBLOX_STAGE.width / 2, y);
      return;
    }

    const prefixWidth = this.ctx.measureText(`${prefix} `).width;
    const linkWidth = this.ctx.measureText(link).width;
    const startX = (NBLOX_STAGE.width - prefixWidth - linkWidth) / 2;
    this.ctx.textAlign = "left";
    this.ctx.fillText(`${prefix} `, startX, y);
    this.ctx.fillStyle = NBLOX_UI.footer.gameLink === link ? NBLOX_UI.panel.link : NBLOX_UI.panel.link;
    this.ctx.fillText(link, startX + prefixWidth, y);
  }

  drawOverlay() {
    if (this.engine.gameOver) {
      this.drawBoardFade();
      this.drawText(NBLOX_UI.labels.gameOver, 89, 44, 24, NBLOX_UI.panel.textDark, {
        display: true,
        align: "left"
      });
      this.drawBulletLabel(59, 80, NBLOX_UI.labels.replay, false, 7, 17);
      return;
    }

    if (this.engine.paused && !this.quitPrompt) {
      this.drawBoardFade();
      this.drawText(NBLOX_UI.labels.pause, 104, 180, 24, NBLOX_UI.panel.text, {
        display: true,
        align: "center"
      });
    }

    if (this.quitPrompt) {
      this.drawQuitPrompt();
    }
  }

  drawBoardFade() {
    this.ctx.fillStyle = "rgba(235, 243, 250, 0.72)";
    this.ctx.fillRect(BOARD.x + 2, BOARD.y + 2, BOARD.cols * BOARD.cell - 2, BOARD.rows * BOARD.cell - 2);
  }

  drawQuitPrompt() {
    const { x, y, width, height } = NBLOX_STAGE.quitBox;
    this.drawPanel(x, y, width, height, { fill: "#d7e5f3", inner: "#dbe9f5" });
    this.drawText(NBLOX_UI.labels.quitGame, x + width / 2, y + 22, 24, NBLOX_UI.panel.textDark, {
      display: true,
      align: "center"
    });
    this.drawBulletLabel(x + 44, y + 52, NBLOX_UI.labels.yes, false, 7, 18);
    this.drawBulletLabel(x + 95, y + 52, NBLOX_UI.labels.no, false, 7, 18);
  }

  drawStartScreen() {
    this.drawStartLogo();
    const { x, y, width, height } = NBLOX_STAGE.startBox;
    if (!this.drawAsset("startBox", x, y, width, height)) {
      this.drawPanel(x, y, width, height, { fill: "#d7e5f3", inner: "#dbe9f5" });
    }
    this.drawText(NBLOX_UI.labels.chooseLevel, x + width / 2, y + 26, 16, NBLOX_UI.panel.text, {
      display: true,
      align: "center"
    });
    this.drawStartArrow(x + 24, y + 53, false);
    this.drawText(String(this.startLevel), x + width / 2, y + 61, 38, NBLOX_UI.panel.text, {
      display: true,
      align: "center"
    });
    this.drawStartArrow(x + width - 50, y + 53, true);
    this.drawBulletLabel(118, 272, NBLOX_UI.labels.playGame, false, 12, 28);
  }

  drawStartLogo() {
    if (this.drawAsset("logo", 66, 10, 228, 126)) return;
    const gradient = this.ctx.createLinearGradient(74, 20, 74, 110);
    gradient.addColorStop(0, "#ff8d34");
    gradient.addColorStop(0.55, "#ffce2f");
    gradient.addColorStop(1, "#fff600");
    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = "#7382a4";
    this.ctx.lineWidth = 4;
    this.ctx.font = `800 58px ${NBLOX_UI.fontUi}`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "alphabetic";
    this.ctx.strokeText("TETRIS", 68, 74);
    this.ctx.fillText("TETRIS", 68, 74);
    this.drawText("N-BLOX", 112, 112, 46, "#eef4ff", { display: true });
  }

  drawStartArrow(x, y, up) {
    if (this.images.arrow) {
      this.ctx.save();
      this.ctx.translate(x + 14, y + 11);
      if (!up) this.ctx.rotate(Math.PI);
      this.ctx.drawImage(this.images.arrow, -14, -11, 28, 22);
      this.ctx.restore();
      return;
    }

    this.ctx.fillStyle = NBLOX_UI.panel.text;
    this.ctx.beginPath();
    if (up) {
      this.ctx.moveTo(x, y + 16);
      this.ctx.lineTo(x + 11, y);
      this.ctx.lineTo(x + 22, y + 16);
    } else {
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + 11, y + 16);
      this.ctx.lineTo(x + 22, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawText(text, x, y, size, color, { display = false, align = "left" } = {}) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${display ? 400 : 700} ${size}px ${display ? NBLOX_UI.fontDisplay : NBLOX_UI.fontUi}`;
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }

  drawBulletLabel(x, y, label, active = false, bulletSize = 7, textSize = 16) {
    this.ctx.fillStyle = active ? "#000000" : NBLOX_UI.panel.text;
    this.ctx.fillRect(x, y - Math.floor(bulletSize / 2), bulletSize, bulletSize);
    this.drawText(label, x + bulletSize + 6, y, textSize, active ? NBLOX_UI.panel.textDark : NBLOX_UI.panel.text, {
      display: true,
      align: "left"
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new TetrisApp();
});
