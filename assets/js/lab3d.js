/* 3D lab bench (three.js r128): instruments, boards, banana jacks, draggable wires,
   and a complex nodal circuit solver that turns the student's wiring into readings. */
(function () {
  'use strict';
  const L = window.Lab;
  const Lab3D = (window.Lab3D = {});
  const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const FLOOR = 0.3;
  const COL = { red: 0xc81c1c, black: 0x1c1e20, yellow: 0xf2c230, green: 0x2a9d4f, blue: 0x2f6fd6, white: 0xeeeeee };
  const PALETTE = [0xf2c230, 0x2f6fd6, 0x2a9d4f, 0xf07d12, 0xe8e8e8];

  const BAND = (Lab3D.BAND = { black: 0x141414, brown: 0x7b3f12, red: 0xd32222, orange: 0xf07d12, yellow: 0xf4d10a, green: 0x16a34a, blue: 0x1d5fd6, violet: 0x7c3cc4, grey: 0x8b8b8b, white: 0xf5f5f5, gold: 0xc9a227, silver: 0xb9bdc2 });
  Lab3D.ok = () => {
    if (!window.THREE || !THREE.OrbitControls) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  };

  /* ---------------- complex numbers + nodal solver ---------------- */
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1] || 1e-30; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cabs = (a) => Math.hypot(a[0], a[1]);
  Lab3D.cabs = cabs;
  function gauss(A, n) {
    for (let c = 0; c < n; c++) {
      let p = c, best = cabs(A[c][c]);
      for (let r = c + 1; r < n; r++) { const v = cabs(A[r][c]); if (v > best) { best = v; p = r; } }
      if (best < 1e-300) continue;
      if (p !== c) { const t = A[p]; A[p] = A[c]; A[c] = t; }
      for (let r = c + 1; r < n; r++) {
        if (!A[r][c][0] && !A[r][c][1]) continue;
        const f = cdiv(A[r][c], A[c][c]);
        for (let k = c; k <= n; k++) { const m = cmul(f, A[c][k]); A[r][k] = [A[r][k][0] - m[0], A[r][k][1] - m[1]]; }
      }
    }
    const x = Array.from({ length: n }, () => [0, 0]);
    for (let r = n - 1; r >= 0; r--) {
      let s = A[r][n];
      for (let k = r + 1; k < n; k++) { const m = cmul(A[r][k], x[k]); s = [s[0] - m[0], s[1] - m[1]]; }
      x[r] = cabs(A[r][r]) < 1e-300 ? [0, 0] : cdiv(s, A[r][r]);
    }
    return x;
  }

  /* ---------------- canvas helpers ---------------- */
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '', E: 'adefg', r: 'eg', L: 'def', O: 'abcdef', o: 'cdeg', P: 'abefg', H: 'bcefg', n: 'ceg', u: 'cde', C: 'adef', F: 'aefg', d: 'bcdeg', A: 'abcefg', b: 'cdefg', U: 'bcdef', S: 'acdfg', t: 'defg' };
  function seg7(ctx, str, x, y, h, n, on, off) {
    const W = h * 0.5, T = h * 0.12, pitch = W + h * 0.34, gp = T * 0.4;
    const cells = [];
    for (const ch of String(str)) { if (ch === '.' && cells.length && !cells[cells.length - 1].dp) cells[cells.length - 1].dp = true; else cells.push({ ch, dp: false }); }
    while (cells.length < n) cells.unshift({ ch: ' ', dp: false });
    cells.splice(0, Math.max(0, cells.length - n));
    const sk = (px, py) => [px - (py - y - h) * 0.09, py];
    const poly = (pts, color) => { ctx.fillStyle = color; ctx.beginPath(); pts.forEach((p, i) => { const [a, b] = sk(p[0], p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); ctx.fill(); };
    const hs = (x0, y0, l) => [[x0, y0], [x0 + T / 2, y0 - T / 2], [x0 + l - T / 2, y0 - T / 2], [x0 + l, y0], [x0 + l - T / 2, y0 + T / 2], [x0 + T / 2, y0 + T / 2]];
    const vs = (x0, y0, l) => [[x0, y0], [x0 + T / 2, y0 + T / 2], [x0 + T / 2, y0 + l - T / 2], [x0, y0 + l], [x0 - T / 2, y0 + l - T / 2], [x0 - T / 2, y0 + T / 2]];
    cells.forEach((c, i) => {
      const x0 = x + i * pitch, segs = SEG[c.ch] || '';
      const S = {
        a: hs(x0 + gp, y, W - 2 * gp), g: hs(x0 + gp, y + h / 2, W - 2 * gp), d: hs(x0 + gp, y + h, W - 2 * gp),
        f: vs(x0, y + gp, h / 2 - 2 * gp), b: vs(x0 + W, y + gp, h / 2 - 2 * gp), e: vs(x0, y + h / 2 + gp, h / 2 - 2 * gp), c: vs(x0 + W, y + h / 2 + gp, h / 2 - 2 * gp),
      };
      for (const k of 'abcdefg') poly(S[k], segs.includes(k) ? on : off);
      const [dx, dy] = sk(x0 + W + T * 1.3, y + h);
      ctx.fillStyle = c.dp ? on : off; ctx.beginPath(); ctx.arc(dx, dy, T * 0.6, 0, 7); ctx.fill();
    });
  }
  Lab3D.seg7 = seg7;
  function txt(ctx, s, x, y, size, color, align = 'center', weight = 600, font = MONO) {
    ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  }
  Lab3D.txt = txt;

  /* ---------------- bench ---------------- */
  Lab3D.Bench = function (host, opt = {}) {
    const THREE = window.THREE;
    host.classList.add('stage');
    host.innerHTML = `<div class="stage-cv"></div>
      <div class="stage-step" aria-live="polite"></div>
      <div class="stage-tools">
        <button type="button" class="tbtn" data-act="auto">توصيل تلقائي</button>
        <button type="button" class="tbtn" data-act="hint">تلميح</button>
        <button type="button" class="tbtn" data-act="clear">فصل الأسلاك</button>
        <button type="button" class="tbtn ic" data-act="cam" aria-label="إعادة ضبط الكاميرا" title="إعادة ضبط الكاميرا">⟲</button>
      </div>
      <div class="stage-status"><i></i><span></span></div>
      <div class="stage-tip" hidden></div>`;
    const cvHost = host.querySelector('.stage-cv'), tipEl = host.querySelector('.stage-tip');
    const statusEl = host.querySelector('.stage-status'), stepEl = host.querySelector('.stage-step');

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    cvHost.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1.6, 1, 900);
    const home = { pos: new THREE.Vector3(...(opt.cam || [0, 66, 82])), target: new THREE.Vector3(...(opt.target || [0, 2, 3])) };
    camera.position.copy(home.pos);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(home.target);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    controls.minDistance = 35; controls.maxDistance = 190;
    controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.3;
    controls.minAzimuthAngle = -1.1; controls.maxAzimuthAngle = 1.1;
    controls.screenSpacePanning = false; controls.panSpeed = 0.7;
    controls.update();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    /* lights + table */
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3b4a50, 0.62));
    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(-35, 90, 55); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 55, bottom: -55, near: 10, far: 260 });
    sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xcfe2ff, 0.28); fill.position.set(50, 35, 70); scene.add(fill);

    let needs = true;
    const dirty = () => { needs = true; };
    const tex = (w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso;
      const api = { c, ctx, t, args: [], draw: (...a) => { if (a.length) api.args = a; ctx.clearRect(0, 0, w, h); draw(ctx, w, h, ...api.args); t.needsUpdate = true; dirty(); } };
      canvases.push(api);
      api.draw();
      return api;
    };
    const canvases = [];
    const M = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: o.r != null ? o.r : 0.55, metalness: o.m || 0, ...(o.x || {}) });
    const mats = { dark: M(0x0c0d0e, { r: 0.9 }), metal: M(0xc8ccd0, { r: 0.3, m: 0.85 }), brass: M(0xc9a54a, { r: 0.35, m: 0.8 }), hit: new THREE.MeshBasicMaterial({ visible: false }) };

    const wood = tex(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#a77a4e'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { ctx.strokeStyle = `rgba(${60 + (i % 5) * 8},${35 + (i % 3) * 6},18,${0.08 + (i % 4) * 0.03})`; ctx.lineWidth = 1 + (i % 3); ctx.beginPath(); const y = (i * 37) % h; ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 8, w * 0.6, y - 8, w, y + 4); ctx.stroke(); }
    });
    wood.t.wrapS = wood.t.wrapT = THREE.RepeatWrapping;
    const table = new THREE.Mesh(new THREE.BoxGeometry(170, 5, 104), M(0xffffff, { r: 0.75, x: { map: wood.t } }));
    table.position.y = -2.5 + 0.0; table.receiveShadow = true; scene.add(table);
    const matT = tex(1024, 576, (ctx, w, h) => {
      ctx.fillStyle = '#2c4f55'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      txt(ctx, 'ESD SAFE WORK AREA', w - 120, h - 18, 13, 'rgba(255,255,255,.25)');
    });
    const mat = new THREE.Mesh(new THREE.BoxGeometry(136, FLOOR, 76), M(0xffffff, { r: 0.95, x: { map: matT.t } }));
    mat.position.y = FLOOR / 2; mat.receiveShadow = true; scene.add(mat);

    const setBg = () => {
      const v = getComputedStyle(host).getPropertyValue('--stage-bg').trim() || '#dfe6e5';
      scene.background = new THREE.Color(v);
      scene.fog = new THREE.Fog(scene.background, 190, 420);
      dirty();
    };

    /* registries */
    const pins = {}, pick = [], wires = [], fixed = [], clickers = {}, draggers = {}, anims = new Set();
    let wid = 0, pending = null, required = [], onWiresCb = [], colorIdx = 0;

    function rbox(w, h, d, r, material) {
      const bev = Math.min(r, d / 4) * 0.6, ww = w - 2 * bev, hh = h - 2 * bev, rr = Math.min(r, ww / 2, hh / 2);
      const s = new THREE.Shape(), x = -ww / 2, y = -hh / 2;
      s.moveTo(x + rr, y); s.lineTo(x + ww - rr, y); s.quadraticCurveTo(x + ww, y, x + ww, y + rr);
      s.lineTo(x + ww, y + hh - rr); s.quadraticCurveTo(x + ww, y + hh, x + ww - rr, y + hh);
      s.lineTo(x + rr, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, -(d - 2 * bev) / 2);
      const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true;
      return m;
    }
    const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
    const mesh = (geo, material, cast = true) => { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = true; return m; };
    const orient = (g, dir) => { if (dir === 'front') g.rotation.x = Math.PI / 2; };
    /* flat textured plane; P(x,y) maps plane coords (cm, origin at centre, y up) to canvas px */
    function plane(parent, w, h, cw, ch, draw, pos, rotX = 0) {
      const P = (x, y) => [((x + w / 2) / w) * cw, ((h / 2 - y) / h) * ch];
      const k = cw / w;
      const t = tex(cw, ch, (ctx, W, H, ...a) => draw(ctx, W, H, P, k, ...a));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t.t, roughness: 0.6 }));
      m.position.set(...pos); m.rotation.x = rotX; m.receiveShadow = true; parent.add(m);
      return t;
    }

    function jack(parent, id, pos, dir, color, label) {
      const g = new THREE.Group();
      const nut = mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 6), mats.metal);
      nut.position.y = 0.11;
      const ring = mesh(new THREE.CylinderGeometry(0.78, 0.9, 1.0, 24), M(COL[color] || COL.yellow, { r: 0.45 }));
      ring.position.y = 0.62;
      const hole = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12), mats.dark, false);
      hole.position.y = 1.13;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), mats.hit);
      hit.position.y = 1.0; hit.userData.pick = { type: 'pin', id };
      g.add(nut, ring, hole, hit);
      orient(g, dir); g.position.set(...pos); parent.add(g);
      pick.push(hit);
      pins[id] = { id, g, ring, color, label, n: 0 };
      return pins[id];
    }
    function knob(parent, id, pos, dir, o = {}) {
      const g = new THREE.Group(), spin = new THREE.Group();
      const r = o.r || 2, h = o.h || 1.6;
      const skirt = mesh(new THREE.CylinderGeometry(r * 1.22, r * 1.28, 0.3, 36), M(0x2f3539, { r: 0.4 }));
      skirt.position.y = 0.15;
      const cap = mesh(new THREE.CylinderGeometry(r * 0.94, r, h, 36), M(o.color || 0x23282c, { r: 0.38 }));
      cap.position.y = h / 2 + 0.2;
      const mark = mesh(new THREE.BoxGeometry(0.26, 0.08, r * 0.75), M(0xf4f4f4, { r: 0.3 }), false);
      mark.position.set(0, h + 0.24, -r * 0.5);
      spin.add(cap, mark); g.add(skirt, spin);
      orient(g, dir); g.position.set(...pos); parent.add(g);
      cap.userData.pick = { type: o.click ? 'click' : 'knob', id };
      pick.push(cap);
      if (o.click) clickers[id] = o.click;
      if (o.drag) draggers[id] = o.drag;
      return { set(deg) { spin.rotation.y = -(deg * Math.PI) / 180; dirty(); }, cap };
    }
    function toggle(parent, id, pos, onClick) {
      const g = new THREE.Group();
      const base = mesh(new THREE.BoxGeometry(2.6, 1.6, 0.5), M(0x202426));
      const lever = mesh(new THREE.BoxGeometry(0.9, 0.7, 2.2), M(0x3b4246, { r: 0.4 }));
      lever.geometry.translate(0, 0, 1.0);
      const led = mesh(new THREE.SphereGeometry(0.42, 12, 10), M(0x441111, { x: { emissive: 0x000000 } }), false);
      led.position.set(-2.4, 0, 0.2);
      g.add(base, lever, led); g.position.set(...pos); parent.add(g);
      lever.userData.pick = { type: 'click', id }; base.userData.pick = { type: 'click', id };
      pick.push(lever, base);
      clickers[id] = onClick;
      return { set(on) { lever.rotation.x = on ? -0.45 : 0.45; led.material.color.setHex(on ? 0xff4b3a : 0x3a1010); led.material.emissive.setHex(on ? 0xff2a10 : 0x000000); dirty(); } };
    }

    /* ---------------- instruments ---------------- */
    const place = (g, o) => { g.position.set(o.x || 0, FLOOR, o.z || 0); g.rotation.y = o.ry || 0; scene.add(g); return g; };

    function supply(o) {
      const g = new THREE.Group(), W = o.triple ? 30 : 26, H = 12, D = 18, z = D / 2 + 0.03;
      g.add(at(rbox(W, H, D, 1.2, M(0xd3d7da, { r: 0.5 })), 0, H / 2, 0));
      const LX = -W / 2 + 6.8, KX = W / 2 - 5;
      const jx = o.triple ? [[o.id + '.p', 'red', '+', W / 2 - 14], [o.id + '.c', 'black', 'COM', W / 2 - 9], [o.id + '.n', 'blue', '−', W / 2 - 4]] : [[o.id + '.p', 'red', '+', W / 2 - 10.5], [o.id + '.n', 'black', '−', W / 2 - 5]];
      plane(g, W - 1.4, H - 1.4, 600, Math.round(600 * (H - 1.4) / (W - 1.4)), (ctx, w, h, P) => {
        ctx.fillStyle = '#2a2f33'; ctx.fillRect(0, 0, w, h);
        txt(ctx, o.title || 'DC POWER SUPPLY', ...P(LX, 4.4), 17, '#e9eef0', 'center', 700);
        txt(ctx, o.sub || '0–15 V  ·  1 A', ...P(LX, 3.3), 12, '#9fb0b6');
        txt(ctx, o.knobLabel || 'VOLTAGE', ...P(KX, 4.75), 12, '#c6d1d5');
        txt(ctx, 'POWER', ...P(-W / 2 + 4, -1.6), 11, '#c6d1d5');
        jx.forEach(([, , lab, x]) => txt(ctx, lab, ...P(x, -1.3), lab.length > 1 ? 12 : 17, '#e9eef0'));
      }, [0, H / 2, z]);
      const lcd = plane(g, 10.5, 3.4, 360, 116, (ctx, w, h, P, k, s = '', on = false) => {
        ctx.fillStyle = '#140707'; ctx.fillRect(0, 0, w, h);
        seg7(ctx, on ? s : '', 18, 18, 76, 4, '#ff3b2a', 'rgba(255,60,40,.08)');
        txt(ctx, o.unit || 'V', w - 26, h - 22, 22, on ? '#ff7a6c' : '#3a1a16');
      }, [LX, H / 2 + 0.9, z + 0.03]);
      const kn = knob(g, o.id + '.knob', [KX, H / 2 + 2.2, D / 2], 'front', { r: 2.2, h: 1.7, drag: o.onDrag });
      const sw = toggle(g, o.id + '.pwr', [-W / 2 + 4, 3.0, D / 2 + 0.1], o.onPower);
      jx.forEach(([id, c, lab, x]) => jack(g, id, [x, 3.2, D / 2], 'front', c, lab));
      place(g, o);
      return { lcd: (s, on) => lcd.draw(s, on), knob: (t) => kn.set(-135 + 270 * t), power: (on) => sw.set(on) };
    }

    function generator(o) {
      const g = new THREE.Group(), W = 28, H = 12, D = 18, z = D / 2 + 0.03;
      g.add(at(rbox(W, H, D, 1.2, M(0xc9d0d6, { r: 0.5 })), 0, H / 2, 0));
      plane(g, W - 1.4, H - 1.4, 620, Math.round(620 * (H - 1.4) / (W - 1.4)), (ctx, w, h, P) => {
        ctx.fillStyle = '#25313d'; ctx.fillRect(0, 0, w, h);
        txt(ctx, 'FUNCTION GENERATOR', ...P(-6.5, 4.4), 15, '#e9eef0', 'center', 700);
        txt(ctx, 'FREQ', ...P(4.3, 4.6), 11, '#c6d1d5'); txt(ctx, 'AMPL', ...P(9.6, 4.6), 11, '#c6d1d5');
        txt(ctx, '∿ SINE', ...P(-6.5, -0.5), 13, '#7fe3f0');
        txt(ctx, 'POWER', ...P(-10, -1.8), 11, '#c6d1d5');
        txt(ctx, 'OUT', ...P(4.5, -1.4), 13, '#e9eef0'); txt(ctx, 'GND', ...P(9.5, -1.4), 13, '#e9eef0');
      }, [0, H / 2, z]);
      const lcd = plane(g, 12, 3.6, 420, 126, (ctx, w, h, P, k, s = '', on = false) => {
        ctx.fillStyle = '#061214'; ctx.fillRect(0, 0, w, h);
        seg7(ctx, on ? s : '', 16, 22, 76, 5, '#56e3f5', 'rgba(86,227,245,.07)');
        txt(ctx, 'Hz', w - 28, h - 22, 20, on ? '#8eeefa' : '#123033');
      }, [-6.5, H / 2 + 1.9, z + 0.03]);
      const kf = knob(g, o.id + '.kf', [4.3, H / 2 + 1.8, D / 2], 'front', { r: 1.9, h: 1.5, drag: o.onFreq });
      const ka = knob(g, o.id + '.ka', [9.6, H / 2 + 1.8, D / 2], 'front', { r: 1.9, h: 1.5, drag: o.onAmp });
      const sw = toggle(g, o.id + '.pwr', [-10, 3.1, D / 2 + 0.1], o.onPower);
      jack(g, o.id + '.p', [4.5, 3.2, D / 2], 'front', 'red', 'OUT');
      jack(g, o.id + '.n', [9.5, 3.2, D / 2], 'front', 'black', 'GND');
      place(g, o);
      return { lcd: (s, on) => lcd.draw(s, on), knobF: (t) => kf.set(-135 + 270 * t), knobA: (t) => ka.set(-135 + 270 * t), power: (on) => sw.set(on) };
    }

    function dmm(o) {
      const g = new THREE.Group(), tilt = new THREE.Group(), W = 12, H = 20, D = 4.4;
      const body = rbox(W, H, D, 1.6, M(o.color || 0xf0a51b, { r: 0.7 })); body.position.y = H / 2;
      const plate = rbox(W - 1.8, H - 1.8, 0.4, 0.8, M(0x2b3034, { r: 0.6 })); plate.position.set(0, H / 2, D / 2);
      tilt.add(body, plate);
      const fz = D / 2 + 0.22;
      const modes = o.modes;
      const face = plane(tilt, W - 2.2, H - 8, 300, Math.round(300 * (H - 8) / (W - 2.2)), (ctx, w, h, P, k, mi = 0) => {
        ctx.fillStyle = '#2b3034'; ctx.fillRect(0, 0, w, h);
        txt(ctx, o.title || 'DMM', ...P(0, 5.2), 14, '#f2b737', 'center', 700);
        modes.forEach((m, i) => {
          const a = ((modes.length === 1 ? 0 : -60 + (120 * i) / (modes.length - 1)) * Math.PI) / 180;
          const [x, y] = P(Math.sin(a) * 3.6, 0.6 + Math.cos(a) * 3.6);
          txt(ctx, m, x, y, 13, i === mi ? '#ffd166' : '#b9c3c7', 'center', i === mi ? 700 : 500);
        });
        o.jacks.forEach(([, , lab, x]) => txt(ctx, lab, ...P(x, -3.9), 12, '#d7dde0'));
      }, [0, H / 2 - 2, fz]);
      const lcd = plane(tilt, W - 2.6, 4.2, 320, 140, (ctx, w, h, P, k, s = '', unit = '', tag = '') => {
        ctx.fillStyle = '#a9b89a'; ctx.fillRect(0, 0, w, h);
        const grd = ctx.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,.18)'); grd.addColorStop(0.3, 'rgba(0,0,0,0)'); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
        seg7(ctx, s, 22, 28, 74, 5, '#18230f', 'rgba(24,35,15,.07)');
        txt(ctx, unit, w - 30, h - 26, 22, '#18230f', 'center', 700);
        txt(ctx, tag, 30, 16, 13, '#18230f', 'center', 700);
      }, [0, H - 3.4, fz + 0.02]);
      let mi = 0;
      const sel = knob(tilt, o.id + '.sel', [0, H / 2 - 1.4, D / 2 + 0.2], 'front', {
        r: 2.2, h: 1.3, color: 0x1a1d20,
        click: modes.length > 1 ? () => { mi = (mi + 1) % modes.length; api.mode(mi); if (o.onMode) o.onMode(mi); } : null,
      });
      o.jacks.forEach(([id, c, lab, x]) => jack(tilt, id, [x, 2.4, D / 2 + 0.2], 'front', c, lab));
      tilt.rotation.x = -0.32; tilt.position.z = -1.5;
      g.add(tilt);
      place(g, o);
      const api = {
        show: (s, unit, tag) => lcd.draw(s, unit, tag),
        mode(i) { mi = i; face.draw(i); sel.set(modes.length === 1 ? 0 : -60 + (120 * i) / (modes.length - 1)); },
      };
      api.mode(0);
      return api;
    }

    function analog(o) {
      const g = new THREE.Group(), W = o.w || 20, H = 18, D = 10, fw = W - 3, fh = 11.2, fy = H - 6.4, z = D / 2 + 0.05;
      g.add(at(rbox(W, H, D, 1.4, M(0x1d2124, { r: 0.6 })), 0, H / 2, 0));
      const piv = -fh / 2 + 1.1, half = (o.sweep || 96) / 2, cz = !!o.centerZero;
      const ang = (p) => (cz ? p * half : -half + p * 2 * half);
      let scales = o.scales || [], unit = o.unit || '';
      const dial = plane(g, fw, fh, 640, Math.round((640 * fh) / fw), (ctx, w, h, P, k) => {
        ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, w, h);
        const [cx, cy] = P(0, piv);
        const at = (r, a) => [cx + r * k * Math.sin((a * Math.PI) / 180), cy - r * k * Math.cos((a * Math.PI) / 180)];
        const arcR = (r, lw, color) => { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r * k, (-90 - half) * Math.PI / 180, (-90 + half) * Math.PI / 180); ctx.stroke(); };
        arcR(7.0, 8, '#c3c8cc');
        scales.forEach((sc, i) => {
          const outer = i === 0, R = outer ? 8.3 : 6.2;
          arcR(R, 2, '#1b1d1f');
          sc.ticks.forEach((t) => {
            const a = ang(t.p), r2 = outer ? R - (t.major ? 0.75 : 0.4) : R + (t.major ? 0.6 : 0.3);
            const [x1, y1] = at(R, a), [x2, y2] = at(r2, a);
            ctx.strokeStyle = '#1b1d1f'; ctx.lineWidth = t.major ? 2.4 : 1.3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            if (t.label != null) { const [lx, ly] = at(outer ? R + 0.75 : R - 0.8, a); txt(ctx, t.label, lx, ly, outer ? 22 : 17, outer ? '#1b1d1f' : '#4a4f53', 'center', outer ? 600 : 500); }
          });
          if (sc.name) { const [nx, ny] = at(outer ? R + 0.6 : R - 1.0, half + 7); txt(ctx, sc.name, nx, ny, 16, '#4a4f53'); }
        });
        txt(ctx, unit, ...P(0, piv + 3.0), 34, '#1b1d1f', 'center', 700);
        txt(ctx, o.brand || '', ...P(0, piv + 1.7), 14, '#6c7175', 'center', 500);
      }, [0, fy, z]);
      const pivot = new THREE.Group(); pivot.position.set(0, fy + piv, z + 0.35);
      const needle = mesh(new THREE.BoxGeometry(0.13, 8.9, 0.05), M(0xd0202e, { r: 0.4 }), false); needle.position.y = 4.1;
      const cap = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 20), M(0x222528), false); cap.rotation.x = Math.PI / 2;
      pivot.add(needle, cap); g.add(pivot);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.1 }));
      glass.position.set(0, fy, z + 0.75); g.add(glass);
      const bezel = rbox(fw + 0.8, fh + 0.8, 0.5, 0.5, M(0x15181a)); bezel.position.set(0, fy, z - 0.32); g.add(bezel);
      const peg = mesh(new THREE.SphereGeometry(0.35, 10, 8), M(0x441111, { x: { emissive: 0 } }), false);
      peg.position.set(fw / 2 - 1, fy + fh / 2 - 1, z + 0.4); g.add(peg);
      jack(g, o.id + '.p', [-3, 2.4, D / 2], 'front', 'red', '+');
      jack(g, o.id + '.n', [3, 2.4, D / 2], 'front', 'black', '−');
      plane(g, W - 2, 1.4, 360, 26, (ctx, w, h) => { ctx.fillStyle = '#1d2124'; ctx.fillRect(0, 0, w, h); txt(ctx, (o.title || 'GALVANOMETER') + '     +          −', w / 2, h / 2, 14, '#c9d0d4', 'center', 600); }, [0, 4.6, D / 2 + 0.02]);
      place(g, o);
      let pos = 0, vel = 0, target = 0;
      const render = () => { pivot.rotation.z = -(ang(pos) * Math.PI) / 180; };
      const anim = (dt) => {
        const acc = 150 * (target - pos) - 13 * vel; vel += acc * dt; pos += vel * dt;
        const lo = cz ? -1.07 : -0.035, hi = 1.07;
        if (pos > hi) { pos = hi; vel *= -0.2; } if (pos < lo) { pos = lo; vel *= -0.2; }
        render();
        return !(Math.abs(target - pos) < 2e-4 && Math.abs(vel) < 2e-3);
      };
      render();
      return {
        set(p) {
          const over = p > 1.02 || (cz && p < -1.02);
          target = L.clamp(p, cz ? -1.07 : -0.035, 1.07);
          peg.material.color.setHex(over ? 0xff3b3b : 0x441111); peg.material.emissive.setHex(over ? 0xff2020 : 0);
          if (L.reduced) { pos = target; render(); dirty(); } else anims.add(anim);
        },
        scales(s, u) { scales = s; if (u != null) unit = u; dial.draw(); },
      };
    }

    function decade(o) {
      const g = new THREE.Group(), W = 36, H = 7, D = 15;
      g.add(at(rbox(W, H, D, 1, M(0x34393d, { r: 0.55 })), 0, H / 2, 0));
      const mult = o.mults || [1000, 100, 10, 1];
      const xs = mult.map((_, i) => -13 + i * 7);
      const top = plane(g, W - 1, D - 1, 720, Math.round((720 * (D - 1)) / (W - 1)), (ctx, w, h, P, k, digits = [0, 0, 0, 0]) => {
        ctx.fillStyle = '#2a2f33'; ctx.fillRect(0, 0, w, h);
        txt(ctx, o.title || 'DECADE RESISTANCE BOX', ...P(-2, 5.8), 15, '#dfe5e8', 'center', 700);
        mult.forEach((m, i) => {
          txt(ctx, '×' + (m >= 1000 ? m / 1000 + 'k' : m) + ' Ω', ...P(xs[i], 3.7), 13, '#aab6bb');
          const [x, y] = P(xs[i], -4.3);
          ctx.fillStyle = '#0e1012'; ctx.fillRect(x - 24, y - 22, 48, 44);
          txt(ctx, String(digits[i]), x, y + 2, 34, '#f4f6f6', 'center', 600);
        });
        txt(ctx, 'A', ...P(14.5, 3.6), 14, '#dfe5e8'); txt(ctx, 'B', ...P(14.5, -2.4), 14, '#dfe5e8');
      }, [0, H + 0.02, 0], -Math.PI / 2);
      const knobs = mult.map((m, i) => knob(g, `${o.id}.k${i}`, [xs[i], H, 0], 'up', { r: 2.1, h: 1.5, drag: (d) => o.onDial && o.onDial(i, d) }));
      jack(g, o.id + '.a', [14.5, H, -1.2], 'up', 'red', 'A');
      jack(g, o.id + '.b', [14.5, H, 4.8], 'up', 'black', 'B');
      place(g, o);
      return {
        set(v) {
          const d = mult.map((m) => Math.floor(Math.round(v) / m) % 10);
          d.forEach((x, i) => knobs[i].set(-135 + 30 * x));
          top.draw(d);
        },
      };
    }

    function board(o) {
      const g = new THREE.Group(), y = 1.2, CW = Math.round(o.w * 22), CH = Math.round(o.d * 22);
      const pcb = mesh(new THREE.BoxGeometry(o.w, 0.3, o.d), M(o.color || 0x1d6b47, { r: 0.6 }));
      pcb.position.y = y - 0.15; g.add(pcb);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const s = mesh(new THREE.CylinderGeometry(0.5, 0.5, y - 0.3, 10), mats.brass); s.position.set(sx * (o.w / 2 - 1.2), (y - 0.3) / 2, sz * (o.d / 2 - 1.2)); g.add(s); });
      const items = [];
      const silk = plane(g, o.w, o.d, CW, CH, (ctx, w, h, P) => {
        ctx.fillStyle = o.silkBg || '#1f7350'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.strokeRect(6, 6, w - 12, h - 12);
        items.forEach((it) => it(ctx, P));
      }, [0, y + 0.01, 0], -Math.PI / 2);
      const B = {
        g,
        redraw: () => silk.draw(),
        text: (x, z, s, size = 15, color = '#f2f5f2', align = 'center') => { items.push((ctx, P) => { const [px, py] = P(x, -z); txt(ctx, s, px, py, size, color, align); }); },
        dyn: (fn) => items.push((ctx, P) => fn(ctx, (x, z) => P(x, -z))),
        trace: (pts, color = 'rgba(214,176,92,.85)', wdt = 7) => { items.push((ctx, P) => { ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = P(x, -z); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }); },
        jack: (id, x, z, color, label, lz = 2.6) => { jack(g, id, [x, y, z], 'up', color, label); if (label) B.text(x, z + lz, label, 15); },
        resistor(x1, z1, x2, z2, bands, ro = {}) {
          const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
          const grp = new THREE.Group(); grp.position.set((x1 + x2) / 2, y + 0.75, (z1 + z2) / 2); grp.rotation.y = -a;
          const bl = Math.min(ro.body || 3.6, len - 1.2), r = ro.r || 0.6;
          const body = mesh(new THREE.CylinderGeometry(r, r, bl, 20), M(ro.bodyColor || 0xe1c89a, { r: 0.6 })); body.rotation.z = Math.PI / 2; grp.add(body);
          const ends = [-1, 1].map((s) => { const e = mesh(new THREE.SphereGeometry(r * 1.06, 16, 12), body.material); e.position.x = (s * bl) / 2; e.scale.x = 0.55; return e; });
          grp.add(...ends);
          const pos = bands.length === 5 ? [-0.36, -0.2, -0.04, 0.12, 0.36] : [-0.32, -0.14, 0.04, 0.34];
          bands.forEach((c, i) => { if (!c) return; const b = mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, bl * 0.075, 20), M(typeof c === 'string' ? BAND[c] : c, { r: 0.5 }), false); b.rotation.z = Math.PI / 2; b.position.x = pos[i] * bl; grp.add(b); });
          const lead = M(0xb9bec2, { r: 0.3, m: 0.8 });
          [-1, 1].forEach((s) => {
            const lh = mesh(new THREE.CylinderGeometry(0.09, 0.09, (len - bl) / 2, 6), lead); lh.rotation.z = Math.PI / 2; lh.position.x = s * (bl / 2 + (len - bl) / 4); grp.add(lh);
            const lv = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.75, 6), lead); lv.position.set(s * len / 2, -0.37, 0); grp.add(lv);
          });
          g.add(grp);
          if (ro.label) B.text((x1 + x2) / 2 + (ro.lx || 0), (z1 + z2) / 2 + (ro.lz != null ? ro.lz : 2), ro.label, ro.size || 14);
          return grp;
        },
        coil(x, z, ro = {}) {
          const grp = new THREE.Group(); grp.position.set(x, y + 2.2, z);
          const core = mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.6, 28), M(0xb87333, { r: 0.35, m: 0.6 })); core.rotation.z = Math.PI / 2;
          const fl = [-1, 1].map((s) => { const f = mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.35, 28), M(0x262a2d)); f.rotation.z = Math.PI / 2; f.position.x = s * 2.45; return f; });
          for (let i = 0; i < 14; i++) { const t = mesh(new THREE.TorusGeometry(1.92, 0.07, 6, 28), M(0x9c5b26, { r: 0.4, m: 0.6 }), false); t.rotation.y = Math.PI / 2; t.position.x = -2.1 + i * 0.32; grp.add(t); }
          grp.add(core, ...fl); g.add(grp);
          if (ro.label) B.text(x, z + 4.2, ro.label, 15);
        },
        cap(x, z, ro = {}) {
          const c = mesh(new THREE.BoxGeometry(4.2, 3, 1.8), M(ro.color || 0x2f6fd6, { r: 0.45 })); c.position.set(x, y + 1.9, z); g.add(c);
          const lead = M(0xb9bec2, { r: 0.3, m: 0.8 });
          [-1, 1].forEach((s) => { const l = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), lead); l.position.set(x + s * 1.2, y + 0.4, z); g.add(l); });
          plane(g, 3.6, 2.2, 200, 122, (ctx, w, h) => { ctx.fillStyle = ro.css || '#2f6fd6'; ctx.fillRect(0, 0, w, h); txt(ctx, ro.text || '? nF', w / 2, h / 2 - 10, 26, '#fff', 'center', 700); txt(ctx, '100V', w / 2, h / 2 + 26, 18, '#dbe7ff'); }, [x, y + 1.9, z + 0.91]);
          if (ro.label) B.text(x, z + 3.2, ro.label, 15);
        },
        selector(id, x, z, positions, onClick) {
          const kn = knob(g, id, [x, y, z], 'up', { r: 1.8, h: 1.4, color: 0x2d3236, click: onClick });
          positions.forEach((p) => { const a = (p.a * Math.PI) / 180; B.text(x + Math.sin(a) * 4.1, z - Math.cos(a) * 4.1 + 0.4, p.label, 14, p.color || '#ffe08a'); });
          return { set: (deg) => kn.set(deg) };
        },
        knob: (id, x, z, ko) => knob(g, id, [x, y, z], 'up', ko),
        add: (m) => { g.add(m); return m; },
        remove: (m) => { g.remove(m); dirty(); },
        y,
      };
      place(g, o);
      return B;
    }

    /* ---------------- wires ---------------- */
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const pinTip = (p, extra = 0) => { scene.updateMatrixWorld(); return p.g.localToWorld(V3(0, 1.15 + extra, 0)); };
    const pinNorm = (p) => V3(0, 1, 0).applyQuaternion(p.g.getWorldQuaternion(new THREE.Quaternion())).normalize();
    function wireColor(a, b) {
      const ca = pins[a].color, cb = pins[b].color;
      if (ca === 'red' || cb === 'red') return COL.red;
      if (ca === 'black' || cb === 'black') return 0x222426;
      return PALETTE[colorIdx++ % PALETTE.length];
    }
    function addWire(a, b, silent) {
      if (a === b || !pins[a] || !pins[b]) return;
      if (wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return;
      const pa = pins[a], pb = pins[b];
      const sa = pa.n * 2.0, sb = pb.n * 2.0;
      pa.n++; pb.n++;
      const A = pinTip(pa, sa), B2 = pinTip(pb, sb), nA = pinNorm(pa), nB = pinNorm(pb);
      const color = wireColor(a, b);
      const mt = M(color, { r: 0.38 });
      const grp = new THREE.Group();
      const plug = (P, n) => {
        const pg = new THREE.Group();
        const body = mesh(new THREE.CylinderGeometry(0.62, 0.55, 2.3, 16), M(color, { r: 0.45 })); body.position.y = 1.15;
        const tip = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), mats.metal); tip.position.y = -0.1;
        pg.add(body, tip); pg.position.copy(P); pg.quaternion.setFromUnitVectors(V3(0, 1, 0), n); grp.add(pg);
      };
      plug(A, nA); plug(B2, nB);
      const s1 = A.clone().addScaledVector(nA, 2.3), s2 = A.clone().addScaledVector(nA, 4.8);
      const e1 = B2.clone().addScaledVector(nB, 2.3), e2 = B2.clone().addScaledVector(nB, 4.8);
      const d = s2.distanceTo(e2);
      const mid = s2.clone().lerp(e2, 0.5);
      mid.y = d < 14 ? Math.max(s2.y, e2.y) + 2.5 : Math.max(FLOOR + 0.5, Math.min(s2.y, e2.y) - d * 0.2);
      const q1 = s2.clone().lerp(mid, 0.55), q2 = e2.clone().lerp(mid, 0.55);
      q1.y = Math.max(FLOOR + 0.5, q1.y); q2.y = Math.max(FLOOR + 0.5, q2.y);
      const curve = new THREE.CatmullRomCurve3([s1, s2, q1, mid, q2, e2, e1], false, 'centripetal');
      const tube = mesh(new THREE.TubeGeometry(curve, 90, 0.34, 8, false), mt);
      grp.add(tube); scene.add(grp);
      const w = { id: ++wid, a, b, grp, tube, mt };
      tube.userData.pick = { type: 'wire', id: w.id };
      pick.push(tube);
      wires.push(w);
      dirty();
      if (!silent) changed();
      return w;
    }
    function removeWire(id, silent) {
      const i = wires.findIndex((w) => w.id === id); if (i < 0) return;
      const w = wires[i];
      scene.remove(w.grp);
      w.grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      pick.splice(pick.indexOf(w.tube), 1);
      wires.splice(i, 1);
      pins[w.a].n = Math.max(0, pins[w.a].n - 1); pins[w.b].n = Math.max(0, pins[w.b].n - 1);
      dirty();
      if (!silent) changed();
    }
    function clearWires(silent) { while (wires.length) removeWire(wires[0].id, true); Object.values(pins).forEach((p) => { p.n = 0; }); if (!silent) changed(); }

    /* connectivity */
    function finder() {
      const parent = {};
      const find = (x) => { if (parent[x] == null) parent[x] = x; while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
      fixed.forEach(([a, b]) => uni(a, b));
      wires.forEach((w) => uni(w.a, w.b));
      return find;
    }
    function check(nets = required) {
      const find = finder();
      let missing = 0, total = 0;
      nets.forEach((net) => net.slice(1).forEach((p) => { total++; if (find(p) !== find(net[0])) missing++; }));
      let shorts = 0;
      for (let i = 0; i < nets.length; i++) for (let j = i + 1; j < nets.length; j++) if (find(nets[i][0]) === find(nets[j][0])) shorts++;
      const inNet = new Set(nets.flat());
      const stray = wires.filter((w) => !inNet.has(w.a) || !inNet.has(w.b)).length;
      return { ok: missing === 0 && shorts === 0 && stray === 0, missing, total, shorts, stray, done: total - missing };
    }
    function changed() { onWiresCb.forEach((f) => f()); }

    /* solver: elements reference pin ids (or internal node names) */
    function solve(els, omega = 0) {
      const find = finder();
      const idx = {}; let n = 0;
      const node = (p) => { const r = find(p); if (!(r in idx)) idx[r] = n++; return idx[r]; };
      els.forEach((e) => { e._a = node(e.a); e._b = node(e.b); });
      const run = () => {
        const A = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => [0, 0]));
        const addY = (a, b, y) => {
          A[a][a] = [A[a][a][0] + y[0], A[a][a][1] + y[1]]; A[b][b] = [A[b][b][0] + y[0], A[b][b][1] + y[1]];
          A[a][b] = [A[a][b][0] - y[0], A[a][b][1] - y[1]]; A[b][a] = [A[b][a][0] - y[0], A[b][a][1] - y[1]];
        };
        const addJ = (a, j) => { A[a][n] = [A[a][n][0] + j[0], A[a][n][1] + j[1]]; };
        for (let i = 0; i < n; i++) A[i][i][0] += 1e-12;
        els.forEach((e) => {
          let y = null;
          if (e.r != null) y = [1 / Math.max(e.r, 1e-6), 0];
          else if (e.z) y = cdiv([1, 0], cabs(e.z) < 1e-9 ? [1e-9, 0] : e.z);
          else if (e.y) y = e.y;
          if (e.v != null) {
            if (e._lim) { addY(e._a, e._b, [1e-7, 0]); const j = [e._lim, 0]; addJ(e._a, j); addJ(e._b, [-j[0], -j[1]]); return; }
            const v = typeof e.v === 'number' ? [e.v, 0] : e.v, g = 1 / e.ri;
            addY(e._a, e._b, [g, 0]); addJ(e._a, [v[0] * g, v[1] * g]); addJ(e._b, [-v[0] * g, -v[1] * g]);
            return;
          }
          if (e.i != null) { const j = typeof e.i === 'number' ? [e.i, 0] : e.i; addJ(e._a, j); addJ(e._b, [-j[0], -j[1]]); return; }
          if (y) addY(e._a, e._b, y);
        });
        return gauss(A, n);
      };
      let x = run();
      // current-limited sources (bench supplies)
      let again = false;
      els.forEach((e) => {
        if (e.v == null || !e.ilim || e._lim) return;
        const vd = x[e._a][0] - x[e._b][0], I = (e.v - vd) / e.ri;
        if (Math.abs(I) > e.ilim) { e._lim = Math.sign(I) * e.ilim; e.limited = true; again = true; }
      });
      if (again) x = run();
      const V = (p) => { const r = find(p); return r in idx ? x[idx[r]] : [0, 0]; };
      return {
        V, vd: (a, b) => { const va = V(a), vb = V(b); return [va[0] - vb[0], va[1] - vb[1]]; },
        same: (a, b) => find(a) === find(b),
      };
    }

    /* ---------------- interaction ---------------- */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const ground = new THREE.Plane(V3(0, 1, 0), -(FLOOR + 0.8));
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x23c4e6, transparent: true, opacity: 0.95 });
    const selRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 8, 32), ringMat);
    selRing.visible = false; scene.add(selRing);
    const preview = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, 0)]), new THREE.LineDashedMaterial({ color: 0x23c4e6, dashSize: 1, gapSize: 0.6 }));
    preview.visible = false; scene.add(preview);
    const hintRings = [];
    let hover = null, down = null, drag = null;
    const cv = renderer.domElement;
    cv.style.touchAction = 'none';
    function hitAt(e) {
      const r = cv.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(pick, false);
      return hits.length ? { ...hits[0].object.userData.pick, obj: hits[0].object } : null;
    }
    function setHover(h, e) {
      if (hover && hover.type === 'pin' && pins[hover.id]) pins[hover.id].ring.material.emissive.setHex(0);
      if (hover && hover.type === 'wire') { const w = wires.find((x) => x.id === hover.id); if (w) w.mt.emissive.setHex(0); }
      hover = h;
      if (h && h.type === 'pin') { pins[h.id].ring.material.emissive.setHex(0x3a3a3a); showTip(pins[h.id].label || h.id, e); }
      else if (h && h.type === 'wire') { const w = wires.find((x) => x.id === h.id); if (w) w.mt.emissive.setHex(0x553300); showTip('اضغط لفصل السلك', e); }
      else if (h && h.type === 'knob') showTip('اسحب لأعلى أو لأسفل', e);
      else if (h && h.type === 'click') showTip(clickTips[h.id] || 'اضغط', e);
      else tipEl.hidden = true;
      cv.style.cursor = h ? (h.type === 'knob' ? 'ns-resize' : 'pointer') : 'grab';
      dirty();
    }
    const clickTips = {};
    function showTip(s, e) {
      if (!e || e.pointerType === 'touch') { tipEl.hidden = true; return; }
      const r = host.getBoundingClientRect();
      tipEl.textContent = s; tipEl.hidden = false;
      tipEl.style.left = e.clientX - r.left + 'px'; tipEl.style.top = e.clientY - r.top + 'px';
    }
    function setPending(id) {
      pending = id;
      if (!id) { selRing.visible = false; preview.visible = false; dirty(); return; }
      const p = pins[id], P = pinTip(p, p.n * 2.0 + 0.2);
      selRing.position.copy(P); selRing.quaternion.setFromUnitVectors(V3(0, 0, 1), pinNorm(p)); selRing.visible = true;
      dirty();
    }
    cv.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      const h = hitAt(e);
      if (h && h.type === 'knob' && draggers[h.id]) {
        drag = { id: h.id, y: e.clientY, x: e.clientX };
        controls.enabled = false;
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    }, { capture: true });
    cv.addEventListener('pointermove', (e) => {
      if (drag) {
        const d = drag.y - e.clientY + (e.clientX - drag.x) * 0.5;
        if (Math.abs(d) >= 1) { draggers[drag.id](d, e.shiftKey); drag.y = e.clientY; drag.x = e.clientX; }
        return;
      }
      if (e.pointerType !== 'touch' && !e.buttons) setHover(hitAt(e), e);
      if (pending) {
        const r = cv.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const pt = new THREE.Vector3();
        if (ray.ray.intersectPlane(ground, pt)) {
          const P = pinTip(pins[pending], pins[pending].n * 2.0);
          preview.geometry.setFromPoints([P, pt]); preview.computeLineDistances(); preview.visible = true; dirty();
        }
      }
    });
    const up = (e) => {
      if (drag) { drag = null; controls.enabled = true; return; }
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 7) return;
      const h = hitAt(e);
      if (!h) { setPending(null); return; }
      if (h.type === 'pin') {
        if (!pending) setPending(h.id);
        else if (pending === h.id) setPending(null);
        else { const a = pending; setPending(null); addWire(a, h.id); }
      } else if (h.type === 'wire') {
        if (pending) setPending(null); else { removeWire(h.id); setHover(null); }
      } else if (h.type === 'click' && clickers[h.id]) clickers[h.id]();
      else if (h.type === 'knob') { /* tap on knob: nothing */ }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointerleave', () => { tipEl.hidden = true; });
    controls.addEventListener('change', dirty);

    host.querySelector('.stage-tools').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'auto') { clearWires(true); required.forEach((net) => { for (let i = 1; i < net.length; i++) { if (finder()(net[i - 1]) !== finder()(net[i])) addWire(net[i - 1], net[i], true); } }); changed(); L.toast('تم توصيل الدائرة'); }
      if (act === 'clear') { clearWires(); setPending(null); }
      if (act === 'cam') { camera.position.copy(home.pos); controls.target.copy(home.target); fit(); controls.update(); dirty(); }
      if (act === 'hint') hint();
    });
    function hint() {
      const find = finder();
      hintRings.forEach((r) => scene.remove(r)); hintRings.length = 0;
      const c = check();
      if (c.stray || c.shorts) { L.toast('يوجد سلك في مكان خاطئ: اضغط على السلك الخاطئ لفصله، أو استخدم «فصل الأسلاك»', 'warn'); return; }
      for (const net of required) {
        const miss = net.find((p) => find(p) !== find(net[0]));
        if (miss) {
          const from = net.find((p) => find(p) === find(net[0]));
          [from, miss].forEach((id) => {
            const p = pins[id], r = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.22, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffc62e }));
            r.position.copy(pinTip(p, p.n * 2.0 + 0.3)); r.quaternion.setFromUnitVectors(V3(0, 0, 1), pinNorm(p));
            scene.add(r); hintRings.push(r);
          });
          L.toast(`وصّل ${pins[from].label || from} مع ${pins[miss].label || miss}`);
          const t0 = performance.now();
          const pulse = () => { const k = (performance.now() - t0) / 1000; hintRings.forEach((r) => r.scale.setScalar(1 + 0.18 * Math.sin(k * 7))); if (k > 4) { hintRings.forEach((r) => scene.remove(r)); hintRings.length = 0; dirty(); return false; } return true; };
          anims.add(pulse);
          return;
        }
      }
      L.toast('الدائرة موصولة بالكامل');
    }

    /* ---------------- render loop + sizing ---------------- */
    let raf = 0, last = performance.now();
    function loop(t) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      const moved = controls.update();
      anims.forEach((f) => { if (!f(dt)) anims.delete(f); });
      if (needs || moved || anims.size) { renderer.render(scene, camera); needs = false; }
    }
    function fit() {
      const w = cvHost.clientWidth || 800, h = cvHost.clientHeight || 500;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 46 : 34;
      camera.updateProjectionMatrix();
      const dir = camera.position.clone().sub(controls.target).normalize();
      const base = home.pos.distanceTo(home.target) * Math.max(1, Math.pow(1.55 / (w / h), 0.75));
      camera.position.copy(controls.target).addScaledVector(dir, Math.min(base, controls.maxDistance));
      dirty();
    }
    const ro = new ResizeObserver(() => fit());
    ro.observe(cvHost);
    const mo = new MutationObserver(setBg);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const mqf = () => setBg();
    if (mq.addEventListener) mq.addEventListener('change', mqf);
    setBg(); fit(); raf = requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => canvases.forEach((c) => c.draw()));
    L.onCleanup(() => {
      cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); if (mq.removeEventListener) mq.removeEventListener('change', mqf);
      controls.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
    });

    return {
      THREE, scene, supply, generator, dmm, analog, decade, board, addWire, clearWires, solve, check, dirty, M, mesh, rbox,
      draggable: (m, id, fn) => { m.userData.pick = { type: 'knob', id }; pick.push(m); draggers[id] = fn; },
      clickable: (m, id, fn) => { m.userData.pick = { type: 'click', id }; pick.push(m); clickers[id] = fn; },
      anim: (f) => anims.add(f),
      pins, wires: () => wires.slice(),
      fixed: (pairs) => { fixed.push(...pairs); },
      require: (nets) => { required = nets || []; },
      onWires: (f) => onWiresCb.push(f),
      tipFor: (id, s) => { clickTips[id] = s; },
      status(text, kind) { statusEl.className = 'stage-status ' + (kind || ''); statusEl.querySelector('span').textContent = text; },
      step(html) { stepEl.innerHTML = html; stepEl.hidden = !html; },
      connected: (a, b) => finder()(a) === finder()(b),
    };
  };

  /* standard page layout around the 3D stage */
  Lab3D.layout = (k, o = {}) => `
    <div class="lab">
      <div class="lab-main">
        <div class="stage-host" id="${k}-stage"></div>
        <div class="dock">
          <div class="dock-ctl" id="${k}-ctl"></div>
          <div class="dock-read">
            <div class="readouts tight" id="${k}-ro"></div>
            <div class="dock-act">${o.extraBtn || ''}<button type="button" class="btn primary" id="${k}-rec">سجّل القراءة</button></div>
          </div>
        </div>
      </div>
      <aside class="lab-side"><div id="${k}-guide"></div></aside>
    </div>
    <div class="data-row${o.chart ? '' : ' one'}">
      <div class="card"><div class="card-head"><h3>النتائج</h3><div class="actions"><button type="button" class="btn small" id="${k}-copy">نسخ</button><button type="button" class="btn small ghost" id="${k}-clear">مسح</button></div></div><div class="table-wrap" id="${k}-table"></div></div>
      ${o.chart ? `<div class="card"><div class="card-head"><h3>${o.chart}</h3></div><div id="${k}-plot"></div></div>` : ''}
    </div>`;
  Lab3D.fallback = (host) => { host.innerHTML = '<div class="note warn">يحتاج هذا المختبر إلى متصفح يدعم WebGL (ثلاثي الأبعاد) واتصالاً بالإنترنت لتحميل مكتبة three.js.</div>'; };

  /* procedure guide bound to the bench: each step may define the wiring it needs */
  Lab3D.guide = (host, bench, steps) => {
    const g = L.Guide(host, steps);
    let cur = -1;
    return {
      update(st) {
        g.update(st);
        const lis = L.$$('li', host);
        const i = lis.findIndex((li) => li.classList.contains('cur'));
        const idx = i < 0 ? steps.length - 1 : i;
        // wiring requirement: nearest step at or before the current one that defines wiring
        let w = null;
        for (let j = idx; j >= 0; j--) if (steps[j].wire) { w = steps[j].wire; break; }
        if (!w) w = steps.find((s) => s.wire)?.wire || [];
        bench.require(w);
        if (idx !== cur || true) bench.step(i < 0 ? '<b>اكتملت الخطوات</b>' : `<b>الخطوة ${idx + 1}/${steps.length}</b> ${steps[idx].t}`);
        cur = idx;
      },
    };
  };
})();
