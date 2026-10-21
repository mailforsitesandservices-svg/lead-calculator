"use strict";

const form = document.querySelector("#calculator");
const fields = ["spend", "clicks", "leads", "sales", "revenue"];
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 2 });

function readValue(name) {
  const input = form.elements.namedItem(name);
  const value = input.valueAsNumber;
  const empty = input.value === "" && !input.validity.badInput;
  const isMoney = name === "spend" || name === "revenue";
  let error = "";
  if (!empty) {
    if (!Number.isFinite(value) || input.validity.badInput) error = "Введите корректное число.";
    else if (value < 0) error = "Значение не может быть отрицательным.";
    else if (!isMoney && !Number.isInteger(value)) error = "Введите целое число.";
    else if (isMoney && input.validity.stepMismatch) error = "Укажите сумму с точностью до копеек.";
  }
  document.getElementById(`${name}-error`).textContent = error;
  input.setAttribute("aria-invalid", String(Boolean(error)));
  return empty || error ? null : value;
}

function showRatio(id, numerator, denominator, formatter) {
  const ratio = numerator !== null && denominator !== null && denominator > 0 ? numerator / denominator : NaN;
  document.getElementById(id).textContent = Number.isFinite(ratio) ? formatter.format(ratio) : "—";
}

function calculate() {
  const [spend, clicks, leads, sales, revenue] = fields.map(readValue);
  showRatio("cpc", spend, clicks, money);
  showRatio("click-conversion", leads, clicks, percent);
  showRatio("cpl", spend, leads, money);
  showRatio("sale-conversion", sales, leads, percent);
  showRatio("cps", spend, sales, money);
  showRatio("romi", revenue !== null && spend !== null ? revenue - spend : null, spend, percent);
}

form.addEventListener("input", calculate);
form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("reset", () => {
  // Событие reset срабатывает до очистки полей браузером.
  setTimeout(calculate, 0);
});
document.getElementById("example").addEventListener("click", () => {
  [50000, 2000, 100, 20, 150000].forEach((value, index) => {
    form.elements.namedItem(fields[index]).value = value;
  });
  calculate();
});
calculate();

const storageKey = "lead-calculator.periods.v1";
const periodInput = document.getElementById("period");
const periodError = document.getElementById("period-error");
const saveStatus = document.getElementById("save-status");
const historyBody = document.getElementById("history-body");
const snapshotColumns = ["period", "spend", "leads", "cpl", "sales", "cps", "romi"];

function loadHistory() {
  const saved = localStorage.getItem(storageKey);
  if (saved === null) return [];
  const entries = JSON.parse(saved);
  if (!Array.isArray(entries) || !entries.every(entry => entry &&
    snapshotColumns.every(key => typeof entry[key] === "string"))) {
    throw new Error("Invalid history");
  }
  return entries;
}

function renderHistory(entries) {
  historyBody.replaceChildren();
  document.getElementById("history-empty").hidden = entries.length > 0;
  entries.forEach((entry, index) => {
    const row = document.createElement("tr");
    snapshotColumns.forEach(key => {
      const cell = document.createElement("td");
      cell.textContent = entry[key];
      row.append(cell);
    });
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reset";
    button.textContent = "Удалить";
    button.setAttribute("aria-label", `Удалить период ${entry.period}`);
    button.addEventListener("click", () => {
      const remaining = entries.filter((_, entryIndex) => entryIndex !== index);
      if (persistHistory(remaining)) {
        const nextButton = historyBody.querySelectorAll("button")[Math.min(index, remaining.length - 1)];
        (nextButton || document.getElementById("save-period")).focus();
        saveStatus.textContent = "Период удалён.";
      }
    });
    action.append(button);
    row.append(action);
    historyBody.append(row);
  });
}

function persistHistory(entries) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
    renderHistory(entries);
    return true;
  } catch {
    saveStatus.textContent = "Не удалось сохранить изменения в браузере. Проверьте доступ к хранилищу и свободное место.";
    return false;
  }
}

periodInput.addEventListener("input", () => {
  periodError.textContent = "";
  periodInput.setAttribute("aria-invalid", "false");
});
form.addEventListener("reset", () => {
  periodError.textContent = "";
  periodInput.setAttribute("aria-invalid", "false");
  saveStatus.textContent = "";
});
document.getElementById("save-period").addEventListener("click", () => {
  calculate();
  const period = periodInput.value.trim();
  periodError.textContent = period ? "" : "Введите название периода.";
  periodInput.setAttribute("aria-invalid", String(!period));
  if (!period) {
    periodInput.focus();
    return;
  }
  const invalid = fields.find(name => form.elements.namedItem(name).getAttribute("aria-invalid") === "true");
  if (invalid) {
    saveStatus.textContent = "Исправьте ошибки в полях перед сохранением.";
    form.elements.namedItem(invalid).focus();
    return;
  }
  const values = fields.map(readValue);
  if (values.every(value => value === null)) {
    saveStatus.textContent = "Введите данные расчёта перед сохранением.";
    return;
  }
  const count = new Intl.NumberFormat("ru-RU");
  const entry = {
    period,
    spend: values[0] === null ? "—" : money.format(values[0]),
    leads: values[2] === null ? "—" : count.format(values[2]),
    sales: values[3] === null ? "—" : count.format(values[3]),
    cpl: document.getElementById("cpl").textContent,
    cps: document.getElementById("cps").textContent,
    romi: document.getElementById("romi").textContent,
    inputs: Object.fromEntries(fields.map((name, index) => [name, values[index]]))
  };
  try {
    const entries = loadHistory();
    if (persistHistory([entry, ...entries])) saveStatus.textContent = "Период сохранён.";
  } catch {
    saveStatus.textContent = "Не удалось прочитать историю из хранилища браузера. Сохранённые данные не изменены.";
  }
});

try {
  renderHistory(loadHistory());
} catch {
  document.getElementById("history-empty").textContent = "История недоступна: не удалось прочитать хранилище браузера.";
}
