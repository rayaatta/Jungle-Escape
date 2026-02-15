(function initWinModalApi() {
  function createNoopModal() {
    return {
      show() {},
      hide() {},
    };
  }

  function createWinModal(options = {}) {
    const modal = document.querySelector("#winModal");
    const message = document.querySelector("#winMessage");
    const title = document.querySelector("#winTitle");
    const closeBtn = document.querySelector("#closeWinModal");
    const resetBtn = document.querySelector("#modalResetBtn");

    if (!modal || !message) {
      return createNoopModal();
    }

    const onReset = typeof options.onReset === "function" ? options.onReset : null;
    const onClose = typeof options.onClose === "function" ? options.onClose : null;
    const focusTarget =
      options.focusTarget instanceof HTMLElement ? options.focusTarget : null;

    function launchConfetti() {
      if (typeof window.confetti !== "function") {
        return;
      }

      // A few short bursts for a lightweight celebration.
      window.confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 } });
      window.setTimeout(() => {
        window.confetti({ particleCount: 70, spread: 65, origin: { x: 0.2, y: 0.7 } });
      }, 120);
      window.setTimeout(() => {
        window.confetti({ particleCount: 70, spread: 65, origin: { x: 0.8, y: 0.7 } });
      }, 220);
    }

    function show(playerName) {
      const computerWon = String(playerName).toLowerCase() === "computer";

      if (computerWon) {
        if (title) {
          title.textContent = "You Lose 😢";
        }
        message.textContent = "Computer wins this round.";
      } else {
        if (title) {
          title.textContent = "You Win 🎉";
        }
        message.textContent = `${playerName} wins the game!`;
        launchConfetti();
      }

      modal.classList.add("is-visible");
      modal.setAttribute("aria-hidden", "false");
    }

    function hide() {
      // Move focus out of modal before hiding it from assistive tech.
      if (modal.contains(document.activeElement)) {
        const fallbackFocus = focusTarget || document.querySelector(".reset-button");
        if (fallbackFocus instanceof HTMLElement) {
          fallbackFocus.focus();
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }

      modal.classList.remove("is-visible");
      modal.setAttribute("aria-hidden", "true");
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        hide();
        if (onClose) {
          onClose();
        }
      });
    }

    if (resetBtn && onReset) {
      resetBtn.addEventListener("click", onReset);
    }

    return {
      show,
      hide,
    };
  }

  window.createWinModal = createWinModal;
})();
