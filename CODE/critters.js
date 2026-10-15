/* =====================================================================
   CRITTERS.JS — six pixel animals that live on top of the page's boxes.

   Each critter is a small button positioned in page coordinates, so it
   scrolls with the box it stands on. It walks along the box's top edge,
   turns at the ends, sits, and naps now and then.
     click        -> its own synthesized sound (Web Audio) + speech bubble
     drag & drop  -> it falls with gravity (a fling carries momentum) and
                     lands on whichever box is below, or the page bottom
   Platforms are re-measured regularly because boxes move as sections
   reveal and the layout reflows. Under prefers-reduced-motion critters
   sit still but can still be clicked and dropped.
   ===================================================================== */
import { SPRITES, BEARS } from './critters-sprites.js';

const PX = 2;                         // CSS px per sprite pixel: 16x12 -> 32x24
const W = 16, H = 12;
const SW = W * PX, SH = H * PX;       // sprite size in CSS px
const PAD_X = 8, PAD_TOP = 16;        // room around the sprite for z's
const BOX_W = SW + PAD_X * 2, BOX_H = SH + PAD_TOP;
const GRAVITY = 2200;                 // px/s^2
const PLATFORMS = '.job, .honour, .ask__box, .project__media, .trophy__media, .form';

const KINDS = {
  tiger:   { name: 'Tiger',   say: 'ROAR!',         speed: 28, step: 160, nap: 0.3 },
  turtle:  { name: 'Turtle',  say: 'hsss…',         speed: 6,  step: 380, nap: 0.3 },
  pig:     { name: 'Pig',     say: 'oink oink!',    speed: 16, step: 220, nap: 0.25, waddle: true },
  octopus: { name: 'Octopus', say: 'blub blub!',    speed: 12, step: 240, nap: 0.15, waddle: true },
  monkey:  { name: 'Monkey',  say: 'ooh ooh ah ah!', speed: 30, step: 150, nap: 0.1, hops: true },
  penguin: { name: 'Penguin', say: 'honk!',         speed: 10, step: 300, nap: 0.15, waddle: true },
};

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const dpr = () => Math.min(window.devicePixelRatio || 1, 3);

/* ---------------------------------------------------------------------
   Sounds: each animal is a small Web Audio patch. The context is created
   on the first click, as browsers require.
   --------------------------------------------------------------------- */
let audio = null;
function ac() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

function envGain(a, t, peak, attack, hold, release) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(a.destination);
  return g;
}

function noise(a, seconds) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

// a voiced sound: oscillator -> band-pass "mouth" filter -> envelope
function voice(a, t, { type, f, filter, q, peak, attack, hold, release, vibrato = 0 }) {
  const o = a.createOscillator();
  o.type = type;
  f.forEach(([hz, at], i) => (i ? o.frequency.exponentialRampToValueAtTime(hz, t + at) : o.frequency.setValueAtTime(hz, t)));
  if (vibrato) {
    const lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = 6; depth.gain.value = vibrato;
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t); lfo.stop(t + attack + hold + release);
  }
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = q;
  filter.forEach(([hz, at], i) => (i ? bp.frequency.exponentialRampToValueAtTime(hz, t + at) : bp.frequency.setValueAtTime(hz, t)));
  o.connect(bp).connect(envGain(a, t, peak, attack, hold, release));
  o.start(t); o.stop(t + attack + hold + release + 0.05);
}

function burst(a, t, { cutoff, peak, attack, hold, release, type = 'lowpass', q = 1 }) {
  const n = noise(a, attack + hold + release + 0.05);
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.value = cutoff; f.Q.value = q;
  n.connect(f).connect(envGain(a, t, peak, attack, hold, release));
  n.start(t);
}

