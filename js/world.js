// The 3D layer: one scene for the whole page. The wand is modelled from the
// real build photos (blue PLA body, white collars, camera, the TFT, four steel
// prongs) and every chapter moves it, or brings its own set piece around it.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const band = (p, a, b) => clamp((p - a) / (b - a));
const GLOW = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

// ── keyframe tracks over the page's scroll position ──────────────────────────
// A key is [chapter, f, off, values]: scroll = chapter top + f·(height − vh) + off·vh.
function track(keys) {
  let at = [];
  return {
    layout(pos) {
      let last = {};
      at = keys.map(([id, f, off, v]) => { last = { ...last, ...v }; return { y: pos(id, f, off), v: last }; }).sort((a, b) => a.y - b.y);
    },
    get(y) {
      if (!at.length) return {};
      if (y <= at[0].y) return at[0].v;
      for (let i = 0; i < at.length - 1; i++) {
        const a = at[i], b = at[i + 1];
        if (y < b.y) {
          const t = ease(clamp((y - a.y) / Math.max(1, b.y - a.y)));
          const o = {};
          for (const k in b.v) o[k] = mix(a.v[k] ?? b.v[k], b.v[k], t);
          return o;
        }
      }
      return at[at.length - 1].v;
    },
  };
}

const WAND = track([
  ['hero', 0, 0, { x: 0, y: -.32, z: 0, rx: .06, ry: -.35, rz: .12, s: .7, ex: 0, spin: 1 }],
  ['hero', 0, .6, { x: 1.9, y: -.1, s: .7, rz: -.04, ry: .5, spin: .8 }],
  ['problem', 0, 0, { x: 3.45, y: -.1, s: .7, rx: .12, ry: .9, rz: -.2, spin: .5 }],
  ['problem', 1, 0, { x: 3.8, y: .25, s: .68, rx: .2, ry: 2.4, rz: -.32, spin: .3 }],
  ['soil', 0, -.3, { x: 1.4, y: 4.4, s: .62, rx: .05, ry: 0, rz: -.12, spin: 0 }],
  ['soil', 0, 0, { x: -.7, y: 3.1, s: .62, rx: .1, ry: 0, rz: 0 }],
  ['soil', .3, 0, { x: -.7, y: .82 }],
  ['soil', .9, 0, { x: -.7, y: .82 }],
  ['eye', 0, 0, { x: 4.0, y: .15, s: .6, rx: .04, ry: -.85, rz: .04 }],
  ['eye', 1, 0, { x: 4.15, y: 0, ry: -.62 }],
  ['voice', 0, 0, { x: 3.75, y: .2, s: .72, rx: .05, ry: .42, rz: -.06 }],
  ['voice', 1, 0, { x: 3.6, y: 0, ry: -.42, rz: .04 }],
  ['brain', 0, -.3, { x: 4.4, y: 7.8, s: .6, ry: 1.4, rz: .3 }],
  ['inside', 0, -.62, { x: 4.4, y: 7.8 }],
  ['inside', 0, -.6, { x: 2.0, y: -8.5, ry: -1.2, rz: 0, rx: .05 }],
  ['inside', 0, 0, { x: 2.1, y: -.3, s: .6, ry: .3, ex: 0 }],
  ['inside', .14, 0, { x: 2.1, y: -.3, ry: .25, ex: 0 }],
  ['inside', .55, 0, { x: 1.7, y: -.12, s: .47, ry: -.22, ex: 1 }],
  ['inside', .97, 0, { ry: .32, ex: 1 }],
  ['proof', 0, -.35, { x: 2.2, y: 8.6, ex: .4, ry: -1.8 }],
  ['team', 0, -.72, { x: 2.2, y: 8.6 }],
  ['team', 0, -.7, { x: 4.0, y: -8.5, s: .66, ex: 0, ry: -.6, rz: 0, spin: 0 }],
  ['team', 0, 0, { x: 3.9, y: -.15, s: .66, rx: .05, ry: -.3, rz: .08, spin: 1 }],
  ['team', 0, .9, { x: 3.9, y: .4 }],
  ['foot', 0, -.2, { x: 0, y: 1.05, s: .5, rx: .04, rz: 0, spin: 1 }],
]);
// Portrait screens (phones and tablets held upright) stack the copy, so the wand
// takes its own path through the empty space: mx/my move it within the stage,
// ms scales the stage (wand, soil, bands), sy lifts the whole stage.
const MWAND = track([
  ['hero', 0, 0, { ms: .6, mx: 0, my: -2.1, sy: 1 }],
  ['hero', 0, .6, { mx: 1.4, my: -1.5 }],
  ['problem', 0, 0, { ms: .5, mx: 2.7, my: -6.2 }],
  ['problem', .45, 0, {}],
  ['problem', .66, 0, { mx: 2.6, my: 1.8 }],
  ['problem', 1, 0, {}],
  ['soil', 0, -.3, { ms: .5, mx: 0, my: 0, sy: .55 }],
  ['soil', .9, 0, {}],
  ['eye', 0, 0, { ms: .6, sy: 1 }],
  ['voice', 0, 0, { ms: .55, my: -1.6 }],
  ['voice', 1, 0, {}],
  ['brain', 0, -.3, { ms: .6, my: 0 }],
  ['inside', 0, -.62, { mx: 0 }],
  ['inside', 0, -.6, { ms: .9, mx: -1.75 }],
  ['inside', 0, 0, { my: -2.4 }],
  ['inside', .4, 0, {}],
  ['inside', .55, 0, { ms: .72, my: -3.6 }],
  ['inside', .97, 0, {}],
  ['proof', 0, -.35, { ms: .6, mx: 0, my: 0 }],
  ['team', 0, -.7, { my: 30 }],
]);
const SET = track([
  ['hero', 0, 0, { bands: 1, sheets: 0, soil: -8, leaf: -8, rings: 0 }],
  ['hero', 0, .65, { bands: 0 }],
  ['problem', 0, -.4, { sheets: 0 }],
  ['problem', .12, 0, { sheets: 1 }],
  ['problem', .86, 0, { sheets: 1 }],
  ['soil', 0, -.15, { sheets: 0, soil: -8 }],
  ['soil', 0, .15, { soil: 0 }],
  ['soil', .9, 0, { soil: 0, leaf: -8 }],
  ['eye', 0, 0, { soil: -8, leaf: 0 }],
  ['eye', 1, 0, { leaf: 0, rings: 0 }],
  ['voice', 0, -.25, { leaf: 8 }],
  ['voice', .06, 0, { rings: 1 }],
  ['voice', .95, 0, { rings: 1 }],
  ['brain', 0, -.4, { rings: 0 }],
]);

