/*
  script.js — All interactive behaviour for the portfolio
  ========================================================
  HOW TO FIND THINGS FAST:
    Ctrl+F → "FEATURE:" to jump to a feature
    Ctrl+F → "CUSTOMIZE" to find settings you might want to change

  TABLE OF CONTENTS
  -----------------
  1. FEATURE: Dark / Light mode toggle
  2. FEATURE: Rain effect (canvas animation)
  3. FEATURE: Terminal typing animation
*/


/* ================================================================
   1. FEATURE: DARK / LIGHT MODE
   ================================================================
   HOW IT WORKS:
     The <html> tag in index.html has an attribute: data-theme="dark".
     In styles.css we wrote two color blocks — one for dark, one for light:
       [data-theme="dark"]  { --bg: #090c14; ... }
       [data-theme="light"] { --bg: #f8fafc;  ... }
     When we change the attribute, CSS instantly swaps all the colors.

   PERSISTENCE:
     localStorage is like a tiny notepad inside your browser that
     survives page refreshes. We save the chosen theme there so
     the page remembers your preference next time you open it.

   STEP BY STEP:
     1. Page loads → read saved theme from localStorage (default: dark)
     2. applyTheme() sets the attribute and updates the button label
     3. User clicks button → toggleTheme() → applyTheme() with the opposite
================================================================ */

// On page load, read saved theme (or default to dark)
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

function applyTheme(theme) {
  // Set the attribute that CSS is watching
  document.documentElement.setAttribute('data-theme', theme);

  // Update button label to show the current mode
  const themeBtn = document.getElementById('theme-btn');
  themeBtn.textContent = (theme === 'dark') ? '🌙 dark' : '☀️ light';

  // Save so it persists after page refresh
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}


/* ================================================================
   2. FEATURE: RAIN EFFECT
   ================================================================
   HOW IT WORKS:
     A <canvas> is a blank drawing board — JavaScript can draw lines,
     shapes, and images on it. Ours covers the whole screen (fixed,
     behind all page content at z-index 0).

     Each "drop" is a plain vertical line stroke — no angle, no gradient.
     Drops are stored as objects with their own x position, y position,
     speed, and length, so they all move independently.

     Every frame (~60 times per second via requestAnimationFrame):
       1. Clear the whole canvas
       2. Move each drop down by its speed
       3. Draw it as a vertical line at its new position
       4. If it exits the bottom, reset it to just above the top

   CUSTOMIZE:
     Change the constants below to adjust how the rain looks and feels.
================================================================ */

const canvas = document.getElementById('rain-canvas');
const ctx    = canvas.getContext('2d'); // '2d' = standard drawing mode

// ── CUSTOMIZE RAIN ─────────────────────────────────────────────
const DROP_COUNT = 65;               // number of drops on screen at once
                                     // raise for heavier rain, lower for lighter
const SPEED_MIN  = 6;                // slowest drop speed (pixels per frame)
const SPEED_MAX  = 14;               // fastest drop speed (pixels per frame)
const LEN_MIN    = 18;               // shortest drop streak (pixels)
const LEN_MAX    = 48;               // longest drop streak (pixels)
const OPACITY    = 0.45;             // how visible drops are (0.0 = invisible, 1.0 = solid)
const COLOR      = [160, 175, 200];  // drop color as [Red, Green, Blue] (0–255 each)
                                     // current: muted grey-blue like real rain
// ───────────────────────────────────────────────────────────────

// Helper: returns a random decimal number between min and max
function rnd(min, max) {
  return min + Math.random() * (max - min);
}

// Creates one drop object with random properties
// W, H = canvas width/height  |  scatter = spread across full screen height initially
function makeDrop(W, H, scatter) {
  return {
    x:      rnd(0, W),
    y:      scatter ? rnd(-H, H * 0.3) : rnd(-LEN_MAX * 2, -LEN_MIN),
    speed:  rnd(SPEED_MIN, SPEED_MAX),
    length: rnd(LEN_MIN, LEN_MAX),
  };
}

let drops     = [];
let rainOn    = false;
let animFrame = null; // stores the ID returned by requestAnimationFrame so we can cancel it

function initRain() {
  // Resize canvas to fill current window (needed on init and on window resize)
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // Create all drops, scattered across the screen so they don't all
  // start from the top at the same moment when you toggle rain on
  drops = Array.from({ length: DROP_COUNT }, () =>
    makeDrop(canvas.width, canvas.height, true)
  );
}

function drawRain() {
  if (!rainOn) return; // safety check

  // Clear canvas and redraw everything at new positions each frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const [r, g, b] = COLOR; // destructure the color array

  ctx.lineWidth = 1;
  ctx.lineCap   = 'round'; // rounded end caps on each line

  for (const d of drops) {
    // Move drop straight down
    d.y += d.speed;

    // Draw a vertical line from tail (top) to head (bottom)
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - d.length); // tail — above
    ctx.lineTo(d.x, d.y);            // head — below
    ctx.strokeStyle = `rgba(${r},${g},${b},${OPACITY})`;
    ctx.stroke();

    // When the entire streak has exited the bottom, reset to above the top
    if (d.y - d.length > canvas.height) {
      Object.assign(d, makeDrop(canvas.width, canvas.height, false));
    }
  }

  // Schedule the next frame — browser calls drawRain again ~60fps
  animFrame = requestAnimationFrame(drawRain);
}

