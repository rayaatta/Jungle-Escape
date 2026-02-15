// Board dimensions. Changing these updates both rendering and path length.
const COLS = 10;
const ROWS = 12;

// Cache DOM elements once so we don't query repeatedly.
const board = document.querySelector("#board");
const statusText = document.querySelector("#status");
const pieceContainer = document.querySelector(".piece-container");
const resetBtn = document.querySelector(".reset-button");
const diceElement = document.querySelector(".dice");

const HUMAN_PLAYER_INDEX = 0;
const COMPUTER_PLAYER_INDEX = 1;
const COMPUTER_ROLL_DELAY_MS = 1000;
let computerRollTimerId = null;

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
/*Special tiles for fun effects */
const specialTiles = {
  4: { type: "snake", action: (player) => player.position -= 3 },
  30: { type: "tiger", action: (player) => player.skipNextTurn = true },
  18: { type: "monkey", action: swapWithOpponent },
  // Mark a one-time extra turn to be consumed in maybeAdvanceTurn().
  22: { type: "treasure", action: (player) => player.bonusRoll = true }
}

// Each player has independent state.
const users = [
  { name: "Player 1", piece: pieceOne, isInPlay: false, position: 0, skipNextTurn: false, bonusRoll: false },
  { name: "Computer", piece: pieceTwo, isInPlay: false, position: 0, skipNextTurn: false, bonusRoll: false },
];
let currentPlayerIndex = 0;
let gameOver = false;
let winModal = null;

renderBoard();
placePieces();
updateTurnStatus("Game started.");
winModal = typeof window.createWinModal === "function"
  ? window.createWinModal({ onReset: resetGame })
  : { show() {}, hide() {} };

// Bridge dice output to board movement logic.
document.addEventListener("dice:rolled", (event) => {
  const steps = event.detail?.value;
  handleDiceRoll(steps);
});

// Reset game state back to start area.
resetBtn.addEventListener("click", resetGame);

function resetGame() {
  clearComputerRollTimer();
  gameOver = false;
  winModal.hide();
  users.forEach((player) => {
    player.isInPlay = false;
    player.position = 0;
    player.skipNextTurn = false;
    player.bonusRoll = false;
  });
  currentPlayerIndex = HUMAN_PLAYER_INDEX;
  placePieces();
  updateTurnStatus("Game reset.");
}
/*
  TURN SYSTEM OVERVIEW

  - currentPlayerIndex tracks whose turn it is.
  - Rolling a 6 grants an extra turn.
  - advanceTurn() updates the index using modulo wrapping.
  - updateTurnStatus() reflects the current state in the UI.
  
  State Flow:
  handleDiceRoll() → maybeAdvanceTurn() → advanceTurn() → updateTurnStatus()
*/

/*Checks if roll is 6 for user to start playing and passes the true/false to the maybeAdvanceTurn function*/
function handleDiceRoll(steps) {
  if (gameOver) {
    return;
  }

  // Guard: only accept valid die values.
  if (!Number.isInteger(steps) || steps < 1 || steps > 6) {
    return;
  }

  const player = users[currentPlayerIndex];
  const rolledSix = steps === 6;

  if (!player.isInPlay) {
    // Entry rule: only a roll of 6 can move piece from base to tile 1.
    if (rolledSix) {
      player.isInPlay = true;
      player.position = 0;
      placePieces();
      maybeAdvanceTurn(`${player.name} rolled 6 and entered tile 1.`, rolledSix);
      return;
    }

    maybeAdvanceTurn(`${player.name} rolled ${steps}. Need a 6 to enter tile 1.`, rolledSix);
    return;
  }

  // Exact-roll win rule: overshoot means no movement this turn.
  if ((player.position + steps) > path.length - 1) {
    maybeAdvanceTurn(
      `${player.name} rolled ${steps} but needs the exact number to reach the temple.`,
      rolledSix
    );
    return;
  }

  player.position = player.position + steps;
  if (player.position === path.length - 1) {
    placePieces();
    gameOver = true;
    winModal.show(player.name);
    statusText.textContent = `${player.name} wins!`;
    clearComputerRollTimer();
    if (diceElement) {
      diceElement.style.pointerEvents = "none";
    }
    return;
  }
  placePieces();

  /*Check if the tile the player landed on has a special effect and apply it if so. 
  The message is shown before the effect is applied and there is a delay to allow the player to see the message and the piece sit on the tile before the tile effect is applied */
  const specialTile = specialTiles[player.position];
  if (specialTile) {
    /*preventing clicking the die during .8s delay */
  diceElement.style.pointerEvents = "none";
  statusText.textContent = `${player.name} hit a ${specialTile.type}!`;
  /*Delay to allow player to see the message and the piece sit on the tile before the tile effect is applied */
    setTimeout(() => {
      diceElement.style.pointerEvents = "auto";
      const actionMessage = specialTile.action(player);
      placePieces();
      const nextMessage = typeof actionMessage === "string"
        ? actionMessage
        : `${player.name} hit a ${specialTile.type} tile!`;
      maybeAdvanceTurn(nextMessage, rolledSix);
    }, 1000);
    return;
  }
  maybeAdvanceTurn(
    `${player.name} rolled ${steps} and moved to tile ${player.position + 1}.`,
    rolledSix
  );
}
/*the swap player function*/
function swapWithOpponent(player) {
  /*first  checking if both players are on the board */
  if(!users[0].isInPlay || !users[1].isInPlay) {
    return `${player.name} hit monkey tile, but swap did not apply yet.`;
  }
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponent = users[opponentIndex];
  
  // Swap positions.
  const tempPosition = player.position;
  player.position = opponent.position;
  opponent.position = tempPosition;
  return `${player.name} swapped positions with ${opponent.name}!`;
}
/*Advances the turn to the next player and updates the status message with an optional prefix for special cases like rolling a six or hitting a special tile. */
function advanceTurn(prefix) {
  currentPlayerIndex = (currentPlayerIndex + 1) % users.length;
  updateTurnStatus(prefix);
}
/*Gets message from dice roll and whether the roll was a six or not to determine whether the user can roll again.
 if its roll is not six the advanceTurn function is called and given the message of what the user rolled */