const SOUNDS = {
  // a growl that swells into a roar: low buzzing tone with rumble, plus breath
  tiger(a, t) {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(150, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(70, t + 1.0);
    const rumble = a.createGain(), lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = 28; depth.gain.value = 0.45; rumble.gain.value = 0.55;
    lfo.connect(depth).connect(rumble.gain);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.linearRampToValueAtTime(1400, t + 0.35);
    lp.frequency.exponentialRampToValueAtTime(300, t + 1.0);
    o.connect(lp).connect(rumble).connect(envGain(a, t, 0.4, 0.12, 0.45, 0.45));
    o.start(t); lfo.start(t); o.stop(t + 1.1); lfo.stop(t + 1.1);
    burst(a, t, { cutoff: 900, peak: 0.12, attack: 0.15, hold: 0.4, release: 0.4 });
  },
  // a slow, soft hiss
  turtle(a, t) {
    burst(a, t, { type: 'bandpass', cutoff: 5000, q: 0.8, peak: 0.16, attack: 0.15, hold: 0.35, release: 0.35 });
  },
  // two nasal oinks with a snort of noise
  pig(a, t) {
    for (const d of [0, 0.24]) {
      voice(a, t + d, { type: 'sawtooth', f: [[190, 0], [150, 0.14]], filter: [[650, 0], [500, 0.14]], q: 4, peak: 0.32, attack: 0.01, hold: 0.08, release: 0.08 });
      burst(a, t + d, { type: 'bandpass', cutoff: 800, q: 2, peak: 0.1, attack: 0.005, hold: 0.06, release: 0.06 });
    }
  },
  // bubbles: quick upward pitch pops
  octopus(a, t) {
    for (const [d, f] of [[0, 300], [0.13, 380], [0.24, 260], [0.38, 420]]) {
      voice(a, t + d, { type: 'sine', f: [[f, 0], [f * 3, 0.06]], filter: [[f * 2, 0]], q: 0.5, peak: 0.22, attack: 0.004, hold: 0.03, release: 0.05 });
    }
  },
  // "ooh ooh" (closed vowel, rising) then "ah ah" (open vowel, higher)
  monkey(a, t) {
    [[0, 'oo'], [0.17, 'oo'], [0.36, 'ah'], [0.52, 'ah']].forEach(([d, v], i) => {
      const lo = v === 'oo' ? 420 + i * 40 : 650 + i * 30;
      voice(a, t + d, { type: 'sawtooth', f: [[lo, 0], [lo * 1.35, 0.1]], filter: [[v === 'oo' ? 600 : 1300, 0]], q: v === 'oo' ? 6 : 3, peak: 0.24, attack: 0.012, hold: 0.07, release: 0.06 });
    });
  },
  // a wobbly bray: square tone with fast tremolo
  penguin(a, t) {
    const o = a.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.5);
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 3;
    const trem = a.createGain();
    const lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = 22; depth.gain.value = 0.5; trem.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);
    o.connect(bp).connect(trem).connect(envGain(a, t, 0.25, 0.03, 0.4, 0.15));
    o.start(t); lfo.start(t); o.stop(t + 0.65); lfo.stop(t + 0.65);
  },
  // a deep, grunting bear growl
  bear(a, t) {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(85, t);
    o.frequency.linearRampToValueAtTime(105, t + 0.2);
    o.frequency.exponentialRampToValueAtTime(62, t + 0.7);
    const grunt = a.createGain(), lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = 16; depth.gain.value = 0.5; grunt.gain.value = 0.5;
    lfo.connect(depth).connect(grunt.gain);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 5;
    o.connect(lp).connect(grunt).connect(envGain(a, t, 0.45, 0.05, 0.4, 0.3));
    o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
    burst(a, t, { cutoff: 600, peak: 0.1, attack: 0.05, hold: 0.35, release: 0.3 });
  },
  // a paw landing: short noise crack plus a low knock
  whack(a, t) {
    burst(a, t, { cutoff: 2500, peak: 0.25, attack: 0.002, hold: 0.015, release: 0.06 });
    voice(a, t, { type: 'sine', f: [[180, 0], [70, 0.08]], filter: [[250, 0]], q: 0.5, peak: 0.3, attack: 0.002, hold: 0.01, release: 0.1 });
  },
  // soft landing thud
  thud(a, t) {
    voice(a, t, { type: 'sine', f: [[140, 0], [55, 0.12]], filter: [[200, 0]], q: 0.5, peak: 0.35, attack: 0.003, hold: 0.02, release: 0.14 });
  },
};

function play(sound) {
  const a = ac();
  if (a) SOUNDS[sound](a, a.currentTime + 0.01);
}

/* ---------------------------------------------------------------------
   Sprites: pre-drawn per kind, frame and direction at device resolution
   --------------------------------------------------------------------- */
