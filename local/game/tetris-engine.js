export const COLS = 10;
export const ROWS = 18;

export const PIECES = {
  I: {
    color: "#2bdcff",
    cells: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]]
    ]
  },
  J: {
    color: "#2f6dff",
    cells: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]]
    ]
  },
  L: {
    color: "#ff9b2f",
    cells: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]]
    ]
  },
  O: {
    color: "#ffdf33",
    cells: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]]
    ]
  },
  S: {
    color: "#45e35f",
    cells: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]]
    ]
  },
  T: {
    color: "#b95cff",
    cells: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]]
    ]
  },
  Z: {
    color: "#ff4d61",
    cells: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]]
    ]
  }
};

const PIECE_IDS = Object.keys(PIECES);
const LINE_SCORES = [0, 100, 300, 500, 800];

export class TetrisEngine {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.reset();
  }

  reset() {
    this.board = createEmptyBoard();
    this.bag = [];
    this.queue = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.paused = false;
    this.fillQueue();
    this.spawn();
  }

  get dropInterval() {
    return Math.max(95, 850 - (this.level - 1) * 58);
  }

  fillQueue() {
    while (this.queue.length < 5) {
      this.queue.push(...this.nextBag());
    }
  }

  nextBag() {
    const bag = [...PIECE_IDS];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  spawn() {
    this.fillQueue();
    const id = this.queue.shift();
    this.active = { id, x: 3, y: 0, rotation: 0 };
    this.fillQueue();
    if (this.collides(this.active)) {
      this.gameOver = true;
    }
  }

  getCells(piece = this.active) {
    return PIECES[piece.id].cells[piece.rotation].map(([x, y]) => ({
      x: piece.x + x,
      y: piece.y + y,
      id: piece.id,
      color: PIECES[piece.id].color
    }));
  }

  collides(piece) {
    return this.getCells(piece).some(({ x, y }) => (
      x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x])
    ));
  }

  move(dx) {
    if (this.blocked) return false;
    const moved = { ...this.active, x: this.active.x + dx };
    if (this.collides(moved)) return false;
    this.active = moved;
    return true;
  }

  rotate(direction = 1) {
    if (this.blocked) return false;
    const rotation = (this.active.rotation + direction + 4) % 4;
    const rotated = { ...this.active, rotation };
    if (!this.collides(rotated)) {
      this.active = rotated;
      return true;
    }
    return false;
  }

  softDrop() {
    if (this.blocked) return false;
    const moved = { ...this.active, y: this.active.y + 1 };
    if (this.collides(moved)) {
      this.lockPiece();
      return false;
    }
    this.active = moved;
    this.score += 1;
    return true;
  }

  hardDrop() {
    if (this.blocked) return 0;
    let distance = 0;
    while (!this.collides({ ...this.active, y: this.active.y + 1 })) {
      this.active = { ...this.active, y: this.active.y + 1 };
      distance += 1;
    }
    this.score += distance * 2;
    this.lockPiece();
    return distance;
  }

  tick() {
    return this.softDrop();
  }

  lockPiece() {
    this.getCells().forEach(({ x, y, id, color }) => {
      if (y >= 0 && y < ROWS) {
        this.board[y][x] = { id, color };
      }
    });
    const cleared = this.clearLines();
    if (cleared > 0) {
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.score += LINE_SCORES[cleared] * this.level;
    }
    this.spawn();
    return cleared;
  }

  clearLines() {
    const remaining = this.board.filter((row) => row.some((cell) => !cell));
    const cleared = ROWS - remaining.length;
    while (remaining.length < ROWS) {
      remaining.unshift(Array(COLS).fill(null));
    }
    this.board = remaining;
    return cleared;
  }

  getGhostPiece() {
    let ghost = { ...this.active };
    while (!this.collides({ ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }

  togglePause() {
    if (this.gameOver) return false;
    this.paused = !this.paused;
    return this.paused;
  }

  get blocked() {
    return this.gameOver || this.paused;
  }
}

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}
