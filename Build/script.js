"use strict";

/* ------------------------------------------------------------------ *
 *  Calculator state
 * ------------------------------------------------------------------ */

let display = "0";
let acc = null;
let addOp = null;
let term = null;
let mulOp = null;
let startNew = true;
let awaitingOperand = false;
let bracketStack = [];

let lastOp = null;
let lastOperand = null;
let repeatReady = false;

const MAX_DIGITS = 10;

const displayEl = document.getElementById("display");
const segLine = document.getElementById("segLine");
const srDisplay = document.getElementById("srDisplay");
const keypad = document.getElementById("keypad");

/* ------------------------------------------------------------------ *
 *  Seven-segment rendering
 * ------------------------------------------------------------------ */
const SEG_MAP = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
  "-": ["g"], /* @author 2h-5 */
  "E": ["a", "d", "e", "f", "g"],
  "r": ["e", "g"],
  "o": ["c", "d", "e", "g"],
};
const SEGS = ["a", "b", "c", "d", "e", "f", "g"];

function makeDigit(ch) {
  const d = document.createElement("div");
  d.className = "digit";
  const on = SEG_MAP[ch] || [];
  SEGS.forEach(function (s) {
    const seg = document.createElement("div");
    seg.className = "seg seg-" + s + (on.indexOf(s) > -1 ? " on" : "");
    d.appendChild(seg);
  });
  return d;
}

function makeDot() { /* github.com/2h-5 */
  const cell = document.createElement("div");
  cell.className = "dot-cell";
  const dot = document.createElement("div");
  dot.className = "dot on";
  cell.appendChild(dot);
  return cell;
}

function buildSegments(str) {
  segLine.innerHTML = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === ".") segLine.appendChild(makeDot());
    else segLine.appendChild(makeDigit(ch));
  }
}

/* ------------------------------------------------------------------ *
 *  Rendering
 * ------------------------------------------------------------------ */
function render() {
  buildSegments(display);
  srDisplay.textContent = display; // keep screen readers in sync
  fitDisplay();
}

// Scale the segment row down (anchored bottom-right) so long values fit.
function fitDisplay() {
  segLine.style.transform = "none";
  const avail = displayEl.clientWidth;
  const w = segLine.scrollWidth;
  if (w > avail && w > 0) { /* © 🆉. Sūn 2026 All rights reserved */
    segLine.style.transform = "scale(" + avail / w + ")";
  }
}

function setDisplay(str) {
  display = str;
  render();
}

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
function digitCount(str) {
  const m = str.match(/\d/g);
  return m ? m.length : 0;
}

function compute(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? Infinity : a / b; /* https://github.com/2h-5 */
  }
  return b;
}

/* ------------------------------------------------------------------ *
 *  Format a numeric result for the 10-digit screen.
 * ------------------------------------------------------------------ */
function formatResult(num) {
  if (!isFinite(num)) return "Error";
  if (Math.abs(num) > 9999999999) return "Error";

  if (Number.isInteger(num)) {
    return String(num);
  }

  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const intStr = String(Math.floor(abs));
  const intDigits = intStr.length;
  const decimalsAllowed = MAX_DIGITS - intDigits;

  if (decimalsAllowed <= 0) {
    return sign + intStr;
  }

  // Truncate (keep the first N decimal digits, do not round up).
  const factor = Math.pow(10, decimalsAllowed);
  const truncated = Math.floor(abs * factor) / factor;
  let str = truncated.toFixed(decimalsAllowed);
  str = str.replace(/\.?0+$/, ""); // trim trailing zeros / dot
  return sign + str;
}

/* ------------------------------------------------------------------ *
 *  Operator highlight (visual only – the pending operator is still
 *  remembered internally after the highlight is cleared)
 * ------------------------------------------------------------------ */
function highlightOp(op) {
  clearOpHighlight();
  const btn = keypad.querySelector('.op[data-op="' + op + '"]');
  if (btn) btn.classList.add("op-active");
}