const cache = new Map();
function sprite(kind, frame, dir) {
  const key = `${kind}:${frame}:${dir}:${dpr()}`;
  let c = cache.get(key);
  if (c) return c;
  const s = SPRITES[kind];
  const grid = frame === 'a' ? s.walk[0] : frame === 'b' ? s.walk[1] : s[frame];
  const unit = PX * dpr();
  c = document.createElement('canvas');
  c.width = SW * dpr(); c.height = SH * dpr();
  const g = c.getContext('2d');
  grid.forEach((row, y) => {
    for (let x = 0; x < W; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      g.fillStyle = ch === '-' ? s.palette.e : s.palette[ch];
      g.fillRect((dir > 0 ? x : W - 1 - x) * unit, y * unit, unit, unit);
    }
  });
  cache.set(key, c);
  return c;
}

const ZED = ['ooo', '.o.', 'ooo'];
function zed(g, x, y, unit) {
  ZED.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === 'o') g.fillRect(Math.round(x + i * unit), Math.round(y + j * unit), unit, unit); });
}

/* ---------------------------------------------------------------------
   Platforms: top edges of the boxes, in page coordinates
   --------------------------------------------------------------------- */
let platforms = [];
let pageW = 0, pageH = 0;
function measure() {
  const sx = window.scrollX, sy = window.scrollY;
  platforms = [...document.querySelectorAll(PLATFORMS)]
    .filter((el) => el.offsetParent !== null)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { el, left: r.left + sx, right: r.right + sx, top: r.top + sy };
    })
    .filter((p) => p.right - p.left >= SW + 24);
  pageW = document.documentElement.clientWidth;
  pageH = document.documentElement.scrollHeight;
}

/* ---------------------------------------------------------------------
   Critters
   --------------------------------------------------------------------- */
const critters = [];

function makeCritter(kind, platform) {
  const k = KINDS[kind];
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'critter';
  el.tabIndex = -1;                       // a pointer toy; keeps keyboard order clean
  el.setAttribute('aria-hidden', 'true');
  el.title = `${k.name}: click to hear it, drag to drop it`;
  const canvas = document.createElement('canvas');
  canvas.width = BOX_W * dpr(); canvas.height = BOX_H * dpr();
  const bubble = document.createElement('span');
  bubble.className = 'critter__say';
  bubble.textContent = k.say;
  el.append(canvas, bubble);
  document.body.appendChild(el);

  const c = {
    kind, ...k, el, canvas, bubble, g: canvas.getContext('2d'),
    platform,
    x: rand(platform.left + 4, platform.right - SW - 4),
    y: platform.top - SH,
    vx: 0, vy: 0,
    dir: Math.random() < 0.5 ? 1 : -1,
    mode: reduce ? 'sit' : 'walk',
    until: performance.now() + rand(1500, 6000),
    frame: 'a', stepAt: 0, drawn: '',
    bubbleUntil: 0,
  };
  bindPointer(c);
  critters.push(c);
}

function render(c, now) {
  const frame = c.mode === 'walk' ? c.frame : c.mode === 'fall' ? 'b' : c.mode === 'drag' ? 'sit' : c.mode;
  const z = c.mode === 'sleep' ? Math.floor(now / 120) : -1;
  const key = `${frame}:${c.dir}:${z}`;
  if (key === c.drawn) return;
  c.drawn = key;
  const g = c.g, d = dpr();
  g.clearRect(0, 0, c.canvas.width, c.canvas.height);
  g.drawImage(sprite(c.kind, frame, c.dir), PAD_X * d, PAD_TOP * d);
  if (c.mode === 'sleep') {
    g.fillStyle = '#c4c4c9';
    for (let k = 0; k < 2; k++) {
      const t = ((now / 1600) + k * 0.5) % 1;
      g.globalAlpha = Math.sin(t * Math.PI) * 0.85;
      zed(g, (PAD_X + (c.dir > 0 ? 24 : 2) + t * 6 * c.dir) * d, (PAD_TOP + 2 - t * 14) * d, d * (1 + k * 0.4));
    }
    g.globalAlpha = 1;
  }
}

function place(c, lift = 0) {
  c.el.style.transform = `translate3d(${Math.round(c.x - PAD_X)}px, ${Math.round(c.y - PAD_TOP - lift)}px, 0)`;
}

function say(c, now) {
  play(c.kind);
  c.bubble.classList.add('is-on');
  c.bubbleUntil = now + 1300;
  if (c.mode === 'sleep' || c.mode === 'walk') { c.mode = 'sit'; c.until = now + rand(1500, 3000); }
  c.hopT = 0.0001;
}

