// Fasal Sathi Rover - one-screen 3D viewer.
// Drag turns it, scroll in zooms toward the cursor and holds 5 s, scroll back resets,
// a tap zooms onto the exact part and springs back after a couple of seconds.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);

if (window.__PHONE__) {
  $('gateUrl').textContent = location.href.replace(/^https?:\/\//, '');
} else {
  main();
}

// a small photo studio, baked into an environment map, so glossy parts have something to reflect
function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0b0c10);
  const panel = (w, h, power, hex, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0.3, 0); s.add(m);
  };
  panel(3.4, 1.6, 4.2, 0xffffff, [0.02, 3.3, 0.01]);     // overhead softbox
  panel(1.6, 2.2, 7.5, 0xfff1df, [2.8, 1.6, 2.2]);       // key, front right
  panel(0.45, 2.8, 5.5, 0xcfe0ff, [-3.0, 1.5, -1.8]);    // cool rim strip, back left
  panel(0.45, 2.8, 2.6, 0xffffff, [-2.4, 1.3, 2.8]);     // fill strip, front left
  panel(2.6, 0.32, 3.2, 0xffd9a8, [0.5, 0.6, -3.2]);     // warm bar behind
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0x15171c }));
  floor.rotation.x = -Math.PI / 2; s.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.012).texture; pm.dispose();
  return tex;
}

