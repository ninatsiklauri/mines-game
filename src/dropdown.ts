let selected = 3;

export function setupMinesDropdown(onChange?: (value: number) => void) {
  const btn = document.getElementById(
    "mines-dropdown-btn",
  ) as HTMLButtonElement;
  const chosen = document.getElementById("mines-chosen") as HTMLSpanElement;
  const list = document.getElementById(
    "mines-dropdown-list",
  ) as HTMLUListElement;
  if (!btn || !chosen || !list) return;

  list.innerHTML = "";
  for (let i = 1; i <= 20; i++) {
    const li = document.createElement("li");
    li.textContent = i.toString();
    li.className = "mines-dropdown-item";
    if (i === selected) li.classList.add("selected");
    li.onclick = () => {
      selected = i;
      chosen.textContent = i.toString();
      Array.from(list.children).forEach((el) =>
        el.classList.remove("selected"),
      );
      li.classList.add("selected");
      list.style.display = "none";
      if (onChange) onChange(selected);
    };
    list.appendChild(li);
  }

  btn.onclick = (e) => {
    e.stopPropagation();
    list.style.display = list.style.display === "block" ? "none" : "block";
  };

  document.addEventListener("click", () => {
    list.style.display = "none";
  });
}

export function getSelectedMines() {
  return selected;
}

function getMultiplier(bombCount: number): string {
  const map: Record<number, string> = {
    1: "1.01x",
    2: "1.05x",
    3: "1.10x",
    4: "1.15x",
    5: "1.21x",
  };
  if (map[bombCount]) return map[bombCount];
  if (bombCount > 5) {
    const mult = 1.21 * Math.pow(1.1, bombCount - 5);
    return mult.toFixed(2) + "x";
  }
  return "1.00x";
}

function updateNextMultiplier(bombCount: number) {
  const nextContainer = document.querySelector("#next-container span");
  if (nextContainer) {
    nextContainer.textContent = getMultiplier(bombCount);
  }
}

function initGame(bombCount: number) {
  const pixiContainer = document.getElementById("pixi-container");
  if (pixiContainer) {
    pixiContainer.innerHTML = "";
  }

  updateNextMultiplier(bombCount);
}

setupMinesDropdown((value) => {
  initGame(value);
});

initGame(3);
