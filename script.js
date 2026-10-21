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