function maybeAdvanceTurn(prefix, rolledSix) {
  /*first checking if the player is computer or not to determine whether to add a delay before advancing the turn,
   this is to give the user a moment to see what the computer rolled before the turn changes back to the user */
function isComputer(player) {
  return player === users[COMPUTER_PLAYER_INDEX];
}
  const player = users[currentPlayerIndex];
  const gotTreasureBonus = player.bonusRoll;
  if (gotTreasureBonus) {
    // Consume bonus so treasure grants exactly one extra turn.
    player.bonusRoll = false;
  }
  /*If the user rolled a six they get an extra turn and the message is updated to reflect that,
   if not then the turn is advanced as normal and the message is updated to reflect what the user rolled.
   If player is computer and rolled a six,a delay is added before advancing the turn */
  if ((rolledSix || gotTreasureBonus) && isComputer(player)) {
    const reason = rolledSix ? "a 6" : "treasure";
    updateTurnStatus(`Computer got ${reason} and gets an extra turn!`);
    setTimeout(() => {
      maybeQueueComputerRoll();
    }, 900);
    updateTurnStatus(`Computer is rolling again...`);

    return;
  } else if (rolledSix || gotTreasureBonus) {
    const reason = rolledSix ? "a 6" : "treasure";
    updateTurnStatus(`${player.name} got ${reason} and gets an extra turn!`);
    return;
  }

  advanceTurn(prefix);
}
/*Shows whos turn it is */
function updateTurnStatus(prefix = "") {
  if (gameOver) {
    return;
  }

  // Skip effects are consumed when that player's turn starts.
  if (users[currentPlayerIndex].skipNextTurn) {
    const skippedPlayer = users[currentPlayerIndex].name;
    users[currentPlayerIndex].skipNextTurn = false;
    currentPlayerIndex = (currentPlayerIndex + 1) % users.length;
    updateTurnStatus(`${skippedPlayer} hit a tiger and skips this turn!`);
    return;
  }

  const nextPlayer = users[currentPlayerIndex].name;
  const turnMessage = `${nextPlayer}'s turn.`;
  statusText.textContent = prefix ? `${prefix} ${turnMessage}` : turnMessage;

  // Prevent manual clicks while computer is taking its turn.
  if (diceElement) {
    const humanTurn = currentPlayerIndex === HUMAN_PLAYER_INDEX;
    diceElement.style.pointerEvents = humanTurn ? "auto" : "none";
  }

  maybeQueueComputerRoll();
}

function clearComputerRollTimer() {
  if (computerRollTimerId !== null) {
    window.clearTimeout(computerRollTimerId);
    computerRollTimerId = null;
  }
}

function maybeQueueComputerRoll() {
  clearComputerRollTimer();

  if (currentPlayerIndex !== COMPUTER_PLAYER_INDEX) {
    return;
  }

  computerRollTimerId = window.setTimeout(() => {
    computerRollTimerId = null;

    // Guard in case reset/turn changed while waiting.
    if (currentPlayerIndex !== COMPUTER_PLAYER_INDEX) {
      return;
    }

    if (typeof window.rollDie === "function") {
      window.rollDie();
      return;
    }

    // Fallback if dice-script isn't available.
    const fallbackRoll = Math.floor(Math.random() * 6) + 1;
    handleDiceRoll(fallbackRoll);
  }, COMPUTER_ROLL_DELAY_MS);
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
        /* Explicit tile class mapping for now, easier to reason about while
        implementing progressive features like monkey swap / treasure extra roll. */
        if(tileIndex === 4) {
          cell.classList.add('snake');
          cell.textContent = '';
        } else if (tileIndex === 30) {
          cell.classList.add('tiger');
          cell.textContent = '';
        } else if (tileIndex === 18) {
          cell.classList.add('monkey');
          cell.textContent = '';
        } else if (tileIndex === 22) {
          cell.classList.add('treasure');
          cell.textContent = '';
        } else if(tileIndex === 39) {
          cell.classList.add('temple');
          cell.textContent = '';
        }
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
