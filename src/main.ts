import { Application, Graphics } from "pixi.js";
import { setupMinesDropdown, getSelectedMines } from "./dropdown";

const nextMultipliers = [
  1.01, 1.05, 1.10, 1.15, 1.21, 1.26, 1.34, 1.42, 1.51, 1.61,
  1.73, 1.86, 2.02, 2.20, 2.42, 2.69, 3.03, 3.46, 4.04, 4.85
];

class MinesGame {
  app: Application | null = null;
  squares: { g: Graphics; isBomb: boolean; revealed: boolean }[] = [];
  gameOver = false;
  currentBalance = 3000.0;
  isAutoRestarting = false;
  currentMultiplier = 1.0;

  constructor() {
    this.drawInactiveGrid();
    setupMinesDropdown(() => {
      this.drawInactiveGrid();
      this.updateNextMultiplierUIForMines(getSelectedMines());
    });
    this.setupEventListeners();
    this.setupBetKeypad();
    this.setupBetList();
  }

  drawInactiveGrid() {
    const betBtn = document.querySelector(".bet-main-btn") as HTMLButtonElement | null;
    const cashoutBtn = document.querySelector(".cashout-btn") as HTMLButtonElement | null;
    if (betBtn) betBtn.style.display = "flex";
    if (cashoutBtn) cashoutBtn.style.display = "none";
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      pixiContainer.innerHTML = "";
    }
    this.app = new Application();
    this.app
      .init({ background: "#024594", width: 500, height: 500 })
      .then(() => {
        document
          .getElementById("pixi-container")!
          .appendChild(this.app!.canvas);
        const gridSize = 5;
        const cellSize = 60;
        const padding = 10;
        const gridPixelSize = gridSize * cellSize + (gridSize - 1) * padding;
        const startX = (500 - gridPixelSize) / 2;
        const startY = (500 - gridPixelSize) / 2;
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const square = new Graphics();
            square.lineStyle(2, 0x3fa9f5);
            square.beginFill(0x0a2a47);
            square.drawRoundedRect(0, 0, cellSize, cellSize, 10);
            square.endFill();
            square.beginFill(0x2176ae);
            square.drawCircle(cellSize / 2, cellSize / 2, 14);
            square.endFill();
            square.x = startX + col * (cellSize + padding);
            square.y = startY + row * (cellSize + padding);
            this.app!.stage.addChild(square);
          }
        }
      });
  }

  setBetControlsDisabled(disabled: boolean) {
    const minesDropdownBtn = document.getElementById("mines-dropdown-btn") as HTMLButtonElement;
    const betInput = document.getElementById("bet-amount-input") as HTMLInputElement;
    const betPlusBtn = document.querySelector(".bet-plus") as HTMLButtonElement;
    const betMinusBtn = document.querySelector(".bet-minus") as HTMLButtonElement;
    const betStackBtn = document.querySelector(".bet-stack") as HTMLButtonElement;
    if (minesDropdownBtn) minesDropdownBtn.disabled = disabled;
    if (betInput) betInput.disabled = disabled;
    if (betPlusBtn) betPlusBtn.disabled = disabled;
    if (betMinusBtn) betMinusBtn.disabled = disabled;
    if (betStackBtn) betStackBtn.disabled = disabled;
    document.querySelectorAll(".bet-list-btn").forEach((btn) => {
      (btn as HTMLButtonElement).disabled = disabled;
    });
  }

  updateProgressBar(safeRevealed: number, totalSafe: number) {
    const bar = document.getElementById("progress-bar-fill") as HTMLDivElement;
    if (bar) {
      const percent = totalSafe === 0 ? 0 : (safeRevealed / totalSafe) * 100;
      bar.style.width = percent + "%";
    }
  }

  updateNextMultiplierUI() {
    const nextSpan = document.querySelector("#next-container span");
    if (nextSpan) {
      nextSpan.textContent = this.currentMultiplier.toFixed(2) + "x";
    }
  }

  updateNextMultiplierUIForMines(mines: number) {
    const nextSpan = document.querySelector("#next-container span");
    if (nextSpan) {
      const idx = Math.max(0, Math.min(nextMultipliers.length - 1, mines - 1));
      nextSpan.textContent = nextMultipliers[idx].toFixed(2) + "x";
    }
  }

  updateCashoutButtonWin() {
    const betAmount = parseFloat(
      (document.getElementById("bet-amount-input") as HTMLInputElement)?.value || "0.30"
    );
    const winnings = betAmount * this.currentMultiplier;
    const cashoutBtn = document.querySelector(".cashout-btn") as HTMLButtonElement;
    if (cashoutBtn) {
      cashoutBtn.innerHTML = `<span class="cashout-icon">💰</span> CASH OUT $${winnings.toFixed(2)}`;
    }
  }

  resetCashoutButton() {
    const cashoutBtn = document.querySelector(".cashout-btn") as HTMLButtonElement;
    if (cashoutBtn) {
      cashoutBtn.innerHTML = `<span class="cashout-icon">💰</span> CASH OUT`;
    }
  }

  updateBalance(newBalance: number) {
    this.currentBalance = newBalance;
    const balanceElement = document.querySelector(".header-balance");
    if (balanceElement) {
      balanceElement.textContent = newBalance.toFixed(2) + " USD";
    }
  }

  initGame(bombCount: number) {
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      pixiContainer.innerHTML = "";
    }
    this.app = new Application();
    this.app.init({ background: "#024594", width: 500, height: 500 }).then(() => {
      document.getElementById("pixi-container")!.appendChild(this.app!.canvas);
      const gridSize = 5;
      const cellSize = 60;
      const padding = 10;
      const gridPixelSize = gridSize * cellSize + (gridSize - 1) * padding;
      const startX = (500 - gridPixelSize) / 2;
      const startY = (500 - gridPixelSize) / 2;
      const totalCells = gridSize * gridSize;
      const bombIndices = new Set<number>();
      while (bombIndices.size < bombCount) {
        bombIndices.add(Math.floor(Math.random() * totalCells));
      }
      this.squares = [];
      this.gameOver = false;
      let cellIndex = 0;
      let safeRevealed = 0;
      const totalSafe = totalCells - bombCount;
      this.updateProgressBar(0, totalSafe);
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const square = new Graphics();
          square.lineStyle(2, 0x3fa9f5);
          square.beginFill(0x0a2a47);
          square.drawRoundedRect(0, 0, cellSize, cellSize, 10);
          square.endFill();
          square.beginFill(0x2176ae);
          square.drawCircle(cellSize / 2, cellSize / 2, 14);
          square.endFill();
          square.x = startX + col * (cellSize + padding);
          square.y = startY + row * (cellSize + padding);
          square.eventMode = "static";
          square.cursor = "pointer";
          const isBomb = bombIndices.has(cellIndex);
          const thisIndex = cellIndex;
          this.squares.push({ g: square, isBomb, revealed: false });
          square.on("pointerdown", () => {
            if (this.gameOver || this.squares[thisIndex].revealed) return;
            this.squares[thisIndex].revealed = true;
            square.clear();
            square.lineStyle(2, 0x3fa9f5);
            if (isBomb) {
              this.gameOver = true;
              this.updateProgressBar(0, totalSafe);
              this.setBetControlsDisabled(false);
              const betBtn = document.querySelector(".bet-main-btn") as HTMLButtonElement;
              const cashoutBtn = document.querySelector(".cashout-btn") as HTMLButtonElement;
              if (betBtn) betBtn.style.display = "none";
              if (cashoutBtn) cashoutBtn.style.display = "flex";
              setTimeout(() => {
                if (betBtn) {
                  this.isAutoRestarting = true;
                  betBtn.click();
                  this.isAutoRestarting = false;
                }
                if (cashoutBtn) cashoutBtn.style.display = "none";
                if (betBtn) betBtn.style.display = "flex";
                this.setBetControlsDisabled(false);
              }, 2000);
              for (let i = 0; i < this.squares.length; i++) {
                const sq = this.squares[i];
                sq.g.clear();
                sq.g.lineStyle(2, 0x3fa9f5);
                if (sq.isBomb) {
                  sq.g.beginFill(0xff2d55);
                  sq.g.drawRoundedRect(0, 0, cellSize, cellSize, 10);
                  sq.g.endFill();
                  sq.g.beginFill(0x000000);
                  sq.g.drawCircle(cellSize / 2, cellSize / 2, 14);
                  sq.g.endFill();
                  sq.g.lineStyle(3, 0xffffff);
                  sq.g.moveTo(cellSize / 2 - 8, cellSize / 2 - 8);
                  sq.g.lineTo(cellSize / 2 + 8, cellSize / 2 + 8);
                  sq.g.moveTo(cellSize / 2 + 8, cellSize / 2 - 8);
                  sq.g.lineTo(cellSize / 2 - 8, cellSize / 2 + 8);
                } else {
                  sq.g.beginFill(0x3fd37a);
                  sq.g.drawRoundedRect(0, 0, cellSize, cellSize, 10);
                  sq.g.endFill();
                  sq.g.beginFill(0x2176ae);
                  sq.g.drawCircle(cellSize / 2, cellSize / 2, 14);
                  sq.g.endFill();
                }
                sq.revealed = true;
              }
            } else {
              square.beginFill(0x3fd37a);
              square.drawRoundedRect(0, 0, cellSize, cellSize, 10);
              square.endFill();
              square.beginFill(0x2176ae);
              square.drawCircle(cellSize / 2, cellSize / 2, 14);
              square.endFill();
              safeRevealed++;
              this.updateProgressBar(safeRevealed, totalSafe);
              const revealed = this.squares.filter((sq) => sq.revealed).length;
              const remaining = totalCells - revealed;
              const safeLeft = totalCells - bombCount - safeRevealed + 1;
              if (remaining > 0 && safeLeft > 0) {
                const prob = safeLeft / remaining;
                this.currentMultiplier = this.currentMultiplier * (1 / prob);
                this.updateNextMultiplierUI();
                this.updateCashoutButtonWin();
              }
            }
          });
          this.app!.stage.addChild(square);
          cellIndex++;
        }
      }
    });
  }

  setupEventListeners() {
    const betBtn = document.querySelector(".bet-main-btn") as HTMLButtonElement;
    const cashoutBtn = document.querySelector(".cashout-btn") as HTMLButtonElement;
    const randomBtn = document.querySelector(".random-btn") as HTMLButtonElement;
    if (betBtn) {
      betBtn.addEventListener("click", () => {
        const betAmount = parseFloat(
          (document.getElementById("bet-amount-input") as HTMLInputElement)?.value || "0.30"
        );
        if (!this.isAutoRestarting) {
          this.currentBalance -= betAmount;
          this.updateBalance(this.currentBalance);
        }
        this.setBetControlsDisabled(true);
        const mines = getSelectedMines();
        const idx = Math.max(0, Math.min(nextMultipliers.length - 1, mines - 1));
        this.currentMultiplier = nextMultipliers[idx];
        this.updateNextMultiplierUIForMines(mines);
        this.resetCashoutButton();
        this.initGame(mines);
        if (!this.isAutoRestarting) {
          betBtn.style.display = "none";
          if (cashoutBtn) cashoutBtn.style.display = "flex";
        }
      });
    }
    if (cashoutBtn) {
      cashoutBtn.addEventListener("click", () => {
        if (this.gameOver) return;
        const bet = parseFloat(
          (document.getElementById("bet-amount-input") as HTMLInputElement)?.value || "0.30"
        );
        this.currentBalance += bet * this.currentMultiplier;
        this.updateBalance(this.currentBalance);
        this.gameOver = true;
        this.setBetControlsDisabled(false);
        cashoutBtn.style.display = "none";
        betBtn.style.display = "flex";
        
        // Reset progress bar to 0
        this.updateProgressBar(0, 1);
        
        // Reset multiplier to initial value
        const mines = getSelectedMines();
        const idx = Math.max(0, Math.min(nextMultipliers.length - 1, mines - 1));
        this.currentMultiplier = nextMultipliers[idx];
        this.updateNextMultiplierUIForMines(mines);
        
        this.drawInactiveGrid();
      });
    }
    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        if (this.gameOver) return;
        const unrevealed = this.squares.filter((sq) => !sq.revealed);
        if (unrevealed.length > 0) {
          const randomIndex = Math.floor(Math.random() * unrevealed.length);
          const randomSquare = unrevealed[randomIndex];
          if (!this.gameOver && !randomSquare.revealed) {
            randomSquare.revealed = true;
            randomSquare.g.clear();
            randomSquare.g.lineStyle(2, 0x3fa9f5);
            if (randomSquare.isBomb) {
              this.gameOver = true;
              const totalSafe = this.squares.length - getSelectedMines();
              this.updateProgressBar(0, totalSafe);
              this.setBetControlsDisabled(false);
              betBtn.style.display = "none";
              if (cashoutBtn) cashoutBtn.style.display = "flex";
              setTimeout(() => {
                if (betBtn) {
                  this.isAutoRestarting = true;
                  betBtn.click();
                  this.isAutoRestarting = false;
                }
                if (cashoutBtn) cashoutBtn.style.display = "none";
                betBtn.style.display = "flex";
                this.setBetControlsDisabled(false);
              }, 2000);
              for (let i = 0; i < this.squares.length; i++) {
                const sq = this.squares[i];
                sq.g.clear();
                sq.g.lineStyle(2, 0x3fa9f5);
                if (sq.isBomb) {
                  sq.g.beginFill(0xff2d55);
                  sq.g.drawRoundedRect(0, 0, 60, 60, 10);
                  sq.g.endFill();
                  sq.g.beginFill(0x000000);
                  sq.g.drawCircle(30, 30, 14);
                  sq.g.endFill();
                } else {
                  sq.g.beginFill(0x3fd37a);
                  sq.g.drawRoundedRect(0, 0, 60, 60, 10);
                  sq.g.endFill();
                  sq.g.beginFill(0x2176ae);
                  sq.g.drawCircle(30, 30, 14);
                  sq.g.endFill();
                }
                sq.revealed = true;
              }
            } else {
              randomSquare.g.beginFill(0x3fd37a);
              randomSquare.g.drawRoundedRect(0, 0, 60, 60, 10);
              randomSquare.g.endFill();
              randomSquare.g.beginFill(0x2176ae);
              randomSquare.g.drawCircle(30, 30, 14);
              randomSquare.g.endFill();
              const safeRevealed = this.squares.filter((sq) => sq.revealed && !sq.isBomb).length;
              const totalSafe = this.squares.length - getSelectedMines();
              this.updateProgressBar(safeRevealed, totalSafe);
              const totalCells = this.squares.length;
              const revealed = this.squares.filter((sq) => sq.revealed).length;
              const remaining = totalCells - revealed;
              const safeLeft = totalCells - getSelectedMines() - safeRevealed + 1;
              if (remaining > 0 && safeLeft > 0) {
                const prob = safeLeft / remaining;
                this.currentMultiplier = this.currentMultiplier * (1 / prob);
                this.updateNextMultiplierUI();
                this.updateCashoutButtonWin();
              }
            }
          }
        }
      });
    }
  }

  setupBetKeypad() {
    const betInput = document.getElementById("bet-amount-input") as HTMLInputElement;
    const keypadContainer = document.getElementById("keypad-container") as HTMLDivElement;
    if (!betInput || !keypadContainer) return;

    function showKeypad() {
      keypadContainer.style.display = "flex";
      setTimeout(() => {
        document.addEventListener("mousedown", handleOutsideClick);
      }, 0);
    }
    function hideKeypad() {
      keypadContainer.style.display = "none";
      document.removeEventListener("mousedown", handleOutsideClick);
      if (!betInput.value) {
        betInput.value = "0.30";
      }
    }

    function handleOutsideClick(e: MouseEvent) {
      if (!keypadContainer.contains(e.target as Node) && e.target !== betInput) {
        hideKeypad();
      }
    }

    betInput.addEventListener("click", () => {
      showKeypad();
    });

    keypadContainer.querySelectorAll(".keypad-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = (btn as HTMLButtonElement).textContent || "";
        if (btn.classList.contains("keypad-backspace")) {
          betInput.value = betInput.value.slice(0, -1);
        } else if (btn.classList.contains("keypad-confirm")) {
          hideKeypad();
        } else {
          if (key === "." && betInput.value.includes(".")) return;
          if (key === "0" && betInput.value === "0") return;
          if (
            betInput.value.includes(".") &&
            betInput.value.split(".")[1].length >= 2
          )
            return;
          betInput.value += key;
        }
      });
    });
  }

  setupBetList() {
    const betInput = document.getElementById("bet-amount-input") as HTMLInputElement;
    const betListContainer = document.getElementById("bet-list-container") as HTMLDivElement;
    const betStackBtn = document.querySelector(".bet-stack") as HTMLButtonElement;
    const betPlusBtn = document.querySelector(".bet-plus") as HTMLButtonElement;
    const betMinusBtn = document.querySelector(".bet-minus") as HTMLButtonElement;
    if (!betInput || !betListContainer) return;

    const betValues = [
      "0.10",
      "0.20",
      "0.30",
      "0.40",
      "0.50",
      "0.60",
      "0.70",
      "0.80",
      "1.20",
      "2.00",
      "4.00",
      "10.00",
      "20.00",
      "50.00",
      "100.00",
    ];

    const betBtns = Array.from(
      betListContainer.querySelectorAll(".bet-list-btn"),
    );

    function showBetList() {
      betListContainer.style.display = "flex";
      setTimeout(() => {
        document.addEventListener("mousedown", handleOutsideClick);
      }, 0);
    }
    function hideBetList() {
      betListContainer.style.display = "none";
      document.removeEventListener("mousedown", handleOutsideClick);
    }
    function handleOutsideClick(e: MouseEvent) {
      if (
        !betListContainer.contains(e.target as Node) &&
        e.target !== betInput &&
        e.target !== betStackBtn
      ) {
        hideBetList();
      }
    }

    if (betStackBtn) {
      betStackBtn.addEventListener("click", () => {
        showBetList();
      });
    }

    betInput.addEventListener("click", () => {
      if (betListContainer.style.display === "flex") {
        hideBetList();
      }
    });

    betBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        betBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        betInput.value = btn.textContent || "";
        hideBetList();
      });
    });

    if (betPlusBtn) {
      betPlusBtn.addEventListener("click", () => {
        const current = parseFloat(betInput.value);
        const next = betValues.find((v) => parseFloat(v) > current);
        if (next) {
          betInput.value = next;
          betBtns.forEach((b) => b.classList.remove("selected"));
          const btn = betBtns.find((b) => b.textContent === betInput.value);
          if (btn) btn.classList.add("selected");
        }
      });
    }
    if (betMinusBtn) {
      betMinusBtn.addEventListener("click", () => {
        const current = parseFloat(betInput.value);
        const prev = [...betValues]
          .reverse()
          .find((v) => parseFloat(v) < current);
        if (prev) {
          betInput.value = prev;
          betBtns.forEach((b) => b.classList.remove("selected"));
          const btn = betBtns.find((b) => b.textContent === betInput.value);
          if (btn) btn.classList.add("selected");
        }
      });
    }
  }
}

// Initialize the game
const game = new MinesGame();
