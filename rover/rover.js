// Fasal Sathi Rover - one-screen 3D viewer: orbit with inertia, spring zoom, system focus, lift toggle.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const $ = (id) => document.getElementById(id);

if (window.__PHONE__) {
  $('gateUrl').textContent = location.href.replace(/^https?:\/\//, '');
} else {
  main();
}

function main() {
  // ---------------------------------------------------------------- renderer, scene
  const canvas = $('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x07080a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 30);

  const key = new THREE.DirectionalLight(0xfff1e2, 2.2); key.position.set(2.2, 3.0, 2.0); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc2ff, 1.6); rim.position.set(-2.4, 1.8, -1.8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x0b0c0f, 0.35));

  // ground: instrument rings that fade out, and a soft contact shadow
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
  const blob = canvasTex(512, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.85)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(-0.01, 0.0005, 0); scene.add(shadow);

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
    [/^Wand_Fan/, 'wand', 'Cooling fan'], [/^Wand_Button/, 'wand', 'Buttons'], [/^Wand_LED/, 'wand', 'RGB status LED'], [/^Wand/, 'wand', 'Fasal Sathi wand'],
    [/^Lift_NEMA|^Lift_MotorScrew/, 'lift', 'NEMA17 stepper'], [/^Lift_Coupler/, 'lift', 'Flexible coupler'], [/^Lift_Screw/, 'lift', 'T8 lead screw'],
    [/^Lift_Rod/, 'lift', '8 mm guide rod'], [/^Lift_Thrust/, 'lift', 'Thrust bearing'], [/^Lift_Collar/, 'lift', 'Lock collar'],
    [/^Lift_Endstop/, 'lift', 'Top limit switch'], [/^Lift_/, 'lift', 'Lift column'], [/^Carriage_Nut/, 'lift', 'Brass lead-screw nut'],
    [/^Carriage_Strap/, 'wand', 'Velcro strap'], [/^Carriage_(Foam|Ring)/, 'wand', 'Padded wand holder'], [/^Carriage/, 'lift', 'Wand carriage'],
    [/^P-07|^Powder|^Label_/, 'spread', 'Powder hopper'], [/^P-10/, 'spread', 'Hopper lid'], [/^P-08/, 'spread', 'Gate + servo'], [/^P-09/, 'spread', 'Rotary gate'],
    [/^P-11/, 'spread', 'Y-chute'], [/^P-12/, 'spread', 'Spinning disc'], [/^P-13/, 'spread', 'Disc motor'], [/^ServoCable/, 'spread', 'Servo cable'],
    [/^P-01|^Sensor_|^Bumper|^Brand_Bumper/, 'sense', 'Front sensor bumper'], [/^RearSensor|^P-14/, 'sense', 'Rear ultrasonic'],
    [/ref-pir$/, 'sense', 'Motion sensor (PIR)'], [/^Hood_LEDWindow/, 'sense', 'Side light'],
    [/^Wheel/, 'drive', 'Ø85 wheel'], [/^Motor_/, 'drive', 'JGB37 encoder motor'], [/^EncoderCable/, 'drive', 'Encoder cable'],
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

  // ---------------------------------------------------------------- camera rig with springs
  const st = { yaw: 0.62, pitch: 0.28, t: new THREE.Vector3(-0.01, 0.29, 0), base: 1.92 };
  const goal = { yaw: st.yaw, pitch: st.pitch, t: st.t.clone(), base: st.base, cx: 0.53 };
  let cx = 0.53;
  const zoom = { x: 1, v: 0, target: 1, last: 0, pinch: false };
  const vel = { yaw: 0, pitch: 0 };
  let dragging = false, lastInput = -1e9, autoSpin = true, current = 'overview';

  function focus(name) {
    current = name; const v = SYS[name].view;
    document.body.classList.toggle('focused', name !== 'overview');
    goal.cx = name === 'overview' ? 0.53 : 0.45;
    let dy = v.yaw - (st.yaw % (Math.PI * 2));
    goal.yaw = st.yaw + Math.atan2(Math.sin(dy), Math.cos(dy));
    goal.pitch = v.pitch; goal.t.set(...v.t); goal.base = v.dist;
    zoom.target = 1;
    document.querySelectorAll('.systems button').forEach((b) => b.classList.toggle('on', b.dataset.sys === name));
    const card = $('card'); card.classList.add('swap');
    setTimeout(() => {
      const s = SYS[name];
      $('cardKick').textContent = s.kick; $('cardTitle').textContent = s.title; $('cardText').textContent = s.text;
      $('cardSpec').innerHTML = s.spec.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
      card.classList.remove('swap');
    }, 260);
    lastInput = performance.now();
  }
  document.querySelectorAll('.systems button').forEach((b) => b.addEventListener('click', () => focus(current === b.dataset.sys ? 'overview' : b.dataset.sys)));
  $('bReset').addEventListener('click', () => focus('overview'));
  const bSpin = $('bSpin'); bSpin.classList.add('on');
  bSpin.addEventListener('click', () => { autoSpin = !autoSpin; bSpin.classList.toggle('on', autoSpin); });

  // ---------------------------------------------------------------- input: drag, inertia, wheel, pinch, hover, click
  const pointers = new Map();
  let down = null, pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; dragging = true; canvas.classList.add('drag'); }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom.target; zoom.pinch = true; }
    vel.yaw = vel.pitch = 0; lastInput = performance.now();
  });
  canvas.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.dirty = true;
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoom.target = THREE.MathUtils.clamp(zoom0 * pinch0 / Math.max(d, 1), 0.42, 1.7); zoom.last = performance.now(); return;
    }
    if (down) down.moved += Math.abs(dx) + Math.abs(dy);
    const ky = 0.0062 * (goal.base / 1.6 + 0.4) / 1.4;
    goal.yaw += dx * 0.0062; goal.pitch = THREE.MathUtils.clamp(goal.pitch + dy * 0.0045, 0.02, 1.25);
    vel.yaw = dx * 0.0062; vel.pitch = dy * 0.0045;
    lastInput = performance.now(); void ky;
  });
  function release(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) zoom.pinch = false;
    if (pointers.size === 0) {
      dragging = false; canvas.classList.remove('drag');
      if (down && down.moved < 5 && hoverPart) focus(hoverPart.sys);
      down = null; zoom.last = performance.now();
    }
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom.target = THREE.MathUtils.clamp(zoom.target * Math.exp(e.deltaY * 0.0011), 0.42, 1.7);
    zoom.last = performance.now(); lastInput = performance.now();
  }, { passive: false });
  const mouse = { x: -1, y: -1, dirty: false };
  canvas.addEventListener('pointerleave', () => { hoverPart = null; $('hover').classList.remove('on'); });

  // ---------------------------------------------------------------- lift
  let liftNode = null, liftDown = false;
  const lift = { y: 0, v: 0 };
  $('bLift').addEventListener('click', () => {
    liftDown = !liftDown;
    $('bLift').textContent = liftDown ? 'Raise the wand' : 'Lower the wand';
    if (liftDown && current === 'overview') focus('lift');
  });

  // ---------------------------------------------------------------- load
  const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let model = null, pickables = [], hoverPart = null;
  const loader = new GLTFLoader();
  loader.load('model/FasalSathi_Rover.glb', (gltf) => {
    model = gltf.scene; scene.add(model);
    model.traverse((o) => {
      if (o.isMesh) {
        pickables.push(o);
        const m = o.material;
        if (m && m.name === 'PETG_Clear') { m.transmission = 0.92; m.thickness = 0.002; m.roughness = 0.12; }
        if (m && /^(TFT|OLED|Voltmeter)$/.test(m.name)) { m.emissiveIntensity = 1.25; m.toneMapped = true; }
        if (m && /^LED_/.test(m.name)) m.emissiveIntensity = 3.0;
        if (m && m.name === 'Plywood') { m.color.setRGB(0.50, 0.35, 0.20); m.roughness = 0.68; }
        if (m) m.envMapIntensity = 0.9;
      }
      if (o.name === 'Lift') liftNode = o;
    });
    $('ldNum').textContent = '100'; $('ldBar').style.transform = 'scaleX(1)';
    setTimeout(() => $('loader').classList.add('out'), 250);
    focus('overview'); lastInput = -1e9;
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

  const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, fpsT = 0;
  function spring(o, key, vkey, target, k, c, dt) {
    const a = -k * (o[key] - target) - c * o[vkey]; o[vkey] += a * dt; o[key] += o[vkey] * dt;
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const now = performance.now();
    // inertia after a drag
    if (!dragging) {
      goal.yaw += vel.yaw * dt * 60; goal.pitch = THREE.MathUtils.clamp(goal.pitch + vel.pitch * dt * 60, 0.02, 1.25);
      const f = Math.exp(-dt * 5.2); vel.yaw *= f; vel.pitch *= f;
      if (autoSpin && now - lastInput > 2500) goal.yaw -= dt * 0.16;
    }
    // zoom springs back to the framing once you let go
    if (!zoom.pinch && pointers.size === 0 && now - zoom.last > 650) zoom.target = 1;
    spring(zoom, 'x', 'v', zoom.target, 95, 10.5, dt);
    // camera glides between framings
    const g = 1 - Math.exp(-dt * (dragging ? 18 : 6.5));
    st.yaw += (goal.yaw - st.yaw) * g; st.pitch += (goal.pitch - st.pitch) * g;
    st.t.lerp(goal.t, 1 - Math.exp(-dt * 4.2)); st.base += (goal.base - st.base) * (1 - Math.exp(-dt * 4.2));
    const d = st.base * zoom.x;
    camera.position.set(st.t.x + d * Math.cos(st.pitch) * Math.cos(st.yaw), st.t.y + d * Math.sin(st.pitch), st.t.z + d * Math.cos(st.pitch) * Math.sin(st.yaw));
    camera.lookAt(st.t);
    cx += (goal.cx - cx) * (1 - Math.exp(-dt * 4));
    if (innerWidth / innerHeight >= 1) camera.setViewOffset(innerWidth, innerHeight, -(cx - 0.5) * innerWidth, 0, innerWidth, innerHeight);
    else camera.setViewOffset(innerWidth, innerHeight, 0, -0.10 * innerHeight, innerWidth, innerHeight);
    // lift
    if (liftNode) { spring(lift, 'y', 'v', liftDown ? -0.03 : 0, 26, 8.5, dt); liftNode.position.y = lift.y; }
    // hover pick
    if (model && mouse.dirty && !dragging) {
      mouse.dirty = false;
      ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      hoverPart = hit ? partOf(hit.object) : null;
      const hv = $('hover');
      if (hoverPart) { hv.textContent = `${SYS[hoverPart.sys].kick.split(' · ')[0]} · ${hoverPart.label}`; hv.style.left = mouse.x + 'px'; hv.style.top = mouse.y + 'px'; hv.classList.add('on'); }
      else hv.classList.remove('on');
    }
    renderer.render(scene, camera);
    // hud
    const deg = ((st.yaw * 180 / Math.PI) % 360 + 360) % 360;
    $('hYaw').textContent = String(Math.round(deg)).padStart(3, '0');
    $('hPitch').textContent = String(Math.round(st.pitch * 180 / Math.PI)).padStart(2, '0');
    $('hZoom').textContent = Math.round(100 / zoom.x);
    $('hLift').textContent = lift.y < -0.028 ? 'READING' : (lift.y > -0.002 ? 'UP' : 'MOVING');
    fpsAcc += dt; fpsN++; fpsT += dt;
    if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc); fpsAcc = fpsN = fpsT = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
