export const FREE_TETRIS_TIMING = {
  das: 170,
  arr: 50,
  softDrop: 35
};

export const NBLOX_FAST_TIMING = {
  das: 0,
  arr: 40,
  softDrop: 35
};

export class AutoShift {
  constructor(timing = FREE_TETRIS_TIMING) {
    this.timing = { ...timing };
    this.held = { left: false, right: false };
    this.activeDirection = null;
    this.pressedAt = 0;
    this.lastShiftAt = 0;
    this.dasReady = false;
  }

  setTiming(timing) {
    this.timing = { ...this.timing, ...timing };
    this.dasReady = this.timing.das === 0 && !!this.activeDirection;
  }

  press(direction, time, move) {
    if (this.held[direction] && this.activeDirection === direction) return;
    this.held[direction] = true;
    this.activeDirection = direction;
    this.pressedAt = time;
    this.lastShiftAt = time;
    this.dasReady = this.timing.das === 0;
    move(direction);
  }

  release(direction, time, move) {
    this.held[direction] = false;
    if (this.activeDirection !== direction) return;

    const fallback = direction === "left" ? "right" : "left";
    if (this.held[fallback]) {
      this.activeDirection = null;
      this.press(fallback, time, move);
      return;
    }

    this.activeDirection = null;
    this.dasReady = false;
  }

  update(time, move) {
    if (!this.activeDirection) return 0;

    if (!this.dasReady) {
      if (time - this.pressedAt < this.timing.das) return 0;
      this.dasReady = true;
      this.lastShiftAt = time;
      move(this.activeDirection);
      return 1;
    }

    const arr = Math.max(1, this.timing.arr);
    let shifted = 0;
    while (time - this.lastShiftAt >= arr) {
      this.lastShiftAt += arr;
      move(this.activeDirection);
      shifted += 1;
    }
    return shifted;
  }

  reset() {
    this.held.left = false;
    this.held.right = false;
    this.activeDirection = null;
    this.dasReady = false;
  }
}
