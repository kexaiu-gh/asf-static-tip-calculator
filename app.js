/* Tip Calculator — state, pure calculation, synchronous render (ADR-1: no framework).
 * Money is computed in integer hundredths so 5% of 25.50 is 1.28, not 1.27
 * (binary floats round 1.275 down). Display rounding is half-up. */

'use strict';

var state = {
  bill: '',          // digits + at most one '.', at most 2 decimals
  tipPercent: null,  // preset percentage; null = nothing chosen yet, rendered as 0%
  customTip: null,   // custom percentage, used only in custom mode
  customMode: false  // true after "Other" is chosen, until a preset is chosen
};

// ------------------------------------------------------------ pure logic

/** Half-up integer division: halfUp(1275000, 10000) === 128. */
function halfUp(numerator, denominator) {
  return Math.floor(numerator / denominator + 0.5);
}

/** Bill string ("25.50", "25.", "") -> number of dollars. */
function parseBill(billStr) {
  var n = parseFloat(billStr);
  return isFinite(n) ? n : 0;
}

/** computeTip(25.50, 5) -> 1.28 (exact to the cent, half-up). */
function computeTip(bill, percent) {
  var billCents = Math.round(bill * 100);      // bill carries at most 2 decimals
  var pctBasis = Math.round(percent * 100);    // percent carries at most 2 decimals
  if (!isFinite(billCents) || !isFinite(pctBasis)) return 0;
  var sign = billCents * pctBasis < 0 ? -1 : 1;
  return sign * halfUp(Math.abs(billCents * pctBasis), 10000) / 100;
}

/** computeTotal(25.50, 1.28) -> 26.78 */
function computeTotal(bill, tip) {
  return (Math.round(bill * 100) + Math.round(tip * 100)) / 100;
}

/** formatMoney(1.28) -> "1.28" (always exactly 2 decimal places). */
function formatMoney(num) {
  return (isFinite(num) ? num : 0).toFixed(2);
}

/** formatPercent(17.5) -> "17.5%", formatPercent(10) -> "10%". */
function formatPercent(pct) {
  var n = Number(pct);
  return (isFinite(n) ? String(n) : '0') + '%';
}

/** The percentage currently in force. */
function activePercent() {
  if (state.customMode) {
    return state.customTip === null ? 0 : state.customTip;
  }
  return state.tipPercent === null ? 0 : state.tipPercent;
}

/** Append a digit or '.' to a bill string, rejecting invalid entries. */
function appendToBill(billStr, ch) {
  if (ch === '.') {
    if (billStr.indexOf('.') !== -1) return billStr;
    return billStr === '' ? '0.' : billStr + '.';
  }
  var dot = billStr.indexOf('.');
  if (dot !== -1 && billStr.length - dot > 2) return billStr;   // max 2 decimals
  if (billStr === '0') return ch;                                // no "07"
  if (dot === -1 && billStr.replace('.', '').length >= 9) return billStr;
  return billStr + ch;
}

/** Keep only characters that form a valid bill string (for typed input). */
function sanitizeBill(raw) {
  var out = '';
  for (var i = 0; i < raw.length; i++) {
    var ch = raw[i];
    if (ch !== '.' && (ch < '0' || ch > '9')) continue;   // drop the char, not the bill
    out = appendToBill(out, ch);
  }
  return out;
}

// ------------------------------------------------------------------ DOM

function el(testid) {
  return document.querySelector('[data-testid="' + testid + '"]');
}

var dom = {};

function render() {
  var bill = parseBill(state.bill);
  var pct = activePercent();
  var tip = computeTip(bill, pct);
  var total = computeTotal(bill, tip);

  if (document.activeElement !== dom.bill) {
    dom.bill.value = state.bill;
  }

  dom.tipAmount.textContent = '$' + formatMoney(tip);
  dom.total.textContent = '$' + formatMoney(total);
  dom.selectedPercent.textContent = formatPercent(pct);

  // Selected-state styling (Figma: selected chip is #146b43 with white label).
  dom.tipButtons.forEach(function (btn) {
    var selected = btn === dom.tipOther
      ? state.customMode
      : (!state.customMode && Number(btn.dataset.percent) === state.tipPercent);
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });

  dom.customRow.classList.toggle('is-hidden', !state.customMode);
}

function selectPreset(percent) {
  state.tipPercent = percent;
  state.customTip = null;
  state.customMode = false;
  dom.customTip.value = '';
  render();
}

function selectCustom() {
  state.customMode = true;
  var typed = parseFloat(dom.customTip.value);
  state.customTip = isFinite(typed) ? typed : null;
  render();
}

function init() {
  dom.bill = el('bill-input');
  dom.tipAmount = el('tip-amount');
  dom.total = el('total');
  dom.selectedPercent = el('selected-percent');
  dom.customRow = document.querySelector('[data-testid="custom-tip-row"]');
  dom.customTip = el('custom-tip-input');
  dom.tipOther = el('tip-other');
  dom.tipButtons = Array.prototype.slice.call(
    document.querySelectorAll('.tip-options button')
  );

  // Numeric keypad — every click updates the display synchronously.
  document.querySelectorAll('[data-digit]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.bill = appendToBill(state.bill, btn.dataset.digit);
      render();
    });
  });

  el('num-backspace').addEventListener('click', function () {
    state.bill = state.bill.slice(0, -1);
    render();
  });

  // Typed bill entry (ux-spec.md: keyboard users skip the on-screen pad).
  dom.bill.addEventListener('input', function () {
    var clean = sanitizeBill(dom.bill.value);
    state.bill = clean;
    if (dom.bill.value !== clean) dom.bill.value = clean;
    render();
  });

  // Preset tip percentages.
  dom.tipButtons.forEach(function (btn) {
    if (btn === dom.tipOther) return;
    btn.addEventListener('click', function () {
      selectPreset(Number(btn.dataset.percent));
    });
  });

  dom.tipOther.addEventListener('click', selectCustom);

  ['input', 'change'].forEach(function (evt) {
    dom.customTip.addEventListener(evt, function () {
      state.customMode = true;
      var typed = parseFloat(dom.customTip.value);
      state.customTip = isFinite(typed) ? typed : null;
      render();
    });
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
