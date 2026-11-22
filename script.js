/* ---------- Math functions ---------- */

function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  return a / b;
}

// Try it in the console: operate('+', 3, 5) -> 8
function operate(operator, a, b) {
  switch (operator) {
    case '+':
      return add(a, b);
    case '-':
      return subtract(a, b);
    case '*':
      return multiply(a, b);
    case '/':
      return divide(a, b);
    default:
      return null;
  }
}

/* ---------- Calculator state ---------- */

const MAX_LENGTH = 12; // most characters that fit on the display
const SYMBOLS = { '+': '+', '-': '\u2212', '*': '\u00d7', '/': '\u00f7' };
const DIVIDE_BY_ZERO_MESSAGE = "Nice try. Dividing by zero isn't happening.";
const OVERFLOW_MESSAGE = 'That number is too big for me. Clear and try again.';

// The three parts of an operation: number, operator, number
let firstNumber = null;
let operator = null;
let secondNumber = null;

let displayValue = '0';      // what the display shows
let expression = '';         // small line above the display, e.g. "12 + 7 ="
let startNewNumber = true;   // true -> the next digit replaces the display
let resultShown = false;     // true right after "=" was pressed
let hasError = false;

const displayEl = document.querySelector('#display');
const expressionEl = document.querySelector('#expression');
const keysEl = document.querySelector('#keys');
const decimalBtn = document.querySelector('[data-action="decimal"]');

/* ---------- Helpers ---------- */

function resetState() {
  firstNumber = null;
  operator = null;
  secondNumber = null;
  displayValue = '0';
  expression = '';
  startNewNumber = true;
  resultShown = false;
  hasError = false;
}

// Rounds long decimals and switches to exponent form for huge/tiny numbers
// so the result always fits on the display.
function formatResult(n) {
  n = Number(n.toPrecision(12)); // removes float noise like 0.30000000000000004
  let text = String(n);
  if (text.length <= MAX_LENGTH && !text.includes('e')) return text;

  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) {
    let digits = 6;
    text = n.toExponential(digits);
    while (text.length > MAX_LENGTH && digits > 0) {
      digits -= 1;
      text = n.toExponential(digits);
    }
    return text.replace(/\.?0+e/, 'e').replace('e+', 'e'); // 1.000000e+24 -> 1e24
  }

  // Long decimal: keep as many decimal places as will fit
  const integerLength = String(Math.trunc(abs)).length + (n < 0 ? 1 : 0);
  const decimals = Math.max(0, MAX_LENGTH - integerLength - 1);
  return String(Number(n.toFixed(decimals)));
}

function digitCount(text) {
  return text.replace('.', '').length;
}

function render() {
  displayEl.textContent = displayValue;
  displayEl.classList.toggle('display--error', hasError);
  expressionEl.textContent = expression;
  // Disable "." when the number being typed already has one
  decimalBtn.disabled =
    !hasError && !startNewNumber && !resultShown && displayValue.includes('.');
}

function showError(message) {
  resetState();
  displayValue = message;
  hasError = true;
  render();
}

// Runs the stored operation. Returns the result, or null if it showed an error.
function evaluate() {
  if (operator === '/' && secondNumber === 0) {
    showError(DIVIDE_BY_ZERO_MESSAGE);
    return null;
  }
  const result = operate(operator, firstNumber, secondNumber);
  if (!Number.isFinite(result)) {
    showError(OVERFLOW_MESSAGE);
    return null;
  }
  return result;
}

/* ---------- Button actions ---------- */

function inputDigit(digit) {
  // A new digit after a result (or an error) starts a fresh calculation
  if (hasError || resultShown) resetState();

  if (startNewNumber) {
    displayValue = digit;
    startNewNumber = false;
  } else if (displayValue === '0') {
    displayValue = digit; // no leading zeros
  } else if (digitCount(displayValue) < MAX_LENGTH) {
    displayValue += digit;
  }
  render();
}

function inputDecimal() {
  if (hasError || resultShown) resetState();

  if (startNewNumber) {
    displayValue = '0.';
    startNewNumber = false;
  } else if (!displayValue.includes('.') && digitCount(displayValue) < MAX_LENGTH) {
    displayValue += '.';
  }
  render();
}

function chooseOperator(nextOperator) {
  if (hasError) return;

  // Operator pressed twice in a row: just swap it, don't evaluate anything
  if (operator !== null && startNewNumber) {
    operator = nextOperator;
    expression = `${formatResult(firstNumber)} ${SYMBOLS[operator]}`;
    render();
    return;
  }

  if (operator !== null) {
    // We already have number + operator + number: evaluate that pair first
    secondNumber = Number(displayValue);
    const result = evaluate();
    if (result === null) return;
    firstNumber = result;
    displayValue = formatResult(result);
  } else if (!resultShown) {
    firstNumber = Number(displayValue);
  } // else: keep the full-precision result of the last "=" as firstNumber

  operator = nextOperator;
  secondNumber = null;
  startNewNumber = true;
  resultShown = false;
  expression = `${formatResult(firstNumber)} ${SYMBOLS[operator]}`;
  render();
}

function pressEquals() {
  // Need a first number, an operator and a second number
  if (hasError || operator === null || startNewNumber) return;

  secondNumber = Number(displayValue);
  const result = evaluate();
  if (result === null) return;

  expression = `${formatResult(firstNumber)} ${SYMBOLS[operator]} ${formatResult(secondNumber)} =`;
  displayValue = formatResult(result);
  firstNumber = result;
  operator = null;
  secondNumber = null;
  startNewNumber = true;
  resultShown = true;
  render();
}

function backspace() {
  // Only works on a number the user is typing, not on results
  if (hasError || resultShown || startNewNumber) return;

  displayValue = displayValue.slice(0, -1);
  if (displayValue === '') displayValue = '0';
  render();
}

function clearAll() {
  resetState();
  render();
}

/* ---------- Mouse / touch ---------- */

keysEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.digit !== undefined) {
    inputDigit(button.dataset.digit);
  } else if (button.dataset.operator !== undefined) {
    chooseOperator(button.dataset.operator);
  } else if (button.dataset.action === 'decimal') {
    inputDecimal();
  } else if (button.dataset.action === 'equals') {
    pressEquals();
  } else if (button.dataset.action === 'backspace') {
    backspace();
  } else if (button.dataset.action === 'clear') {
    clearAll();
  }
});

/* ---------- Keyboard ---------- */

function buttonForKey(key) {
  if (/^[0-9]$/.test(key)) return keysEl.querySelector(`[data-digit="${key}"]`);
  if (key.length === 1 && '+-*/'.includes(key)) {
    return keysEl.querySelector(`[data-operator="${key}"]`);
  }
  if (key === 'x' || key === 'X') return keysEl.querySelector('[data-operator="*"]');
  if (key === '.' || key === ',') return decimalBtn;
  if (key === 'Enter' || key === '=') return keysEl.querySelector('[data-action="equals"]');
  if (key === 'Backspace') return keysEl.querySelector('[data-action="backspace"]');
  if (key === 'Escape' || key === 'Delete' || key === 'c' || key === 'C') return keysEl.querySelector('[data-action="clear"]');
  return null;
}

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const button = buttonForKey(event.key);
  if (!button) return;

  // Stops "/" opening quick-find and Enter re-clicking a focused button
  event.preventDefault();
  button.click(); // same code path as the mouse; disabled buttons ignore it

  button.classList.add('is-pressed');
  setTimeout(() => button.classList.remove('is-pressed'), 120);
});

render();