/* ---- pointer: click to speak, drag to pick up and drop ---- */
function bindPointer(c) {
  let start = null, offX = 0, offY = 0, last = null;
  c.el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    c.el.setPointerCapture(e.pointerId);
    start = { x: e.pageX, y: e.pageY };
    offX = e.pageX - c.x; offY = e.pageY - c.y;
    last = { x: e.pageX, y: e.pageY, t: performance.now(), vx: 0, vy: 0 };
  });
  c.el.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (c.mode !== 'drag' && Math.hypot(e.pageX - start.x, e.pageY - start.y) < 6) return;
    if (c.mode !== 'drag') { c.mode = 'drag'; c.platform = null; c.el.classList.add('is-held'); }
    const now = performance.now(), dt = Math.max(now - last.t, 1) / 1000;
    last = { x: e.pageX, y: e.pageY, t: now, vx: (e.pageX - last.x) / dt, vy: (e.pageY - last.y) / dt };
    c.x = e.pageX - offX; c.y = e.pageY - offY;
    if (Math.abs(last.vx) > 30) c.dir = last.vx > 0 ? 1 : -1;
  });
  const end = (e) => {
    if (!start) return;
    const now = performance.now();
    if (c.mode === 'drag') {
      c.el.classList.remove('is-held');
      c.mode = 'fall';
      c.fallFrom = c.y;
      // a fling keeps (some of) the hand's momentum
      c.vx = Math.max(-900, Math.min(900, last.vx * 0.6));
      c.vy = Math.max(-1100, Math.min(900, last.vy * 0.6));
      if (now - last.t > 80) { c.vx = 0; c.vy = 0; }   // held still before letting go: a plain drop
    } else if (e.type === 'pointerup') {
      say(c, now);
    }
    start = null;
  };
  c.el.addEventListener('pointerup', end);
  c.el.addEventListener('pointercancel', end);
}

function nextMode(c, now) {
  if (reduce) { c.until = now + 1e9; return; }
  const r = Math.random();
  if (c.mode === 'walk') {
    if (r < c.nap * 0.5) { c.mode = 'sleep'; c.until = now + rand(7000, 14000); }
    else if (r < 0.65) { c.mode = 'sit'; c.until = now + rand(1500, 4500); }
    else { c.dir *= -1; c.until = now + rand(2500, 7000); }
  } else {
    c.mode = 'walk';
    if (Math.random() < 0.4) c.dir *= -1;
    c.until = now + rand(3000, 8000);
  }
}

function land(c, top, platform, now) {
  c.y = top - SH;
  c.vx = 0; c.vy = 0;
  c.platform = platform;
  c.mode = 'sit';
  c.until = now + rand(900, 2000);
  if (top - SH - c.fallFrom > 120) play('thud');
}

function step(c, now, dt) {
  const s = dt / 1000;
  if (c.mode === 'fall') {
    const prevFoot = c.y + SH;
    c.vy += GRAVITY * s;
    c.x += c.vx * s;
    c.y += c.vy * s;
    if (c.x < 0) { c.x = 0; c.vx = -c.vx * 0.5; }
    if (c.x > pageW - SW) { c.x = pageW - SW; c.vx = -c.vx * 0.5; }
    const foot = c.y + SH, mid = c.x + SW / 2;
    if (c.vy > 0) {
      const hit = platforms
        .filter((p) => mid > p.left + 6 && mid < p.right - 6 && prevFoot <= p.top + 1 && foot >= p.top)
        .sort((a, b) => a.top - b.top)[0];
      if (hit) return land(c, hit.top, hit, now);
      if (foot >= pageH - 2) return land(c, pageH - 2, null, now);   // the page's bottom edge
    }
    return;
  }
  if (c.mode === 'drag') return;

  // standing: stay glued to the platform as boxes move during reveals and reflow
  const p = c.platform;
  let left = 0, right = pageW;
  if (p) {
    c.y = p.top - SH;
    left = p.left + 2; right = p.right - 2;
  } else {
    c.y = pageH - 2 - SH;
  }
  if (now > c.until) nextMode(c, now);
  if (c.mode === 'walk') {
    if (now - c.stepAt > c.step) { c.frame = c.frame === 'a' ? 'b' : 'a'; c.stepAt = now; }
    const move = c.hops && c.frame === 'a' ? 0.25 : 1;    // bunnies travel while in the air
    c.x += c.dir * c.speed * move * s;
  }
  // turn around at the ends of the box
  if (c.x < left) { c.x = left; c.dir = 1; }
  if (c.x > right - SW) { c.x = right - SW; c.dir = -1; }
}

