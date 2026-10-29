// The conductor: smooth scroll, one timeline for every chapter, DOM motion,
// and the 3D world fed from the same scroll position each frame.
import { createWorld } from './world.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const band = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

// ── split headings into words for the reveal
function split(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.append(' '); return; }
          const o = document.createElement('span'); o.className = 'w';
          const s = document.createElement('span'); s.textContent = w; s.style.setProperty('--i', i++);
          o.append(s); frag.append(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
}
$$('[data-split]').forEach(split);
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .25 });
$$('[data-split]').forEach((el) => io.observe(el));

// counters that run once when seen
const fmt = (v, plus) => Math.round(v).toLocaleString('en-IN') + (plus ? '+' : '');
const cio = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  const el = e.target, to = +el.dataset.count, plus = 'plus' in el.dataset, t0 = performance.now();
  const step = (t) => { const k = ease(clamp((t - t0) / 1600)); el.textContent = fmt(to * k, plus && k === 1); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step); cio.unobserve(el);
}), { threshold: .6 });
$$('[data-count]').forEach((el) => cio.observe(el));

// ── loader
const ld = $('#loader'), ldBar = $('.ld-bar i'), ldPct = $('#ldPct'), ldLog = $('#ldLog');
const LOG = ['MODBUS RTU · 4800 BAUD · SLAVE 01', 'READING 9 REGISTERS', 'EC 98 µS/cm · pH 8.8 · 27.4 %', 'RULES LOADED · HINDI VOICE READY'];
let ldShown = 0, loading = true;
const setLoad = (p) => { ldShown = Math.max(ldShown, p); ldBar.style.setProperty('--p', ldShown); ldPct.textContent = String(Math.round(ldShown * 100)).padStart(3, '0'); ldLog.textContent = LOG[Math.min(3, Math.floor(ldShown * 4))]; };
document.documentElement.style.overflow = 'hidden';
let fake = 0; const fakeT = setInterval(() => { fake = Math.min(.82, fake + .04 + Math.random() * .05); setLoad(fake); }, 90);

// ── chapters
const secs = $$('[data-ch]').map((el) => ({ el, id: el.dataset.ch, name: el.dataset.name, bg: el.dataset.bg || '#07080a', fg: el.dataset.fg || '#f1eee7', top: 0, h: 0 }));
const byId = Object.fromEntries(secs.map((s) => [s.id, s]));
let vh = innerHeight, maxY = 1;
function measure() {
  vh = innerHeight;
  secs.forEach((s) => { const r = s.el.getBoundingClientRect(); s.top = r.top + scrollY; s.h = r.height; });
  maxY = document.documentElement.scrollHeight - vh;
}
const pos = (id, f = 0, off = 0) => { const s = byId[id]; return s.top + f * Math.max(s.h - vh, 0) + off * vh; };

// ── smooth scroll (wheel only; touch and keys stay native)
let target = scrollY, cur = scrollY;
if (!still && fine) {
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || loading) return;
    e.preventDefault();
    target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 36 : 1), 0, maxY);
  }, { passive: false });
}
addEventListener('scroll', () => { if (Math.abs(scrollY - cur) > 3) target = cur = scrollY; }, { passive: true });
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const t = $(a.getAttribute('href')); if (!t) return;
  e.preventDefault(); const y = t.id === 'top' ? 0 : t.getBoundingClientRect().top + scrollY;
  if (still || !fine) scrollTo({ top: y, behavior: still ? 'auto' : 'smooth' }); else target = clamp(y, 0, maxY);
}));

// ── pointer: viewfinder cursor and magnetic buttons
const mouse = { x: 0, y: 0, px: innerWidth / 2, py: innerHeight / 2 };
const cursor = $('#cursor'); let cx = mouse.px, cy = mouse.py;
addEventListener('pointermove', (e) => { mouse.px = e.clientX; mouse.py = e.clientY; mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });
$$('a, [data-magnet]').forEach((el) => {
  el.addEventListener('pointerenter', () => cursor.classList.add('big'));
  el.addEventListener('pointerleave', () => { cursor.classList.remove('big'); if (el.dataset.magnet !== undefined) el.style.transform = ''; });
  if (el.dataset.magnet !== undefined) el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
  });
});

// ── DOM pieces driven by the timeline
const hw1 = $('.hw1'), hw2 = $('.hw2'), heroMeta = $('.hero-meta'), heroFoot = $('.hero-foot'), cue = $('.cue');
const ks = $$('.k'), kin = $('.kin'), kinAfter = $('.kin-after'), n86 = $('.stat86 .n');
const tSec = $('#tSec'), rds = $$('.rd'), soilNote = $('.soil-note');
const chips = $$('.chips li'), idcard = $('#idcard'), idConf = $('#idcard i[data-to]'), idBar = $('.idbar i');
const tabs = $$('.tabs span'), lines = $$('.line'), wave = $('.wave');
for (let i = 0; i < 56; i++) wave.append(document.createElement('i'));
const waveBars = [...wave.children];
const track = $('.track'), phones = $$('.ph'), winImgs = $$('.win-pics img');
const hudCh = $('#hudCh'), hudT = $('#hudT'), hudBar = $('#hudBar'), nav = $('.nav');
const labelsEl = $('#labels'); const labs = new Map();
let n86Done = false, lastY = 0, navAway = false, light = 0;

