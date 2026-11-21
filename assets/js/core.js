/* Electrical Measurements Lab — shared core: formatting, storage, SVG schematic helpers,
   instrument widgets (analog meter, 7-segment LCD, knobs, switches), charts and the procedure guide. */
(function () {
  'use strict';
  const Lab = (window.Lab = { experiments: [] });
  Lab.register = (exp) => Lab.experiments.push(exp);
  const $ = (Lab.$ = (s, r = document) => r.querySelector(s));
  const $$ = (Lab.$$ = (s, r = document) => Array.from(r.querySelectorAll(s)));
  const clamp = (Lab.clamp = (v, a, b) => Math.min(b, Math.max(a, v)));
  Lab.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- storage (per-viewer convenience only) ---------- */
  Lab.store = {
    get(k, d) {
      try { const v = localStorage.getItem('mlab:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem('mlab:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  /* ---------- cleanup between pages ---------- */
  const cleanups = [];
  Lab.onCleanup = (fn) => cleanups.push(fn);
  Lab.runCleanup = () => { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* ignore */ } } };

  /* ---------- number formatting ---------- */
  Lab.sig = (x, s = 4) => {
    if (x == null || !isFinite(x)) return '—';
    if (x === 0) return '0';
    const d = s - 1 - Math.floor(Math.log10(Math.abs(x)));
    return String(+x.toFixed(clamp(d, 0, 9)));
  };
  const PFX = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  Lab.si = (v, unit = '', s = 4) => {
    if (v == null || !isFinite(v)) return '—';
    if (v === 0) return '0 ' + unit;
    const a = Math.abs(v);
    let f = 1e-12, p = 'p';
    for (const [ff, pp] of PFX) if (a >= ff * 0.99995) { f = ff; p = pp; break; }
    return Lab.sig(v / f, s) + ' ' + p + unit;
  };
  Lab.fx = (v, d = 2) => (v == null || !isFinite(v) ? '—' : v.toFixed(d));
  Lab.n = (s) => `<span class="num">${s}</span>`;
  Lab.frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  Lab.sqrt = (x) => `<span class="sqrt"><span class="rad">${x}</span></span>`;
  Lab.eq = (html, cls = '') => `<div class="formula ${cls}" dir="ltr">${html}</div>`;
  Lab.ieq = (html) => `<span class="formula inline" dir="ltr">${html}</span>`;
  Lab.ihead = (ar, en) => `<div class="inst-head"><b>${ar}</b><span>${en}</span></div>`;
  Lab.ro = (id, label, cls = '') => `<div class="ro ${cls}" id="${id}-box"><span>${label}</span><b id="${id}">—</b></div>`;
  Lab.setText = (id, txt, root = document) => { const e = root.querySelector('#' + id); if (e) e.textContent = txt; };

  /* ---------- toast ---------- */
  let toastEl;
  Lab.toast = (msg, kind = 'ok') => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.dataset.kind = kind;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2800);
  };

  /* ---------- copy a table as tab-separated text ---------- */
  Lab.copyTable = (table) => {
    const txt = $$('tr', table).map((tr) => $$('th,td', tr).map((c) => c.innerText.trim().replace(/\s+/g, ' ')).join('\t')).join('\n');
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents(table);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      Lab.toast('تم تحديد الجدول، انسخه بالضغط على Ctrl+C', 'warn');
    };
    try {
      navigator.clipboard.writeText(txt).then(() => Lab.toast('تم نسخ الجدول، يمكنك لصقه في Excel أو Word'), fallback);
    } catch (e) { fallback(); }
  };

  /* ================= SVG schematic helpers ================= */
  const S = (Lab.S = {});
  const P = (pts) => pts.map((p) => (+p[0]).toFixed(1) + ',' + (+p[1]).toFixed(1)).join(' ');
  S.P = P;
  S.svg = (w, h, inner, aria = 'مخطط الدائرة', cls = '') =>
    `<svg class="schem ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${aria}">${inner}</svg>`;
  S.wire = (pts, cls = '', id = '') => `<polyline class="w ${cls}"${id ? ` id="${id}"` : ''} points="${P(pts)}"/>`;
  S.flow = (pts, key, cls = '') => `<polyline class="flow ${cls}" data-flow="${key}" points="${P(pts)}"/>`;
  S.dot = (x, y) => `<circle class="node" cx="${x}" cy="${y}" r="3.3"/>`;
  S.term = (x, y) => `<circle class="term" cx="${x}" cy="${y}" r="4.2"/>`;
  S.text = (x, y, t, o = {}) =>
    `<text x="${x}" y="${y}" class="lbl ${o.cls || ''}" text-anchor="${o.anchor || 'middle'}"${o.id ? ` id="${o.id}"` : ''}>${t}</text>`;
  const frame = (x1, y1, x2, y2) => {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return { L, tr: `translate(${x1} ${y1}) rotate(${a.toFixed(3)})` };
  };
  const label = (x1, y1, x2, y2, o) => {
    if (!o.label) return '';
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    const off = o.off != null ? o.off : 16;
    const x = o.lx != null ? o.lx : vertical ? mx + off : mx;
    const y = o.ly != null ? o.ly : vertical ? my + 4 : my - off;
    const anchor = o.anchor || (vertical ? (off >= 0 ? 'start' : 'end') : 'middle');
    let s = `<text x="${x}" y="${y}" class="lbl ${o.lcls || ''}" text-anchor="${anchor}"${o.lid ? ` id="${o.lid}"` : ''}>${o.label}</text>`;
    if (o.sub != null) s += `<text x="${x}" y="${y + 15}" class="lbl sub" text-anchor="${anchor}"${o.sid ? ` id="${o.sid}"` : ''}>${o.sub}</text>`;
    return s;
  };
  const gopen = (o) => `<g class="comp ${o.cls || ''}"${o.id ? ` id="${o.id}"` : ''}>`;
  S.res = (x1, y1, x2, y2, o = {}) => {
    const { L, tr } = frame(x1, y1, x2, y2);
    const b = Math.min(o.body || 42, L - 8), s = (L - b) / 2, n = Math.max(6, Math.round(b / 7) & ~1), A = 6;
    let d = `M0 0 L${s.toFixed(1)} 0`;
    for (let i = 0; i < n; i++) d += ` L${(s + (b * (i + 0.5)) / n).toFixed(1)} ${i % 2 ? A : -A}`;
    d += ` L${(s + b).toFixed(1)} 0 L${L.toFixed(1)} 0`;
    const arr = o.variable
      ? `<line class="w thin" x1="${(s + 2).toFixed(1)}" y1="13" x2="${(s + b - 2).toFixed(1)}" y2="-14" marker-end="url(#arrowhead)"/>`
      : '';
    return `${gopen(o)}<g transform="${tr}"><path class="w" d="${d}"/>${arr}</g>${label(x1, y1, x2, y2, o)}</g>`;
  };
  S.coil = (x1, y1, x2, y2, o = {}) => {
    const { L, tr } = frame(x1, y1, x2, y2);
    const n = o.turns || 4, b = Math.min(o.body || 44, L - 8), s = (L - b) / 2, r = b / n / 2;
    let d = `M0 0 L${s.toFixed(1)} 0`;
    for (let i = 0; i < n; i++) d += ` a${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(2 * r).toFixed(2)} 0`;
    d += ` L${L.toFixed(1)} 0`;
    return `${gopen(o)}<g transform="${tr}"><path class="w" d="${d}"/></g>${label(x1, y1, x2, y2, o)}</g>`;
  };
  S.cap = (x1, y1, x2, y2, o = {}) => {
    const { L, tr } = frame(x1, y1, x2, y2);
    const g = 5, h = 14, m = L / 2;
    return `${gopen(o)}<g transform="${tr}"><path class="w" d="M0 0 L${m - g} 0 M${m + g} 0 L${L} 0"/><path class="w plate" d="M${m - g} ${-h} L${m - g} ${h} M${m + g} ${-h} L${m + g} ${h}"/></g>${label(x1, y1, x2, y2, o)}</g>`;
  };
  // DC source drawn from + terminal (x1,y1) to − terminal (x2,y2)
  S.bat = (x1, y1, x2, y2, o = {}) => {
    const { L, tr } = frame(x1, y1, x2, y2);
    const m = L / 2, g = 4;
    return `${gopen(o)}<g transform="${tr}"><path class="w" d="M0 0 L${m - g} 0 M${m + g} 0 L${L} 0"/><path class="w" d="M${m - g} -15 L${m - g} 15"/><path class="w plate" d="M${m + g} -8 L${m + g} 8"/><path class="w thin" d="M${m - g - 12} -20 L${m - g - 4} -20 M${m - g - 8} -24 L${m - g - 8} -16"/></g>${label(x1, y1, x2, y2, o)}</g>`;
  };
  S.ac = (cx, cy, o = {}) => {
    const r = o.r || 18;
    return `${gopen(o)}<circle class="w body" cx="${cx}" cy="${cy}" r="${r}"/><path class="w thin" d="M${cx - 10} ${cy} q5 -12 10 0 t10 0"/>${
      o.label ? `<text x="${o.lx != null ? o.lx : cx - r - 8}" y="${o.ly != null ? o.ly : cy + 4}" class="lbl" text-anchor="${o.anchor || 'end'}">${o.label}</text>` : ''
    }${o.sub ? `<text x="${o.lx != null ? o.lx : cx - r - 8}" y="${(o.ly != null ? o.ly : cy + 4) + 15}" class="lbl sub" text-anchor="${o.anchor || 'end'}">${o.sub}</text>` : ''}</g>`;
  };
  S.meter = (cx, cy, letter, o = {}) => {
    const r = o.r || 17;
    const inner = letter === 'G'
      ? `<line class="w thin" x1="${cx - 8}" y1="${cy + 8}" x2="${cx + 8}" y2="${cy - 8}" marker-end="url(#arrowhead)"/>`
      : `<text x="${cx}" y="${cy + 5}" class="mlet" text-anchor="middle">${letter}</text>`;
    const lab = o.label
      ? `<text x="${o.lx != null ? o.lx : cx}" y="${o.ly != null ? o.ly : cy - r - 8}" class="lbl ${o.lcls || ''}" text-anchor="${o.anchor || 'middle'}"${o.lid ? ` id="${o.lid}"` : ''}>${o.label}</text>`
      : '';
    return `${gopen(o)}<circle class="w body" cx="${cx}" cy="${cy}" r="${r}"/>${inner}${lab}</g>`;
  };
  S.gnd = (x, y) => `<path class="w" d="M${x} ${y} L${x} ${y + 7} M${x - 11} ${y + 7} L${x + 11} ${y + 7} M${x - 7} ${y + 11} L${x + 7} ${y + 11} M${x - 3} ${y + 15} L${x + 3} ${y + 15}"/>`;

  Lab.setFlow = (root, key, on, speed = 1, ac = false) => {
    $$(`[data-flow="${key}"]`, root).forEach((p) => {
      const show = !!on && !Lab.reduced;
      p.classList.toggle('on', show);
      p.classList.toggle('ac', !!ac);
      if (show) p.style.animationDuration = (ac ? 0.9 : clamp(0.55 / Math.max(speed, 0.02), 0.16, 6)).toFixed(2) + 's';
    });
  };

  /* ================= analog moving-coil meter ================= */
  const pt = (cx, cy, r, deg) => { const a = (deg * Math.PI) / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
  const arc = (cx, cy, r, a1, a2) => {
    const [x1, y1] = pt(cx, cy, r, a1), [x2, y2] = pt(cx, cy, r, a2);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  Lab.linTicks = (min, max, major, minor, fmt) => {
    const t = [];
    const n = Math.round((max - min) / minor);
    for (let i = 0; i <= n; i++) {
      const v = min + i * minor;
      const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      t.push({ p: (v - min) / (max - min), major: isMajor, label: isMajor ? (fmt ? fmt(v) : Lab.sig(v, 3)) : null });
    }
    return t;
  };
  Lab.AnalogMeter = function (host, o = {}) {
    const cx = 150, cy = 176, sweep = o.sweep || 96, half = sweep / 2, cz = !!o.centerZero;
    host.innerHTML = `<svg viewBox="0 0 300 204" class="ameter" role="img" aria-label="${o.aria || 'مقياس بمؤشر'}">
      <rect class="dial" x="4" y="4" width="292" height="196" rx="10"/>
      <g class="zones"></g><g class="scales"></g>
      <path class="mirror" d="${arc(cx, cy, 116, -half, half)}"/>
      <text class="dial-unit" x="150" y="136" text-anchor="middle">${o.unit || ''}</text>
      <text class="dial-brand" x="150" y="153" text-anchor="middle">${o.brand || ''}</text>
      <g class="needle-g"><line class="needle" x1="${cx}" y1="${cy + 10}" x2="${cx}" y2="${cy - 146}"/></g>
      <circle class="pivot" cx="${cx}" cy="${cy}" r="9"/>
      <circle class="peg" cx="272" cy="24" r="5"><title>تجاوز التدريج</title></circle>
    </svg>`;
    const svg = host.querySelector('svg');
    const g = svg.querySelector('.scales'), needle = svg.querySelector('.needle-g'), peg = svg.querySelector('.peg');
    const unitEl = svg.querySelector('.dial-unit'), zonesEl = svg.querySelector('.zones');
    const ang = (p) => (cz ? p * half : -half + p * sweep);
    function drawScales(list) {
      let s = '';
      list.forEach((sc, i) => {
        const outer = i === 0;
        const rBase = outer ? 134 : 102;
        s += `<path class="scale-arc" d="${arc(cx, cy, rBase, -half, half)}"/>`;
        for (const t of sc.ticks) {
          const a = ang(t.p);
          const r2 = outer ? rBase - (t.major ? 12 : 6) : rBase + (t.major ? 10 : 5);
          const [x1, y1] = pt(cx, cy, rBase, a), [x2, y2] = pt(cx, cy, r2, a);
          s += `<line class="tick${t.major ? ' major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
          if (t.label != null) {
            const [lx, ly] = pt(cx, cy, outer ? rBase + 10 : rBase - 11, a);
            s += `<text class="tl${outer ? '' : ' inner'}" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle">${t.label}</text>`;
          }
        }
        if (sc.name) {
          const [nx, ny] = pt(cx, cy, outer ? rBase + 8 : rBase - 14, half + 9);
          s += `<text class="sname" x="${nx.toFixed(1)}" y="${(ny + 4).toFixed(1)}" text-anchor="start">${sc.name}</text>`;
        }
      });
      g.innerHTML = s;
    }
    let pos = cz ? 0 : 0, vel = 0, target = 0, raf = 0, last = 0;
    const minP = cz ? -1.07 : -0.035, maxP = 1.07;
    const render = () => needle.setAttribute('transform', `rotate(${ang(pos).toFixed(2)} ${cx} ${cy})`);
    function tick(t) {
      const dt = Math.min(0.032, Math.max(0.001, (t - last) / 1000)); last = t;
      const acc = 150 * (target - pos) - 13 * vel;
      vel += acc * dt; pos += vel * dt;
      if (pos > maxP) { pos = maxP; vel = -vel * 0.2; }
      if (pos < minP) { pos = minP; vel = -vel * 0.2; }
      render();
      if (Math.abs(target - pos) < 2e-4 && Math.abs(vel) < 2e-3) { pos = target; render(); raf = 0; return; }
      raf = requestAnimationFrame(tick);
    }
    const api = {
      scales: drawScales,
      unit: (u) => { unitEl.textContent = u; },
      zones: (list) => { zonesEl.innerHTML = list.map((z) => `<path class="zone ${z.cls}" d="${arc(cx, cy, 140, ang(z.from), ang(z.to))}"/>`).join(''); },
      set(p) {
        target = clamp(p, minP, maxP);
        peg.classList.toggle('on', p > 1.02 || (cz && p < -1.02));
        if (Lab.reduced || !document.body.contains(host)) { pos = target; vel = 0; render(); return; }
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      },
    };
    Lab.onCleanup(() => cancelAnimationFrame(raf));
    if (o.scales) drawScales(o.scales);
    render();
    return api;
  };

  /* ================= 7-segment LCD ================= */
  const SEG = {
    0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
    '-': 'g', ' ': '', E: 'adefg', r: 'eg', L: 'def', O: 'abcdef', o: 'cdeg', P: 'abefg', H: 'bcefg', n: 'ceg', u: 'cde',
    C: 'adef', F: 'aefg', d: 'bcdeg', A: 'abcefg', b: 'cdefg', _: 'd', t: 'defg', U: 'bcdef',
  };
  Lab.LCD = function (host, o = {}) {
    const n = o.digits || 4, W = 20, H = 36, T = 4.4, pitch = 33, pad = 8;
    const width = pad * 2 + n * pitch + 6, height = H + pad * 2 + 4;
    const hs = (x, y, l) => { const h = T / 2; return `${x},${y} ${x + h},${y - h} ${x + l - h},${y - h} ${x + l},${y} ${x + l - h},${y + h} ${x + h},${y + h}`; };
    const vs = (x, y, l) => { const h = T / 2; return `${x},${y} ${x + h},${y + h} ${x + h},${y + l - h} ${x},${y + l} ${x - h},${y + l - h} ${x - h},${y + h}`; };
    let svg = `<svg class="lcd" viewBox="0 0 ${width} ${height}" aria-hidden="true"><g transform="translate(9 0) skewX(-7)">`;
    for (let i = 0; i < n; i++) {
      const x0 = pad + i * pitch + 4, y0 = pad + 2, gp = 1.5;
      const sg = {
        a: hs(x0 + gp, y0, W - 2 * gp), g: hs(x0 + gp, y0 + H / 2, W - 2 * gp), d: hs(x0 + gp, y0 + H, W - 2 * gp),
        f: vs(x0, y0 + gp, H / 2 - 2 * gp), b: vs(x0 + W, y0 + gp, H / 2 - 2 * gp),
        e: vs(x0, y0 + H / 2 + gp, H / 2 - 2 * gp), c: vs(x0 + W, y0 + H / 2 + gp, H / 2 - 2 * gp),
      };
      for (const k of 'abcdefg') svg += `<polygon class="seg" data-d="${i}" data-s="${k}" points="${sg[k]}"/>`;
      svg += `<circle class="seg" data-d="${i}" data-s="p" cx="${x0 + W + 5.5}" cy="${y0 + H}" r="2.5"/>`;
    }
    svg += '</g></svg>';
    host.innerHTML = `<div class="lcd-wrap" role="img">${o.tag ? `<span class="lcd-tag">${o.tag}</span>` : ''}${svg}<span class="lcd-unit">${o.unit || ''}</span></div>`;
    const wrap = host.querySelector('.lcd-wrap'), unitEl = host.querySelector('.lcd-unit');
    const segs = $$('.seg', host);
    let unit = o.unit || '';
    const api = {
      set(str) {
        const cells = [];
        for (const ch of String(str)) {
          if (ch === '.' && cells.length && !cells[cells.length - 1].dp) cells[cells.length - 1].dp = true;
          else cells.push({ ch, dp: false });
        }
        while (cells.length < n) cells.unshift({ ch: ' ', dp: false });
        if (cells.length > n) cells.splice(0, cells.length - n);
        for (const s of segs) {
          const c = cells[+s.dataset.d], k = s.dataset.s;
          const on = k === 'p' ? c.dp : (SEG[c.ch] || '').includes(k);
          s.classList.toggle('on', on);
        }
        wrap.setAttribute('aria-label', String(str).trim() + ' ' + unit);
      },
      unit(u) { unit = u; unitEl.textContent = u; },
    };
    api.set(o.value != null ? o.value : '');
    return api;
  };
  // fit a value into an n-digit LCD with fixed decimals; overload shows "1" like a 3½-digit DMM
  Lab.lcdText = (v, dec, n, max) => {
    if (v == null || !isFinite(v)) return '-'.repeat(n);
    if (max != null && Math.abs(v) > max) return '1' + ' '.repeat(n - 1);
    let s = v.toFixed(dec);
    if (s.replace(/[-.]/g, '').length > n) s = v.toFixed(Math.max(0, dec - (s.replace(/[-.]/g, '').length - n)));
    return s;
  };

  /* ================= rotary knob ================= */
  Lab.Knob = function (host, o) {
    const min = o.min, max = o.max, log = !!o.log;
    const toT = (v) => (log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min));
    const snap = (v) => { if (o.step) v = Math.round(v / o.step) * o.step; return clamp(+v.toFixed(10), min, max); };
    const fromT = (t) => snap(log ? min * Math.pow(max / min, t) : min + t * (max - min));
    let value = clamp(o.value, min, max);
    host.classList.add('knob-host');
    host.innerHTML = `<div class="knob" role="slider" tabindex="0" aria-label="${o.aria || o.label || 'مقبض'}" aria-valuemin="${min}" aria-valuemax="${max}" style="--size:${o.size || 64}px"><div class="knob-ring"></div><div class="knob-cap"><i></i></div></div>${o.label ? `<div class="knob-label">${o.label}</div>` : ''}`;
    const knob = host.querySelector('.knob');
    const paint = () => {
      knob.style.setProperty('--t', clamp(toT(value), 0, 1).toFixed(4));
      knob.setAttribute('aria-valuenow', value);
      knob.setAttribute('aria-valuetext', o.format ? o.format(value) : String(value));
    };
    const set = (v, emit = true) => { value = clamp(v, min, max); paint(); if (emit && o.onInput) o.onInput(value); };
    let drag = null;
    knob.addEventListener('pointerdown', (e) => {
      knob.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, t: clamp(toT(value), 0, 1) };
      knob.classList.add('grab'); knob.focus({ preventScroll: true }); e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const d = drag.y - e.clientY + (e.clientX - drag.x);
      const k = e.shiftKey ? 0.1 : 1;
      const nv = fromT(clamp(drag.t + (d / (o.travel || 240)) * k, 0, 1));
      if (nv !== value) set(nv);
    });
    const end = () => { drag = null; knob.classList.remove('grab'); };
    knob.addEventListener('pointerup', end);
    knob.addEventListener('pointercancel', end);
    const nudge = (k, fine) => {
      if (o.step && !log) set(snap(value + k * o.step * (fine ? 1 : o.nudge || 1)));
      else set(fromT(clamp(toT(value) + k * (fine ? 0.002 : 0.01), 0, 1)));
    };
    knob.addEventListener('wheel', (e) => {
      if (document.activeElement !== knob) return;
      e.preventDefault(); nudge(e.deltaY < 0 ? 1 : -1, e.shiftKey);
    }, { passive: false });
    knob.addEventListener('keydown', (e) => {
      const m = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };
      if (e.key in m) { e.preventDefault(); nudge(m[e.key], e.shiftKey); }
      else if (e.key === 'Home') { e.preventDefault(); set(min); }
      else if (e.key === 'End') { e.preventDefault(); set(max); }
    });
    paint();
    return { set, get: () => value, el: knob };
  };

  /* knob + numeric field + fine-step buttons */
  Lab.Control = function (host, o) {
    host.classList.add('ctl');
    const fmtStep = (s) => (s >= 1000 ? s / 1000 + 'k' : String(s));
    host.innerHTML = `<div class="ctl-head"><span class="ctl-label">${o.label}</span><label class="ctl-field"><input type="number" id="${o.id}" inputmode="decimal" step="any" aria-label="${o.aria || o.label}"><span class="ctl-unit">${o.unit || ''}</span></label></div>
      <div class="ctl-body"><div class="ctl-knob"></div>${o.steps ? `<div class="ctl-steps">${o.steps.map((s) => `<button type="button" data-d="${s}">${s > 0 ? '+' : '−'}${fmtStep(Math.abs(s))}</button>`).join('')}</div>` : ''}</div>
      ${o.hint ? `<div class="ctl-hint">${o.hint}</div>` : ''}`;
    const input = host.querySelector('input');
    const dec = o.decimals;
    const fmtv = (v) => (dec != null ? (+v).toFixed(dec) : String(+(+v).toPrecision(6)));
    let value = o.value;
    const api = {
      set(v, emit = true) {
        v = clamp(v, o.min, o.max);
        if (o.step) v = Math.round(v / o.step) * o.step;
        value = +v.toFixed(10);
        knob.set(value, false);
        input.value = fmtv(value);
        if (emit && o.onInput) o.onInput(value);
      },
      get: () => value,
    };
    const knob = Lab.Knob(host.querySelector('.ctl-knob'), {
      min: o.min, max: o.max, value, step: o.step, log: o.log, size: o.size, travel: o.travel, nudge: o.nudge,
      aria: o.aria || o.label, format: (v) => fmtv(v) + ' ' + (o.unit || ''),
      onInput: (v) => { value = v; input.value = fmtv(v); if (o.onInput) o.onInput(v); },
    });
    input.value = fmtv(value);
    input.addEventListener('change', () => { const v = parseFloat(input.value); if (isFinite(v)) api.set(v); else input.value = fmtv(value); });
    $$('.ctl-steps button', host).forEach((b) => b.addEventListener('click', () => api.set(value + parseFloat(b.dataset.d))));
    return api;
  };

  /* segmented radio buttons */
  Lab.Seg = function (host, o) {
    host.classList.add('seg');
    if (o.big) host.classList.add('big');
    host.setAttribute('role', 'radiogroup');
    if (o.aria) host.setAttribute('aria-label', o.aria);
    host.innerHTML = o.options.map((op) => `<button type="button" role="radio" data-v="${op.v}">${op.label}</button>`).join('');
    let value = o.value;
    const btns = $$('button', host);
    const paint = () => btns.forEach((b) => { const on = b.dataset.v === String(value); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    const api = {
      set(v, emit = true) {
        const op = o.options.find((x) => String(x.v) === String(v));
        value = op ? op.v : v; paint();
        if (emit && o.onChange) o.onChange(value);
      },
      get: () => value,
    };
    host.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) api.set(b.dataset.v); });
    host.addEventListener('keydown', (e) => {
      const i = btns.findIndex((b) => b.dataset.v === String(value));
      let j = -1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = (i + 1) % btns.length;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
      if (j >= 0) { e.preventDefault(); api.set(btns[j].dataset.v); btns[j].focus(); }
    });
    paint();
    return api;
  };

  /* rotary range-selector switch */
  Lab.Rotary = function (host, o) {
    const n = o.positions.length, a0 = o.start != null ? o.start : -70, span = o.span != null ? o.span : 140;
    host.classList.add('rotary');
    host.setAttribute('role', 'radiogroup');
    host.setAttribute('aria-label', o.aria || 'مفتاح اختيار المدى');
    const angles = o.positions.map((_, i) => (n === 1 ? 0 : a0 + (span * i) / (n - 1)));
    host.innerHTML = `<div class="rot-knob"><i></i></div>` + o.positions.map((p, i) => {
      const a = (angles[i] * Math.PI) / 180, r = 68;
      return `<button type="button" role="radio" class="rot-pos${p.danger ? ' danger' : ''}" data-i="${i}" style="left:${(95 + r * Math.sin(a)).toFixed(1)}px;top:${(92 - r * Math.cos(a)).toFixed(1)}px">${p.label}</button>`;
    }).join('');
    const knob = host.querySelector('.rot-knob');
    const btns = $$('.rot-pos', host);
    let idx = Math.max(0, o.positions.findIndex((p) => String(p.v) === String(o.value)));
    const paint = () => {
      knob.style.transform = `rotate(${angles[idx]}deg)`;
      btns.forEach((b, i) => { b.setAttribute('aria-checked', i === idx); b.tabIndex = i === idx ? 0 : -1; });
    };
    const api = {
      set(v, emit = true) {
        const i = o.positions.findIndex((p) => String(p.v) === String(v));
        if (i >= 0) idx = i;
        paint();
        if (emit && o.onChange) o.onChange(o.positions[idx].v);
      },
      get: () => o.positions[idx].v,
    };
    host.addEventListener('click', (e) => {
      const b = e.target.closest('.rot-pos');
      if (b) api.set(o.positions[+b.dataset.i].v);
      else if (e.target.closest('.rot-knob')) api.set(o.positions[(idx + 1) % n].v);
    });
    host.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'ArrowUp'].includes(e.key)) { e.preventDefault(); api.set(o.positions[Math.min(n - 1, idx + 1)].v); btns[idx].focus(); }
      if (['ArrowLeft', 'ArrowDown'].includes(e.key)) { e.preventDefault(); api.set(o.positions[Math.max(0, idx - 1)].v); btns[idx].focus(); }
    });
    paint();
    return api;
  };

  /* power switch */
  Lab.Power = function (host, o) {
    host.innerHTML = `<button type="button" class="pwr" aria-pressed="${!!o.value}"><span class="led"></span><span>${o.label || 'تشغيل'}</span></button>`;
    const b = host.querySelector('button');
    let on = !!o.value;
    const api = {
      set(v, emit = true) { on = !!v; b.setAttribute('aria-pressed', on); if (emit && o.onChange) o.onChange(on); },
      get: () => on,
    };
    b.addEventListener('click', () => api.set(!on));
    return api;
  };

  /* decade resistance box */
  Lab.Decade = function (host, o) {
    const mults = o.mults || [1000, 100, 10, 1];
    let digits = mults.map((m) => Math.floor((o.value || 0) / m) % 10);
    const label = (m) => '×' + (m >= 1000 ? m / 1000 + 'k' : m);
    host.classList.add('decade');
    host.innerHTML = mults.map((m, i) => `<div class="dec"><small>${label(m)}</small><button type="button" data-i="${i}" data-d="1" aria-label="زيادة ${label(m)}">▲</button><output id="${o.id}-${i}">0</output><button type="button" data-i="${i}" data-d="-1" aria-label="إنقاص ${label(m)}">▼</button></div>`).join('');
    const outs = $$('output', host);
    const val = () => digits.reduce((s, d, i) => s + d * mults[i], 0);
    const paint = () => outs.forEach((e, i) => { e.textContent = digits[i]; });
    const api = {
      set(v, emit = true) {
        v = clamp(Math.round(v), 0, mults.reduce((s, m) => s + 9 * m, 0));
        digits = mults.map((m) => Math.floor(v / m) % 10);
        paint();
        if (emit && o.onInput) o.onInput(val());
      },
      get: val,
    };
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const i = +b.dataset.i;
      digits[i] = (digits[i] + +b.dataset.d + 10) % 10;
      paint(); if (o.onInput) o.onInput(val());
    });
    host.addEventListener('wheel', (e) => {
      const d = e.target.closest('.dec'); if (!d || !d.contains(document.activeElement)) return;
      e.preventDefault();
      const i = $$('.dec', host).indexOf(d);
      digits[i] = (digits[i] + (e.deltaY < 0 ? 1 : -1) + 10) % 10; paint(); if (o.onInput) o.onInput(val());
    }, { passive: false });
    paint();
    return api;
  };

  /* ================= chart ================= */
  const niceStep = (span, count) => {
    const raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), nrm = raw / mag;
    return (nrm < 1.5 ? 1 : nrm < 3 ? 2 : nrm < 7 ? 5 : 10) * mag;
  };
  Lab.ticks = (a, b, count = 6) => {
    const st = niceStep(b - a || 1, count), out = [];
    for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-6; v += st) out.push(+v.toFixed(10));
    return out;
  };
  Lab.Plot = function (host, o = {}) {
    host.classList.add('plot');
    host.innerHTML = `<div class="legend"></div><div class="plot-box"><svg class="chart" role="img" aria-label="${o.aria || 'رسم بياني'}"></svg><div class="tip" hidden></div></div>`;
    const svg = host.querySelector('svg'), tip = host.querySelector('.tip'), legend = host.querySelector('.legend'), box = host.querySelector('.plot-box');
    let series = [], marks = [], geo = null, lastW = 0;
    const shape = (m, x, y, r, color, cls = 'mk') => {
      if (m === 'square') return `<rect class="${cls}" x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${2 * r}" height="${2 * r}" rx="1.5" fill="${color}"/>`;
      if (m === 'triangle') return `<path class="${cls}" d="M${x.toFixed(1)} ${(y - r - 1).toFixed(1)} L${(x + r + 1).toFixed(1)} ${(y + r).toFixed(1)} L${(x - r - 1).toFixed(1)} ${(y + r).toFixed(1)} Z" fill="${color}"/>`;
      return `<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}"/>`;
    };
    function auto(k) {
      const vals = [];
      series.forEach((s) => s.points.forEach((p) => vals.push(p[k])));
      marks.forEach((m) => vals.push(k ? m.y : m.x));
      if (!vals.length) return [0, 1];
      let a = Math.min(...vals), b = Math.max(...vals);
      if (k && o.yZero) { a = Math.min(a, 0); b = Math.max(b, 0); }
      if (a === b) { a -= 1; b += 1; }
      const st = niceStep(b - a, 5);
      return [Math.floor(a / st) * st, Math.ceil(b / st) * st];
    }
    function draw() {
      const W = Math.max(260, Math.round(box.clientWidth || 600)), H = o.height || 270;
      lastW = W;
      const m = { l: 54, r: 14, t: 12, b: 44 };
      const pw = W - m.l - m.r, ph = H - m.t - m.b;
      const [x0, x1] = o.x || auto(0), [y0, y1] = o.y || auto(1);
      const lx = (v) => Math.log10(Math.max(v, 1e-12));
      const xs = o.xLog ? (v) => m.l + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * pw : (v) => m.l + ((v - x0) / (x1 - x0)) * pw;
      const ys = (v) => m.t + ph - ((v - y0) / (y1 - y0)) * ph;
      let s = '';
      // grid + ticks
      const yt = Lab.ticks(y0, y1, Math.max(3, Math.round(ph / 46)));
      for (const v of yt) {
        const y = ys(v);
        s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
        s += `<text class="tk" x="${m.l - 7}" y="${(y + 4).toFixed(1)}" text-anchor="end">${o.yFmt ? o.yFmt(v) : Lab.sig(v, 4)}</text>`;
      }
      if (o.xLog) {
        for (let e = Math.ceil(lx(x0) - 1e-9); e <= Math.floor(lx(x1) + 1e-9); e++) {
          const v = Math.pow(10, e), x = xs(v);
          s += `<line class="grid" y1="${m.t}" y2="${m.t + ph}" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}"/>`;
          s += `<text class="tk" x="${x.toFixed(1)}" y="${m.t + ph + 16}" text-anchor="middle">${o.xFmt ? o.xFmt(v) : Lab.si(v, '', 3).trim()}</text>`;
          for (let k = 2; k < 10; k++) {
            const vv = v * k; if (vv > x1) break;
            const xx = xs(vv);
            s += `<line class="grid minor" y1="${m.t}" y2="${m.t + ph}" x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}"/>`;
          }
        }
      } else {
        for (const v of Lab.ticks(x0, x1, Math.max(3, Math.round(pw / 70)))) {
          const x = xs(v);
          s += `<line class="grid" y1="${m.t}" y2="${m.t + ph}" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}"/>`;
          s += `<text class="tk" x="${x.toFixed(1)}" y="${m.t + ph + 16}" text-anchor="middle">${o.xFmt ? o.xFmt(v) : Lab.sig(v, 4)}</text>`;
        }
      }
      if (y0 < 0 && y1 > 0) s += `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${ys(0).toFixed(1)}" y2="${ys(0).toFixed(1)}"/>`;
      if (!o.xLog && x0 < 0 && x1 > 0) s += `<line class="zero" y1="${m.t}" y2="${m.t + ph}" x1="${xs(0).toFixed(1)}" x2="${xs(0).toFixed(1)}"/>`;
      s += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/><line class="axis" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + ph}"/>`;
      s += `<text class="al" x="${m.l + pw / 2}" y="${H - 6}" text-anchor="middle">${o.xLabel || ''}</text>`;
      s += `<text class="al" transform="translate(13 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${o.yLabel || ''}</text>`;
      // clip
      const cid = 'cp' + Math.random().toString(36).slice(2, 8);
      s += `<defs><clipPath id="${cid}"><rect x="${m.l}" y="${m.t - 6}" width="${pw}" height="${ph + 12}"/></clipPath></defs><g clip-path="url(#${cid})">`;
      const pts = [];
      for (const se of series) {
        const sorted = se.sort === false ? se.points : [...se.points].sort((a, b) => a[0] - b[0]);
        const inside = sorted.filter((p) => isFinite(p[0]) && isFinite(p[1]) && (!o.xLog || p[0] > 0));
        if (se.line !== false && inside.length > 1) {
          s += `<polyline class="ln${se.faint ? ' faint' : ''}" stroke="${se.color}"${se.dash ? ' stroke-dasharray="6 5"' : ''} points="${inside.map((p) => xs(p[0]).toFixed(1) + ',' + ys(p[1]).toFixed(1)).join(' ')}"/>`;
        }
        for (const p of inside) {
          const X = xs(p[0]), Y = ys(p[1]);
          if (se.markers) s += shape(se.marker || 'circle', X, Y, 4.5, se.color);
          if (se.hover !== false) pts.push({ x: X, y: Y, name: se.name, vx: p[0], vy: p[1] });
        }
      }
      for (const mk of marks) {
        if (!isFinite(mk.x) || !isFinite(mk.y)) continue;
        const X = xs(mk.x), Y = ys(mk.y);
        s += `<circle class="cur" cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="7"/><circle class="cur-fill" cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="2.5"/>`;
        pts.push({ x: X, y: Y, name: mk.name || 'الوضع الحالي', vx: mk.x, vy: mk.y });
      }
      s += '</g><line class="xh" y1="' + m.t + '" y2="' + (m.t + ph) + '" x1="-10" x2="-10"/>';
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML = s;
      geo = { pts, xh: svg.querySelector('.xh') };
      legend.innerHTML = series.filter((se) => se.legend !== false).map((se) => `<span><svg viewBox="0 0 26 12" aria-hidden="true">${se.line !== false ? `<line x1="1" x2="25" y1="6" y2="6" stroke="${se.color}" stroke-width="2"${se.dash ? ' stroke-dasharray="4 3"' : ''}/>` : ''}${se.markers ? shape(se.marker || 'circle', 13, 6, 4, se.color, '') : ''}</svg>${se.name}</span>`).join('') +
        (marks.length && o.markLegend !== false ? `<span><svg viewBox="0 0 26 12" aria-hidden="true"><circle cx="13" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>${o.markLabel || 'الوضع الحالي'}</span>` : '');
    }
    const fmtX = o.tipX || ((v) => Lab.sig(v, 4)), fmtY = o.tipY || ((v) => Lab.sig(v, 4));
    svg.addEventListener('pointermove', (e) => {
      if (!geo) return;
      const r = svg.getBoundingClientRect(), sc = lastW / r.width;
      const px = (e.clientX - r.left) * sc, py = (e.clientY - r.top) * sc;
      let best = null, bd = 34 * 34;
      for (const p of geo.pts) { const d = (p.x - px) ** 2 + (p.y - py) ** 2; if (d < bd) { bd = d; best = p; } }
      if (!best) { tip.hidden = true; geo.xh.setAttribute('x1', -10); geo.xh.setAttribute('x2', -10); return; }
      geo.xh.setAttribute('x1', best.x); geo.xh.setAttribute('x2', best.x);
      tip.hidden = false;
      tip.innerHTML = `<b>${best.name}</b><span>${fmtX(best.vx)} · ${fmtY(best.vy)}</span>`;
      tip.style.left = (best.x / sc) + 'px';
      tip.style.top = (best.y / sc) + 'px';
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; if (geo) { geo.xh.setAttribute('x1', -10); geo.xh.setAttribute('x2', -10); } });
    let rafId = 0;
    const ro = new ResizeObserver(() => { if (Math.abs((box.clientWidth || 0) - lastW) > 2) { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(draw); } });
    ro.observe(box);
    Lab.onCleanup(() => ro.disconnect());
    return {
      set(se, mk) { series = se || []; marks = mk || []; draw(); },
      opts: o,
    };
  };

  /* ================= procedure guide ================= */
  Lab.Guide = function (host, steps, o = {}) {
    host.classList.add('guide');
    host.innerHTML = `<div class="guide-head"><h3>${o.title || 'خطوات العمل'}</h3><span class="guide-count num"></span></div><div class="guide-bar"><i></i></div>
      <ol class="guide-list">${steps.map((s, i) => `<li><span class="gk" aria-hidden="true">${i + 1}</span><div class="gt">${s.t}</div></li>`).join('')}</ol>`;
    const lis = $$('li', host);
    const done = steps.map(() => false);
    return {
      update(st) {
        steps.forEach((s, i) => { if (!done[i] && s.check && s.check(st)) done[i] = true; });
        const cur = done.indexOf(false);
        lis.forEach((li, i) => { li.classList.toggle('done', done[i]); li.classList.toggle('cur', i === cur); });
        const n = done.filter(Boolean).length;
        host.querySelector('.guide-count').textContent = `${n}/${steps.length}`;
        host.querySelector('.guide-bar i').style.width = (100 * n) / steps.length + '%';
      },
    };
  };

  /* worksheet: design inputs that are checked against the correct value */
  Lab.Worksheet = function (host, o) {
    // o: {title, intro, items:[{label, sub, unit, answer, tol, solution}], key, onSolve}
    const saved = Lab.store.get(o.key, {});
    host.classList.add('card', 'ws');
    host.innerHTML = `<h3>${o.title}</h3>${o.intro ? `<p>${o.intro}</p>` : ''}<div class="ws-rows">${o.items.map((it, i) => `
      <div class="ws-row" data-i="${i}">
        <label for="${o.key}-${i}">${it.label} ${it.sub ? `<span class="num">${it.sub}</span>` : ''}</label>
        <span class="ws-in"><input id="${o.key}-${i}" type="number" step="any" inputmode="decimal" aria-label="${it.label}"><span class="ctl-unit">${it.unit}</span></span>
        <div class="ws-fb" aria-live="polite"><span class="msg">أدخل القيمة ثم اضغط Enter</span><button type="button" class="linkish show">إظهار الحل</button></div>
      </div>`).join('')}</div>`;
    const solved = o.items.map((_, i) => !!(saved[i] && saved[i].ok));
    const rows = $$('.ws-row', host);
    const check = (i, silent) => {
      const it = o.items[i], row = rows[i], inp = $('input', row), fb = $('.ws-fb', row), msg = $('.msg', fb), box = $('.ws-in', row);
      const v = parseFloat(inp.value);
      if (!isFinite(v)) { box.classList.remove('ok', 'bad'); fb.classList.remove('ok', 'bad'); msg.textContent = 'أدخل القيمة ثم اضغط Enter'; return; }
      const ok = Math.abs(v - it.answer) <= Math.abs(it.answer) * (it.tol || 0.01);
      box.classList.toggle('ok', ok); box.classList.toggle('bad', !ok);
      fb.classList.toggle('ok', ok); fb.classList.toggle('bad', !ok);
      msg.innerHTML = ok ? 'صحيح ✓' : it.hint || 'غير صحيح، راجع المعادلة';
      solved[i] = ok;
      saved[i] = { v: inp.value, ok };
      Lab.store.set(o.key, saved);
      if (!silent && o.onSolve) o.onSolve(solved.slice());
    };
    rows.forEach((row, i) => {
      const inp = $('input', row);
      if (saved[i] && saved[i].v != null) { inp.value = saved[i].v; check(i, true); }
      inp.addEventListener('change', () => check(i));
      $('.show', row).addEventListener('click', () => {
        const fb = $('.ws-fb', row);
        $('.msg', fb).innerHTML = o.items[i].solution;
        fb.classList.remove('bad');
      });
    });
    return { solved: () => solved.slice() };
  };

  /* simple table renderer */
  Lab.table = (head, rows) => `<table class="data"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td class="row-h">${c}</td>` : `<td>${c == null || c === '' ? '<span class="muted">—</span>' : c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;

  /* deterministic pseudo-random for "unknown" components */
  Lab.rand = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
})();
