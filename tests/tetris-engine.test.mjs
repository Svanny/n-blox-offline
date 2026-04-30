import assert from "node:assert/strict";
import { AutoShift, FREE_TETRIS_TIMING, NBLOX_FAST_TIMING } from "../local/game/auto-shift.js";
import { NBLOX_UI, getBlockStyle } from "../local/game/nblox-assets.js";
import { COLS, ROWS, TetrisEngine, createEmptyBoard } from "../local/game/tetris-engine.js";

function fixedEngine() {
  return new TetrisEngine({ random: () => 0 });
}

function filledCell() {
  return { id: "X", color: "#fff" };
}

{
  assert.equal(COLS, 10);
  assert.equal(ROWS, 18);
}

{
  const engine = fixedEngine();
  engine.board = createEmptyBoard();
  engine.active = { id: "I", x: 7, y: 0, rotation: 1 };

  assert.equal(engine.rotate(1), false);
  assert.deepEqual(engine.active, { id: "I", x: 7, y: 0, rotation: 1 });
}

{
  const engine = fixedEngine();
  engine.board = createEmptyBoard();
  engine.board[ROWS - 1] = Array.from({ length: COLS }, (_, x) => (
    x >= 3 && x <= 6 ? null : filledCell()
  ));
  engine.active = { id: "I", x: 3, y: ROWS - 2, rotation: 0 };

  assert.equal(engine.lockPiece(), 1);
  assert.equal(engine.lines, 1);
  assert.equal(engine.level, 1);
  assert.equal(engine.score, 100);
  assert.ok(engine.board[ROWS - 1].every((cell) => cell === null));
}

{
  const engine = fixedEngine();
  engine.board = createEmptyBoard();
  engine.active = { id: "O", x: 3, y: 0, rotation: 0 };

  const distance = engine.hardDrop();
  assert.ok(distance > 0);
  assert.ok(engine.score >= distance * 2);
}

{
  const moves = [];
  const shift = new AutoShift(FREE_TETRIS_TIMING);
  shift.press("left", 0, (direction) => moves.push(direction));
  shift.update(169, (direction) => moves.push(direction));
  shift.update(170, (direction) => moves.push(direction));
  shift.update(220, (direction) => moves.push(direction));

  assert.deepEqual(moves, ["left", "left", "left"]);
}

{
  const moves = [];
  const shift = new AutoShift(NBLOX_FAST_TIMING);
  shift.press("right", 0, (direction) => moves.push(direction));
  shift.update(39, (direction) => moves.push(direction));
  shift.update(40, (direction) => moves.push(direction));

  assert.deepEqual(moves, ["right", "right"]);
}

{
  assert.equal(NBLOX_UI.labels.gameOver, "game over!");
  assert.deepEqual(getBlockStyle("I"), {
    base: "#66ccff",
    highlight: "#99ffff",
    shadow: "#3399cc",
    outline: "#001133"
  });
  assert.deepEqual(getBlockStyle("Z"), {
    base: "#ff0000",
    highlight: "#ff6666",
    shadow: "#cc0000",
    outline: "#330000"
  });
}
