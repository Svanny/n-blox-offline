const BLOCK_STYLE_BY_SHAPE_ID = {
  3: { base: "#ff0000", highlight: "#ff6666", shadow: "#cc0000", outline: "#330000" },
  4: { base: "#ffff00", highlight: "#ffff99", shadow: "#ffcc00", outline: "#333300" },
  5: { base: "#00ff00", highlight: "#66ff66", shadow: "#00cc00", outline: "#003300" },
  6: { base: "#66ccff", highlight: "#99ffff", shadow: "#3399cc", outline: "#001133" },
  7: { base: "#0000ff", highlight: "#6666ff", shadow: "#0000cc", outline: "#000033" },
  8: { base: "#cc00ff", highlight: "#cc66ff", shadow: "#9900cc", outline: "#110033" },
  9: { base: "#ff6600", highlight: "#ff9933", shadow: "#cc6600", outline: "#331100" }
};

const PIECE_TO_SHAPE_ID = {
  Z: 3,
  O: 4,
  S: 5,
  I: 6,
  J: 7,
  T: 8,
  L: 9
};

const FALLBACK_STYLE = { base: "#66ccff", highlight: "#99ffff", shadow: "#3399cc", outline: "#001133" };

export const NBLOX_UI = {
  fontDisplay: "\"Angie's New House_26pt_st\", \"Trebuchet MS\", Verdana, sans-serif",
  fontUi: "\"Arial Bold\", Arial, sans-serif",
  labels: {
    title: "N-BLOX",
    chooseLevel: "choose level:",
    playGame: "play game",
    quitGame: "quit game?",
    yes: "yes",
    no: "no",
    score: "score",
    lines: "lines",
    level: "level",
    next: "next",
    pauseMenu: "pause",
    quitMenu: "quit",
    pause: "paused",
    gameOver: "game over!",
    replay: "play again",
    restart: "Press any move to restart"
  },
  panel: {
    border: "#7584a5",
    highlight: "#e2edf9",
    fill: "#d9e6f4",
    stage: "#dce8f5",
    stripe: "#eef5fb",
    text: "#43516d",
    textDark: "#0a0f1b",
    link: "#0077b5"
  },
  footer: {
    startTop: "© Tetris Holding, LLC. Tetris N-Blox developed by",
    startLink: "Neave Interactive.",
    startBottom: "Tetris®, N-Blox™ & the Tetris trade dress are owned by Tetris Holding, LLC.",
    gameTop: "Powered by Tetris Friends Online Games.",
    gameBottom: "Visit today at",
    gameLink: "www.tetrisfriends.com."
  }
};

export const NBLOX_STAGE = {
  width: 360,
  height: 360,
  board: { x: 24, y: 8, cell: 16, cols: 10, rows: 18 },
  side: { x: 205, y: 8, width: 136, height: 304 },
  nextBox: { x: 205, y: 8, width: 136, height: 74 },
  stats: { x: 205, y: 88, width: 136, height: 118 },
  menuY: 213,
  logo: { x: 205, y: 224, width: 136, height: 86 },
  footer: { y: 318, height: 42 },
  startBox: { x: 100, y: 146, width: 160, height: 105 },
  quitBox: { x: 24, y: 83, width: 160, height: 83 }
};

export function getBlockStyle(pieceId) {
  const shapeId = PIECE_TO_SHAPE_ID[pieceId];
  return BLOCK_STYLE_BY_SHAPE_ID[shapeId] || FALLBACK_STYLE;
}
