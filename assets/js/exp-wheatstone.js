/* Experiment 3 — Methods of measuring resistance + Wheatstone DC bridge (balanced & unbalanced). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const KEY = 'wheatstone';
  let data = L.store.get(KEY + ':data', { bal: [], unbal: [] });
  const save = () => L.store.set(KEY + ':data', data);

  /* ---------- colour code ---------- */
  const CC = [
    { k: 'black', ar: 'أسود', en: 'Black', hex: '#141414', d: 0, m: 1, t: null },
    { k: 'brown', ar: 'بني', en: 'Brown', hex: '#7b3f12', d: 1, m: 10, t: 1 },
    { k: 'red', ar: 'أحمر', en: 'Red', hex: '#d32222', d: 2, m: 100, t: 2 },
    { k: 'orange', ar: 'برتقالي', en: 'Orange', hex: '#f07d12', d: 3, m: 1e3, t: null },
    { k: 'yellow', ar: 'أصفر', en: 'Yellow', hex: '#f4d10a', d: 4, m: 1e4, t: null },
    { k: 'green', ar: 'أخضر', en: 'Green', hex: '#16a34a', d: 5, m: 1e5, t: 0.5 },
    { k: 'blue', ar: 'أزرق', en: 'Blue', hex: '#1d5fd6', d: 6, m: 1e6, t: 0.25 },
    { k: 'violet', ar: 'بنفسجي', en: 'Violet', hex: '#7c3cc4', d: 7, m: 1e7, t: 0.1 },
    { k: 'grey', ar: 'رمادي', en: 'Grey', hex: '#8b8b8b', d: 8, m: 1e8, t: 0.05 },
    { k: 'white', ar: 'أبيض', en: 'White', hex: '#f5f5f5', d: 9, m: 1e9, t: null },
    { k: 'gold', ar: 'ذهبي', en: 'Gold', hex: '#c9a227', d: null, m: 0.1, t: 5 },
    { k: 'silver', ar: 'فضي', en: 'Silver', hex: '#b9bdc2', d: null, m: 0.01, t: 10 },
    { k: 'none', ar: 'بدون لون', en: 'No colour', hex: null, d: null, m: null, t: 20 },
  ];
  const C = (k) => CC.find((c) => c.k === k);
  const ccValue = (bands) => {
    const digits = bands.length === 5 ? 3 : 2;
    let v = 0;
    for (let i = 0; i < digits; i++) v = v * 10 + C(bands[i]).d;
    return { v: v * C(bands[digits]).m, tol: C(bands[digits + 1]).t };
  };
  function resistorSVG(bands, o = {}) {
    const five = bands.length === 5;
    const pos = five ? [102, 128, 154, 180, 252] : [108, 138, 168, 252];
    let s = `<line x1="8" y1="44" x2="72" y2="44" stroke="#8d949a" stroke-width="5" stroke-linecap="round"/><line x1="288" y1="44" x2="352" y2="44" stroke="#8d949a" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M78 20 Q78 14 92 14 L110 18 L250 18 L268 14 Q282 14 282 20 L282 68 Q282 74 268 74 L250 70 L110 70 L92 74 Q78 74 78 68 Z" fill="#e3cc9c" stroke="#a5864f" stroke-width="1.5"/>`;
    bands.forEach((b, i) => {
      const c = C(b); if (!c || !c.hex) return;
      s += `<rect x="${pos[i] - 7}" y="${i === 0 ? 16 : 18}" width="14" height="${i === 0 ? 56 : 52}" fill="${c.hex}" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`;
    });
    if (o.labels) {
      bands.forEach((b, i) => {
        const c = C(b);
        const role = i === bands.length - 1 ? 'Tolerance' : i === bands.length - 2 ? 'Multiplier' : `${['1st', '2nd', '3rd'][i]} digit`;
        s += `<text x="${pos[i]}" y="96" text-anchor="middle" class="rl">${c.en}</text><text x="${pos[i]}" y="110" text-anchor="middle" class="rl sub">${role}</text>`;
      });
    }
    return `<svg class="resistor-svg" viewBox="0 0 360 ${o.labels ? 118 : 88}" role="img" aria-label="مقاومة بحلقات ملونة"><style>.rl{font:500 10.5px var(--font-mono);fill:var(--ink)}.rl.sub{fill:var(--muted);font-size:9.5px}</style>${s}</svg>`;
  }

  /* unknown resistors handed out in the lab (true values are hidden) */
  const UNK = [
    { id: 'Rx-1', bands: ['yellow', 'violet', 'black', 'gold'], nom: 47, val: 46.4 },
    { id: 'Rx-2', bands: ['brown', 'black', 'red', 'gold'], nom: 1000, val: 1013 },
    { id: 'Rx-3', bands: ['red', 'red', 'red', 'gold'], nom: 2200, val: 2174 },
    { id: 'Rx-4', bands: ['orange', 'orange', 'red', 'gold'], nom: 3300, val: 3352 },
    { id: 'Rx-5', bands: ['blue', 'grey', 'red', 'gold'], nom: 6800, val: 6712 },
    { id: 'Rx-6', bands: ['yellow', 'violet', 'orange', 'gold'], nom: 47000, val: 46550 },
  ];
  const EVALS = [100, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 6800, 10000];
  const unkOptions = (sel) => UNK.map((u, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${u.id}</option>`).join('');
  const valOptions = (list, sel) => list.map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${L.si(v, 'Ω', 3)}</option>`).join('');

  /* ---------- bridge schematic ---------- */
  const frame = (x1, y1, x2, y2) => ({ L: Math.hypot(x2 - x1, y2 - y1), tr: `translate(${x1} ${y1}) rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI).toFixed(3)})` });
  const boxR = (x1, y1, x2, y2, cls = '') => {
    const { L: len, tr } = frame(x1, y1, x2, y2), b = 34, s = (len - b) / 2;
    return `<g class="comp ${cls}"><g transform="${tr}"><path class="w" d="M0 0 L${s} 0 M${s + b} 0 L${len} 0"/><rect class="w body" x="${s}" y="-8" width="${b}" height="16" rx="1"/></g></g>`;
  };
  const A = [260, 42], D = [110, 172], B = [410, 172], Cc = [260, 302];
  function bridge(mode, v = {}) {
    let s = '';
    s += S.wire([A, [260, 16], [490, 16], [490, 140]]) + S.wire([[490, 204], [490, 322], [260, 322], Cc]);
    s += S.bat(490, 204, 490, 140, { label: v.V || 'V', off: 24 });
    if (mode === 'bal') {
      s += boxR(D[0], D[1], A[0], A[1]);
      s += S.text(168, 92, 'Ru', { cls: 'big', anchor: 'end' }) + S.text(168, 108, v.ru || 'unknown', { cls: 'sub', anchor: 'end' });
      s += S.res(A[0], A[1], B[0], B[1], { variable: true, body: 54 });
      s += S.text(352, 92, 'Rv', { cls: 'big acc', anchor: 'start' }) + `<text x="352" y="108" class="lbl sub" text-anchor="start" id="wb-rv-l">${v.rv || 'variable'}</text>`;
    } else {
      const M = [185, 107];
      s += S.res(D[0], D[1], M[0], M[1], { body: 34 });
      s += boxR(M[0], M[1], A[0], A[1]);
      s += S.dot(M[0], M[1]);
      s += `<g transform="${frame(D[0], D[1], A[0], A[1]).tr}"><rect class="hl-box" x="6" y="-22" width="${frame(D[0], D[1], A[0], A[1]).L - 12}" height="44" rx="4"/></g>`;
      s += S.text(122, 112, 'R4', { cls: 'big', anchor: 'end' }) + S.text(122, 128, v.r4 || '', { cls: 'sub', anchor: 'end' });
      s += S.text(210, 62, 'Ru', { cls: 'big', anchor: 'end' });
      s += `<text x="150" y="58" class="lbl big" fill="#d33b3b" style="fill:#d33b3b">Rx</text>`;
      s += S.res(A[0], A[1], B[0], B[1], { body: 54 });
      s += S.text(352, 92, 'R1', { cls: 'big', anchor: 'start' }) + S.text(352, 108, v.r1 || '', { cls: 'sub', anchor: 'start' });
    }
    s += S.res(D[0], D[1], Cc[0], Cc[1], { body: 54 });
    s += S.res(B[0], B[1], Cc[0], Cc[1], { body: 54 });
    s += S.text(166, 262, 'R3', { cls: 'big', anchor: 'end' }) + S.text(166, 278, v.r3 || '', { cls: 'sub', anchor: 'end' });
    s += S.text(354, 262, 'R2', { cls: 'big', anchor: 'start' }) + S.text(354, 278, v.r2 || '', { cls: 'sub', anchor: 'start' });
    s += S.wire([D, [241, 172]]) + S.wire([[279, 172], B]);
    s += S.flow([Cc, D, A], 'left') + S.flow([Cc, B, A], 'right') + S.flow([[490, 204], [490, 322], [260, 322], Cc], 'sup') + S.flow([A, [260, 16], [490, 16], [490, 140]], 'sup');
    s += S.meter(260, 172, 'V', { label: 'Vo', ly: 206, lcls: 'acc' });
    [[A, 'A', 0, -8], [D, 'D', -14, 4], [B, 'B', 14, 4], [Cc, 'C', -12, 16]].forEach(([p, t, dx, dy]) => { s += S.dot(p[0], p[1]) + S.text(p[0] + dx, p[1] + dy, t, { cls: 'big acc', anchor: dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle' }); });
    return S.svg(552, 336, s, mode === 'bal' ? 'قنطرة ويتستون المتزنة' : 'قنطرة ويتستون غير المتزنة');
  }

  /* ================= simulation ================= */
  function mount(root) {
    root.innerHTML = `<div class="sim-modes"><div id="wb-mode"></div></div><div id="wb-views"></div>`;
    const views = L.$('#wb-views', root);
    const built = {};
    const MODES = [
      { v: 'bal', label: 'الجزء أ: القنطرة المتزنة', fn: mountBalanced },
      { v: 'unbal', label: 'الجزء ب: القنطرة غير المتزنة', fn: mountUnbalanced },
      { v: 'color', label: 'شفرة الألوان', fn: mountColor },
      { v: 'vi', label: 'الأميتر والفولتميتر', fn: mountVI },
      { v: 'ohm', label: 'الأوميتر', fn: mountOhm },
    ];
    const open = (m) => {
      Object.values(built).forEach((el) => { el.hidden = true; });
      if (!built[m]) { const el = document.createElement('div'); views.appendChild(el); built[m] = el; MODES.find((x) => x.v === m).fn(el); }
      built[m].hidden = false;
      L.store.set(KEY + ':mode', m);
      window.dispatchEvent(new Event('resize'));
    };
    const first = L.store.get(KEY + ':mode', 'bal');
    L.Seg(L.$('#wb-mode', root), { options: MODES, value: first, big: true, aria: 'جزء التجربة', onChange: open });
    open(MODES.some((m) => m.v === first) ? first : 'bal');
  }

  /* ---------- Part A: balanced bridge ---------- */
  function mountBalanced(root) {
    const st = { unk: 2, r2: 1000, r3: 1000, rv: 1000, V: 5, on: true, everBal: false, ratioChanged: false };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="card sch c4"><div class="sch-title"><b>قنطرة ويتستون: الاتزان</b><span>R3/Ru = R2/Rv</span></div><div id="wb-sch"></div></div>
        <div class="inst c2">${L.ihead('كاشف الصفر', 'Null detector · Vo = VD − VB')}<div id="wb-null"></div><div id="wb-dmm"></div></div>
        <div class="inst c3">${L.ihead('صندوق المقاومات العشري Rv', 'Decade resistance box 0–9999 Ω')}<div id="wb-dec"></div><div class="inst-foot">اضغط ▲▼ لتغيير كل خانة حتى يقرأ الكاشف صفراً</div></div>
        <div class="inst c3">${L.ihead('المقاومات المعلومة والمجهولة', 'Ratio arms & unknown')}
          <div class="inst-row" style="align-items:flex-end">
            <label class="field"><span>المجهولة Ru</span><select id="wb-unk">${unkOptions(st.unk)}</select></label>
            <label class="field"><span>R2</span><select id="wb-r2">${valOptions([100, 1000, 10000], st.r2)}</select></label>
            <label class="field"><span>R3</span><select id="wb-r3">${valOptions([100, 1000, 10000], st.r3)}</select></label>
            <div id="wb-pwr"></div>
          </div>
          <div id="wb-res"></div>
        </div>
        <div class="card c6">
          <div class="card-head"><h3>حالة القنطرة</h3><span class="status" id="wb-status">—</span></div>
          <div class="readouts">
            ${L.ro('wb-vd', 'جهد النقطة D')}${L.ro('wb-vb', 'جهد النقطة B')}${L.ro('wb-vo', 'Vo = VD − VB', 'hl')}${L.ro('wb-ru', 'Ru = R3 × Rv / R2', 'hl')}
          </div>
          <div class="calc-live" id="wb-live"></div>
          <div class="meas-actions"><span class="muted" style="font-size:13px">إذا خرج Rv عن مدى الصندوق غيّر نسبة R3/R2.</span><button type="button" class="btn primary" id="wb-rec">سجّل نقطة الاتزان</button></div>
        </div>
      </div></div>
      <aside class="side"><div id="wb-guide"></div></aside>
    </div>
    <div class="data-row">
      <div class="card"><div class="card-head"><h3>نتائج الجزء أ</h3><div class="actions"><button type="button" class="btn small" id="wb-copy">نسخ</button><button type="button" class="btn small ghost" id="wb-clear">مسح</button></div></div><div class="table-wrap" id="wb-table"></div></div>
      <div class="card"><div class="card-head"><h3>Vo مقابل Rv</h3></div><div id="wb-plot"></div></div>
    </div>`;
    const nul = L.AnalogMeter(L.$('#wb-null', root), { centerZero: true, unit: 'mV', brand: 'NULL', aria: 'مؤشر كاشف الصفر',
      scales: [{ ticks: [-100, -50, -20, 0, 20, 50, 100].map((v) => ({ p: Math.tanh(v / 60), major: true, label: (v > 0 ? '+' : '') + v })).concat([-200, -10, -5, -2, 2, 5, 10, -30, 30, -70, 70, 200].map((v) => ({ p: Math.tanh(v / 60), major: false }))), name: 'mV' }] });
    const dmm = L.LCD(L.$('#wb-dmm', root), { digits: 6, unit: 'mV', tag: 'DC' });
    const dec = L.Decade(L.$('#wb-dec', root), { id: 'wb-dv', value: st.rv, onInput: (v) => { st.rv = v; update(); } });
    const pwr = L.Power(L.$('#wb-pwr', root), { label: 'المصدر 5 V', value: true, onChange: (v) => { st.on = v; update(); } });
    L.$('#wb-unk', root).addEventListener('change', (e) => { st.unk = +e.target.value; update(); });
    L.$('#wb-r2', root).addEventListener('change', (e) => { st.r2 = +e.target.value; st.ratioChanged = true; update(); });
    L.$('#wb-r3', root).addEventListener('change', (e) => { st.r3 = +e.target.value; st.ratioChanged = true; update(); });
    const plot = L.Plot(L.$('#wb-plot', root), { xLabel: 'Rv (Ω)', yLabel: 'Vo (V)', x: [0, 9999], height: 250, tipX: (v) => L.si(v, 'Ω'), tipY: (v) => L.fx(v * 1000, 1) + ' mV', markLabel: 'Rv الحالية' });
    const guide = L.Guide(L.$('#wb-guide', root), [
      { t: 'صِل دائرة القنطرة كما في المخطط، وشغّل المصدر 5 V.', check: (s) => s.on },
      { t: 'استخدم مقاومات قياسية للذراعين R2 و R3 (اختر النسبة من القوائم).', check: (s) => s.ratioChanged || s.everBal },
      { t: 'ضع المقاومة المجهولة Ru في مكانها (اختر إحدى المقاومات Rx).', check: (s) => s.unk !== 2 || s.everBal },
      { t: 'غيّر Rv من صندوق المقاومات حتى يقرأ الفولتميتر صفراً (نقطة الاتزان).', check: (s) => s.everBal },
      { t: 'سجّل Rv عند الاتزان واحسب Ru = R3·Rv/R2، وكرّر لمقاومتين مجهولتين على الأقل.', check: () => new Set(data.bal.map((r) => r.id)).size >= 2 },
    ]);
    L.$('#wb-rec', root).addEventListener('click', () => {
      const k = compute();
      if (!st.on) return L.toast('شغّل المصدر أولاً', 'warn');
      if (Math.abs(k.vo) > 0.002) return L.toast('القنطرة غير متزنة بعد: اجعل Vo أقرب ما يمكن إلى الصفر (أقل من 2 mV)', 'warn');
      const u = UNK[st.unk];
      data.bal.push({ id: u.id, nom: u.nom, r2: st.r2, r3: st.r3, rv: st.rv, vo: k.vo, ru: k.ruCalc });
      save(); renderTable(); update();
      L.toast(`سُجّل الاتزان: Ru = ${L.si(k.ruCalc, 'Ω')}`);
    });
    L.$('#wb-copy', root).addEventListener('click', () => L.copyTable(L.$('#wb-table table', root)));
    L.$('#wb-clear', root).addEventListener('click', () => { data.bal = []; save(); renderTable(); update(); });

    function compute() {
      const Ru = UNK[st.unk].val, V = st.on ? st.V : 0;
      const vd = (V * Ru) / (Ru + st.r3), vb = (V * st.rv) / (st.rv + st.r2);
      return { Ru, vd, vb, vo: vd - vb, ruCalc: (st.r3 * st.rv) / st.r2 };
    }
    function renderTable() {
      const rows = data.bal.map((r, i) => [i + 1, r.id, n(L.si(r.r2, 'Ω')), n(L.si(r.r3, 'Ω')), n(r.rv + ' Ω'), n((r.vo * 1000).toFixed(2) + ' mV'), `<b>${n(L.si(r.ru, 'Ω', 4))}</b>`, n(L.si(r.nom, 'Ω')), n((((r.ru - r.nom) / r.nom) * 100).toFixed(2) + '%')]);
      L.$('#wb-table', root).innerHTML = L.table(['#', 'المجهولة', 'R2', 'R3', 'Rv', 'Vo', 'Ru المحسوبة', 'الاسمية (الألوان)', 'الفرق'], rows.length ? rows : [['—', 'لا توجد قراءات بعد', '', '', '', '', '', '', '']]);
    }
    function update() {
      const k = compute();
      const balanced = st.on && Math.abs(k.vo) < 0.0005;
      if (balanced) st.everBal = true;
      L.$('#wb-sch', root).innerHTML = bridge('bal', { V: '5 V', rv: st.rv + ' Ω', r2: L.si(st.r2, 'Ω'), r3: L.si(st.r3, 'Ω'), ru: UNK[st.unk].id });
      nul.set(Math.tanh((k.vo * 1000) / 60));
      const mv = k.vo * 1000;
      if (Math.abs(mv) < 1000) { dmm.unit('mV'); dmm.set(L.lcdText(mv, 2, 5)); } else { dmm.unit('V'); dmm.set(L.lcdText(k.vo, 3, 5)); }
      L.setText('wb-vd', L.fx(k.vd, 4) + ' V', root);
      L.setText('wb-vb', L.fx(k.vb, 4) + ' V', root);
      L.setText('wb-vo', (Math.abs(mv) < 1000 ? L.fx(mv, 2) + ' mV' : L.fx(k.vo, 3) + ' V'), root);
      L.setText('wb-ru', L.si(k.ruCalc, 'Ω', 4), root);
      const stEl = L.$('#wb-status', root);
      if (!st.on) { stEl.className = 'status'; stEl.textContent = 'المصدر مطفأ'; }
      else if (balanced) { stEl.className = 'status ok'; stEl.textContent = 'متزنة: لا تيار في الكاشف'; }
      else if (Math.abs(k.vo) < 0.002) { stEl.className = 'status warn'; stEl.textContent = 'قريبة جداً من الاتزان'; }
      else { stEl.className = 'status bad'; stEl.textContent = k.vo > 0 ? 'غير متزنة: VD > VB (زِد Rv)' : 'غير متزنة: VD < VB (أنقص Rv)'; }
      L.$('#wb-res', root).innerHTML = `<div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-top:6px">${resistorSVG(UNK[st.unk].bands)}<span class="inst-foot" style="text-align:start">${UNK[st.unk].id}: اقرأ قيمتها الاسمية من شفرة الألوان وقارنها بنتيجة القنطرة.</span></div>`;
      L.$('#wb-live', root).innerHTML = `${L.ieq(`R<sub>u</sub> = ${L.frac('R<sub>3</sub> × R<sub>v</sub>', 'R<sub>2</sub>')} = ${L.frac(`${st.r3} × ${st.rv}`, st.r2)} = ${L.si(k.ruCalc, 'Ω', 4)}`)} ${balanced ? '<span class="status ok">القيمة صالحة عند الاتزان</span>' : '<span class="status">تصبح صحيحة فقط عند الاتزان</span>'}`;
      const sp = st.on ? 1 : 0;
      L.setFlow(root, 'left', sp, 0.8); L.setFlow(root, 'right', sp, 0.8); L.setFlow(root, 'sup', sp, 1.2);
      const pts = [];
      for (let i = 0; i <= 160; i++) { const rv = (9999 * i) / 160; pts.push([rv, (st.on ? st.V : 0) * (k.Ru / (k.Ru + st.r3) - rv / (rv + st.r2))]); }
      plot.set([{ name: 'Vo عند تغيير Rv', color: 'var(--s1)', points: pts, hover: false }], [{ x: st.rv, y: k.vo, name: 'Rv = ' + st.rv + ' Ω' }]);
      guide.update(st);
    }
    renderTable(); update();
    pwr.set(true, false);
    void dec;
  }

  /* ---------- Part B: unbalanced bridge ---------- */
  function mountUnbalanced(root) {
    const st = { unk: 2, r1: 1000, r2: 1000, r3: 1000, r4: 1000, V: 5, on: true, changed: false };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="card sch c4"><div class="sch-title"><b>قنطرة غير متزنة (Deflection type)</b><span>Rx = Ru + R4</span></div><div id="wu-sch"></div></div>
        <div class="inst c2">${L.ihead('الفولتميتر بين D و B', 'DC voltmeter · Vo')}<div id="wu-null"></div><div id="wu-dmm"></div></div>
        <div class="inst c6">${L.ihead('قيم المقاومات المعلومة', 'R1, R2, R3, R4 known · Ru unknown')}
          <div class="inst-row" style="align-items:flex-end">
            <label class="field"><span>Ru المجهولة</span><select id="wu-unk">${unkOptions(st.unk)}</select></label>
            ${['r1', 'r2', 'r3', 'r4'].map((k) => `<label class="field"><span>${k.toUpperCase()}</span><select id="wu-${k}">${valOptions(EVALS, st[k])}</select></label>`).join('')}
            <div id="wu-pwr"></div>
          </div>
        </div>
        <div class="card c6">
          <div class="card-head"><h3>الحساب من قراءة الفولتميتر</h3><span class="status" id="wu-status">—</span></div>
          <div class="calc-live" id="wu-live" style="margin-top:0"></div>
          <div class="meas-actions"><span class="muted" style="font-size:13px">يستخدم الحساب قراءة الفولتميتر المقرّبة لأقرب 1 mV كما يفعل الطالب.</span><button type="button" class="btn primary" id="wu-rec">سجّل القراءة</button></div>
        </div>
      </div></div>
      <aside class="side"><div id="wu-guide"></div></aside>
    </div>
    <div class="data-row">
      <div class="card"><div class="card-head"><h3>نتائج الجزء ب</h3><div class="actions"><button type="button" class="btn small" id="wu-copy">نسخ</button><button type="button" class="btn small ghost" id="wu-clear">مسح</button></div></div><div class="table-wrap" id="wu-table"></div></div>
      <div class="card"><div class="card-head"><h3>Vo مقابل Ru (لاحظ اللاخطية)</h3></div><div id="wu-plot"></div></div>
    </div>`;
    const nul = L.AnalogMeter(L.$('#wu-null', root), { centerZero: true, unit: 'V', brand: 'DC V ±2.5', aria: 'مؤشر الفولتميتر',
      scales: [{ ticks: L.linTicks(-2.5, 2.5, 1, 0.25, (v) => (v > 0 ? '+' : '') + L.sig(v, 2)).map((t) => ({ ...t, p: t.p * 2 - 1 })), name: 'V' }] });
    const dmm = L.LCD(L.$('#wu-dmm', root), { digits: 6, unit: 'V', tag: 'DC' });
    L.Power(L.$('#wu-pwr', root), { label: 'المصدر 5 V', value: true, onChange: (v) => { st.on = v; update(); } });
    L.$('#wu-unk', root).addEventListener('change', (e) => { st.unk = +e.target.value; st.changed = true; update(); });
    ['r1', 'r2', 'r3', 'r4'].forEach((k) => L.$('#wu-' + k, root).addEventListener('change', (e) => { st[k] = +e.target.value; st.changed = true; update(); }));
    const plot = L.Plot(L.$('#wu-plot', root), { xLabel: 'Ru (Ω) — مقياس لوغاريتمي', yLabel: 'Vo (V)', xLog: true, x: [10, 100000], y: [-2.5, 2.5], height: 250, tipX: (v) => L.si(v, 'Ω'), tipY: (v) => L.fx(v, 3) + ' V', markLabel: 'Ru الحالية' });
    const guide = L.Guide(L.$('#wu-guide', root), [
      { t: 'أبقِ توصيلات الدائرة كما في الجزء أ مع إضافة R4 على التوالي مع Ru.', check: (s) => s.on },
      { t: 'اختر قيم R1 و R2 و R3 و R4 وضع المقاومة المجهولة في مكانها.', check: (s) => s.changed },
      { t: 'سجّل انحراف (قراءة) الفولتميتر Vo.', check: () => data.unbal.length >= 1 },
      { t: 'احسب Rx ثم Ru من المعادلة، وكرّر لقيم أخرى للتحقق.', check: () => data.unbal.length >= 2 },
    ]);
    L.$('#wu-rec', root).addEventListener('click', () => {
      const k = compute();
      if (!st.on) return L.toast('شغّل المصدر أولاً', 'warn');
      if (!isFinite(k.ru) || k.ru <= 0) return L.toast('لا يمكن حساب Ru بهذه القيم: غيّر R4 أو R3', 'warn');
      const u = UNK[st.unk];
      data.unbal.push({ id: u.id, nom: u.nom, r1: st.r1, r2: st.r2, r3: st.r3, r4: st.r4, vo: k.voRead, rx: k.rx, ru: k.ru });
      save(); renderTable(); update();
      L.toast(`سُجّلت القراءة: Ru = ${L.si(k.ru, 'Ω')}`);
    });
    L.$('#wu-copy', root).addEventListener('click', () => L.copyTable(L.$('#wu-table table', root)));
    L.$('#wu-clear', root).addEventListener('click', () => { data.unbal = []; save(); renderTable(); update(); });
    function compute() {
      const Ru = UNK[st.unk].val, Rx = Ru + st.r4, V = st.on ? st.V : 0;
      const vo = V * (Rx / (Rx + st.r3) - st.r1 / (st.r1 + st.r2));
      const voRead = Math.round(vo * 1000) / 1000;
      const kk = voRead / st.V + st.r1 / (st.r1 + st.r2);
      const rx = (st.r3 * kk) / (1 - kk);
      return { Ru, vo, voRead, kk, rx, ru: rx - st.r4 };
    }
    function renderTable() {
      const rows = data.unbal.map((r, i) => [i + 1, r.id, n(`${L.si(r.r1, 'Ω')} / ${L.si(r.r2, 'Ω')} / ${L.si(r.r3, 'Ω')} / ${L.si(r.r4, 'Ω')}`), n(r.vo.toFixed(3) + ' V'), n(L.si(r.rx, 'Ω', 4)), `<b>${n(L.si(r.ru, 'Ω', 4))}</b>`, n(L.si(r.nom, 'Ω')), n((((r.ru - r.nom) / r.nom) * 100).toFixed(2) + '%')]);
      L.$('#wu-table', root).innerHTML = L.table(['#', 'المجهولة', 'R1 / R2 / R3 / R4', 'Vo', 'Rx', 'Ru = Rx − R4', 'الاسمية', 'الفرق'], rows.length ? rows : [['—', 'لا توجد قراءات بعد', '', '', '', '', '', '']]);
    }
    function update() {
      const k = compute();
      L.$('#wu-sch', root).innerHTML = bridge('unbal', { V: '5 V', r1: L.si(st.r1, 'Ω'), r2: L.si(st.r2, 'Ω'), r3: L.si(st.r3, 'Ω'), r4: L.si(st.r4, 'Ω') });
      nul.set(k.vo / 2.5);
      dmm.set(L.lcdText(k.voRead, 3, 5));
      const stEl = L.$('#wu-status', root);
      if (!st.on) { stEl.className = 'status'; stEl.textContent = 'المصدر مطفأ'; }
      else if (Math.abs(k.vo) < 0.0005) { stEl.className = 'status ok'; stEl.textContent = 'القنطرة متزنة تقريباً'; }
      else { stEl.className = 'status warn'; stEl.textContent = `غير متزنة: Vo = ${k.voRead.toFixed(3)} V`; }
      const f = (x) => x.toFixed(4);
      L.$('#wu-live', root).innerHTML = st.on ? `
        <div>المعادلة: ${L.ieq(`V<sub>o</sub> = V (${L.frac('R<sub>x</sub>', 'R<sub>x</sub> + R<sub>3</sub>')} − ${L.frac('R<sub>1</sub>', 'R<sub>1</sub> + R<sub>2</sub>')})`)}</div>
        <div>١) ${L.ieq(`k = ${L.frac('V<sub>o</sub>', 'V')} + ${L.frac('R<sub>1</sub>', 'R<sub>1</sub>+R<sub>2</sub>')} = ${L.frac(k.voRead.toFixed(3), '5')} + ${L.frac(st.r1, st.r1 + st.r2)} = ${f(k.kk)}`)}</div>
        <div>٢) ${L.ieq(`R<sub>x</sub> = ${L.frac('R<sub>3</sub> · k', '1 − k')} = ${L.frac(`${st.r3} × ${f(k.kk)}`, f(1 - k.kk))} = ${L.si(k.rx, 'Ω', 4)}`)}</div>
        <div>٣) ${L.ieq(`R<sub>u</sub> = R<sub>x</sub> − R<sub>4</sub> = ${L.si(k.rx, 'Ω', 4)} − ${L.si(st.r4, 'Ω')} = <b>${L.si(k.ru, 'Ω', 4)}</b>`)}</div>` : 'شغّل المصدر لترى الحساب.';
      const sp = st.on ? 1 : 0;
      L.setFlow(root, 'left', sp, 0.8); L.setFlow(root, 'right', sp, 0.8); L.setFlow(root, 'sup', sp, 1.2);
      const pts = [];
      for (let i = 0; i <= 120; i++) { const ru = Math.pow(10, 1 + (4 * i) / 120), rx = ru + st.r4; pts.push([ru, (st.on ? st.V : 0) * (rx / (rx + st.r3) - st.r1 / (st.r1 + st.r2))]); }
      plot.set([{ name: 'Vo عند تغيّر Ru', color: 'var(--s2)', points: pts, hover: false }], [{ x: k.Ru, y: k.vo, name: UNK[st.unk].id }]);
      guide.update(st);
    }
    renderTable(); update();
  }

  /* ---------- colour code tool + quiz ---------- */
  function mountColor(root) {
    const st = { five: false, b4: ['yellow', 'violet', 'red', 'gold'], b5: ['brown', 'black', 'black', 'red', 'brown'], quiz: null, score: 0, tries: 0 };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="card c6">
          <div class="card-head"><h3>قارئ شفرة الألوان</h3><div id="cc-n"></div></div>
          <div id="cc-draw"></div>
          <div class="cc-grid" id="cc-sel" style="margin-top:10px"></div>
          <div class="readouts" style="margin-top:12px">${L.ro('cc-v', 'القيمة الاسمية', 'hl')}${L.ro('cc-t', 'السماحية')}${L.ro('cc-min', 'أقل قيمة مسموحة')}${L.ro('cc-max', 'أعلى قيمة مسموحة')}</div>
          <div class="calc-live" id="cc-f"></div>
        </div>
        <div class="card c6">
          <div class="card-head"><h3>اختبر نفسك</h3><span class="status" id="cc-score">0 / 0</span></div>
          <div id="cc-q"></div>
          <div class="inst-row" style="justify-content:flex-start;margin-top:10px">
            <label class="field"><span>القيمة</span><input id="cc-ans" type="number" step="any" inputmode="decimal" style="width:120px"></label>
            <label class="field"><span>الوحدة</span><select id="cc-unit"><option value="1">Ω</option><option value="1000" selected>kΩ</option><option value="1000000">MΩ</option></select></label>
            <button type="button" class="btn primary" id="cc-check" style="align-self:flex-end">تحقق</button>
            <button type="button" class="btn" id="cc-next" style="align-self:flex-end">مقاومة أخرى</button>
          </div>
          <p id="cc-fb" class="muted" style="margin-top:8px" aria-live="polite"></p>
        </div>
      </div></div>
      <aside class="side"><div id="cc-guide"></div></aside>
    </div>`;
    L.Seg(L.$('#cc-n', root), { options: [{ v: 4, label: '4 حلقات' }, { v: 5, label: '5 حلقات' }], value: 4, onChange: (v) => { st.five = +v === 5; build(); } });
    const guide = L.Guide(L.$('#cc-guide', root), [
      { t: 'أمسك المقاومة بحيث تكون حلقة السماحية (الذهبية أو الفضية والمفصولة قليلاً) على اليمين.', check: () => true },
      { t: 'الحلقة الأولى الرقم الأول والثانية الرقم الثاني (والثالثة رقم ثالث في المقاومات الدقيقة ذات 5 حلقات).', check: (s) => s.touched },
      { t: 'حلقة المضاعِف تعطي عدد الأصفار المضافة، والأخيرة السماحية.', check: (s) => s.touched },
      { t: 'اقرأ ثلاث مقاومات صحيحة في «اختبر نفسك».', check: (s) => s.score >= 3 },
    ]);
    const bands = () => (st.five ? st.b5 : st.b4);
    function build() {
      const b = bands(), nd = st.five ? 3 : 2;
      const roles = [...Array(nd)].map((_, i) => `الحلقة ${i + 1}: رقم`).concat(['المضاعِف', 'السماحية']);
      L.$('#cc-sel', root).innerHTML = b.map((k, i) => {
        const opts = CC.filter((c) => (i < nd ? c.d != null : i === nd ? c.m != null : c.t != null));
        return `<label class="field"><span>${roles[i]}</span><select data-i="${i}">${opts.map((c) => `<option value="${c.k}"${c.k === k ? ' selected' : ''}>${c.ar} · ${c.en}</option>`).join('')}</select></label>`;
      }).join('');
      paint();
    }
    L.$('#cc-sel', root).addEventListener('change', (e) => { const i = +e.target.dataset.i; bands()[i] = e.target.value; st.touched = true; paint(); });
    function paint() {
      const b = bands(), r = ccValue(b);
      L.$('#cc-draw', root).innerHTML = resistorSVG(b, { labels: true });
      L.setText('cc-v', L.si(r.v, 'Ω', 4), root);
      L.setText('cc-t', '± ' + r.tol + ' %', root);
      L.setText('cc-min', L.si(r.v * (1 - r.tol / 100), 'Ω', 4), root);
      L.setText('cc-max', L.si(r.v * (1 + r.tol / 100), 'Ω', 4), root);
      const nd = st.five ? 3 : 2;
      L.$('#cc-f', root).innerHTML = `R = (${b.slice(0, nd).map((k) => C(k).d).join(' ')}) × ${C(b[nd]).m} ± ${r.tol}% = <b class="num">${L.si(r.v, 'Ω', 4)} ± ${r.tol}%</b>`;
      guide.update(st);
    }
    const rnd = () => {
      const digit = () => CC[1 + Math.floor(Math.random() * 9)].k;
      const mult = ['black', 'brown', 'red', 'orange', 'yellow', 'gold'][Math.floor(Math.random() * 6)];
      st.quiz = [digit(), CC[Math.floor(Math.random() * 10)].k, mult, Math.random() < 0.75 ? 'gold' : 'silver'];
      L.$('#cc-q', root).innerHTML = resistorSVG(st.quiz);
      L.$('#cc-fb', root).textContent = 'ما قيمة هذه المقاومة؟';
      L.$('#cc-ans', root).value = '';
    };
    L.$('#cc-next', root).addEventListener('click', rnd);
    L.$('#cc-check', root).addEventListener('click', () => {
      const v = parseFloat(L.$('#cc-ans', root).value) * +L.$('#cc-unit', root).value;
      if (!isFinite(v)) return L.toast('أدخل قيمة أولاً', 'warn');
      const r = ccValue(st.quiz);
      st.tries++;
      const ok = Math.abs(v - r.v) <= r.v * 1e-6 + 1e-9;
      if (ok) st.score++;
      L.$('#cc-fb', root).innerHTML = ok ? `<span class="status ok">صحيح: ${L.si(r.v, 'Ω', 4)} ± ${r.tol}%</span>` : `<span class="status bad">الجواب ${L.si(r.v, 'Ω', 4)} ± ${r.tol}%</span> (${st.quiz.map((k) => C(k).ar).join(' – ')})`;
      L.setText('cc-score', `${st.score} / ${st.tries}`, root);
      guide.update(st);
    });
    build(); rnd();
  }

  /* ---------- ammeter–voltmeter method ---------- */
  function mountVI(root) {
    const RA = 1, RV = 100e3, VS = 10;
    const st = { rx: 100, conn: 'a', seenA: false, seenB: false, low: false, high: false };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="card sch c4"><div class="sch-title"><b id="vi-title">—</b><span>Vs = 10 V · RA = 1 Ω · RV = 100 kΩ</span></div><div id="vi-sch"></div></div>
        <div class="inst c2">${L.ihead('الأميتر', 'Ammeter · mA')}<div id="vi-a"></div>${L.ihead('الفولتميتر', 'Voltmeter · V')}<div id="vi-v"></div></div>
        <div class="inst c3">${L.ihead('المقاومة المقاسة Rx', 'Unknown resistor (log scale)')}<div id="vi-rx"></div></div>
        <div class="inst c3">${L.ihead('طريقة التوصيل', 'Connection')}<div style="display:grid;justify-items:center;gap:10px"><div id="vi-conn"></div><div class="inst-foot">(a) الفولتميتر على Rx فقط: للمقاومات الصغيرة<br>(b) الفولتميتر على الأميتر + Rx: للمقاومات الكبيرة</div></div></div>
        <div class="card c6"><div class="readouts">${L.ro('vi-rm', 'Rx المقاسة = V / I', 'hl')}${L.ro('vi-rt', 'Rx الحقيقية')}${L.ro('vi-e', 'الخطأ النسبي')}${L.ro('vi-best', 'التوصيل الأنسب')}</div><div class="calc-live" id="vi-live"></div></div>
      </div></div>
      <aside class="side"><div id="vi-guide"></div></aside>
    </div>
    <div class="data-row one"><div class="card"><div class="card-head"><h3>مقدار الخطأ مقابل قيمة Rx للتوصيلين</h3></div><div id="vi-plot"></div></div></div>`;
    const am = L.LCD(L.$('#vi-a', root), { digits: 5, unit: 'mA', tag: 'DC' });
    const vm = L.LCD(L.$('#vi-v', root), { digits: 5, unit: 'V', tag: 'DC' });
    L.Control(L.$('#vi-rx', root), { id: 'vi-rxc', label: 'Rx', unit: 'Ω', min: 1, max: 1e6, value: st.rx, log: true, size: 60, onInput: (v) => { st.rx = +v.toPrecision(3); update(); } });
    L.Seg(L.$('#vi-conn', root), { options: [{ v: 'a', label: '(a) على Rx فقط' }, { v: 'b', label: '(b) على A + Rx' }], value: 'a', onChange: (v) => { st.conn = v; update(); } });
    const plot = L.Plot(L.$('#vi-plot', root), { xLabel: 'Rx (Ω) — مقياس لوغاريتمي', yLabel: 'مقدار الخطأ %', xLog: true, x: [1, 1e6], y: [0, 30], height: 260, tipX: (v) => L.si(v, 'Ω', 3), tipY: (v) => L.fx(v, 2) + ' %', markLabel: 'Rx الحالية' });
    const guide = L.Guide(L.$('#vi-guide', root), [
      { t: 'مرّر تياراً مستمراً في Rx واقرأ الأميتر (I) والفولتميتر (V)، ثم احسب Rx = V/I.', check: () => true },
      { t: 'قِس مقاومة صغيرة (أقل من 100 Ω) بالتوصيلين وقارن الخطأ.', check: (s) => s.low },
      { t: 'قِس مقاومة كبيرة (أكبر من 10 kΩ) بالتوصيلين وقارن الخطأ.', check: (s) => s.high },
      { t: 'استنتج من الرسم القيمة الحدّية √(RA·RV) ≈ 316 Ω التي يتساوى عندها خطأ التوصيلين.', check: (s) => s.seenA && s.seenB && s.low && s.high },
    ]);
    const meas = (rx, conn) => {
      if (conn === 'a') { const rp = (rx * RV) / (rx + RV), I = VS / (RA + rp); return { I, V: I * rp, rm: rp }; }
      const I = VS / (RA + rx); return { I, V: VS, rm: rx + RA };
    };
    function schem(conn) {
      let s = '';
      s += S.bat(40, 70, 40, 140, { label: 'Vs', off: -14 });
      s += S.wire([[40, 70], [40, 40], [110, 40]]) + S.wire([[150, 40], [220, 40]]) + S.wire([[40, 140], [40, 170], [320, 170]]);
      s += S.res(220, 40, 220, 170, { label: 'Rx', off: 14 });
      s += S.meter(130, 40, 'A');
      if (conn === 'a') {
        s += S.wire([[220, 40], [320, 40], [320, 87]]) + S.wire([[320, 121], [320, 170]]) + S.meter(320, 104, 'V') + S.dot(220, 40) + S.dot(220, 170);
      } else {
        s += S.wire([[80, 40], [80, 14], [320, 14], [320, 87]]) + S.wire([[320, 121], [320, 170]]) + S.meter(320, 104, 'V') + S.dot(80, 40) + S.dot(220, 170);
      }
      s += S.flow([[40, 70], [40, 40], [220, 40], [220, 170], [40, 170], [40, 140]], 'vi');
      return S.svg(380, 196, s, conn === 'a' ? 'الفولتميتر على Rx فقط' : 'الفولتميتر على الأميتر و Rx');
    }
    function update() {
      const k = meas(st.rx, st.conn), e = ((k.rm - st.rx) / st.rx) * 100;
      if (st.conn === 'a') st.seenA = true; else st.seenB = true;
      if (st.rx < 100) st.low = st.low || (st.seenA && st.seenB);
      if (st.rx > 1e4) st.high = st.high || (st.seenA && st.seenB);
      L.$('#vi-title', root).textContent = st.conn === 'a' ? '(a) الفولتميتر على Rx فقط' : '(b) الفولتميتر على A + Rx';
      L.$('#vi-sch', root).innerHTML = schem(st.conn);
      L.setFlow(root, 'vi', true, 0.3 + Math.min(1.5, (k.I / 0.01) ** 0.4));
      am.set(L.lcdText(k.I * 1000, k.I * 1000 >= 100 ? 1 : 3, 5));
      vm.set(L.lcdText(k.V, 3, 5));
      L.setText('vi-rm', L.si(k.rm, 'Ω', 4), root);
      L.setText('vi-rt', L.si(st.rx, 'Ω', 4), root);
      L.setText('vi-e', (e >= 0 ? '+' : '') + L.fx(e, 2) + ' %', root);
      const best = st.rx < Math.sqrt(RA * RV) ? 'a' : 'b';
      L.setText('vi-best', best === 'a' ? '(a) على Rx فقط' : '(b) على A + Rx', root);
      L.$('#vi-e-box', root).className = 'ro ' + (Math.abs(e) < 1 ? 'good' : Math.abs(e) < 5 ? 'warn' : 'bad');
      L.$('#vi-live', root).innerHTML = st.conn === 'a'
        ? `الفولتميتر يسحب تياراً، فالأميتر يقرأ تيار Rx + تيار الفولتميتر: ${L.ieq(`R<sub>m</sub> = R<sub>x</sub> ∥ R<sub>V</sub> = ${L.frac('R<sub>x</sub> R<sub>V</sub>', 'R<sub>x</sub> + R<sub>V</sub>')}`)} ← القيمة المقاسة <b>أصغر</b> من الحقيقية.`
        : `الفولتميتر يقرأ جهد Rx + هبوط الجهد على الأميتر: ${L.ieq('R<sub>m</sub> = R<sub>x</sub> + R<sub>A</sub>')} ← القيمة المقاسة <b>أكبر</b> من الحقيقية.`;
      const ea = [], eb = [];
      for (let i = 0; i <= 120; i++) { const r = Math.pow(10, (6 * i) / 120); ea.push([r, (100 * r) / (r + RV)]); eb.push([r, (100 * RA) / r]); }
      plot.set([
        { name: '(a) الفولتميتر على Rx فقط', color: 'var(--s1)', points: ea },
        { name: '(b) الفولتميتر على A + Rx', color: 'var(--s2)', points: eb, dash: true },
      ], [{ x: st.rx, y: Math.abs(e), name: 'Rx = ' + L.si(st.rx, 'Ω', 3) }]);
      guide.update(st);
    }
    update();
  }

  /* ---------- ohmmeter: analog series type + DMM ---------- */
  function mountOhm(root) {
    const MULTS = [1, 10, 100, 1000], RC = 15, E = 1.46;
    const st = { type: 'analog', mult: 100, leads: 'open', z: 0.93, unk: 2, drange: 20000, zeroed: false, readAnalog: false, readDmm: false, overSeen: false };
    root.innerHTML = `
    <div class="sim-modes"><div id="om-type"></div></div>
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="inst c3" id="om-an">${L.ihead('أوميتر تناظري متوالي', 'Series-type analog ohmmeter')}<div id="om-meter"></div>
          <div class="inst-row"><div id="om-range"></div></div>
          <div class="inst-row"><div id="om-zero"></div></div>
        </div>
        <div class="inst c3" id="om-dg" hidden>${L.ihead('ملتيميتر رقمي (Ω)', 'Digital multimeter · COM / VΩ')}<div id="om-lcd"></div><div class="inst-row"><div id="om-drange"></div></div><div class="inst-foot">إذا ظهر «1» في يسار الشاشة فالقيمة أكبر من المدى: اختر مدى أعلى.</div></div>
        <div class="card c3">
          <div class="card-head"><h3>الطرفان (Test leads)</h3></div>
          <div id="om-leads"></div>
          <label class="field" style="margin-top:10px"><span>المقاومة المقاسة</span><select id="om-unk">${unkOptions(st.unk)}</select></label>
          <div id="om-res" style="margin-top:8px"></div>
          <div class="readouts" style="margin-top:10px">${L.ro('om-read', 'القراءة', 'hl')}${L.ro('om-how', 'طريقة الحساب')}</div>
        </div>
      </div></div>
      <aside class="side"><div id="om-guide"></div></aside>
    </div>`;
    const meter = L.AnalogMeter(L.$('#om-meter', root), { unit: 'Ω', brand: 'OHMS · CENTER 15', aria: 'مؤشر الأوميتر',
      scales: [{ ticks: [0, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 200, 500].map((r) => ({ p: RC / (RC + r), major: true, label: String(r) })).concat([{ p: 0, major: true, label: '∞' }], [4, 6, 7, 8, 9, 12, 25, 40, 70, 150, 300].map((r) => ({ p: RC / (RC + r), major: false }))), name: 'Ω' }] });
    const lcd = L.LCD(L.$('#om-lcd', root), { digits: 4, unit: 'kΩ', tag: 'Ω' });
    L.Seg(L.$('#om-type', root), { options: [{ v: 'analog', label: 'أوميتر تناظري' }, { v: 'digital', label: 'ملتيميتر رقمي DMM' }], value: 'analog', big: true, onChange: (v) => { st.type = v; L.$('#om-an', root).hidden = v !== 'analog'; L.$('#om-dg', root).hidden = v !== 'digital'; update(); } });
    L.Seg(L.$('#om-range', root), { options: MULTS.map((m) => ({ v: m, label: '×' + (m >= 1000 ? '1k' : m) })), value: st.mult, aria: 'مدى الأوميتر', onChange: (v) => { st.mult = +v; st.zeroed = false; update(); } });
    L.Control(L.$('#om-zero', root), { id: 'om-z', label: 'ضبط الصفر (0 Ω ADJ)', unit: '', min: 0.8, max: 1.25, value: st.z, step: 0.001, decimals: 3, size: 50, steps: [-0.005, 0.005, -0.001, 0.001], onInput: (v) => { st.z = v; update(); } });
    L.Seg(L.$('#om-drange', root), { options: [200, 2000, 20000, 200000, 2000000].map((r) => ({ v: r, label: r >= 1e6 ? '2M' : r >= 1000 ? r / 1000 + 'k' : String(r) })), value: st.drange, aria: 'مدى الملتيميتر', onChange: (v) => { st.drange = +v; update(); } });
    L.Seg(L.$('#om-leads', root), { options: [{ v: 'open', label: 'مفتوحان' }, { v: 'short', label: 'مقصوران' }, { v: 'rx', label: 'على المقاومة' }], value: 'open', onChange: (v) => { st.leads = v; update(); } });
    L.$('#om-unk', root).addEventListener('change', (e) => { st.unk = +e.target.value; update(); });
    const guide = L.Guide(L.$('#om-guide', root), [
      { t: '<b>تناظري:</b> اختر مدى مناسباً (×1، ×10، ×100، ×1k).', check: (s) => s.mult !== 100 || s.zeroed },
      { t: 'قصّر الطرفين وأدِر مقبض ضبط الصفر حتى يشير المؤشر إلى 0 Ω تماماً.', check: (s) => s.zeroed },
      { t: 'افصل الطرفين وصِلهما على طرفي المقاومة المجهولة.', check: (s) => s.zeroed && s.leads === 'rx' && s.type === 'analog' && (s.readAnalog = true) },
      { t: 'اقرأ التدريج واضربه في المدى. مثال: 22 على ×100 = 2.2 kΩ.', check: (s) => s.readAnalog },
      { t: '<b>رقمي:</b> الطرف الأسود في COM والأحمر في VΩ، والمفتاح على Ω بمدى أعلى من القيمة المتوقعة.', check: (s) => s.type === 'digital' },
      { t: 'المس طرفي المقاومة واقرأ الشاشة؛ إذا ظهر «1» فاختر مدى أعلى.', check: (s) => s.type === 'digital' && s.leads === 'rx' && s.overSeen && (s.readDmm = true) },
    ]);
    function update() {
      const Rx = UNK[st.unk].val;
      const R = st.leads === 'open' ? Infinity : st.leads === 'short' ? 0 : Rx;
      const rc = RC * st.mult;
      const p = R === Infinity ? 0 : (E / 1.5) * st.z * (rc / (rc + R));
      if (st.type === 'analog' && st.leads === 'short' && Math.abs((E / 1.5) * st.z - 1) < 0.004) st.zeroed = true;
      meter.set(p);
      L.$('#om-res', root).innerHTML = resistorSVG(UNK[st.unk].bands);
      if (st.type === 'analog') {
        let read = '∞', how = 'لا تيار: المؤشر عند ∞';
        if (p > 0.004) {
          const scale = RC * (1 / Math.min(p, 1) - 1);
          const sc = scale < 0.05 ? 0 : +scale.toPrecision(2);
          read = L.si(sc * st.mult, 'Ω', 3);
          how = `${L.sig(sc, 2)} × ${st.mult >= 1000 ? '1k' : st.mult}`;
          if (p > 1.0) { read = '< 0 Ω'; how = 'المؤشر تجاوز الصفر: أنقص ضبط الصفر'; }
        }
        L.setText('om-read', read, root);
        L.setText('om-how', how, root);
      } else {
        const dr = st.drange;
        const unit = dr >= 1e6 ? 'MΩ' : dr >= 2000 ? 'kΩ' : 'Ω';
        const div = dr >= 1e6 ? 1e6 : dr >= 2000 ? 1000 : 1;
        const dec = { 200: 1, 2000: 3, 20000: 2, 200000: 1, 2000000: 3 }[dr];
        lcd.unit(unit);
        if (R === Infinity || R > dr) { lcd.set('1   '); if (st.leads === 'rx') st.overSeen = true; L.setText('om-read', 'OL «1»', root); L.setText('om-how', 'القيمة أكبر من المدى', root); }
        else { lcd.set(L.lcdText(R / div, dec, 4)); L.setText('om-read', (R / div).toFixed(dec) + ' ' + unit, root); L.setText('om-how', 'قراءة مباشرة', root); if (st.leads === 'rx') st.readDmm = true; }
        if (st.leads === 'rx' && R <= dr) st.overSeen = st.overSeen || st.readDmm;
      }
      guide.update(st);
    }
    update();
  }

  /* ================= text content ================= */
  const ccTable = () => `<div class="table-wrap"><table class="data"><thead><tr><th>اللون (Color)</th><th>الرقم (Digit)</th><th>المضاعِف (Multiplier)</th><th>السماحية (Tolerance)</th></tr></thead><tbody>
    ${CC.map((c) => `<tr><td class="row-h" style="text-align:start">${c.hex ? `<span class="swatch" style="background:${c.hex}"></span>` : '<span class="swatch" style="background:transparent"></span>'}${c.ar} <span class="muted en">${c.en}</span></td><td>${c.d == null ? '—' : c.d}</td><td class="num">${c.m == null ? '—' : '× ' + (c.m >= 1 ? L.si(c.m, '', 3).trim() : c.m)}</td><td class="num">${c.t == null ? '—' : '± ' + c.t + ' %'}</td></tr>`).join('')}
  </tbody></table></div>`;

  function theory() {
    return `
      <h2>طرق قياس المقاومة (Methods of Measuring Resistance)</h2>
      <p>قبل اختيار الطريقة يجب معرفة القيمة التقريبية للمقاومة، لأن كل طريقة تعمل أفضل في مدى معيّن. تُقسم المقاومات عادة إلى ثلاث مجموعات:</p>
      <ul>
        <li><b>مقاومات منخفضة (أقل من 1 Ω):</b> مثل شنتات الأميترات وموصلات الكابلات وملفات عضو الإنتاج في المحركات.</li>
        <li><b>مقاومات متوسطة (من 1 Ω إلى 100 kΩ):</b> معظم المقاومات المستخدمة في الدوائر الإلكترونية والمختبرية.</li>
        <li><b>مقاومات عالية (أكثر من 100 kΩ):</b> مثل مقاومة عزل الكابلات والمكائن.</li>
      </ul>
      <h3>1. طريقة شفرة الألوان (Color Code Method)</h3>
      <p>معظم مقاومات الكربون والغشاء المعدني الصغيرة لا تُكتب قيمتها رقماً، بل تُبيَّن بحلقات ملوّنة حول جسمها. هذه أسرع طريقة لمعرفة القيمة ولا تحتاج إلى جهاز، لكنها تعطي <b>القيمة المكتوبة (الاسمية)</b> لا القيمة المقاسة فعلاً.</p>
      <p><b>قراءة مقاومة ذات 4 حلقات:</b></p>
      <ol>
        <li>أمسك المقاومة بحيث تكون <b>حلقة السماحية</b> (ذهبية أو فضية عادةً، ومفصولة قليلاً عن البقية) على اليمين.</li>
        <li>الحلقة الأولى تعطي الرقم الأول والثانية تعطي الرقم الثاني.</li>
        <li>الحلقة الثالثة هي <b>المضاعِف</b> (عدد الأصفار المضافة بعد الرقمين).</li>
        <li>الحلقة الرابعة هي <b>السماحية</b>: مقدار ما قد تختلف به القيمة الفعلية عن الاسمية.</li>
      </ol>
      ${L.eq('R = (1st digit)(2nd digit) × Multiplier ± Tolerance')}
      <figure class="figure">${resistorSVG(['yellow', 'violet', 'red', 'gold'], { labels: true })}<figcaption>أصفر 4، بنفسجي 7، أحمر × 100، ذهبي ± 5% ⇒ 4.7 kΩ ± 5%</figcaption></figure>
      <p><b>قراءة مقاومة ذات 5 حلقات (أدق):</b> المقاومات الدقيقة (± 1% أو أفضل) لها 5 حلقات: الثلاث الأولى أرقام، والرابعة المضاعِف، والخامسة السماحية. مثال: بني – أسود – أسود – أحمر – بني = ${n('100 × 100 = 10 000 Ω = 10 kΩ ± 1%')}.</p>
      <h3>جدول شفرة الألوان (Color code table)</h3>
      ${ccTable()}
      <h3>2. طريقة الأميتر والفولتميتر (V–I Method)</h3>
      <p>أبسط الطرق وتعتمد مباشرة على <b>قانون أوم</b>: يمرَّر تيار مستمر في المقاومة المجهولة ${n('Rx')}، فيقيس الأميتر التيار ${n('I')} ويقيس الفولتميتر الجهد ${n('V')} عليها، ثم ${n('Rx = V / I')}.</p>
      <p>المشكلة أن الأجهزة ليست مثالية: للأميتر مقاومة داخلية صغيرة ${n('RA')}، والفولتميتر يسحب تياراً صغيراً لأن مقاومته ${n('RV')} ليست لا نهائية. لذلك يوجد توصيلان:</p>
      <ul><li><b>(a) الفولتميتر على Rx فقط:</b> للمقاومات المنخفضة، فالقيمة المقاسة ${n('Rx ∥ RV')}.</li><li><b>(b) الفولتميتر على الأميتر و Rx معاً:</b> للمقاومات العالية، فالقيمة المقاسة ${n('Rx + RA')}.</li></ul>
      <h3>3. طريقة الاستبدال (Substitution Method)</h3>
      <p>تُستبدل المقاومة المجهولة بمقاومة متغيرة معلومة (صندوق مقاومات عشري) تعطي التأثير نفسه في الدائرة (القراءة نفسها للأميتر). تعتمد دقة الطريقة على دقة صندوق المقاومات وثبات جهد المصدر، لا على دقة الأميتر.</p>
      <h3>4. طريقة الأوميتر (القراءة المباشرة)</h3>
      <p>الأوميتر جهاز يعرض قيمة المقاومة مباشرة بالأوم، وله نوعان شائعان: <b>الأوميتر التناظري المتوالي</b> و<b>الملتيميتر الرقمي (DMM)</b> على وضع Ω.</p>
      <p><b>(أ) الأوميتر التناظري:</b> ١) اختر مدى مناسباً (×1، ×10، ×100، ×1k…). ٢) قصّر الطرفين وعدّل مقاومة المعايرة حتى يشير المؤشر إلى ${n('0 Ω')} تماماً. ٣) افصل الطرفين وصِلهما على طرفي المقاومة المجهولة. ٤) اقرأ التدريج واضربه في المدى. مثال: المؤشر عند 22 على مدى ×100 ⇒ ${n('Rx = 22 × 100 = 2.2 kΩ')}.</p>
      <p><b>(ب) الملتيميتر الرقمي:</b> أسهل قراءة وأدق من التناظري. ١) أدخل الطرف الأسود في COM والأحمر في VΩ. ٢) أدر المفتاح إلى Ω واختر مدى أعلى من القيمة المتوقعة (أو المدى التلقائي). ٣) المس طرفي المقاومة واقرأ الشاشة. ٤) إذا ظهر «1» فالقيمة أكبر من المدى، فاختر مدى أعلى.</p>
      <h3>5. قنطرة كلفن المزدوجة (Kelvin Double Bridge)</h3>
      <p>قنطرة ويتستون معدّلة لقياس <b>المقاومات المنخفضة</b> (من نحو 1 µΩ إلى 1 Ω). في هذا المدى تكون مقاومة الأسلاك ونقاط التلامس (بضعة ملي أوم) بحجم المقاومة المقاسة نفسها.</p>
      <h3>6. طرق المقاومات العالية</h3>
      <ul><li>الميغر (Megger): جهاز اختبار مقاومة العزل.</li><li>طريقة فقدان الشحنة (Loss of Charge).</li><li>طريقة الانحراف المباشر (Direct Deflection).</li></ul>
      <h2>7. قنطرة ويتستون (هذه التجربة)</h2>
      <h3>الأهداف (Objective)</h3>
      <ol><li>فهم مبدأ عمل قنطرة ويتستون.</li><li>إيجاد مقاومة مجهولة باستخدام قنطرة ويتستون المتزنة.</li><li>ملاحظة وتحليل سلوك القنطرة في حالتي الاتزان وعدم الاتزان.</li></ol>
      <h3>النظرية (Theory)</h3>
      <p>قنطرة ويتستون دائرة كهربائية لقياس مقاومة مجهولة بموازنة ذراعين من دائرة قنطرة. تتكون من أربع مقاومات مرتّبة على شكل معيّن، ويوصل جهاز الكشف (فولتميتر أو جلفانوميتر) بين نقطتين متقابلتين.</p>
      <p><b>حالة الاتزان (Balanced Condition):</b> تكون القنطرة متزنة عندما لا يمر تيار في الفولتميتر، وشرط الاتزان:</p>
      ${L.eq(`${L.frac('R<sub>3</sub>', 'R<sub>u</sub>')} = ${L.frac('R<sub>2</sub>', 'R<sub>v</sub>')} &nbsp;⟶&nbsp; R<sub>u</sub> = ${L.frac('R<sub>3</sub> × R<sub>v</sub>', 'R<sub>2</sub>')}`)}
      <p>حيث ${n('R2')} و${n('R3')} مقاومتان معلومتان، و${n('Rv')} مقاومة متغيرة، و${n('Ru')} المقاومة المجهولة.</p>
      <p><b>حالة عدم الاتزان (Deflection-type):</b> عندما تكون القنطرة غير متزنة يظهر فرق جهد بين النقطتين D و B، ويعتمد مقدار الانحراف على مدى بُعد القنطرة عن الاتزان:</p>
      ${L.eq(`V<sub>o</sub> = V (${L.frac('R<sub>x</sub>', 'R<sub>x</sub> + R<sub>3</sub>')} − ${L.frac('R<sub>1</sub>', 'R<sub>1</sub> + R<sub>2</sub>')})`)}
      <p>حيث ${n('Vo')} الجهد بين النقطتين D و B، و${n('R1, R2, R3, R4')} مقاومات معلومة، و${n('Rx = Ru + R4')}، و${n('Ru')} المقاومة المجهولة.</p>
      <div class="note">لاحظ أن ${n('Vo')} ليس دالة خطية في ${n('Rx')}؛ القنطرة غير المتزنة تكون شبه خطية فقط للتغيرات الصغيرة قرب الاتزان، ولهذا تُستخدم مع المتحسسات (Strain gauges و RTD).</div>`;
  }
  function apparatus() {
    return `
      <h2>الأجهزة المطلوبة (Apparatus Required)</h2>
      <ul class="app-list">
        <li><b>دائرة قنطرة ويتستون</b><span class="en">Wheatstone bridge circuit setup</span><span>أربعة أذرع مقاومة على شكل معيّن.</span></li>
        <li><b>فولتميتر تيار مستمر</b><span class="en">DC voltmeter</span><span>كاشف الصفر بين D و B.</span></li>
        <li><b>مجهّز قدرة أو بطارية 5 V</b><span class="en">DC power supply / battery</span><span>يغذي القنطرة بين A و C.</span></li>
        <li><b>مقاومات معلومة ومجهولة</b><span class="en">Known & unknown resistors</span><span>R1، R2، R3، R4 و Ru.</span></li>
        <li><b>مقاومة متغيرة</b><span class="en">Variable resistor</span><span>Rv (صندوق مقاومات عشري).</span></li>
        <li><b>أسلاك توصيل</b><span class="en">Connecting wires</span><span>—</span></li>
      </ul>
      <h2>الجزء أ: القنطرة المتزنة</h2>
      <figure class="figure">${bridge('bal', { V: 'Vi' })}<figcaption>Ru بين D و A، و Rv بين A و B، و R3 بين D و C، و R2 بين B و C، والفولتميتر بين D و B.</figcaption></figure>
      <ol class="steps">
        <li><div>صِل الدائرة حسب مخطط قنطرة ويتستون.</div></li>
        <li><div>استخدم مقاومات قياسية للذراعين المعلومين (R2 و R3).</div></li>
        <li><div>ضع المقاومة المجهولة Ru في مكانها المخصص.</div></li>
        <li><div>غيّر المقاومة المتغيرة حتى يُظهر الفولتميتر <b>انحرافاً صفرياً</b> (نقطة الصفر Null point).</div></li>
        <li><div>سجّل قيمة المقاومة المتغيرة عند الاتزان واحسب Ru من المعادلة.</div></li>
      </ol>
      <div class="note warn">في ورقة المختبر تسمّي خطوات الجزء أ المقاومة المتغيرة R3 والقياسيتين R1 و R2، بينما يستخدم المخطط والمعادلة الرموز Rv و R3 و R2. اعتمدنا هنا رموز المخطط والمعادلة: ${n('Ru = R3 × Rv / R2')}.</div>
      <h2>الجزء ب: القنطرة غير المتزنة</h2>
      <figure class="figure">${bridge('unbal', { V: 'Vi' })}<figcaption>الذراع D–A يحوي Ru و R4 على التوالي (Rx)، والفولتميتر يقرأ Vo بين D و B.</figcaption></figure>
      <ol class="steps">
        <li><div>أبقِ توصيلات الدائرة كما في الجزء أ.</div></li>
        <li><div>صِل قيم المقاومات R1 و R2 و R3 و R4 و Ru وضعها كما في المخطط.</div></li>
        <li><div>سجّل انحراف الفولتميتر.</div></li>
        <li><div>احسب Rx ثم Ru باستخدام المعادلة.</div></li>
      </ol>`;
  }
  function calc() {
    const b = data.bal[data.bal.length - 1], u = data.unbal[data.unbal.length - 1];
    return `
      <h2>الجزء أ: حساب Ru عند الاتزان</h2>
      ${L.eq(`R<sub>u</sub> = ${L.frac('R<sub>3</sub> × R<sub>v</sub>', 'R<sub>2</sub>')}${b ? ` = ${L.frac(`${b.r3} × ${b.rv}`, b.r2)} = ${L.si(b.ru, 'Ω', 4)}` : ''}`)}
      ${b ? `<p>آخر قراءة مسجّلة (${b.id}): ${n(`Rv = ${b.rv} Ω`)} عند ${n(`Vo = ${(b.vo * 1000).toFixed(2)} mV`)}، والقيمة الاسمية من شفرة الألوان ${n(L.si(b.nom, 'Ω'))} فالفرق ${n((((b.ru - b.nom) / b.nom) * 100).toFixed(2) + '%')} (ضمن سماحية ±5%).</p>` : `<p class="muted">سجّل نقطة اتزان من <a href="#" data-goto-tab="sim">المحاكاة</a> لترى الحساب بأرقامك.</p>`}
      <h2>الجزء ب: حساب Rx ثم Ru</h2>
      <p>من المعادلة ${L.ieq(`V<sub>o</sub> = V (${L.frac('R<sub>x</sub>', 'R<sub>x</sub>+R<sub>3</sub>')} − ${L.frac('R<sub>1</sub>', 'R<sub>1</sub>+R<sub>2</sub>')})`)} نعرّف ${L.ieq(`k = ${L.frac('V<sub>o</sub>', 'V')} + ${L.frac('R<sub>1</sub>', 'R<sub>1</sub>+R<sub>2</sub>')}`)} فيكون:</p>
      ${L.eq(`R<sub>x</sub> = ${L.frac('k · R<sub>3</sub>', '1 − k')} &nbsp;&nbsp; , &nbsp;&nbsp; R<sub>u</sub> = R<sub>x</sub> − R<sub>4</sub>`)}
      ${u ? (() => { const k = u.vo / 5 + u.r1 / (u.r1 + u.r2); return `<ol class="steps"><li><div>${n(`k = ${u.vo.toFixed(3)}/5 + ${u.r1}/(${u.r1}+${u.r2}) = ${k.toFixed(4)}`)}</div></li><li><div>${n(`Rx = ${k.toFixed(4)} × ${u.r3} / (1 − ${k.toFixed(4)}) = ${L.si(u.rx, 'Ω', 4)}`)}</div></li><li><div>${n(`Ru = ${L.si(u.rx, 'Ω', 4)} − ${L.si(u.r4, 'Ω')} = ${L.si(u.ru, 'Ω', 4)}`)}</div></li></ol>`; })() : `<p class="muted">سجّل قراءة من الجزء ب في المحاكاة لترى الخطوات بأرقامك.</p>`}
      <h2>النتائج (Results)</h2>
      <ol>
        <li>في حالة الاتزان أظهر الفولتميتر ${n(b ? (b.vo * 1000).toFixed(2) + ' mV ≈ 0 V' : '______ V')}.</li>
        <li>في حالة عدم الاتزان أظهر الفولتميتر ${n(u ? u.vo.toFixed(3) + ' V' : '______ V')}.</li>
        <li>المقاومة المجهولة Ru من الاتزان كانت ${n(b ? L.si(b.ru, 'Ω', 4) : '______ Ω')}.</li>
        <li>المقاومة المجهولة Ru من عدم الاتزان كانت ${n(u ? L.si(u.ru, 'Ω', 4) : '______ Ω')}.</li>
      </ol>
      <h2>الاستنتاج (Conclusion)</h2>
      <ul>
        <li>عند الاتزان تكون قراءة الفولتميتر صفراً، وتعطي العلاقة ${n('Ru = R3·Rv/R2')} قيمة المقاومة المجهولة بدقة تعتمد على دقة المقاومات المعلومة لا على معايرة الكاشف (طريقة صفرية).</li>
        <li>في الحالة غير المتزنة يزداد ${n('Vo')} كلما ابتعدت القنطرة عن الاتزان، لكن العلاقة غير خطية، ومع ذلك يمكن حساب Rx ثم Ru من قيمة ${n('Vo')} المقاسة.</li>
        <li>تتفق القيم المقاسة بالطريقتين مع القيمة الاسمية المقروءة من شفرة الألوان ضمن سماحية المقاومة (±5%)، وطريقة الاتزان أدق لأنها لا تتأثر بدقة قراءة الفولتميتر.</li>
      </ul>`;
  }

  L.register({
    id: 'wheatstone', num: 3, group: 'resistance',
    title: 'طرق قياس المقاومة وقنطرة ويتستون',
    en: 'Methods of Measuring Resistance · Wheatstone DC Bridge',
    sheet: 'Experiment No. (3) — Wheatstone DC Bridge: Balanced & Unbalanced',
    tags: ['Color code', 'V–I method', 'Ohmmeter', 'Wheatstone bridge'],
    summary: 'طرق قياس المقاومة (شفرة الألوان، الأميتر والفولتميتر، الأوميتر التناظري والرقمي) ثم إيجاد مقاومة مجهولة بقنطرة ويتستون في حالتي الاتزان وعدم الاتزان.',
    objectiveShort: 'فهم مبدأ قنطرة ويتستون، وإيجاد مقاومة مجهولة بالقنطرة المتزنة، وتحليل سلوكها في حالتي الاتزان وعدم الاتزان، مع التعرّف على طرق قياس المقاومة الأخرى.',
    mount, calc, theory, apparatus,
    discussion: [
      { en: 'What is the principle of a Wheatstone Bridge?', ar: 'ما مبدأ عمل قنطرة ويتستون؟',
        a: `<p>تعمل على مبدأ <b>المقارنة الصفرية</b> (Null method): مقسّما جهد متوازيان يغذيهما المصدر نفسه، والكاشف بين نقطتي منتصفهما (D و B) يقيس فرق جهدهما. نغيّر المقاومة المتغيرة حتى يتساوى جهد D و B فلا يمر تيار في الكاشف، وعندها تتساوى نسبتا الذراعين وتُحسب المقاومة المجهولة من ثلاث مقاومات معلومة. لا تعتمد النتيجة على معايرة الكاشف ولا على جهد المصدر.</p>` },
      { en: 'What condition must be met for Wheatstone Bridge to be balanced?', ar: 'ما الشرط اللازم لاتزان قنطرة ويتستون؟',
        a: `<p>أن يكون فرق الجهد بين D و B صفراً (لا تيار في الكاشف)، ويتحقق عندما تتساوى نسبتا الذراعين:</p>${L.eq(`${L.frac('R<sub>3</sub>', 'R<sub>u</sub>')} = ${L.frac('R<sub>2</sub>', 'R<sub>v</sub>')} &nbsp; ⟺ &nbsp; R<sub>u</sub> · R<sub>2</sub> = R<sub>3</sub> · R<sub>v</sub>`)}<p>أي أن حاصل ضرب مقاومتي الذراعين المتقابلين متساوٍ.</p>` },
      { en: 'How can the accuracy of the experiment be improved?', ar: 'كيف يمكن تحسين دقة التجربة؟',
        a: `<ul><li>استخدام مقاومات قياسية دقيقة (سماحية صغيرة) وصندوق مقاومات بخطوات دقيقة.</li><li>اختيار نسبة R3/R2 بحيث تعمل Rv قرب أعلى مداها، وتكون الأذرع من رتبة Ru نفسها لأعلى حساسية.</li><li>استخدام كاشف صفر حساس (ملتيميتر بدقة 0.01 mV أو جلفانوميتر حساس).</li><li>رفع جهد المصدر في حدود القدرة المسموحة لزيادة الحساسية دون تسخين المقاومات.</li><li>تقليل مقاومة الأسلاك والتلامس وإحكام التوصيلات.</li><li>عكس قطبية المصدر وأخذ المعدل لإلغاء القوى الدافعة الحرارية، وتكرار القياس وأخذ المتوسط.</li></ul>` },
      { en: 'Can Wheatstone Bridge work with AC circuits?', ar: 'هل تعمل قنطرة ويتستون مع دوائر التيار المتناوب؟',
        a: `<p>نعم، بتغذيتها بمصدر متناوب واستبدال المقاومات بممانعات ${n('Z')} واستخدام كاشف متناوب (سماعة، فولتميتر AC، أو راسم إشارة). يصبح شرط الاتزان ${n('Z1·Z4 = Z2·Z3')} ويجب أن يتحقق للمقدار والطور معاً. ومن أمثلتها قنطرة ماكسويل وهاي (للمحاثة) وقنطرة شيرنغ (للسعة) وقنطرة وين (للتردد).</p>` },
      { en: 'Why is the Wheatstone bridge not suitable for measuring very low resistance?', ar: 'لماذا لا تناسب قنطرة ويتستون قياس المقاومات المنخفضة جداً؟',
        a: `<p>لأن مقاومة أسلاك التوصيل ونقاط التلامس (بضعة ملي أوم) تصبح بنفس رتبة المقاومة المقاسة أو أكبر منها، فتُضاف إليها وتسبب خطأً كبيراً، إضافة إلى القوى الدافعة الحرارية عند نقاط التلامس. لذلك تُستخدم <b>قنطرة كلفن المزدوجة</b> أو طريقة الأطراف الأربعة لقياس المقاومات من نحو 1 µΩ إلى 1 Ω.</p>` },
      { en: 'Which method would you use to measure the insulation resistance of a cable?', ar: 'ما الطريقة التي تستخدمها لقياس مقاومة عزل كابل؟',
        a: `<p><b>الميغر</b> (Megger: Insulation Resistance Tester)، لأن مقاومة العزل عالية جداً (ميغا أوم إلى غيغا أوم) وتحتاج جهد اختبار عالياً (500 V إلى 5 kV) ليظهر تيار تسرّب قابل للقياس. ويمكن أيضاً استخدام طريقة فقدان الشحنة أو الانحراف المباشر.</p>` },
      { en: 'Why is the scale of an analog ohmmeter reversed and non-linear?', ar: 'لماذا يكون تدريج الأوميتر التناظري معكوساً وغير خطي؟',
        a: `<p>في الأوميتر المتوالي يمر تيار البطارية الداخلية عبر المقاومة المقاسة: ${L.ieq(`I = ${L.frac('E', 'R<sub>int</sub> + R<sub>x</sub>')}`)}.</p><ul><li><b>معكوس:</b> عند ${n('Rx = 0')} يكون التيار أعظم (انحراف كامل) فيقع الصفر على اليمين، وعند ${n('Rx = ∞')} لا يمر تيار فيقع ∞ على اليسار.</li><li><b>غير خطي:</b> الانحراف ${n('p = Rint / (Rint + Rx)')} يتناسب عكسياً مع ${n('Rint + Rx')} وليس مع Rx، فتتباعد العلامات قرب الصفر وتتزاحم قرب اللانهاية. أدق قراءة تكون قرب منتصف التدريج حيث ${n('Rx = Rint')}.</li></ul><p>جرّب ذلك في جزء «الأوميتر» من المحاكاة.</p>` },
    ],
  });
})();