function main() {
  // ---------------------------------------------------------------- renderer, scene, light
  const canvas = $('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x07080a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 30);

  const key = new THREE.DirectionalLight(0xfff0de, 2.8);
  key.position.set(1.5, 2.6, 1.3); key.target.position.set(0, 0.22, 0); scene.add(key, key.target);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.6, right: 0.6, top: 0.75, bottom: -0.6, near: 0.5, far: 6 });
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.0025;
  const rim = new THREE.DirectionalLight(0x9cc2ff, 1.5); rim.position.set(-2.4, 1.8, -1.8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x0b0c0f, 0.22));

  // ground: instrument rings that fade out, a real shadow, and a soft contact shadow
  function canvasTex(size, draw) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const rings = canvasTex(2048, (g, s) => {
    const c = s / 2;
    const fade = g.createRadialGradient(c, c, 0, c, c, c);
    fade.addColorStop(0, 'rgba(24,30,40,0.95)'); fade.addColorStop(0.45, 'rgba(14,17,23,0.7)'); fade.addColorStop(1, 'rgba(7,8,10,0)');
    g.fillStyle = fade; g.fillRect(0, 0, s, s);
    for (let i = 1; i <= 9; i++) {
      const r = c * i / 9.4;
      g.strokeStyle = i === 3 ? 'rgba(127,176,255,0.55)' : `rgba(241,238,231,${0.10 - i * 0.008})`;
      g.lineWidth = i === 3 ? 3 : 2;
      g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke();
    }
    g.strokeStyle = 'rgba(241,238,231,0.06)'; g.lineWidth = 2;
    for (let a = 0; a < 24; a++) {
      const t = a / 24 * Math.PI * 2;
      g.beginPath(); g.moveTo(c + Math.cos(t) * c * 0.33, c + Math.sin(t) * c * 0.33); g.lineTo(c + Math.cos(t) * c * 0.98, c + Math.sin(t) * c * 0.98); g.stroke();
    }
    g.fillStyle = 'rgba(255,154,46,0.85)';
    for (let a = 0; a < 4; a++) { const t = a * Math.PI / 2; g.fillRect(c + Math.cos(t) * c * 0.319 - 6, c + Math.sin(t) * c * 0.319 - 6, 12, 12); }
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: rings, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; scene.add(ground);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.55, depthWrite: false }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.0003; catcher.receiveShadow = true; scene.add(catcher);
  const blob = canvasTex(512, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.7)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(-0.01, 0.0002, 0); scene.add(shadow);

  // ---------------------------------------------------------------- systems: words and camera framings
  const SYS = {
    overview: { kick: 'Overview', title: 'One wand. Every corner of the field.',
      text: 'The rover drives a grid over the field, stops at each point, lowers the Fasal Sathi wand to read the soil, and spreads lime or gypsum only where the reading says the soil needs it.',
      spec: [], view: { t: [-0.01, 0.29, 0], yaw: 0.62, pitch: 0.28, dist: 1.92 } },
    wand: { kick: 'Wand · Arduino Uno Q', title: 'The Fasal Sathi wand rides in front.',
      text: 'The same wand that won Season 1. It reads the soil, photographs the crop, and speaks the advice in Hindi. Unstrap it and it still works by hand.',
      spec: [['Reads', 'moisture · temp · pH · EC'], ['Sees', 'webcam + crop ID'], ['Speaks', 'Hindi, out loud'], ['Body', 'Ø150 head · 527 mm']],
      view: { t: [0.07, 0.49, 0], yaw: 0.30, pitch: 0.10, dist: 1.28 } },
    lift: { kick: 'Lift · twin NEMA17', title: 'Two columns lower the wand to the ground.',
      text: 'A stepper on each column turns a T8 lead screw. The brass nuts carry the wand holder down 30 mm until the probe touches the soil, then back up.',
      spec: [['Motors', '2 × NEMA17'], ['Screw', 'T8, 2 mm lead'], ['Travel', '30 mm'], ['Load', 'thrust bearing + collar']],
      view: { t: [0.04, 0.28, 0], yaw: 0.80, pitch: 0.18, dist: 1.30 } },
    spread: { kick: 'Spreader · by measured pH', title: 'It feeds only the soil that needs it.',
      text: 'Acidic soil gets lime (chuna), alkaline soil gets gypsum. A servo opens the gate, and a spinning disc throws the powder out under the deck.',
      spec: [['Hoppers', 'lime · gypsum'], ['Gate', 'MG996R servo'], ['Spread', 'N20 spinning disc'], ['Rule', 'pH, measured']],
      view: { t: [-0.19, 0.15, 0.02], yaw: 2.45, pitch: 0.34, dist: 1.10 } },
    sense: { kick: 'Sensors · HC-SR04', title: 'It sees people and walls before it touches them.',
      text: 'Three ultrasonic sensors look ahead, one looks back, and an IR line sensor under the bumper keeps it on the grid. Two motion sensors and the wand camera watch the field.',
      spec: [['Front', '3 × ultrasonic'], ['Rear', '1 × ultrasonic'], ['Floor', 'IR line sensor'], ['Watch', 'PIR × 2 + wand camera']],
      view: { t: [0.18, 0.10, 0], yaw: 0.36, pitch: 0.18, dist: 0.98 } },
    drive: { kick: 'Drive · 4WD', title: 'Four geared motors that count every turn.',
      text: 'JGB37 motors with encoders let it drive straight and stop exactly on each grid point. Two BTS7960 drivers run the left and right sides.',
      spec: [['Motors', '4 × JGB37-520'], ['Wheels', 'Ø85 mm'], ['Drivers', '2 × BTS7960'], ['Base', '450 × 260 plywood']],
      view: { t: [0.10, 0.07, 0.14], yaw: 0.95, pitch: 0.16, dist: 0.92 } },
    brain: { kick: 'Control · ESP32 + Pi', title: 'Battery and brains under one hood.',
      text: 'A Raspberry Pi plans the route and runs the hotspot, an ESP32 drives the motors and sensors. The red button cuts all power at once.',
      spec: [['Battery', '11.1 V Li-ion 3S2P'], ['Brain', 'Raspberry Pi + ESP32'], ['Panel', 'E-stop · voltmeter'], ['Charge', 'USB-C']],
      view: { t: [-0.12, 0.17, 0.05], yaw: 1.72, pitch: 0.56, dist: 1.05 } },
  };
  const NAMES = [
    [/^Wand_TFT/, 'wand', 'TFT screen'], [/^Wand_Speaker/, 'wand', 'Speaker'], [/^Wand_OLED/, 'wand', 'OLED weather screen'],
    [/^Wand_(Webcam|TopCam)/, 'wand', 'Camera'], [/^Wand_(Prong|ProbeHead)/, 'wand', 'Soil probe'], [/^Wand_Solar/, 'wand', 'Solar panel'],
    [/^Wand_Fan/, 'wand', 'Cooling fan'], [/^Wand_Button/, 'wand', 'Buttons'], [/^Wand_LED/, 'wand', 'RGB status LED'], [/^Wand_Mic/, 'wand', 'Microphone'],
    [/^Wand_Oval|^Wand_WaistBand/, 'wand', 'Wand waist'], [/^Wand_Collar|^Wand_TopCap|^Wand_BottomCap/, 'wand', 'Wand collar'], [/^Wand/, 'wand', 'Fasal Sathi wand'],
    [/^Lift_NEMA|^Lift_MotorScrew/, 'lift', 'NEMA17 stepper'], [/^Lift_Coupler/, 'lift', 'Flexible coupler'], [/^Lift_Screw/, 'lift', 'T8 lead screw'],
    [/^Lift_Rod/, 'lift', '8 mm guide rod'], [/^Lift_Thrust/, 'lift', 'Thrust bearing'], [/^Lift_Collar/, 'lift', 'Lock collar'],
    [/^Lift_Endstop/, 'lift', 'Top limit switch'], [/^Lift_Riser/, 'lift', 'Motor riser'], [/^Lift_Cap/, 'lift', 'Column cap'], [/^Lift_Foot/, 'lift', 'Column foot'],
    [/^Lift_/, 'lift', 'Lift column'], [/^Carriage_Nut/, 'lift', 'Brass lead-screw nut'], [/^Carriage_(Bushing|LM8UU)/, 'lift', 'Linear bearing'],
    [/^Carriage_Strap/, 'wand', 'Velcro strap'], [/^Carriage_(Foam|Ring)/, 'wand', 'Padded wand holder'], [/^Carriage/, 'lift', 'Wand carriage'],
    [/^Powder_lime|^Label_Lime/, 'spread', 'Lime hopper'], [/^Powder_gypsum|^Label_Gypsum/, 'spread', 'Gypsum hopper'], [/^P-07/, 'spread', 'Powder hopper'],
    [/^P-10/, 'spread', 'Hopper lid'], [/^P-08/, 'spread', 'Gate + servo'], [/^P-09/, 'spread', 'Rotary gate'],
    [/^P-11/, 'spread', 'Y-chute'], [/^P-12/, 'spread', 'Spinning disc'], [/^P-13/, 'spread', 'Disc motor'], [/^ServoCable/, 'spread', 'Servo cable'],
    [/^Sensor_|^RearSensor/, 'sense', 'Ultrasonic sensor'], [/^Bumper_LineSensor|ref-pcb$/, 'sense', 'IR line sensor'], [/^Bumper_LED/, 'sense', 'Status light'],
    [/^Bumper_RubberStrip/, 'sense', 'Rubber bump strip'], [/^P-01|^Brand_Bumper/, 'sense', 'Front sensor bumper'], [/^P-14/, 'sense', 'Rear sensor mount'],
    [/ref-pir$/, 'sense', 'Motion sensor (PIR)'], [/^Hood_LEDWindow/, 'sense', 'Side light'],
    [/_Tire$|_Tread$/, 'drive', 'Treaded tyre'], [/_Hub$|_Nut$/, 'drive', 'Wheel hub'], [/^Wheel/, 'drive', 'Ø85 wheel'],
    [/_Encoder$|_Magnet$|_Header$/, 'drive', 'Motor encoder'], [/_Bracket$/, 'drive', 'Motor bracket'], [/^Motor_/, 'drive', 'JGB37 gear motor'],
    [/^EncoderCable/, 'drive', 'Encoder cable'],
    [/ref-estop$|^Hood_EStop/, 'brain', 'Emergency stop'], [/^Hood_Volt/, 'brain', 'Battery voltmeter'], [/^Hood_Rocker/, 'brain', 'Power switch'],
    [/^Hood_Mute/, 'brain', 'Alarm mute'], [/^Antenna/, 'brain', 'Wi-Fi antenna'], [/^Hood_Status/, 'brain', 'Status LEDs'], [/^Hood_USBC/, 'brain', 'USB-C charging'],
    [/^P-06|^Hood|^Brand_Hood/, 'brain', 'Electronics hood'], [/^S-01|^Deck/, 'drive', 'Plywood deck'], [/^Cable/, 'lift', 'Motor cable'], [/^Fasteners/, 'drive', 'Screws'],
  ];
  function partOf(obj) {
    for (let o = obj; o; o = o.parent) {
      const n = o.name || '';
      for (const [re, sys, label] of NAMES) if (re.test(n)) return { sys, label };
    }
    return null;
  }

  // ---------------------------------------------------------------- camera rig: every value on its own spring
  const SPRING = { glide: [30, 11], bounce: [58, 6.6] };   // [stiffness, damping]; glide is critically damped, bounce overshoots
  const v0 = SYS.overview.view;
  const cam = { yaw: v0.yaw, pitch: v0.pitch, dist: v0.dist, t: new THREE.Vector3(...v0.t), cx: 0.53 };
  const vel = { yaw: 0, pitch: 0, dist: 0, t: new THREE.Vector3(), cx: 0 };
  const goal = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, t: cam.t.clone(), cx: cam.cx };
  let mode = 'glide', flying = false, current = 'overview', hold = null;
  let dragging = false, lastInput = -1e9, autoSpin = true;

  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function viewOf(name) {
    const v = SYS[name].view;
    return { yaw: v.yaw, pitch: v.pitch, dist: v.dist, t: new THREE.Vector3(...v.t), cx: name === 'overview' ? 0.53 : 0.45 };
  }
  function flyTo(v, m) {
    goal.yaw = cam.yaw + wrap(v.yaw - cam.yaw); goal.pitch = v.pitch; goal.dist = v.dist; goal.t.copy(v.t); goal.cx = v.cx;
    mode = m; flying = true;
  }
  function snapshot() {
    return { yaw: flying ? goal.yaw : cam.yaw, pitch: flying ? goal.pitch : cam.pitch, dist: goal.dist, t: goal.t.clone(), cx: goal.cx };
  }

  // the card on the right
  const card = $('card');
  function setCard(kick, title, text, spec) {
    card.classList.add('swap');
    clearTimeout(setCard.t);
    setCard.t = setTimeout(() => {
      $('cardKick').textContent = kick; $('cardTitle').textContent = title; $('cardText').textContent = text;
      $('cardSpec').innerHTML = (spec || []).map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
      card.classList.remove('swap');
    }, 220);
  }
  function showSystem(name) { const s = SYS[name]; setCard(s.kick, s.title, s.text, s.spec); }

  function focus(name) {
    endHold(false);
    current = name;
    flyTo(viewOf(name), 'glide');
    document.body.classList.toggle('focused', name !== 'overview');
    document.querySelectorAll('.systems button').forEach((b) => b.classList.toggle('on', b.dataset.sys === name));
    showSystem(name);
    lastInput = performance.now();
  }

  // a hold keeps a zoom on screen for a while, then springs back to where you were
  const holdEl = $('hold'), holdBar = $('holdBar'), holdTxt = $('holdTxt');
  function startHold(ms) {
    if (!hold) hold = { snap: snapshot() };
    hold.until = performance.now() + ms; hold.total = ms;
    document.body.classList.add('focused');
    holdEl.classList.add('on');
    lastInput = performance.now();
  }
  function endHold(springBack) {
    if (!hold) return;
    const s = hold.snap; hold = null;
    unhighlight();
    holdEl.classList.remove('on');
    // spring all the way home: always the exact view the page opens with
    if (springBack) {
      current = 'overview';
      document.querySelectorAll('.systems button').forEach((b) => b.classList.remove('on'));
      flyTo(viewOf('overview'), 'bounce');
    }
    document.body.classList.toggle('focused', current !== 'overview');
    showSystem(current);
    lastInput = performance.now();
  }

  document.querySelectorAll('.systems button').forEach((b) => b.addEventListener('click', () => focus(current === b.dataset.sys ? 'overview' : b.dataset.sys)));
  $('bReset').addEventListener('click', () => focus('overview'));
  const bSpin = $('bSpin'); bSpin.classList.add('on');
  bSpin.addEventListener('click', () => { autoSpin = !autoSpin; bSpin.classList.toggle('on', autoSpin); });

  // ---------------------------------------------------------------- picking, part focus, highlight
  const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let model = null; const pickables = []; const labelOf = new Map();
  function pick(px, py) {
    ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(pickables, false)[0] || null;
  }
  const bTmp = new THREE.Box3(), cTmp = new THREE.Vector3();
  function partFocus(hit) {
    const info = labelOf.get(hit.object); if (!info) return null;
    const box = new THREE.Box3(); const meshes = [];
    for (const m of pickables) {
      const li = labelOf.get(m); if (!li || li.label !== info.label) continue;
      bTmp.setFromObject(m); bTmp.getCenter(cTmp);
      if (m === hit.object || cTmp.distanceTo(hit.point) < 0.09) { box.union(bTmp); meshes.push(m); }
    }
    const size = box.getSize(new THREE.Vector3()); let s = Math.max(size.x, size.y, size.z);
    let c = box.getCenter(new THREE.Vector3());
    let wide = false;
    if (!isFinite(s) || s > 0.3) { c = hit.point.clone(); s = 0.12; meshes.length = 0; wide = true; }
    return { c, s, info, meshes, wide };
  }
  let hl = [];
  const SAFFRON = new THREE.Color(0xff9a2e);
  function highlight(meshes) {
    unhighlight();
    for (const m of meshes) {
      if (!m.material || m.material.emissiveMap) continue;
      const orig = m.material, cl = orig.clone();
      cl.emissive = SAFFRON.clone(); cl.emissiveIntensity = 0;
      m.material = cl; hl.push([m, orig, cl]);
    }
  }
  function unhighlight() { for (const [m, orig, cl] of hl) { m.material = orig; cl.dispose(); } hl = []; }

  const hover = $('hover');
  let hoverTimer = 0;
  function showLabel(info, x, y, ms) {
    hover.textContent = `${SYS[info.sys].kick.split(' · ')[0]} · ${info.label}`;
    hover.style.left = x + 'px'; hover.style.top = y + 'px'; hover.classList.add('on');
    clearTimeout(hoverTimer); hoverTimer = 0;
    if (ms) hoverTimer = setTimeout(() => { hover.classList.remove('on'); hoverTimer = 0; }, ms);
  }

  // zoom so the point under the cursor stays put (a scaling about the picked point)
  function zoomToward(px, py, f) {
    const hit = pick(px, py);
    const P = hit ? hit.point : goal.t;
    const nd = Math.max(0.17, goal.dist * (1 - f));
    const ff = 1 - nd / goal.dist;
    goal.t.lerp(P, ff); goal.dist = nd; mode = 'glide';
  }

  function tap(x, y) {
    const hit = pick(x, y);
    if (!hit) { if (hold) endHold(true); return; }
    const f = partFocus(hit); if (!f) return;
    startHold(2600);
    goal.t.copy(f.c); goal.dist = THREE.MathUtils.clamp(f.s * 3.4 + 0.1, 0.2, 1.05); mode = 'glide';
    highlight(f.meshes);
    showLabel(f.info, x, y, 1800);
    const s = SYS[f.info.sys];
    setCard(`${s.kick.split(' · ')[0]} · close-up`, f.info.label, s.text, s.spec);
  }

  // ---------------------------------------------------------------- input
  const pointers = new Map();
  let down = null, pinch = null, lastMove = 0, lastBack = -1e9;
  const mouse = { x: -1, y: -1, dirty: false };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      dragging = true; flying = false; canvas.classList.add('drag');
      vel.yaw = vel.pitch = 0;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), total: 1, reset: false };
      down = null;
    }
    lastInput = performance.now();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.dirty = true; }
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const now = performance.now(); lastInput = now;
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), r = d / Math.max(pinch.d, 1);
      pinch.d = d; pinch.total *= r;
      if (r > 1.004) { zoomToward((a.x + b.x) / 2, (a.y + b.y) / 2, 1 - 1 / r); startHold(5000); }
      if (pinch.total < 0.8 && !pinch.reset) { pinch.reset = true; focus('overview'); }
      return;
    }
    if (down) down.moved += Math.abs(dx) + Math.abs(dy);
    const dyaw = dx * 0.0062, dpitch = dy * 0.0045;
    cam.yaw += dyaw; cam.pitch = THREE.MathUtils.clamp(cam.pitch + dpitch, 0.02, 1.25);
    const dt = Math.max((now - lastMove) / 1000, 1 / 240); lastMove = now;
    vel.yaw = vel.yaw * 0.5 + (dyaw / dt) * 0.5; vel.pitch = vel.pitch * 0.5 + (dpitch / dt) * 0.5;
    if (hold) hold.until = Math.max(hold.until, now + 1500);
  });
  function release(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      dragging = false; canvas.classList.remove('drag');
      if (performance.now() - lastMove > 90) vel.yaw = vel.pitch = 0;
      if (down && down.moved < 6 && performance.now() - down.t < 600) tap(e.clientX, e.clientY);
      down = null;
    }
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { if (!hoverTimer) hover.classList.remove('on'); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now(); lastInput = now;
    if (e.deltaY > 2) {                       // scrolling back is the reset button
      if (now - lastBack > 600) { lastBack = now; focus('overview'); }
      return;
    }
    if (e.deltaY < 0 && now - lastBack > 350) {
      zoomToward(e.clientX, e.clientY, 1 - Math.exp(e.deltaY * 0.0018));
      startHold(5000);
    }
  }, { passive: false });

  // ---------------------------------------------------------------- lift
  // the lead screws move the wand at an even, gentle pace: an eased glide, never a spring
  let liftNode = null, liftDown = false;
  const TRAVEL = 0.03;
  const lift = { y: 0, from: 0, to: 0, t0: -1, dur: 1 };
  const bLift = $('bLift');
  function toggleLift() {
    liftDown = !liftDown;
    lift.from = lift.y; lift.to = liftDown ? -TRAVEL : 0; lift.t0 = performance.now();
    lift.dur = 600 + 1900 * Math.abs(lift.to - lift.from) / TRAVEL;     // 2.5 s for the full 30 mm
    bLift.textContent = liftDown ? 'Raise the wand' : 'Lower the wand';
    if (liftDown && current === 'overview') focus('lift');
  }
  bLift.addEventListener('click', toggleLift);

  // ---------------------------------------------------------------- materials: glass on the screens, coat on the wand
  const upgraded = new Map();
  function physical(m, extra) {
    const p = m.isMeshPhysicalMaterial ? m : new THREE.MeshPhysicalMaterial({
      name: m.name, color: m.color.clone(), map: m.map, roughness: m.roughness, metalness: m.metalness,
      emissive: m.emissive.clone(), emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
      normalMap: m.normalMap, transparent: m.transparent, opacity: m.opacity, side: m.side });
    return Object.assign(p, extra);
  }
  function upgrade(m) {
    if (upgraded.has(m)) return upgraded.get(m);
    let n = m; const name = m.name || '';
    if (/^(TFT|OLED|Voltmeter)$/.test(name)) n = physical(m, { roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.015, emissiveIntensity: 1.35, envMapIntensity: 1.9 });
    else if (name === 'Wand_Cobalt') n = physical(m, { roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.06, envMapIntensity: 1.25 });
    else if (/^(GlossBlack|LensGlass|Solar)$/.test(name)) n = physical(m, { roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.7 });
    else if (name === 'PETG_Clear') n = physical(m, { transmission: 0.95, thickness: 0.002, roughness: 0.07, ior: 1.5, envMapIntensity: 1.5 });
    else if (/^(PLA_|Hub_|Wand_Collar|EStop|RockerRed)/.test(name)) n = physical(m, { clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 1.05 });
    else n.envMapIntensity = /Aluminium|Steel|Brass|Gearbox|BlackOxide/.test(name) ? 1.5 : 1.0;
    if (name === 'Plywood') { n.color.setRGB(0.50, 0.35, 0.20); n.roughness = 0.66; }
    if (/^LED_/.test(name)) n.emissiveIntensity = 4;
    upgraded.set(m, n); return n;
  }

  // ---------------------------------------------------------------- load
  const loader = new GLTFLoader();
  loader.load('model/FasalSathi_Rover.glb', (gltf) => {
    model = gltf.scene; scene.add(model);
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = upgrade(o.material);
        o.castShadow = o.material.name !== 'PETG_Clear'; o.receiveShadow = true;
        pickables.push(o);
        const info = partOf(o); if (info) labelOf.set(o, info);
      }
      if (o.name === 'Lift') liftNode = o;
    });
    $('ldNum').textContent = '100'; $('ldBar').style.transform = 'scaleX(1)';
    setTimeout(() => $('loader').classList.add('out'), 250);
    showSystem('overview');
    lastInput = -1e9;
  }, (xhr) => {
    const total = xhr.total || 6833596;
    const p = Math.min(99, Math.round(xhr.loaded / total * 100));
    $('ldNum').textContent = p; $('ldBar').style.transform = `scaleX(${p / 100})`;
  }, (err) => { $('ldTxt').textContent = 'Could not load the model. Refresh to try again.'; console.error(err); });

  // ---------------------------------------------------------------- loop
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1 ? 38 : 28; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  function spring(o, v, key, target, k, c, dt) {
    const a = -k * (o[key] - target) - c * v[key]; v[key] += a * dt; o[key] += v[key] * dt;
  }
  const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, fpsT = 0, time = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 30); time += dt;
    const now = performance.now();
    const [k, c] = SPRING[mode];
    // rotation: dragged directly, then inertia, flights, or the idle spin
    if (!dragging) {
      if (flying) {
        spring(cam, vel, 'yaw', goal.yaw, k, c, dt); spring(cam, vel, 'pitch', goal.pitch, k, c, dt);
        if (Math.abs(goal.yaw - cam.yaw) < 1e-3 && Math.abs(goal.pitch - cam.pitch) < 1e-3 && Math.abs(vel.yaw) < 1e-3) flying = false;
      } else {
        cam.yaw += vel.yaw * dt; cam.pitch = THREE.MathUtils.clamp(cam.pitch + vel.pitch * dt, 0.02, 1.25);
        const f = Math.exp(-dt * 4.5); vel.yaw *= f; vel.pitch *= f;
        if (autoSpin && !hold && now - lastInput > 2500) cam.yaw -= dt * 0.16;
      }
    }
    // distance, target and framing always follow their goals
    spring(cam, vel, 'dist', goal.dist, k, c, dt); spring(cam, vel, 'cx', goal.cx, k, c, dt);
    for (const ax of ['x', 'y', 'z']) spring(cam.t, vel.t, ax, goal.t[ax], k, c, dt);
    // a hold runs out, then everything springs back
    if (hold) {
      const left = hold.until - now;
      holdTxt.textContent = `Close-up · back in ${Math.max(0, left / 1000).toFixed(1)} s`;
      holdBar.style.transform = `scaleX(${Math.max(0, Math.min(1, left / hold.total))})`;
      if (left <= 0 && !dragging && pointers.size === 0) endHold(true);
    }
    for (const [, , cl] of hl) cl.emissiveIntensity = 0.16 + 0.12 * Math.sin(time * 6.5);

    const d = cam.dist;
    camera.position.set(cam.t.x + d * Math.cos(cam.pitch) * Math.cos(cam.yaw), cam.t.y + d * Math.sin(cam.pitch), cam.t.z + d * Math.cos(cam.pitch) * Math.sin(cam.yaw));
    camera.lookAt(cam.t);
    if (innerWidth / innerHeight >= 1) camera.setViewOffset(innerWidth, innerHeight, -(cam.cx - 0.5) * innerWidth, 0, innerWidth, innerHeight);
    else camera.setViewOffset(innerWidth, innerHeight, 0, -0.10 * innerHeight, innerWidth, innerHeight);
    camera.updateMatrixWorld();

    if (lift.t0 >= 0) {
      const k = Math.min(1, (now - lift.t0) / lift.dur), e = 0.5 - 0.5 * Math.cos(Math.PI * k);   // sine ease in and out
      lift.y = lift.from + (lift.to - lift.from) * e;
      if (k >= 1) lift.t0 = -1;
    }
    if (liftNode) liftNode.position.y = lift.y;
    // hover names (mouse only)
    if (model && mouse.dirty && !dragging) {
      mouse.dirty = false;
      const hit = pick(mouse.x, mouse.y);
      const info = hit ? labelOf.get(hit.object) : null;
      if (info) showLabel(info, mouse.x, mouse.y, 0); else if (!hoverTimer) hover.classList.remove('on');
    }
    renderer.render(scene, camera);
    // hud
    const deg = ((cam.yaw * 180 / Math.PI) % 360 + 360) % 360;
    $('hYaw').textContent = String(Math.round(deg)).padStart(3, '0');
    $('hPitch').textContent = String(Math.round(cam.pitch * 180 / Math.PI)).padStart(2, '0');
    $('hZoom').textContent = Math.round(100 * SYS[current].view.dist / cam.dist);
    $('hLift').textContent = lift.t0 >= 0 ? 'MOVING' : (liftDown ? 'READING' : 'UP');
    fpsAcc += dt; fpsN++; fpsT += dt;
    if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc); fpsAcc = fpsN = fpsT = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
