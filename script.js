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

const pieceOne = document.createElement("div");
pieceOne.className = "piece-one";
const pieceTwo = document.createElement("div");
pieceTwo.className = "piece-two";

// Each player has independent state.
const users = [
  { name: "Player 1", piece: pieceOne, isInPlay: false, position: 0 },
  { name: "Player 2", piece: pieceTwo, isInPlay: false, position: 0 },
];
let currentPlayerIndex = 0;

renderBoard();
placePieces();
updateTurnStatus("Game started.");

// Bridge dice output to board movement logic.
document.addEventListener("dice:rolled", (event) => {
  const steps = event.detail?.value;
  handleDiceRoll(steps);
});

// Reset game state back to start area.
resetBtn.addEventListener("click", () => {
  users.forEach((player) => {
    player.isInPlay = false;
    player.position = 0;
  });
  currentPlayerIndex = 0;
  placePieces();
  updateTurnStatus("Game reset.");
});

function handleDiceRoll(steps) {
  // Guard: only allow realistic die values.
  if (!Number.isInteger(steps) || steps < 1 || steps > 6) {
    return;
  }

  const player = users[currentPlayerIndex];

  if (!player.isInPlay) {
    // Entry rule: only a roll of 6 can move piece from base to tile 1.
    if (steps === 6) {
      player.isInPlay = true;
      player.position = 0;
      placePieces();
      advanceTurn(`${player.name} rolled 6 and entered tile 1.`);
      return;
    }

    advanceTurn(`${player.name} rolled ${steps}. Need a 6 to enter tile 1.`);
    return;
  }

  // Clamp so the piece cannot move past the final tile.
  player.position = Math.min(player.position + steps, path.length - 1);
  placePieces();
  advanceTurn(`${player.name} rolled ${steps} and moved to tile ${player.position + 1}.`);
}

function advanceTurn(prefix) {
  currentPlayerIndex = (currentPlayerIndex + 1) % users.length;
  updateTurnStatus(prefix);
}

function updateTurnStatus(prefix = "") {
  const nextPlayer = users[currentPlayerIndex].name;
  const turnMessage = `${nextPlayer}'s turn.`;
  statusText.textContent = prefix ? `${prefix} ${turnMessage}` : turnMessage;
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

function placePieces() {
  // Place each piece according to that player's own state.
  users.forEach((player) => {
    if (!player.isInPlay) {
      pieceContainer.appendChild(player.piece);
      return;
    }

    tileEls[player.position].appendChild(player.piece);
  });
}