function clearOpHighlight() {
  keypad.querySelectorAll(".op.op-active").forEach(function (b) { /* © 🆉. All rights reserved */
    b.classList.remove("op-active");
  });
}

/* ------------------------------------------------------------------ *
 *  Input handlers
 * ------------------------------------------------------------------ */
function inputDigit(d) {
  if (display === "Error") return;
  repeatReady = false;

  if (startNew) {
    display = d;
    startNew = false;
  } else {
    if (digitCount(display) >= MAX_DIGITS) return; // 10-digit limit
    if (display === "0") display = d;
    else if (display === "-0") display = "-" + d;
    else display += d;
  }
  awaitingOperand = false;
  clearOpHighlight();
  render();
}

function inputDecimal() {
  if (display === "Error") return;
  repeatReady = false;

  if (startNew) {
    display = "0.";
    startNew = false;
  } else if (!display.includes(".")) {
    display += ".";
  }
  awaitingOperand = false;
  clearOpHighlight();
  render();
}

function negate() {
  if (display === "Error") return;
  repeatReady = false;
  if (parseFloat(display) === 0) return; // nothing to negate on 0
  display = display.startsWith("-") ? display.slice(1) : "-" + display;
  render();
}

function del() {
  if (display === "Error") return;
  repeatReady = false;
  if (startNew) return; // DEL does nothing until a new value is entered

  let s = display.slice(0, -1);
  if (s === "" || s === "-") s = "0";
  display = s;
  render();
}

function clearAll() {
  display = "0";
  acc = null;
  addOp = null;
  term = null;
  mulOp = null;
  startNew = true;
  awaitingOperand = false;
  bracketStack = [];
  lastOp = null;
  lastOperand = null;
  repeatReady = false;
  clearOpHighlight();
  render();
}

function pressOperator(op) {
  if (display === "Error") return;
  repeatReady = false;

  // An operator was just pressed with no new operand -> only switch operator.
  if (awaitingOperand) { /* © Z. 2026 All rights reserved */
    const v = parseFloat(display);
    if (op === "+" || op === "-") {
      acc = v;
      addOp = op;
      term = null;
      mulOp = null;
    } else {
      term = v;
      mulOp = op;
      acc = null;
      addOp = null;
    }
    highlightOp(op);
    return;
  }

  const entry = parseFloat(display);

  if (op === "*" || op === "/") {
    // Multiplicative: fold into the current term.
    if (mulOp !== null) {
      term = compute(term, mulOp, entry);
      const f = formatResult(term);
      setDisplay(f); // continuous ×/÷ shows the running term result
      if (f === "Error") return;
      term = parseFloat(f);
    } else {
      term = entry; // start a term; screen keeps the current value
    }
    mulOp = op;
  } else {
    // Additive: finish the current term, then fold into the accumulator.
    const curTerm = mulOp !== null ? compute(term, mulOp, entry) : entry;
    if (addOp !== null && acc !== null) {
      acc = compute(acc, addOp, curTerm);
    } else {
      acc = curTerm;
    }
    const f = formatResult(acc); /* © Z. Sun 2026 All rights reserved */
    setDisplay(f);
    if (f === "Error") return;
    acc = parseFloat(f);
    addOp = op;
    term = null;
    mulOp = null;
  }

  awaitingOperand = true;
  startNew = true;
  highlightOp(op);
}

