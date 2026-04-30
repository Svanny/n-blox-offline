export const KEY_NAMES = {
  ArrowLeft: "Left Arrow",
  ArrowRight: "Right Arrow",
  ArrowDown: "Down Arrow",
  ArrowUp: "Up Arrow",
  AltLeft: "Option",
  AltRight: "Option",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  ControlLeft: "Control",
  ControlRight: "Control",
  MetaLeft: "Command",
  MetaRight: "Command",
  Space: "Space",
  Escape: "Escape",
  Enter: "Enter",
  KeyP: "P",
  KeyO: "O",
  KeyW: "W",
  KeyA: "A",
  KeyS: "S",
  KeyD: "D",
  KeyK: "K"
};

export function keyName(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function defaultBindings(actions) {
  return Object.fromEntries(actions.map((action) => [action.id, action.defaultCode]));
}

export function loadBindings(storageKey, actions) {
  const defaults = defaultBindings(actions);
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
  } catch {
    return defaults;
  }
}

export function saveBindings(storageKey, bindings) {
  localStorage.setItem(storageKey, JSON.stringify(bindings));
}

export function applyBinding({ bindings, actions, actionId, code }) {
  const nextBindings = { ...bindings };

  actions.forEach((action) => {
    if (action.id !== actionId && nextBindings[action.id] === code) {
      nextBindings[action.id] = action.defaultCode;
    }
  });

  nextBindings[actionId] = code;
  return nextBindings;
}
