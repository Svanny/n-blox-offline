import assert from "node:assert/strict";
import { applyBinding, defaultBindings, keyName } from "../local/shared/bindings.js";

const ACTIONS = [
  { id: "left", defaultCode: "ArrowLeft" },
  { id: "right", defaultCode: "ArrowRight" },
  { id: "rotate", defaultCode: "ArrowUp" }
];

{
  assert.equal(keyName("ArrowLeft"), "Left Arrow");
  assert.equal(keyName("Space"), "Space");
  assert.equal(keyName("KeyP"), "P");
  assert.equal(keyName("AltLeft"), "Option");
  assert.equal(keyName("Digit7"), "7");
  assert.equal(keyName("BracketLeft"), "BracketLeft");
}

{
  const bindings = defaultBindings(ACTIONS);
  assert.deepEqual(bindings, {
    left: "ArrowLeft",
    right: "ArrowRight",
    rotate: "ArrowUp"
  });
}

{
  const bindings = defaultBindings(ACTIONS);
  const next = applyBinding({ bindings, actions: ACTIONS, actionId: "right", code: "ArrowLeft" });

  // Collision: old "left" should revert to its default, and "right" takes the code.
  assert.deepEqual(next, {
    left: "ArrowLeft",
    right: "ArrowLeft",
    rotate: "ArrowUp"
  });
}
