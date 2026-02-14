const dice = document.querySelector('.dice');

// Safe guard: lets this file exist on pages that do not render the die.
if (!dice) {
  console.warn('Dice element (.dice) was not found in the DOM.');
} else {
  initDice(dice);
}

function initDice(element) {
  // Camera tilt for the resting view (do not change unless you also retune face mapping).
  const BASE_ANGLE = { x: -24, y: 35 };
  // Mapping contract:
  // value -> extra rotation needed to bring that value to the front face.
  // Keep these values in sync with CSS face placement classes (.one ... .six).
  const FACE_ROTATION = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 0, y: 180 },
  };

  // Internal component state.
  // spinX/spinY store accumulated full turns so each roll can spin naturally.
  const state = {
    value: 1,
    spinX: 0,
    spinY: 0,
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function setFace(value) {
    const face = FACE_ROTATION[value];
    const x = BASE_ANGLE.x + state.spinX + face.x;
    const y = BASE_ANGLE.y + state.spinY + face.y;

    state.value = value;
    element.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    // CSS reads this to highlight the active face:
    // .dice[data-value="N"] .N-face-class
    element.dataset.value = String(value);
    element.setAttribute('aria-label', `Die showing ${value}`);
  }

  function rollDie() {
    const value = randomInt(1, 6);

    // Add full turns so rolls feel natural before landing on the chosen face.
    state.spinX += randomInt(1, 2) * 360;
    state.spinY += randomInt(1, 2) * 360;

    setFace(value);

    // Game systems can listen for this and use e.detail.value directly.
    document.dispatchEvent(new CustomEvent('dice:rolled', { detail: { value } }));

    return value;
  }

  function getLastRoll() {
    return state.value;
  }

  // Public API for the rest of your game:
  // - window.rollDie(): rolls and returns 1..6
  // - window.getLastRoll(): returns latest resolved value
  window.rollDie = rollDie;
  window.getLastRoll = getLastRoll;

  // Local interaction for this component.
  element.addEventListener('click', rollDie);
  // Initial paint must call setFace so data-value is present for CSS highlighting.
  setFace(state.value);
}