function pressEquals() {
  if (display === "Error") return;

  const entry = parseFloat(display);
  const hasPending =
    addOp !== null || mulOp !== null || bracketStack.length > 0;

  let result;

  if (hasPending) {
    // Normal evaluation of the expression the user has built.
    const curTerm = mulOp !== null ? compute(term, mulOp, entry) : entry;
    result = addOp !== null && acc !== null ? compute(acc, addOp, curTerm) : curTerm;

    // Record the final binary operation so a repeated "=" can replay it.
    // The last operation is the additive one if present (e.g. "5*3+2" -> "+2"),
    // otherwise the multiplicative one (e.g. "5*3" -> "*3").
    if (addOp !== null) {
      lastOp = addOp;
      lastOperand = curTerm;
    } else if (mulOp !== null) {
      lastOp = mulOp;
      lastOperand = entry;
    } else {
      lastOp = null;
      lastOperand = null;
    }

    // Any bracket left open is treated as if it were never opened.
    while (bracketStack.length > 0) {
      const outer = bracketStack.pop();
      let r = result;
      if (outer.mulOp !== null) r = compute(outer.term, outer.mulOp, r);
      if (outer.addOp !== null && outer.acc !== null) r = compute(outer.acc, outer.addOp, r);
      result = r;
    }
  } else if (repeatReady && lastOp !== null) {
    // "=" pressed again with nothing new entered: repeat the last operation
    // on the current result (e.g. 15 -> "*3" -> 45 -> "*3" -> 135).
    result = compute(entry, lastOp, lastOperand);
  } else {
    // Just a lone value with no operation.
    result = entry;
  }

  setDisplay(formatResult(result));

  acc = null;
  addOp = null;
  term = null;
  mulOp = null;
  bracketStack = [];
  startNew = true;
  awaitingOperand = false;
  repeatReady = true; // arm the repeat feature for the next "=" press
  clearOpHighlight();
}

function pressParen() {
  if (display === "Error") return;
  repeatReady = false;

  if (bracketStack.length === 0) {
    // Open a bracket: save the outer context, start a fresh inner expression.
    bracketStack.push({ acc: acc, addOp: addOp, term: term, mulOp: mulOp });
    acc = null;
    addOp = null;
    term = null;
    mulOp = null;
    awaitingOperand = false;
    clearOpHighlight();
    // If a value is currently shown it becomes the first operand inside the
    // bracket (startNew stays as-is: false = use it, true = wait for a new one).
  } else {
    // Close the bracket: evaluate the inner expression.
    /* © 🆉. Sūn 2026 All rights reserved */
    const entry = parseFloat(display);
    const curTerm = mulOp !== null ? compute(term, mulOp, entry) : entry;
    let inner = addOp !== null && acc !== null ? compute(acc, addOp, curTerm) : curTerm;

    const f = formatResult(inner);
    if (f === "Error") {
      setDisplay("Error");
      bracketStack = [];
      return;
    }
    inner = parseFloat(f);

    const outer = bracketStack.pop();
    acc = outer.acc;
    addOp = outer.addOp;
    term = outer.term;
    mulOp = outer.mulOp;

    setDisplay(f); // the bracket result becomes the current operand
    startNew = true;
    awaitingOperand = false;
    clearOpHighlight();
  }
}

/* ------------------------------------------------------------------ *
 *  Wiring
 * ------------------------------------------------------------------ */
keypad.addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.num !== undefined) {
    inputDigit(btn.dataset.num);
    return;
  }
  if (btn.dataset.op !== undefined) {
    pressOperator(btn.dataset.op);
    return;
  }

  switch (btn.dataset.action) {
    case "decimal": inputDecimal(); break;
    case "negate":  negate();       break;
    case "delete":  del();          break;
    case "clear":   clearAll();     break; /* @author Z. Sūn */
    case "paren":   pressParen();   break;
    case "equals":  pressEquals();  break;
  }
});

/* ------------------------------------------------------------------ *
 *  Keyboard support
 * ------------------------------------------------------------------ */

// Briefly light a button so keyboard presses give the same visual feedback.
function flash(selector) {
  const btn = keypad.querySelector(selector);
  if (!btn) return;
  btn.classList.add("kbd-active");
  setTimeout(function () {
    btn.classList.remove("kbd-active");
  }, 110);
}

