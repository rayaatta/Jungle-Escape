// Board dimensions. Changing these updates both rendering and path length.
const COLS = 10;
const ROWS = 12;

// Cache DOM elements once so we don't query repeatedly.
const board = document.querySelector("#board");
const statusText = document.querySelector("#status");
const pieceContainer = document.querySelector(".piece-container");
const resetBtn = document.querySelector(".reset-button");

// Keep CSS grid values in sync with JS board settings.
board.style.setProperty("--cols", COLS);
board.style.setProperty("--rows", ROWS);

// `path` holds tile coordinates in movement order (tile 1 -> last tile).
const path = buildPath(COLS, ROWS);
// `tileEls[i]` is the DOM element for tile number i + 1.
const tileEls = [];
const piece = document.createElement("div");
piece.className = "piece";

// Current tile index (0-based). 0 means tile 1.
let currentIndex = 0;
// Piece starts in base and must roll 6 to enter the board.
let isInPlay = false;

renderBoard();
placePiece();

// Bridge dice output to board movement logic.
document.addEventListener("dice:rolled", (event) => {
  const steps = event.detail?.value;
  handleDiceRoll(steps);
});


// Reset game state back to tile 1.
resetBtn.addEventListener("click", () => {
  currentIndex = 0;
  isInPlay = false;
  placePiece();
});

function handleDiceRoll(steps) {
  // Guard: only allow realistic die values.
  if (!Number.isInteger(steps) || steps < 1 || steps > 6) {
    return;
  }

  if (!isInPlay) {
    // Entry rule: only a roll of 6 can move piece from base to tile 1.
    if (steps === 6) {
      isInPlay = true;
      currentIndex = 0;
      placePiece();
      return;
    }

    statusText.textContent = `Rolled ${steps}. Need a 6 to enter tile 1.`;
    return;
  }

  // Clamp so the piece cannot move past the final tile.
  currentIndex = Math.min(currentIndex + steps, path.length - 1);
  placePiece();
}

function buildPath(cols, rows) {
  const positions = [];

  // Top edge: left -> right.
  for (let col = 0; col < cols; col += 1) {
    positions.push([0, col]);
  }

  // Right edge: top -> bottom (excluding corners already added).
  for (let row = 1; row < rows - 1; row += 1) {
    positions.push([row, cols - 1]);
  }

  // Bottom edge: right -> left.
  for (let col = cols - 1; col >= 0; col -= 1) {
    positions.push([rows - 1, col]);
  }

  // Left edge: bottom -> top (excluding corners already added).
  for (let row = rows - 2; row >= 1; row -= 1) {
    positions.push([row, 0]);
  }

  return positions;
}

function renderBoard() {
  // Fast lookup: "row-col" -> tile index on the movement path.
  const pathMap = new Map(path.map((coords, index) => [`${coords[0]}-${coords[1]}`, index]));

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("div");
      cell.classList.add("cell");

      const tileIndex = pathMap.get(`${row}-${col}`);
      if (tileIndex === undefined) {
        cell.classList.add("empty");
      } else {
        cell.classList.add("tile");
        cell.textContent = String(tileIndex + 1);
        tileEls[tileIndex] = cell;
      }

      board.appendChild(cell);
    }
  }
}

function placePiece() {
  if (!isInPlay) {
    // Piece waits in base until a 6 is rolled.
    pieceContainer.appendChild(piece);
    statusText.textContent = "Piece is in start area. Roll 6 to enter tile 1.";
  } else {
    // Appending moves the same piece element from old tile to new tile.
    tileEls[currentIndex].appendChild(piece);
    statusText.textContent = `Piece is on tile ${currentIndex + 1}`;
  }
}
