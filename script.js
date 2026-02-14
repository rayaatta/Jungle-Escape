// Board dimensions. Changing these updates both rendering and path length.
const COLS = 10;
const ROWS = 12;

// Cache DOM elements once so we don't query repeatedly.
const board = document.querySelector("#board");
const controls = document.querySelector("#controls");
const moveInput = document.querySelector("#moveInput");
const resetBtn = document.querySelector("#resetBtn");
const statusText = document.querySelector("#status");

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

renderBoard();
placePiece();

// Move button/input submit handler.
controls.addEventListener("submit", (event) => {
  event.preventDefault();

  const steps = Number.parseInt(moveInput.value, 10);
  // Guard: only allow positive whole-number movement.
  if (!Number.isInteger(steps) || steps <= 0) {
    moveInput.focus();
    return;
  }

  // Clamp so the piece cannot move past the final tile.
  currentIndex = Math.min(currentIndex + steps, path.length - 1);
  placePiece();
  moveInput.value = "";
});

// Reset game state back to tile 1.
resetBtn.addEventListener("click", () => {
  currentIndex = 0;
  placePiece();
  moveInput.value = "";
  moveInput.focus();
});

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
  // Appending moves the same piece element from old tile to new tile.
  tileEls[currentIndex].appendChild(piece);
  statusText.textContent = `Piece is on tile ${currentIndex + 1}`;
}