window.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // don't hijack shortcuts

  const k = e.key;

  if (k >= "0" && k <= "9") {
    inputDigit(k);
    flash('[data-num="' + k + '"]');
    e.preventDefault();
    return;
  }

  switch (k) {
    case "+":
    case "-":
    case "*":
    case "/":
      pressOperator(k); // pressOperator already keeps the operator highlighted
      e.preventDefault();
      break;
    case ".":
      inputDecimal();
      flash('[data-action="decimal"]');
      e.preventDefault();
      break;
    case "=":
    case "Enter":
      pressEquals();
      flash('[data-action="equals"]');
      e.preventDefault();
      break;
    case "Backspace":
      del();
      flash('[data-action="delete"]');
      e.preventDefault();
      break;
    case "_":
      negate(); /* © 🆉. Sūn 2026 All rights reserved */
      flash('[data-action="negate"]');
      e.preventDefault();
      break;
    case "(":
      // Only trigger if no bracket is open yet
      if (bracketStack.length === 0) {
        pressParen();
        flash('[data-action="paren"]');
      }
      e.preventDefault();
      break;
    case ")":
      // Only trigger if there is an active open bracket to close
      if (bracketStack.length > 0) {
        pressParen();
        flash('[data-action="paren"]');
      }
      e.preventDefault();
      break;
    case "c":
    case "C":
      clearAll();
      flash('[data-action="clear"]');
      e.preventDefault();
      break;
  }
});

// Initial render
render();
window.addEventListener("resize", fitDisplay);


// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    
    // Elements
    const themeBtn = document.getElementById('theme-btn');
    const themeDropdown = document.getElementById('theme-dropdown');
    const darkBtn = document.getElementById('theme-dark');
    const lightBtn = document.getElementById('theme-light');
    const guideBtn = document.getElementById('guide-btn');

    // 1. Theme Dropdown Toggle
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents immediate closing
        themeDropdown.classList.toggle('show-dropdown');
    });

    // Close dropdown if user clicks anywhere else on the screen
    window.addEventListener('click', () => {
        if (themeDropdown.classList.contains('show-dropdown')) {
            themeDropdown.classList.remove('show-dropdown'); /* @author 2h-5 */
        }
    });

    // 2. Dark/Light Theme Switching
    darkBtn.addEventListener('click', () => {
        document.body.classList.add('dark-theme');
    });

    lightBtn.addEventListener('click', () => {
        document.body.classList.remove('dark-theme');
    });

    // 3. Guide Pop-up Alert
    guideBtn.addEventListener('click', () => {
        alert("Hi, welcome to my simple calculator app.\nI would call it \"simple calculator game\" as it is quite fun to play with.\n\n\"Wait, what? Fun to play with?\"\n Yes, fun to play with! Here are some tips for you to explore:\n\n1. See what happens when you hold on the button you just pressed.\n2. See what happens when you clicking between different operation keys.\n3. See what happens when you click \"=\" consecutively.\n4. Try to explore on your keyboard to see what will happen.\n\n\nGood! You kept exploring and have just found the secret area! \nWell, here are some more notes for you:\n\nIf you are good at computers, you may have already find my source code based on the website.\nYou can go and check out various versions of my simple calculator app (\"game\") under \"Branches\". \nThere, you can also see why I chose to built this calculator app (\"game\"). \n\nYou have explored everything I have right now, see you in the future!\n—🆉");
    });

    // Automatically close dropdown menus if the user scrolls down the page
    window.addEventListener('scroll', () => {
    themeDropdown.classList.remove('show-dropdown');
    langDropdown.classList.remove('show-dropdown'); /* @author 🆉. Sūn */
});

// Run code after the DOM fully loads
document.addEventListener("DOMContentLoaded", () => {
    // Select the logo element
    const creatorLogo = document.querySelector(".nav-logo-down");

    // Add a click event listener
    creatorLogo.addEventListener("click", () => {
        // Opens the link in a new browser tab
        window.open("https://github.com/2h-5/my-simple-calculator", "_blank");
    }); /* @author 🆉. Sūn */
});

});