// ── textures ─────────────────────────────────────────────────────────────────
function canvasTex(w, h, draw, opt = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opt.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.userData = { c, g };
  return t;
}
// FDM layer lines: the honest fingerprint of a 3D-printed body
const layers = canvasTex(8, 256, (g, w, h) => {
  for (let y = 0; y < h; y++) { const v = 128 + 70 * Math.sin(y / h * TAU * 32) + (Math.random() - .5) * 30; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); }
}, { linear: true, repeat: true });

function scaleUV(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return geo;
}

export async function createWorld(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 120);
  camera.position.set(0, 0, 14);

  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.1); key.position.set(-5, 7, 8); scene.add(key);
  const rimA = new THREE.DirectionalLight(0x6fa2ff, 2.4); rimA.position.set(-7, 2, -6); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xffa04a, 2.2); rimB.position.set(7, -1, -5); scene.add(rimB);

  // ── materials
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x2b66cc, roughness: .4, metalness: .18, clearcoat: .45, clearcoatRoughness: .35, bumpMap: layers, bumpScale: 1.2 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xe9e5dc, roughness: .55, metalness: 0, clearcoat: .15, bumpMap: layers, bumpScale: 1.2 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x101114, roughness: .32, metalness: .1, clearcoat: .6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x05070c, roughness: .04, metalness: .2, clearcoat: 1, clearcoatRoughness: .02 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd2d5da, metalness: 1, roughness: .26 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, metalness: .85, roughness: .3 });

  // ── the TFT: a 320×240 canvas the page redraws as the story moves
  const tft = canvasTex(640, 480, () => {});
  const T = tft.userData.g;
  let tftMode = '', tftFrame = 0;
  function drawTFT(mode, t, p) {
    const g = T, W = 640, H = 480;
    g.save(); g.scale(2, 2); const w = 320, h = 240;
    if (mode === 'idle') {
      const sky = g.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, '#5fb6f0'); sky.addColorStop(1, '#bfe6fb');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff6c7'; g.beginPath(); g.arc(268, 34, 15, 0, TAU); g.fill();
      for (let i = 0; i < 3; i++) { const cx = ((i * 130 - t * 9) % 420 + 420) % 420 - 50; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(cx, 22 + i * 13, 44, 9); g.fillRect(cx + 9, 15 + i * 13, 24, 8); }
      g.fillStyle = '#8fbf5a'; g.beginPath(); g.moveTo(0, 170); for (let x = 0; x <= w; x += 10) g.lineTo(x, 160 - 12 * Math.sin((x + t * 20) / 46)); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#c99b5a'; g.fillRect(0, 186, w, 54);
      g.fillStyle = '#b4843f'; for (let x = -((t * 30) % 22); x < w; x += 22) g.fillRect(x, 194, 12, 3);
      // tractor, driving right (as on the real wand)
      const tx = 40 + ((t * 18) % 330) - 40, ty = 166;
      g.fillStyle = '#d62f2f'; g.fillRect(tx, ty, 34, 14); g.fillRect(tx + 18, ty - 12, 14, 12);
      g.fillStyle = '#9fd4ff'; g.fillRect(tx + 21, ty - 9, 8, 7);
      g.fillStyle = '#222'; g.beginPath(); g.arc(tx + 8, ty + 17, 8, 0, TAU); g.arc(tx + 30, ty + 18, 6, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.font = '800 38px Manrope'; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = '#123b66'; g.strokeText('FASAL SATHI', w / 2, 112); g.fillText('FASAL SATHI', w / 2, 112);
      g.fillStyle = '#111'; g.fillRect(84, 126, 152, 34);
      g.fillStyle = '#52e05a'; g.font = '800 15px Manrope'; g.fillText('SCAN', w / 2, 141);
      g.fillStyle = '#fff'; g.font = '700 10px Manrope'; g.fillText('START SOIL TEST', w / 2, 155);
      g.fillStyle = '#10243a'; g.fillRect(0, 222, w, 18);
      g.fillStyle = '#9fd0ff'; g.font = '700 9px Manrope'; g.fillText('NEXT · CAMERA      PREV · SETTINGS', w / 2, 234);
    } else if (mode === 'scan') {
      g.fillStyle = '#071018'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffb347'; g.font = '800 26px Manrope'; g.textAlign = 'center'; g.fillText('READING SOIL', w / 2, 92);
      g.fillStyle = '#7d93a8'; g.font = '700 11px JB'; g.fillText('MODBUS RTU · 4800 BAUD', w / 2, 116);
      g.fillStyle = '#16283a'; g.fillRect(50, 140, 220, 14);
      g.fillStyle = '#4fa3ff'; g.fillRect(50, 140, 220 * clamp(p), 14);
      for (let i = 0; i < 9; i++) { g.fillStyle = i / 9 < p ? '#52e05a' : '#20364c'; g.fillRect(52 + i * 24, 170, 18, 18); }
      g.fillStyle = '#cfe3ff'; g.font = '700 11px JB'; g.fillText(`${Math.round(clamp(p) * 9)} / 9 REGISTERS`, w / 2, 212);
    } else if (mode === 'result') {
      g.fillStyle = '#071018'; g.fillRect(0, 0, w, h);
      const tiles = [['MOIST', '27.4', '#3aa0ff'], ['TEMP', '26.7', '#ff6b5a'], ['EC', '98', '#ffc23d'], ['pH', '8.8', '#b57bff'], ['N', '40', '#52e05a', 1], ['P', '5', '#ff9a2e', 1], ['K', '30', '#2fd8d0', 1]];
      g.textAlign = 'left';
      tiles.forEach(([k, v, c, est], i) => {
        const col = i % 3, row = Math.floor(i / 3), x = 8 + col * 104, y = 8 + row * 72, tw = i === 6 ? 304 : 98;
        g.fillStyle = '#0f2131'; g.fillRect(x, y, tw, 66); g.fillStyle = c; g.fillRect(x, y, 4, 66);
        g.fillStyle = '#8aa2b8'; g.font = '700 11px JB'; g.fillText(k + (est ? ' EST' : ''), x + 12, y + 20);
        g.fillStyle = '#fff'; g.font = '800 28px Manrope'; g.fillText(v, x + 12, y + 54);
      });
    } else if (mode === 'camera') {
      g.fillStyle = '#1b1d1c'; g.fillRect(0, 0, w, h);
      // 4-bit greyscale preview, as the wand really streams it
      for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
        const dx = (x - 160) / 70, dy = (y - 120) / 100, leaf = dx * dx * (1.2 + dy) + dy * dy < 1 ? 1 : 0;
        const v = Math.floor((leaf ? 110 + 60 * Math.sin(x * .09 + y * .05) : 40 + 20 * Math.sin(x * .03 + t)) / 16) * 16;
        g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 4);
      }
      g.strokeStyle = '#52e05a'; g.lineWidth = 3; const b = 22;
      [[60, 30, 1, 1], [260, 30, -1, 1], [60, 210, 1, -1], [260, 210, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + b * sx, y); g.lineTo(x, y); g.lineTo(x, y + b * sy); g.stroke(); });
      g.fillStyle = '#52e05a'; g.font = '800 12px JB'; g.textAlign = 'center'; g.fillText('FRAME THE LEAF · PRESS SCAN', w / 2, 232);
    } else if (mode === 'speak') {
      g.fillStyle = '#120c06'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ff9a2e'; g.font = '800 24px Manrope'; g.textAlign = 'center'; g.fillText('SPEAKING', w / 2, 66);
      for (let i = 0; i < 26; i++) { const a = .25 + .75 * Math.abs(Math.sin(t * 7 + i * .7) * Math.sin(t * 2.3 + i * .31)); g.fillStyle = '#ff9a2e'; g.fillRect(28 + i * 10.4, 132 - a * 42, 6, a * 84); }
      g.fillStyle = '#c9a37a'; g.font = '700 11px JB'; g.fillText('HINDI ADVISORY · PAGE 1 / 3', w / 2, 210);
    }
    g.restore();
    tft.needsUpdate = true;
  }
  drawTFT('idle', 0, 0);

  // ── the wand
  const stage = new THREE.Group(); scene.add(stage);
  const wand = new THREE.Group(); stage.add(wand);
  const rig = new THREE.Group(); rig.position.y = .3; wand.add(rig);
  const part = (n) => { const g = new THREE.Group(); g.name = n; rig.add(g); return g; };
  const cap = part('cap'), upper = part('upper'), board = part('board'), lower = part('lower'), probe = part('probe');
  const cyl = (r, h, mat, y, grp, seg = 72) => { const m = new THREE.Mesh(scaleUV(new THREE.CylinderGeometry(r, r, h, seg, 1, false), 1, h * 2.2), mat); m.position.y = y; grp.add(m); return m; };
  const front = (obj, r, y, grp) => { obj.position.set(0, y, r); grp.add(obj); return obj; };

  // probe: bottom collar and four stainless prongs
  cyl(.66, .32, white, -2.46, probe);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.6, .66, .05, 64), white); base.position.y = -2.645; probe.add(base);
  for (const [x, z] of [[-.27, .12], [-.09, -.12], [.09, .12], [.27, -.12]]) {
    const pr = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, 1.15, 16), steel); pr.position.set(x, -3.22, z); probe.add(pr);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.034, .16, 16), steel); tip.rotation.x = Math.PI; tip.position.set(x, -3.875, z); probe.add(tip);
  }
  // lower body: black waist band with cobalt ovals front and back, status LED board, OLED, speaker
  // (matches the rover design model: real speaker with frame, screws, surround, ribbed cone and dust cap)
  const MM = .012;                                   // world units per mm on this wand
  const bandMat = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: .5, metalness: .05, clearcoat: .2, clearcoatRoughness: .5, bumpMap: layers, bumpScale: 1.2 });
  cyl(.6, .56, blue, -2.02, lower);                  // cobalt foot above the bottom collar
  cyl(.6, 1.5, bandMat, -.99, lower);                // the waist band, up to the middle collar
  cyl(.665, .26, white, -.11, lower);
  function ovalGeo(R, yc, hy, hw, ang0) {
    const seg = 72, rings = 12, pos = [], nor = [], uv = [], idx = [];
    const put = (s, y, u, v) => { const a = ang0 + s / R; pos.push(R * Math.sin(a), y, R * Math.cos(a)); nor.push(Math.sin(a), 0, Math.cos(a)); uv.push(u, v * hy * 2.2); };
    put(0, yc, .5, .5);
    for (let k = 1; k <= rings; k++) for (let i = 0; i < seg; i++) { const ph = TAU * i / seg, r = k / rings; put(hw * r * Math.cos(ph), yc + hy * r * Math.sin(ph), .5 + .5 * r * Math.cos(ph), .5 + .5 * r * Math.sin(ph)); }
    for (let i = 0; i < seg; i++) idx.push(0, 1 + i, 1 + (i + 1) % seg);
    for (let k = 0; k < rings - 1; k++) for (let i = 0; i < seg; i++) { const a = 1 + k * seg + i, b = 1 + k * seg + (i + 1) % seg; idx.push(a, a + seg, b + seg, a, b + seg, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); return g;
  }
  for (const a0 of [0, Math.PI]) lower.add(new THREE.Mesh(ovalGeo(.607, -.96, .72, .52, a0), blue));
  const shoulder = new THREE.Mesh(scaleUV(new THREE.LatheGeometry(Array.from({ length: 17 }, (_, i) => { const t = i / 16; return new THREE.Vector2(.64 + .36 * (t * t * (3 - 2 * t)), .02 + t * .74); }), 72), 1, 2), blue);
  lower.add(shoulder);
  // status LED board (red PCB, two pads, the WS2812) and the two mic holes above it
  const ledPcb = front(new THREE.Mesh(new RoundedBoxGeometry(.19, .19, .05, 2, .008), new THREE.MeshStandardMaterial({ color: 0xc8463a, roughness: .55 })), .6, -.41, lower);
  const led = new THREE.Mesh(new RoundedBoxGeometry(.065, .065, .03, 2, .008), new THREE.MeshBasicMaterial({ color: 0x52e05a })); led.position.set(0, -.41, .63); lower.add(led);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .9, roughness: .3 });
  for (const x of [-.078, .078]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .01, 16), padMat); p.rotation.x = Math.PI / 2; p.position.set(x, -.345, .627); lower.add(p); }
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050506 });
  for (const x of [-.048, .048]) { const h = new THREE.Mesh(new THREE.CircleGeometry(.016, 20), holeMat); h.position.set(x, -.28, .603); lower.add(h); }
  // OLED in an aluminium frame, showing the weather card the wand really shows
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: .85, roughness: .32 });
  const oledFrame = front(new THREE.Mesh(new RoundedBoxGeometry(.384, .312, .06, 2, .01), alu), .6, -.8, lower);
  const oledTex = canvasTex(256, 140, (g) => {
    g.fillStyle = '#0a0612'; g.fillRect(0, 0, 256, 140); g.fillStyle = '#dfe6ff'; g.strokeStyle = '#dfe6ff';
    g.beginPath(); g.arc(46, 52, 20, 0, TAU); g.arc(70, 58, 16, 0, TAU); g.arc(28, 62, 14, 0, TAU); g.fill();
    g.lineWidth = 4; g.beginPath(); g.moveTo(52, 80); g.lineTo(42, 100); g.lineTo(54, 100); g.lineTo(44, 120); g.stroke();
    g.fillRect(100, 18, 3, 100);
    g.font = '700 19px JB'; g.fillText('Rain: 100%', 112, 40); g.fillText('29 / 22C', 112, 66); g.font = '700 16px JB'; g.fillText('Thunderstorm', 112, 92);
    g.fillRect(14, 122, 80, 2); g.fillRect(160, 122, 82, 2); g.font = '700 11px JB'; g.fillText('SCAN to start', 104, 128);
  });
  const oled = new THREE.Mesh(new THREE.PlaneGeometry(.312, .168), new THREE.MeshBasicMaterial({ map: oledTex, toneMapped: false })); oled.position.set(0, -.8, .632); lower.add(oled);
  const oledGlass = new THREE.Mesh(new THREE.PlaneGeometry(.312, .168), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: .12, roughness: .03, clearcoat: 1, clearcoatRoughness: .02 })); oledGlass.position.set(0, -.8, .634); lower.add(oledGlass);
  // the speaker, built like a real driver (sizes in mm from the design model, scaled to 51 mm)
  const spk = new THREE.Group(); spk.position.set(0, -1.43, 0); lower.add(spk);
  const SK = 51 / 56, SF = 55;
  const lathe = (pts, mat) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r * SK * MM, (SF + x) * MM)), 96), mat); m.rotation.x = Math.PI / 2; spk.add(m); return m; };
  const oxide = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, color: 0x24262b, metalness: .75, roughness: .34, clearcoat: .3 });
  const rubber = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0x131416, roughness: .78 });
  const coneMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: 0x0c0c0e, roughness: .72 });
  const capMat = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, color: 0x08080a, roughness: .14, clearcoat: 1, clearcoatRoughness: .05 });
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(29 * SK * MM, 29 * SK * MM, 17 * MM, 64), new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: .45, clearcoat: .3 }));
  housing.rotation.x = Math.PI / 2; housing.position.z = (SF - 8.5) * MM; spk.add(housing);
  lathe([[22.6, 0], [28, 0], [28, 1.2], [27.4, 1.6], [22.6, 1.6], [22.6, 0]], oxide);                                  // steel frame
  lathe(Array.from({ length: 13 }, (_, i) => { const a = Math.PI * i / 12; return [20.8 + 1.8 * Math.cos(a), 1.6 + 1.5 * Math.sin(a)]; }), rubber);  // rubber surround
  lathe(Array.from({ length: 25 }, (_, i) => { const t = i / 24; return [19 - 10 * t, 1.6 - 3.3 * t + (i % 4 === 2 ? .16 : 0)]; }), coneMat);         // ribbed paper cone
  lathe(Array.from({ length: 13 }, (_, i) => { const a = Math.PI / 2 * i / 12; return [9.1 * Math.cos(a) + .01, -1.7 + 3.6 * Math.sin(a)]; }).reverse(), capMat);  // dust cap
  for (let q = 0; q < 4; q++) {
    const a = Math.PI / 4 + q * Math.PI / 2, sc = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * SK * MM, 1.6 * SK * MM, 1 * MM, 16), steel);
    sc.rotation.x = Math.PI / 2; sc.position.set(25.3 * SK * MM * Math.cos(a), 25.3 * SK * MM * Math.sin(a), (SF + 2) * MM); spk.add(sc);
  }
  // upper body: camera, display, three buttons
  cyl(1.0, 2.3, blue, 1.9, upper);
  cyl(1.02, .24, white, 3.13, upper);
  const cam = new THREE.Group(); cam.position.set(0, 2.5, .96); upper.add(cam);
  const camBody = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .16, 48), black); camBody.rotation.x = Math.PI / 2; cam.add(camBody);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(.17, .03, 16, 40), silver); lensRing.position.z = .085; cam.add(lensRing);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(.15, 32, 16), glass); lens.scale.z = .45; lens.position.z = .08; cam.add(lens);
  const mini = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 24), black); mini.rotation.x = Math.PI / 2; mini.position.set(0, 3.13, 1.04); upper.add(mini);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.1, .86, .08, 3, .025), silver); bezel.position.set(0, 1.55, .97); upper.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.94, .705), new THREE.MeshBasicMaterial({ map: tft, toneMapped: false })); screen.position.set(0, 1.55, 1.014); upper.add(screen);
  for (const x of [-.27, 0, .27]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .1, 32), white); b.rotation.x = Math.PI / 2; b.position.set(x, .97, .98); upper.add(b);
    const s = new THREE.Mesh(new RoundedBoxGeometry(.2, .2, .04, 2, .01), black); s.position.set(x, .97, .94); upper.add(s);
  }
  // top cap: solar panel and fan
  const capDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, .07, 72), white); capDisc.position.y = 3.285; cap.add(capDisc);
  const solarTex = canvasTex(256, 256, (g) => { g.fillStyle = '#0c1a3a'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#5c7fbf'; g.lineWidth = 2; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } g.fillStyle = '#c7d3ea'; g.fillRect(124, 0, 8, 256); });
  const solar = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, .03, 64), [new THREE.MeshStandardMaterial({ color: 0x222833, metalness: .6, roughness: .3 }), new THREE.MeshPhysicalMaterial({ map: solarTex, roughness: .08, metalness: .3, clearcoat: 1 }), new THREE.MeshStandardMaterial({ color: 0x222833 })]);
  solar.position.set(0, 3.33, -.15); cap.add(solar);
  const fan = new THREE.Mesh(new RoundedBoxGeometry(.42, .1, .42, 2, .03), black); fan.position.set(0, 3.36, .62); cap.add(fan);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .02, 24), new THREE.MeshStandardMaterial({ color: 0x2a2c31 })); hub.position.set(0, 3.42, .62); cap.add(hub);

  // the board inside: Arduino UNO Q
  const pcbTex = canvasTex(512, 400, (g, w, h) => {
    g.fillStyle = '#0d3b45'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,210,220,.25)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { g.beginPath(); const y = 20 + i * 9; g.moveTo(0, y); g.lineTo(140 + (i % 7) * 20, y); g.lineTo(170 + (i % 7) * 20, y + 30); g.lineTo(w, y + 30); g.stroke(); }
    g.fillStyle = '#e8eef0'; g.font = '800 34px Manrope'; g.fillText('UNO Q', 330, 360);
    g.font = '700 14px JB'; g.fillText('ARDUINO · ABX00087', 300, 382);
  });
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(1.37, 1.07, .05, 2, .02), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? new THREE.MeshStandardMaterial({ map: pcbTex, roughness: .5, metalness: .2 }) : new THREE.MeshStandardMaterial({ color: 0x0d3b45 }))));
  board.add(pcb);
  const chip = (w, h, x, y, mat) => { const c = new THREE.Mesh(new RoundedBoxGeometry(w, h, .05, 2, .008), mat); c.position.set(x, y, .05); board.add(c); return c; };
  chip(.34, .34, -.22, .08, silver); chip(.2, .2, .24, .16, black); chip(.16, .1, .25, -.12, black); chip(.18, .1, -.5, .35, silver);
  const hdr = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: .7 });
  chip(1.1, .07, -.04, -.45, hdr); chip(1.1, .07, -.04, .46, hdr);
  board.position.set(0, 1.95, 0);
  board.visible = false;

  // ── soil cross-section, with grass and the sensing wave
  const soil = new THREE.Group(); stage.add(soil);
  const tilt = new THREE.Group(); tilt.position.set(-.7, -.6, 0); tilt.rotation.x = .2; soil.add(tilt);
  const strata = canvasTex(1800, 680, (g, w, h) => {
    const L = [[0, '#2b1a10'], [.2, '#3a2414'], [.42, '#5a3a1f'], [.62, '#7a5430'], [.8, '#6e4a2c'], [1, '#3b2a1c']];
    const gr = g.createLinearGradient(0, 0, 0, h); L.forEach(([s, c]) => gr.addColorStop(s, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const y = Math.random() * h; g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,220,170'},${Math.random() * .12})`; g.fillRect(Math.random() * w, y, 2, 2); }
    for (const [y0, a] of [[.2, .35], [.44, .3], [.63, .35], [.81, .3]]) { g.strokeStyle = `rgba(20,10,4,${a})`; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 20) g.lineTo(x, y0 * h + 9 * Math.sin(x / 90) + 5 * Math.sin(x / 23)); g.stroke(); }
    for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = h * (.62 + Math.random() * .36), r = 4 + Math.random() * 14; g.fillStyle = `hsl(${25 + Math.random() * 15},${15 + Math.random() * 15}%,${30 + Math.random() * 30}%)`; g.beginPath(); g.ellipse(x, y, r * 1.4, r, Math.random() * 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x - r * .3, y - r * .3, r * .5, r * .3, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(214,180,130,.55)'; g.lineCap = 'round';
    for (let i = 0; i < 70; i++) { let x = Math.random() * w, y = 0; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); g.moveTo(x, y); const n = 6 + Math.random() * 10; for (let k = 0; k < n; k++) { x += (Math.random() - .5) * 26; y += 10 + Math.random() * 18; g.lineTo(x, y); } g.stroke(); }
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e130b, roughness: 1 });
  const cut = new THREE.MeshStandardMaterial({ map: strata, roughness: .95 });
  const block = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.4, 4), [cut, cut, new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 1 }), dark, cut, dark]);
  block.position.set(0, -1.7, -2); tilt.add(block);
  // grass: instanced blades with a vertex-shader sway
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-.022, 0, 0, .022, 0, 0, -.012, .12, 0, .012, .12, 0, 0, .26, 0], 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  blade.computeVertexNormals();
  const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7, side: THREE.DoubleSide });
  const sway = { value: 0 };
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = sway;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat hh = position.y / .26; vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.); transformed.x += hh * hh * .07 * sin(uT * 1.6 + wp.x * 1.3 + wp.z * .8); transformed.z += hh * hh * .04 * cos(uT * 1.2 + wp.x);');
  };
  const N = 4200, grass = new THREE.InstancedMesh(blade, grassMat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - .5) * 6.7, z = -Math.random() * 3.95, s = .6 + Math.random() * 1.1;
    e.set((Math.random() - .5) * .5, Math.random() * TAU, (Math.random() - .5) * .5); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (.7 + Math.random() * .8), s)); grass.setMatrixAt(i, m4);
    col.setHSL(.2 + Math.random() * .1, .55 + Math.random() * .3, .2 + Math.random() * .25); grass.setColorAt(i, col);
  }
  tilt.add(grass);
  const waveMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...GLOW,
    uniforms: { uTip: { value: new THREE.Vector2() }, uT: { value: 0 }, uAmp: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec2 uTip; uniform float uT, uAmp; varying vec2 vP;
      void main(){ vec2 d2 = vP - uTip; d2.x *= .8; float d = length(d2);
        float ring = pow(.5 + .5 * sin(d * 10. - uT * 6.), 18.) * exp(-d * .5);
        float core = exp(-d * 3.2) * .9;
        vec3 c = mix(vec3(.18,.45,1.), vec3(.55,.95,1.), ring);
        gl_FragColor = vec4(c * (ring * 1.1 + core) * uAmp, 1.); }`,
  });
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.4), waveMat); wave.position.set(0, -1.7, .004); tilt.add(wave);

  // ── the leaf, scanned
  const leafG = new THREE.Group(); scene.add(leafG);
  const spots = [[.18, .32, .07], [-.22, .02, .055], [.12, -.3, .08], [-.08, .55, .045]];
  const leafTex = canvasTex(520, 840, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3f8f2a'); gr.addColorStop(.5, '#2f7a24'); gr.addColorStop(1, '#1f5a1c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(210,255,170,.55)'; g.lineWidth = 7; g.beginPath(); g.moveTo(w / 2, h); g.quadraticCurveTo(w / 2 + 14, h / 2, w / 2, 0); g.stroke();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(200,250,160,.4)';
    for (let i = 1; i < 12; i++) { const y = h - i * 70; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * 120, y - 40, w / 2 + s * 250, y - 120); g.stroke(); } }
    spots.forEach(([x, y, r]) => { const cx = (x / 1.6 + .5) * w, cy = (.5 - y / 2.6) * h, R = r / 1.6 * w * 1.4;
      const sg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8); sg.addColorStop(0, '#4a2d12'); sg.addColorStop(.45, '#7a4b1c'); sg.addColorStop(.7, 'rgba(214,196,64,.7)'); sg.addColorStop(1, 'rgba(214,196,64,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, R * 1.8, 0, TAU); g.fill(); });
  });
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.3); shape.bezierCurveTo(.95, -.9, .85, .6, 0, 1.3); shape.bezierCurveTo(-.85, .6, -.95, -.9, 0, -1.3);
  const lg = new THREE.ShapeGeometry(shape, 48);
  { const p = lg.attributes.position, uv = lg.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -.32 * x * x + .12 * Math.sin(y * 2.2)); uv.setXY(i, x / 1.6 + .5, y / 2.6 + .5); } lg.computeVertexNormals(); }
  const leaf = new THREE.Mesh(lg, new THREE.MeshPhysicalMaterial({ map: leafTex, roughness: .45, clearcoat: .5, clearcoatRoughness: .3, side: THREE.DoubleSide, sheen: .5, sheenColor: new THREE.Color(0xbfff9a) }));
  leafG.add(leaf);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.025, .04, .7, 12), new THREE.MeshStandardMaterial({ color: 0x3d7a26, roughness: .6 })); stem.position.y = -1.6; stem.rotation.z = .12; leafG.add(stem);
  const scanBar = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .03), new THREE.MeshBasicMaterial({ color: 0xb9f26a, transparent: true, depthWrite: false }));
  scanBar.position.z = .35; leafG.add(scanBar);
  const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .5), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, ...GLOW, uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ float a = pow(vU.y, 3.) * (1. - abs(vU.x - .5) * 2.); gl_FragColor = vec4(vec3(.72,.95,.42) * a * .55 * uA, 1.); }' }));
  scanGlow.position.z = .34; leafG.add(scanGlow);
  const bracket = new THREE.Group(); leafG.add(bracket);
  const brMat = new THREE.MeshBasicMaterial({ color: 0xb9f26a });
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const c = new THREE.Group();
    const h1 = new THREE.Mesh(new THREE.PlaneGeometry(.32, .03), brMat); h1.position.x = -sx * .16;
    const v1 = new THREE.Mesh(new THREE.PlaneGeometry(.03, .32), brMat); v1.position.y = -sy * .16;
    c.add(h1, v1); c.position.set(sx * 1.1, sy * 1.55, .4); c.userData = { sx, sy }; bracket.add(c);
  }
  const marks = spots.map(([x, y]) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(.1, .125, 40), new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, depthWrite: false }));
    m.position.set(x, y, .36); m.userData.y = y; leafG.add(m); return m;
  });

  // ── voice rings from the speaker
  const rings = Array.from({ length: 7 }, () => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, .012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x120c06, transparent: true, depthWrite: false }));
    scene.add(r); return r;
  });

  // ── the problem: lab reports drifting past, in English, a week late
  const sheetTex = canvasTex(400, 560, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1b1b'; g.font = '800 22px Manrope'; g.fillText('SOIL TEST REPORT', 28, 50);
    g.font = '600 11px JB'; g.fillStyle = '#666'; g.fillText('SAMPLE NO. 0447/B · LAB REF. ST-2026', 28, 72);
    const rows = ['Organic Carbon (OC) %', 'Available N (kg/ha)', 'Available P2O5', 'Available K2O', 'Electrical Cond. dS/m', 'pH (1:2.5)', 'Zn (DTPA) ppm', 'Fe (DTPA) ppm', 'Cation Exch. Capacity', 'Calcium Carbonate %'];
    rows.forEach((r, i) => { const y = 112 + i * 34; g.fillStyle = i % 2 ? '#ebe6dc' : '#f4f1ea'; g.fillRect(24, y - 20, w - 48, 30); g.fillStyle = '#333'; g.font = '500 12px Manrope'; g.fillText(r, 32, y); g.fillStyle = '#111'; g.font = '700 12px JB'; g.fillText((Math.random() * 300).toFixed(2), w - 100, y); });
    g.save(); g.translate(w - 130, h - 90); g.rotate(-.25); g.strokeStyle = '#c8322a'; g.lineWidth = 4; g.strokeRect(-70, -26, 160, 56); g.fillStyle = '#c8322a'; g.font = '800 22px Manrope'; g.fillText('7 DAYS', -44, 10); g.restore();
  });
  const sheets = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.68), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: .9, side: THREE.DoubleSide, transparent: true }));
    m.userData = { x: 1.6 + (i % 4) * 1.35 + Math.random() * .4, y: 3.6 - i * 1.25 + Math.random() * .4, z: -3.4 + Math.random() * 2.4, r: Math.random() * TAU, sp: .5 + Math.random() };
    scene.add(m); return m;
  });

  // ── a data ring orbiting the hero
  function textBand(txt, color, font) {
    const t = canvasTex(4096, 128, (g, w, h) => { g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; const step = g.measureText(txt).width; for (let x = 0; x < w; x += step) g.fillText(txt, x, h / 2); });
    t.wrapS = THREE.RepeatWrapping;
    return new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, .2, 128, 1, true), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  }
  await document.fonts.load('700 60px JB').catch(() => {});
  await document.fonts.load('60px Tiro').catch(() => {});
  const bandA = textBand('MOISTURE 27.4 %  ·  TEMPERATURE 26.7 °C  ·  EC 98 µS/cm  ·  pH 8.8  ·  N 40  P 5  K 30 EST  ·  ', '#ff9a2e', '700 60px JB');
  const bandB = textBand('मिट्टी  ·  फसल  ·  सलाह  ·  पानी  ·  खाद  ·  ', '#cfe0ff', '72px Tiro');
  bandB.scale.set(1.18, 1, 1.18);
  const bands = new THREE.Group(); bands.add(bandA); stage.add(bands);

  // ── pollen / dust
  const PN = 1100, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3), ps = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pp[i * 3] = (Math.random() - .5) * 22; pp[i * 3 + 1] = (Math.random() - .5) * 14; pp[i * 3 + 2] = -8 + Math.random() * 12; ps[i] = Math.random(); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
  const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0xffd9a8) }, uA: { value: .8 }, uS: { value: 0 }, uPx: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uT, uS, uPx; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uT * (.12 + seed * .25) + uS * (.4 + seed), 14.) - 7.; p.x += sin(uT * .3 + seed * 20.) * .4;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (2. + seed * 5.) * uPx * (10. / -mv.z); vA = .25 + .75 * fract(seed * 7.3); }`,
    fragmentShader: 'uniform vec3 uC; uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(uC, smoothstep(.5, .0, d) * uA * vA); }' });
  scene.add(new THREE.Points(pg, dustMat));

  // ── labels for the teardown: anchors inside each part
  const ANCH = [
    ['cap', cap, [-.9, 3.3, 0], 'Solar panel + fan', 'Top cap · keeps it cool'],
    ['cam', upper, [-.36, 2.5, .98], 'HD camera + mic', 'Sees the crop · hears the name'],
    ['tft', upper, [.47, 1.55, 1.0], 'Colour display', '2.4 in · 320 × 240'],
    ['btn', upper, [-.27, .97, 1.0], 'Three buttons', 'Scan · Next · Prev'],
    ['board', board, [.69, .1, 0], 'Arduino UNO Q', 'Linux + microcontroller'],
    ['led', lower, [.1, -.41, .63], 'Status light', 'WS2812 · 17 states'],
    ['oled', lower, [-.19, -.8, .63], 'OLED screen', '128 × 64 · weather'],
    ['spk', lower, [.3, -1.43, .68], 'Speaker', 'Speaks the advice in Hindi'],
    ['probe', probe, [-.27, -3.3, .12], 'Soil probe', '4 steel prongs · RS-485'],
  ];
  const v3 = new THREE.Vector3();
  const LEFT = new Set(['cap', 'cam', 'btn', 'oled', 'probe']);
  const MOB = new Set(['cap', 'tft', 'board', 'spk', 'probe']);

  // ── state
  let W = 1, H = 1, mobile = false, fitK = 1, spinA = 0, last = performance.now(), time = 0;
  const cur = { mx: 0, my: 0 };
  function resize() {
    W = innerWidth; H = innerHeight; mobile = W / H < .85;
    // short phones have less room between the stacked lines of copy
    fitK = W < 600 ? clamp(H / W / 2.05, .8, 1) : 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = mobile ? 42 : 30; camera.updateProjectionMatrix();
    dustMat.uniforms.uPx.value = renderer.getPixelRatio() * (H / 900);
  }
  resize();

  function frame(st) {
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
    const y = st.y, P = WAND.get(y), S = SET.get(y), ch = st.ch;
    cur.mx = mix(cur.mx, st.mouse.x, .05); cur.my = mix(cur.my, st.mouse.y, .05);

    // wand pose; spin accumulates while wanted, then settles to face the camera
    spinA += dt * .42 * (P.spin || 0);
    if ((P.spin || 0) < .99) { const tgt = Math.round(spinA / TAU) * TAU; spinA = mix(spinA, tgt, (1 - (P.spin || 0)) * .06); }
    let { x, s } = P, py = P.y;
    const M = mobile ? MWAND.get(y) : null;
    if (mobile) { x = M.mx + x * .12; py += M.my; }
    stage.scale.setScalar(mobile ? M.ms * fitK : 1); stage.position.y = mobile ? M.sy : 0;
    const intro = ease(clamp(st.intro ?? 1));
    py -= (1 - intro) * 5.5;
    const bob = Math.sin(time * 1.1) * .06 * (1 - (ch.soil?.vis || 0));
    wand.position.set(x, py + bob, P.z || 0);
    wand.rotation.set(P.rx + cur.my * .08, P.ry + spinA + cur.mx * .3 - (1 - intro) * 4.2, P.rz);
    wand.scale.setScalar(s);
    // teardown
    const ex = ease(clamp(P.ex || 0));
    cap.position.y = ex * 3.0; cap.rotation.y = ex * .5;
    upper.position.y = ex * 1.65;
    lower.position.y = -ex * .95;
    probe.position.y = -ex * 2.45; probe.rotation.y = -ex * .4;
    board.visible = ex > .02;
    board.position.set(0, mix(1.95, 1.1, ex), ex * .35);
    board.rotation.set(-.12 * ex, -wand.rotation.y + .22 * ex, 0);
    board.scale.setScalar(.6 + .55 * ex);

    // TFT follows the story
    const soilP = ch.soil?.p || 0;
    let mode = 'idle', sp = 0;
    if ((ch.soil?.vis || 0) > .5) mode = soilP < .28 ? 'idle' : soilP < .6 ? 'scan' : 'result', sp = band(soilP, .3, .58);
    if ((ch.eye?.vis || 0) > .5) mode = 'camera';
    if ((ch.voice?.vis || 0) > .5) mode = 'speak';
    tftFrame++;
    if (mode !== tftMode || ((mode === 'idle' || mode === 'speak' || mode === 'scan') && tftFrame % 2 === 0) || (mode === 'camera' && tftFrame % 8 === 0)) { drawTFT(mode, time, sp); tftMode = mode; }
    led.material.color.setHex(mode === 'scan' ? (Math.sin(time * 12) > 0 ? 0x4fa3ff : 0x0a2a55) : mode === 'speak' ? 0xff9a2e : 0x52e05a);

    // soil
    soil.visible = S.soil > -7.9;
    soil.position.y = S.soil;
    sway.value = time;
    const tip = new THREE.Vector3(0, -3.62, 0); probe.localToWorld(tip.set(0, -3.95, 0));
    wave.worldToLocal(tip); waveMat.uniforms.uTip.value.set(tip.x, tip.y + .2);
    waveMat.uniforms.uT.value = time; waveMat.uniforms.uAmp.value = band(soilP, .3, .4) * (1 - band(soilP, .9, 1)) * (soil.visible ? 1 : 0);

    // leaf
    leafG.visible = Math.abs(S.leaf) < 7.9;
    const eyeP = ch.eye?.p || 0;
    leafG.position.set(mobile ? -.75 : .85, S.leaf + (mobile ? 1.0 : .28), .5);
    leafG.rotation.set(-.15 + cur.my * .1, Math.sin(time * .45) * .28 + eyeP * .5 + cur.mx * .2, -.18);
    leafG.scale.setScalar(mobile ? .62 : 1.2);
    const sweep = band(eyeP, .14, .62), scanY = mix(1.35, -1.35, sweep);
    scanBar.position.y = scanY; scanGlow.position.y = scanY + .25;
    const scanOn = sweep > 0 && sweep < 1 ? 1 : 0;
    scanBar.material.opacity = scanOn; scanGlow.material.uniforms.uA.value = scanOn;
    const br = 1.45 - .45 * ease(band(eyeP, .05, .35));
    bracket.children.forEach((c) => c.position.set(c.userData.sx * 1.1 * br, c.userData.sy * 1.55 * br, .4));
    marks.forEach((m, i) => { const on = clamp((scanY < m.userData.y ? 1 : 0) * band(eyeP, .14, .2)); const k = on * (1 + .15 * Math.sin(time * 5 + i)); m.scale.setScalar(Math.max(.001, k)); m.material.opacity = on; });

    // voice rings ripple out of the speaker toward the viewer
    const sw = new THREE.Vector3(0, -1.43, .72); lower.localToWorld(sw);
    rings.forEach((r, i) => {
      const ph = (time * .45 + i / rings.length) % 1;
      r.visible = S.rings > .01;
      r.position.set(sw.x - ph * 1.5, sw.y + ph * .4, sw.z + ph * 2);
      r.scale.setScalar(.25 + ph * 2.6 * (mobile ? .6 : 1));
      r.rotation.set(0, -.5, 0);
      r.material.opacity = S.rings * (1 - ph) * .75;
    });

    // falling lab reports
    const probP = ch.problem?.p || 0;
    sheets.forEach((m) => {
      const u = m.userData; m.visible = S.sheets > .01;
      m.visible = m.visible && !mobile;
      m.position.set(mobile ? u.x * .5 - 1.2 : u.x, u.y + 2.2 - probP * 7 + Math.sin(time * .6 * u.sp + u.r) * .12, u.z);
      m.rotation.set(Math.sin(time * .5 * u.sp + u.r) * .5, u.r + time * .2 * u.sp, Math.cos(time * .4 + u.r) * .3);
      m.material.opacity = S.sheets * .92;
    });

    // data bands around the hero wand
    bands.visible = S.bands > .01;
    bands.position.copy(wand.position); bands.position.y += 1.6 * s;
    bands.scale.setScalar(s * 1.05);
    bands.rotation.set(.32, 0, -.14);
    bandA.rotation.y = time * .25;
    bandA.material.opacity = S.bands * intro;

    // dust takes the colour of the chapter's ground
    dustMat.uniforms.uT.value = time; dustMat.uniforms.uS.value = y / H * .6;
    dustMat.uniforms.uC.value.lerpColors(new THREE.Color(0xffd9a8), new THREE.Color(0x2a1d10), st.light);
    dustMat.uniforms.uA.value = .75 - st.light * .35;
    rimB.intensity = 2.2 - st.light * 1.2; rimA.intensity = 2.4 - st.light * 1.4;

    camera.position.set(cur.mx * .35, -cur.my * .25, 14);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    // teardown labels, projected to the screen
    const insideVis = band(ch.inside?.p || 0, .5, .58) * (1 - band(ch.inside?.p || 0, .985, 1)) * (ch.inside?.vis > .5 ? 1 : 0);
    return ANCH.map(([id, grp, p, t1, t2], i) => {
      v3.set(...p); grp.localToWorld(v3); v3.project(camera);
      const sxp = (v3.x * .5 + .5) * W, syp = (-v3.y * .5 + .5) * H;
      return { id, x: sxp, y: syp, left: !mobile && LEFT.has(id), on: insideVis > 0 && (ch.inside.p > .52 + i * .035) && (!mobile || MOB.has(id)), t1, t2, mobile };
    });
  }

  return { frame, resize, layout: (pos) => { WAND.layout(pos); MWAND.layout(pos); SET.layout(pos); } };
}