function lift(c, now) {
  let l = 0;
  if (c.mode === 'walk' && c.hops && c.frame === 'b') l = 3;
  if (c.mode === 'walk' && c.waddle && c.frame === 'b') l = 1;
  if (c.hopT) {
    c.hopT += 16 / 380;
    if (c.hopT >= 1) c.hopT = 0; else l += Math.sin(c.hopT * Math.PI) * 8;
  }
  return l;
}

/* ---------------------------------------------------------------------
   Two bears brawling along the whole top edge of the honour roll.
     chase   one runs for the far corner, the other chases; a cornered
             runner turns to face it
     brawl   when caught they rear up and trade swipes (sparks, knock-backs)
     pounce  one leaps onto the other's back and rides it while it bucks,
             then gets thrown, flips through the air upside down and lands
             on the far side; it runs, the other chases, and round it goes
   Clicking a bear makes it growl and turn to fight. The canvas never takes
   pointer events; clicks are matched against the bears' boxes instead.
   --------------------------------------------------------------------- */
function bearFight(host) {
  const unit = window.innerWidth < 600 ? 2 : 3;            // CSS px per sprite pixel
  const BW = 16 * unit, BH = 12 * unit;                     // bear size in CSS px
  const CH = BH * 3;                                        // headroom for pounces and throws
  const canvas = document.createElement('canvas');
  canvas.className = 'bears';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const g = canvas.getContext('2d');
  let width = 0, hostLeft = 0, hostTop = 0;

  const pre = new Map();
  function art(pal, pose, dir, shut, upside) {
    const key = `${pal}${pose}${dir}${shut}${upside}${dpr()}`;
    if (pre.has(key)) return pre.get(key);
    const grid = BEARS[pose], palette = BEARS.palettes[pal], u = unit * dpr();
    const c = document.createElement('canvas');
    c.width = 16 * u; c.height = 12 * u;
    const cg = c.getContext('2d');
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      cg.fillStyle = ch === 'e' && shut ? palette.B : palette[ch];
      cg.fillRect((dir > 0 ? x : 15 - x) * u, (upside ? 11 - y : y) * u, u, u);
    }));
    pre.set(key, c);
    return c;
  }
  const sparkArt = (() => {
    const u = unit * dpr(), c = document.createElement('canvas');
    c.width = 7 * u; c.height = 7 * u;
    const cg = c.getContext('2d');
    BEARS.spark.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') { cg.fillStyle = BEARS.spark.palette[ch]; cg.fillRect(x * u, y * u, u, u); }
    }));
    return c;
  })();

  // x: left edge in CSS px along the board; h: height above the board edge
  const bears = [0, 1].map((i) => ({
    pal: i, x: 0, h: 0, vx: 0, vh: 0, dir: i ? -1 : 1,
    pose: 'stand', shut: false, upside: false, stepAt: 0, run: false,
  }));
  const [A, B] = bears;
  let mode = 'chase', modeUntil = 0, runner = A, chaser = B, sparks = [], beatAt = 0, attacker = A, rider = null;

  function measure() {
    const r = host.getBoundingClientRect();
    hostLeft = r.left + window.scrollX;
    hostTop = r.top + window.scrollY;
    if (Math.round(r.width) !== width) {
      width = Math.round(r.width);
      canvas.style.width = width + 'px';
      canvas.style.height = CH + 'px';
      canvas.width = Math.round(width * dpr());
      canvas.height = Math.round(CH * dpr());
    }
    canvas.style.transform = `translate3d(${Math.round(hostLeft)}px, ${Math.round(hostTop - CH)}px, 0)`;
  }
  measure();
  A.x = width * 0.2; B.x = width * 0.55;
  const maxX = () => width - BW;
  const face = (a, b) => { a.dir = b.x > a.x ? 1 : -1; b.dir = -a.dir; };

  function startChase(now, run, chase) {
    mode = 'chase'; runner = run; chaser = chase;
    // run for the corner farther from the chaser
    runner.dir = runner.x > chaser.x ? 1 : -1;
    chaser.dir = runner.x > chaser.x ? 1 : -1;
    modeUntil = now + 12000;
  }
  function startBrawl(now, first) {
    mode = 'brawl';
    attacker = first || (Math.random() < 0.5 ? A : B);
    face(A, B);
    beatAt = now;
    modeUntil = now + rand(1600, 2600);
  }
  function startPounce(now) {
    mode = 'pounce';
    rider = Math.random() < 0.5 ? A : B;
    const base = rider === A ? B : A;
    // timed so the leap comes down onto the other bear's back
    rider.vh = 260 * unit / 3; rider.vx = (base.x - rider.x) / 0.49;
    rider.pose = 'stand'; rider.upside = false;
    modeUntil = now + 99999;           // ends when the rider is thrown and lands
    rider.phase = 'leap';
  }

  function spark(x, h) { sparks.push({ x, h, until: performance.now() + 240 }); }

  function update(now, dt) {
    const s = dt / 1000;
    const runSpeed = 62 * unit / 3, chaseSpeed = 76 * unit / 3;
    for (const b of bears) { b.shut = false; if (b !== rider) b.upside = false; }

    if (reduce) { A.pose = B.pose = 'stand'; face(A, B); return; }

    if (mode === 'chase') {
      // a runner that reaches a corner turns and holds its ground
      if (!runner.stuck && (runner.x <= 0 || runner.x >= maxX())) runner.stuck = true;
      for (const b of [runner, chaser]) {
        if (b === runner && runner.stuck) {
          runner.x = Math.max(0, Math.min(maxX(), runner.x));
          runner.dir = chaser.x > runner.x ? 1 : -1;
          runner.pose = 'stand';
          continue;
        }
        if (now - b.stepAt > 130) { b.stepAt = now; b.pose = b.pose === 'run' ? 'stand' : 'run'; }
        b.x += b.dir * (b === runner ? runSpeed : chaseSpeed) * s;
      }
      if (Math.abs(runner.x - chaser.x) < BW * 0.8) { runner.stuck = false; startBrawl(now, chaser); }
    } else if (mode === 'brawl') {
      // a beat every ~300 ms: the attacker swipes, the other flinches back
      const t = now - beatAt;
      const other = attacker === A ? B : A;
      if (t < 260) {
        attacker.pose = 'swipe'; other.pose = 'stand'; other.shut = true;
        if (t < dt + 1) {
          spark((attacker.x + other.x) / 2 + BW / 2 - 3.5 * unit, BH * 0.55);
          other.x -= other.dir * 4 * unit / 3;                // knocked back, away from the attacker
        }
      } else {
        A.pose = B.pose = 'stand';
        if (t > 300) { beatAt = now; attacker = Math.random() < 0.7 ? other : attacker; }
      }
      // both rear up and clash now and then
      if (Math.random() < 0.004) { A.pose = B.pose = 'swipe'; spark((A.x + B.x) / 2 + BW / 2 - 3.5 * unit, BH * 0.7); }
      A.x = Math.max(0, Math.min(maxX(), A.x)); B.x = Math.max(0, Math.min(maxX(), B.x));
      face(A, B);
      if (now > modeUntil) startPounce(now);
    } else if (mode === 'pounce') {
      const base = rider === A ? B : A;
      if (rider.phase === 'leap' || rider.phase === 'thrown') {
        rider.vh -= 900 * unit / 3 * s;
        rider.h += rider.vh * s;
        rider.x += rider.vx * s;
        rider.x = Math.max(0, Math.min(maxX(), rider.x));
        const onBack = rider.phase === 'leap' && rider.vh < 0 && Math.abs(rider.x - base.x) < BW * 0.5 && rider.h <= BH * 0.62;
        if (onBack) { rider.phase = 'ride'; rider.h = BH * 0.62; rider.x = base.x + base.dir * -2 * unit; rider.rideUntil = now + rand(700, 1200); }
        if (rider.h <= 0) {                                  // touched down
          rider.h = 0; rider.upside = false; rider.vx = 0;
          if (rider.phase === 'thrown') { startChase(now, rider, base); rider = null; return; }
          rider.phase = 'ride'; rider.h = BH * 0.62; rider.x = base.x; rider.rideUntil = now + 800;
        }
        rider.pose = rider.phase === 'thrown' ? 'stand' : 'swipe';
        if (rider.phase === 'thrown') rider.upside = rider.h > BH * 0.5;  // tumbling through the air
      } else if (rider.phase === 'ride') {
        // the rider pummels, the bear underneath bucks
        rider.x = base.x + (Math.floor(now / 90) % 2 ? unit : -unit);
        rider.h = BH * 0.62 + (Math.floor(now / 120) % 2 ? unit * 2 : 0);
        rider.pose = Math.floor(now / 200) % 2 ? 'swipe' : 'stand';
        rider.dir = base.dir;
        base.pose = 'stand'; base.shut = true;
        base.x += Math.floor(now / 150) % 2 ? 0.6 : -0.6;
        if (Math.random() < 0.03) spark(base.x + BW / 2 - 3.5 * unit, BH * 0.9);
        if (now > rider.rideUntil) {
          // bucked off: thrown up and over to the side with more room
          const room = base.x > width / 2 ? -1 : 1;
          rider.phase = 'thrown';
          rider.vh = 330 * unit / 3;
          rider.vx = room * 210 * unit / 3;
          base.dir = room;
        }
      }
    }
  }

  function draw(now) {
    const u = dpr();
    g.clearRect(0, 0, canvas.width, canvas.height);
    // draw the lower bear first so a rider sits on top
    const order = [...bears].sort((a, b) => a.h - b.h);
    for (const b of order) {
      const img = art(b.pal, b.pose, b.dir, b.shut, b.upside);
      g.drawImage(img, Math.round(b.x * u), Math.round((CH - BH - b.h) * u));
    }
    sparks = sparks.filter((sp) => sp.until > now);
    for (const sp of sparks) g.drawImage(sparkArt, Math.round(sp.x * u), Math.round((CH - sp.h - 7 * unit) * u));
  }

  // clicks: match the pointer against each bear's box on the page
  const hit = (e) => bears.find((b) => {
    const left = hostLeft + b.x, top = hostTop - BH - b.h;
    return e.pageX >= left && e.pageX <= left + BW && e.pageY >= top && e.pageY <= top + BH;
  });
  document.addEventListener('pointerdown', (e) => {
    const b = hit(e);
    if (!b || e.button !== 0) return;
    play('bear');
    const a = ac();
    if (a) SOUNDS.whack(a, a.currentTime + 0.12);
    if (mode !== 'pounce') {
      const other = b === A ? B : A;
      if (Math.abs(b.x - other.x) < BW * 1.4) startBrawl(performance.now(), b);
      else startChase(performance.now(), other, b);        // it charges at the other bear
    }
  });
  document.addEventListener('pointermove', (e) => {
    document.documentElement.classList.toggle('over-bear', !!hit(e));
  }, { passive: true });

  startChase(performance.now(), A, B);
  let last = performance.now();
  return {
    update(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      measure();
      update(now, dt);
      draw(now);
    },
  };
}