function toggleRain() {
  rainOn = !rainOn; // flip the on/off flag
  const rainBtn = document.getElementById('rain-btn');

  if (rainOn) {
    // Turn rain ON
    canvas.style.display = 'block';
    rainBtn.classList.add('active');  // green highlight on the button
    rainBtn.textContent = '🌧 rain on';
    initRain();
    drawRain();
  } else {
    // Turn rain OFF
    rainBtn.classList.remove('active');
    rainBtn.textContent = '🌧 rain';
    if (animFrame) cancelAnimationFrame(animFrame); // stop the animation loop
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  }
}

// If the browser window is resized while rain is on, resize the canvas too
window.addEventListener('resize', () => {
  if (rainOn) initRain();
});


/* ================================================================
   3. FEATURE: TERMINAL TYPING ANIMATION
   ================================================================
   HOW IT WORKS:
     The `lines` array below holds the script for the terminal.
     Each entry has a type ("command" or "output") and the text to show.

     - "command" lines are typed character by character (like real typing)
     - "output"  lines appear all at once (like the terminal responding)

     async/await lets us pause between characters without freezing
     the page. `sleep(ms)` waits a given number of milliseconds.

   CUSTOMIZE:
     Edit the `lines` array to change what appears in the terminal.
     Change TYPING_SPEED to make typing faster (lower) or slower (higher).
================================================================ */

// ── CUSTOMIZE TERMINAL SCRIPT ────────────────────────────────────
const lines = [
  { type: 'command', text: 'psql portfolio -U vrushabhjainanil' },
  { type: 'output',  text: 'psql (16.0)  Connected.' },
  { type: 'command', text: 'SELECT name, role FROM me;' },
  { type: 'output',  text: ' name               | role          ' },
  { type: 'output',  text: ' ───────────────────┼───────────────' },
  { type: 'output',  text: ' Vrushabh Jain Anil | Data Engineer ' },
  { type: 'output',  text: '(1 row)' },
  { type: 'command', text: 'SELECT tool FROM stack WHERE mastered;' },
  { type: 'output',  text: ' tool            ' },
  { type: 'output',  text: ' ────────────────' },
  { type: 'output',  text: ' Python          ' },
  { type: 'output',  text: ' SQL             ' },
  { type: 'output',  text: ' Apache Airflow  ' },
  { type: 'output',  text: ' dbt Core        ' },
  { type: 'output',  text: ' BigQuery        ' },
  { type: 'output',  text: '(5 rows)' },
  { type: 'command', text: 'SELECT project FROM work ORDER BY year DESC;' },
  { type: 'output',  text: ' project                  ' },
  { type: 'output',  text: ' ─────────────────────────' },
  { type: 'output',  text: ' stream-chat-analyzer     ' },
  { type: 'output',  text: ' aus-vehicle-pipeline     ' },
  { type: 'output',  text: ' weather-etl-airflow      ' },
  { type: 'output',  text: ' australia-weather-etl    ' },
  { type: 'output',  text: '(4 rows)' },
];
// ─────────────────────────────────────────────────────────────────

const TYPING_SPEED = 40;  // milliseconds between each character (lower = faster)
const CMD_PAUSE    = 500; // milliseconds to pause before starting a new command
const OUT_PAUSE    = 140; // milliseconds to pause before showing output

const termBody = document.getElementById('terminal-body');

// Pauses execution for `ms` milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTerminal() {
  await sleep(400); // brief pause before the animation starts

  for (const line of lines) {

    if (line.type === 'command') {
      await sleep(CMD_PAUSE);

      // Add a new row: "$ " prompt + empty text + blinking cursor
      const row = document.createElement('div');
      row.className = 't-line';
      row.innerHTML = '<span class="t-ps1">$</span> <span class="t-cmd"></span><span class="cursor"></span>';
      termBody.appendChild(row);

      const cmdEl    = row.querySelector('.t-cmd');
      const cursorEl = row.querySelector('.cursor');

      // Type each character one at a time
      for (let i = 1; i <= line.text.length; i++) {
        cmdEl.textContent = line.text.slice(0, i);
        await sleep(TYPING_SPEED);
      }

      cursorEl.remove(); // remove blinking cursor — typing is done
      await sleep(OUT_PAUSE);

    } else {
      // Output line: appears instantly after a tiny pause
      await sleep(80);
      const out = document.createElement('div');
      out.className = 't-out';
      out.textContent = line.text;
      termBody.appendChild(out);
    }
  }

  // Leave an idle blinking cursor at the end
  const idle = document.createElement('div');
  idle.className = 't-line';
  idle.innerHTML = '<span class="t-ps1">$</span> <span class="cursor"></span>';
  termBody.appendChild(idle);
}

runTerminal();