function lum(hex) { const n = parseInt(hex.slice(1), 16); return (.299 * (n >> 16 & 255) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; }
let curBg = '';

function chState(y) {
  const o = {};
  for (const s of secs) {
    const span = Math.max(s.h - vh, 1);
    o[s.id] = { p: clamp((y - s.top) / span), vis: y + vh * .5 >= s.top && y + vh * .5 < s.top + s.h ? 1 : 0, q: clamp((y - s.top + vh) / (s.h + vh)) };
  }
  return o;
}

function dom(y, ch, t) {
  // hero
  const hp = clamp(y / vh);
  hw1.style.setProperty('--y', `${-hp * 22}vh`); hw2.style.setProperty('--y', `${hp * 10}vh`);
  hw1.style.opacity = hw2.style.opacity = 1 - hp * .9;
  const hin = introT < 0 ? 0 : ease(clamp((performance.now() - introT - 800) / 900));
  heroMeta.style.opacity = heroFoot.style.opacity = cue.style.opacity = Math.max(0, 1 - hp * 2.2) * hin;

  // problem: three words land, then the room goes quiet
  const pp = ch.problem.p;
  ks.forEach((k, i) => { const a = ease(band(pp, .04 + i * .13, .14 + i * .13)); k.style.opacity = a; k.style.transform = `translate3d(${(1 - a) * -40}px, ${(1 - a) * 50}px, 0)`; });
  const out = ease(band(pp, .5, .64));
  kin.style.transform = `translateY(${-out * 20}vh) scale(${1 - out * .3})`; kin.style.transformOrigin = 'left center'; kin.style.opacity = 1 - out * .9;
  const aft = band(pp, .58, .7);
  kinAfter.style.opacity = aft; kinAfter.style.transform = `translateY(${(1 - ease(aft)) * 40}px)`;
  if (aft > .5 && !n86Done) { n86Done = true; const t0 = performance.now(); const run = (tt) => { const k = ease(clamp((tt - t0) / 1300)); n86.textContent = Math.round(86 * k); if (k < 1) requestAnimationFrame(run); }; requestAnimationFrame(run); }

  // soil: eleven seconds, four readings, one honest label
  const sp = ch.soil.p;
  tSec.textContent = (11 * band(sp, .3, .6)).toFixed(1).padStart(4, '0');
  rds.forEach((r, i) => {
    const on = sp > .6 + i * .05; r.classList.toggle('on', on); r.classList.toggle('live', on && sp < .6 + (i + 1) * .05 + .03);
    const v = r.querySelector('i[data-to]');
    if (v) { const k = ease(band(sp, .6 + i * .05, .66 + i * .05)); v.textContent = (+v.dataset.to * k).toFixed(+v.dataset.d); }
  });
  soilNote.classList.toggle('on', sp > .84);

  // eye
  const ep = ch.eye.p;
  chips.forEach((c, i) => c.classList.toggle('on', ep > .1 + i * .13));
  idcard.classList.toggle('on', ep > .6);
  const conf = ease(band(ep, .62, .76)); idConf.textContent = Math.round(87 * conf); idBar.style.setProperty('--w', .87 * conf);

  // voice
  const vp = ch.voice.p, li = vp < .38 ? 0 : vp < .7 ? 1 : 2;
  tabs.forEach((x, i) => x.classList.toggle('on', i === li)); lines.forEach((x, i) => x.classList.toggle('on', i === li));
  if (ch.voice.vis) waveBars.forEach((b, i) => { const a = .12 + .88 * Math.abs(Math.sin(t * 6.3 + i * .55) * Math.sin(t * 1.7 + i * .21)); b.style.transform = `scaleY(${a.toFixed(3)})`; });

  // the real photographs slide past
  const rp = ch.real.p, dist = track.scrollWidth - innerWidth * .62;
  track.style.transform = `translate3d(${-ease(rp) * dist}px, 0, 0)`;

  // app phones fan with the scroll
  const aq = ch.app.q - .5;
  phones[0].style.transform = `translate(-135%, ${-46 + aq * 18}%) rotateY(${18 - aq * 20}deg) rotateZ(-5deg)`;
  phones[1].style.transform = `translate(-50%, ${-54 - aq * 10}%)`;
  phones[2].style.transform = `translate(35%, ${-46 + aq * 26}%) rotateY(${-18 + aq * 20}deg) rotateZ(5deg)`;
  const wq = ch.win.q; winImgs.forEach((im, i) => { im.style.transform = `scale(1.12) translateY(${(wq - .5) * (i + 1) * -6}%)`; });

  // HUD: the whole page is about a minute long, like a scan
  let curSec = secs[0], idx = 0;
  secs.forEach((s, i) => { if (y + vh * .5 >= s.top) { curSec = s; idx = i; } });
  hudCh.textContent = `${String(idx).padStart(2, '0')} / ${curSec.name}`;
  const secsT = Math.round(clamp(y / maxY) * 60);
  hudT.textContent = `T+00:${String(secsT).padStart(2, '0')} / 01:00`;
  hudBar.style.setProperty('--p', clamp(y / maxY));
  if (curSec.bg !== curBg) {
    curBg = curSec.bg;
    document.documentElement.style.setProperty('--bg', curSec.bg); document.documentElement.style.setProperty('--fg', curSec.fg);
  }
  light += ((lum(curSec.bg) > .5 ? 1 : 0) - light) * .06;

  // nav slides away while reading, returns on the way back
  const away = y > lastY + 1 && y > vh * .8; const back = y < lastY - 1;
  if (away && !navAway) { navAway = true; nav.classList.add('away'); } else if ((back || y < vh * .8) && navAway) { navAway = false; nav.classList.remove('away'); }
  lastY = y;
}

function placeLabels(list) {
  if (!list) return;
  for (const a of list) {
    let el = labs.get(a.id);
    if (!el) {
      el = document.createElement('div'); el.className = 'lab';
      el.innerHTML = `<span class="pt"></span><span class="ln"></span><span class="tx"><b>${a.t1}</b><span>${a.t2}</span></span>`;
      labelsEl.append(el); labs.set(a.id, el); el._w = 0;
    }
    el.classList.toggle('left', a.left); el.classList.toggle('on', a.on);
    if (!a.on && !el.classList.contains('on')) { if (el.style.opacity === '0') continue; }
    if (!el._w || el._side !== a.left) { el._w = el.offsetWidth; el._h = el.offsetHeight; el._side = a.left; }
    if (a.mobile) { const lw = Math.max(14, innerWidth * .5 - a.x); el.style.setProperty('--lw', lw + 'px'); el._w = 0; }
    const x = a.left ? a.x - el._w + 4.5 : a.x - 4.5;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${(a.y - el._h / 2).toFixed(1)}px, 0)`;
  }
}

// ── boot
let world = null, introT = -1;
(async () => {
  await document.fonts.ready;
  try { world = await createWorld($('#world')); } catch (e) { console.error(e); }
  if (!world) { document.documentElement.classList.add('no-webgl'); $('#world').remove(); }
  measure(); world?.layout(pos);
  clearInterval(fakeT); setLoad(1);
  setTimeout(() => {
    ld.classList.add('out'); loading = false; document.documentElement.style.overflow = '';
    setTimeout(() => { ld.remove(); }, 1200);
    $$('.hero [data-split]').forEach((el) => el.classList.add('in'));
    document.documentElement.classList.add('go'); introT = performance.now();
  }, 350);
  window.__ready = true;
})();
// the hero word is fitted to the screen width, whatever the font metrics
function fitHero() {
  const wrap = $('.hero-word'), ws = $$('.hw');
  const stack = innerWidth / innerHeight < .85;
  ws.forEach((w) => { w.style.fontSize = '100px'; });
  const widths = ws.map((w) => w.getBoundingClientRect().width);
  const avail = innerWidth * .94, gap = innerWidth * .016;
  const k = stack ? avail / Math.max(...widths) : (avail - gap) / (widths[0] + widths[1]);
  ws.forEach((w) => { w.style.fontSize = (100 * k).toFixed(1) + 'px'; });
  const fw = $('.foot-word'); fw.style.fontSize = '100px';
  fw.style.fontSize = (100 * (innerWidth - 2 * parseFloat(getComputedStyle($('.foot')).paddingLeft)) / fw.getBoundingClientRect().width).toFixed(1) + 'px';
}
document.fonts.ready.then(fitHero);
addEventListener('resize', () => { fitHero(); measure(); world?.resize(); world?.layout(pos); });
addEventListener('load', () => { measure(); world?.layout(pos); });
new ResizeObserver(() => { measure(); world?.layout(pos); }).observe(document.body);

function loop(now) {
  const t = now / 1000;
  if (Math.abs(target - cur) > .4) { cur += (target - cur) * .085; scrollTo(0, cur); } else if (target !== cur) { cur = target; scrollTo(0, cur); }
  const y = window.__forceY ?? scrollY;
  const ch = chState(y);
  dom(y, ch, t);
  cx += (mouse.px - cx) * .22; cy += (mouse.py - cy) * .22;
  cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
  const intro = introT < 0 ? 0 : clamp((now - introT - 150) / 1700);
  if (world) placeLabels(world.frame({ y, ch, mouse, light, intro }));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