/* ---------------------------------------------------------------------
   Start: wait for the intro and the layout to settle, then spread the
   critters across different boxes
   --------------------------------------------------------------------- */
function start() {
  measure();
  if (!platforms.length) return;
  const kinds = Object.keys(KINDS).sort(() => Math.random() - 0.5)
    .slice(0, window.innerWidth < 600 ? 4 : 6);
  const away = platforms.filter((p) => !p.el.matches('.honour'));
  const pool = [...(away.length ? away : platforms)].sort(() => Math.random() - 0.5);
  const honour = document.querySelector('.honour');
  const bears = honour ? bearFight(honour) : null;
  kinds.forEach((kind, i) => makeCritter(kind, pool[i % pool.length]));

  let last = performance.now(), measuredAt = 0;
  function loop(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    if (now - measuredAt > 500) {
      measure();
      measuredAt = now;
      // keep standing critters attached to their box's new position
      for (const c of critters) if (c.platform) c.platform = platforms.find((p) => p.el === c.platform.el) || null;
    }
    if (bears) bears.update(now);
    for (const c of critters) {
      step(c, now, dt);
      render(c, now);
      place(c, lift(c, now));
      if (c.bubbleUntil && now > c.bubbleUntil) { c.bubble.classList.remove('is-on'); c.bubbleUntil = 0; }
    }
    raf = requestAnimationFrame(loop);
  }
  let raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(loop); }
  });
  window.addEventListener('resize', () => cache.clear());
}

if (document.readyState === 'complete') setTimeout(start, 1200);
else window.addEventListener('load', () => setTimeout(start, 1200));
