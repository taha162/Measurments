/* Experiment 3 — Wheatstone DC bridge, balanced & unbalanced (3D bench). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const KEY = 'wheatstone';
  const NETS = [['ps.p', 'bb.C'], ['ps.n', 'bb.A', 'bb.v1', 'dec.a'], ['dec.b', 'bb.v2', 'bb.B', 'dm.com'], ['bb.D', 'dm.v']];
  const CC = [['black', 'أسود', '#141414', 0, '×1', ''], ['brown', 'بني', '#7b3f12', 1, '×10', '±1%'], ['red', 'أحمر', '#d32222', 2, '×100', '±2%'], ['orange', 'برتقالي', '#f07d12', 3, '×1k', ''], ['yellow', 'أصفر', '#f4d10a', 4, '×10k', ''], ['green', 'أخضر', '#16a34a', 5, '×100k', '±0.5%'], ['blue', 'أزرق', '#1d5fd6', 6, '×1M', '±0.25%'], ['violet', 'بنفسجي', '#7c3cc4', 7, '×10M', '±0.1%'], ['grey', 'رمادي', '#8b8b8b', 8, '×100M', '±0.05%'], ['white', 'أبيض', '#f5f5f5', 9, '×1G', ''], ['gold', 'ذهبي', '#c9a227', '', '×0.1', '±5%'], ['silver', 'فضي', '#b9bdc2', '', '×0.01', '±10%']];
  const UNK = [
    { id: 'Rx-1', bands: ['yellow', 'violet', 'black', 'gold'], nom: 47, val: 46.4 },
    { id: 'Rx-2', bands: ['brown', 'black', 'red', 'gold'], nom: 1000, val: 1013 },
    { id: 'Rx-3', bands: ['red', 'red', 'red', 'gold'], nom: 2200, val: 2174 },
    { id: 'Rx-4', bands: ['orange', 'orange', 'red', 'gold'], nom: 3300, val: 3352 },
    { id: 'Rx-5', bands: ['blue', 'grey', 'red', 'gold'], nom: 6800, val: 6712 },
    { id: 'Rx-6', bands: ['yellow', 'violet', 'orange', 'gold'], nom: 47000, val: 46550 },
  ];
  const BAND_OF = { 100: ['brown', 'black', 'brown', 'gold'], 1000: ['brown', 'black', 'red', 'gold'], 10000: ['brown', 'black', 'orange', 'gold'], 220: ['red', 'red', 'brown', 'gold'], 470: ['yellow', 'violet', 'brown', 'gold'], 2200: ['red', 'red', 'red', 'gold'], 4700: ['yellow', 'violet', 'red', 'gold'] };
  let data = L.store.get(KEY + ':data2', { rows: [] });
  const save = () => L.store.set(KEY + ':data2', data);
  const opts = (list, sel) => list.map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${L.si(v, 'Ω', 3)}</option>`).join('');

  function schematic(partB) {
    const A = [260, 42], D = [110, 172], B = [410, 172], C = [260, 302];
    let s = S.wire([A, [260, 16], [490, 16], [490, 140]]) + S.wire([[490, 204], [490, 322], [260, 322], C]) + S.bat(490, 204, 490, 140, { label: 'V', off: 24 });
    if (partB) { s += S.res(D[0], D[1], 185, 107, { body: 30 }) + S.res(185, 107, A[0], A[1], { body: 30 }) + S.text(132, 120, 'R4', { cls: 'big', anchor: 'end' }) + S.text(212, 66, 'Ru', { cls: 'big', anchor: 'end' }); }
    else s += S.res(D[0], D[1], A[0], A[1], { body: 54 }) + S.text(168, 96, 'Ru', { cls: 'big', anchor: 'end' });
    s += S.res(A[0], A[1], B[0], B[1], { body: 54, variable: !partB }) + S.text(352, 96, partB ? 'R1' : 'Rv', { cls: 'big', anchor: 'start' });
    s += S.res(D[0], D[1], C[0], C[1], { body: 54 }) + S.res(B[0], B[1], C[0], C[1], { body: 54 });
    s += S.text(166, 264, 'R3', { cls: 'big', anchor: 'end' }) + S.text(354, 264, 'R2', { cls: 'big', anchor: 'start' });
    s += S.wire([D, [241, 172]]) + S.wire([[279, 172], B]) + S.meter(260, 172, 'V', { label: 'Vo', ly: 206 });
    [[A, 'A', 0, -8], [D, 'D', -14, 4], [B, 'B', 14, 4], [C, 'C', -12, 16]].forEach(([p, t, dx, dy]) => { s += S.dot(p[0], p[1]) + S.text(p[0] + dx, p[1] + dy, t, { cls: 'big acc', anchor: dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle' }); });
    return S.svg(552, 336, s, 'قنطرة ويتستون');
  }

  function mount(root) {
    if (!window.Lab3D || !Lab3D.ok()) return Lab3D.fallback(root);
    const st = { on: false, rv: 1000, unk: 2, r2: 1000, r3: 1000, r4: 1000, partB: false, wired: false };
    root.innerHTML = Lab3D.layout('wb');
    const B = Lab3D.Bench(L.$('#wb-stage', root), { cam: [0, 70, 88] });
    const ps = B.supply({ id: 'ps', x: -44, z: -15, sub: 'FIXED 5 V', onPower: () => pwr.set(!st.on) });
    let rvNum; const acc = [0, 0, 0, 0];
    const dec = B.decade({ id: 'dec', x: -6, z: -15, onDial: (i, d) => { acc[i] += d; const k = Math.trunc(acc[i] / 14); if (k) { acc[i] -= k * 14; rvNum.set(st.rv + k * [1000, 100, 10, 1][i]); } } });
    const dm = B.dmm({ id: 'dm', x: 32, z: -14, modes: ['mV'], title: 'NULL DETECTOR', jacks: [['dm.com', 'black', 'COM', -2.4], ['dm.v', 'red', 'VΩ', 2.4]] });
    const bb = B.board({ id: 'bb', x: 4, z: 15, w: 48, d: 24 });
    const P = { A: [0, -8.5], D: [-15, 0], B: [15, 0], C: [0, 8.5] };
    const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    bb.text(14, -10.2, 'WHEATSTONE BRIDGE', 15, '#fff');
    // D–A arm: R4 (with jumper) then Ru
    const d1 = lerp(P.D, P.A, 0.12), d2 = lerp(P.D, P.A, 0.44), d3 = lerp(P.D, P.A, 0.56), d4 = lerp(P.D, P.A, 0.88);
    bb.trace([P.D, d1]); bb.trace([d2, d3]); bb.trace([d4, P.A]);
    bb.resistor(...d1, ...d2, BAND_OF[1000], { body: 3.2 });
    let ruMesh = null;
    const putRu = () => { if (ruMesh) bb.remove(ruMesh); ruMesh = bb.resistor(...d3, ...d4, UNK[st.unk].bands, { body: 3.2, bodyColor: 0x9cc7e8 }); B.dirty(); };
    putRu();
    const jmp = bb.selector('bb.j4', -12.5, -6.5, [{ a: -50, label: 'IN' }, { a: 50, label: 'OUT' }], () => partSeg.set(st.partB ? 'A' : 'B'));
    // A–B arm: gap for the decade box
    const v1 = lerp(P.A, P.B, 0.32), v2 = lerp(P.A, P.B, 0.7);
    bb.trace([P.A, v1]); bb.trace([v2, P.B]);
    // D–C and B–C
    const c1 = lerp(P.D, P.C, 0.2), c2 = lerp(P.D, P.C, 0.8), e1 = lerp(P.B, P.C, 0.2), e2 = lerp(P.B, P.C, 0.8);
    bb.trace([P.D, c1]); bb.trace([c2, P.C]); bb.trace([P.B, e1]); bb.trace([e2, P.C]);
    let r3Mesh = null, r2Mesh = null;
    const putFixed = () => {
      if (r3Mesh) bb.remove(r3Mesh); if (r2Mesh) bb.remove(r2Mesh);
      r3Mesh = bb.resistor(...c1, ...c2, BAND_OF[st.r3] || BAND_OF[1000], { body: 4 });
      r2Mesh = bb.resistor(...e1, ...e2, BAND_OF[st.r2] || BAND_OF[1000], { body: 4 });
    };
    putFixed();
    bb.dyn((ctx, Q) => {
      const t = (x, z, s, c = '#fff', sz = 16) => { const [px, py] = Q(x, z); Lab3D.txt(ctx, s, px, py, sz, c); };
      t(-10.5, -1.6, 'R4'); t(-1.4, -8.4 + 3.2, 'Ru', '#bfe3ff'); t(10.5, -6.8, 'Rv / R1', '#ffe08a'); t(-10.8, 6.6, 'R3 ' + L.si(st.r3, 'Ω', 3)); t(10.8, 6.6, 'R2 ' + L.si(st.r2, 'Ω', 3));
      t(0, -11, 'A', '#ffe08a', 18); t(-18.2, 0, 'D', '#ffe08a', 18); t(18.2, 0, 'B', '#ffe08a', 18); t(0, 11.3, 'C', '#ffe08a', 18);
    });
    bb.jack('bb.A', ...P.A, 'black', '', 0); bb.jack('bb.C', ...P.C, 'red', '', 0);
    bb.jack('bb.D', ...P.D, 'yellow', '', 0); bb.jack('bb.B', ...P.B, 'green', '', 0);
    bb.jack('bb.v1', ...v1, 'yellow', '', 0); bb.jack('bb.v2', ...v2, 'yellow', '', 0);
    bb.redraw();
    B.fixed([['bb.A', 'bb.v1'], ['bb.v2', 'bb.B']]);
    Object.assign(B.pins['bb.A'], { label: 'A (−)' }); Object.assign(B.pins['bb.C'], { label: 'C (+)' }); Object.assign(B.pins['bb.D'], { label: 'D' }); Object.assign(B.pins['bb.B'], { label: 'B' });
    Object.assign(B.pins['bb.v1'], { label: 'Rv طرف A' }); Object.assign(B.pins['bb.v2'], { label: 'Rv طرف B' });
    B.tipFor('bb.j4', 'R4: إدخال / إخراج');

    const ctl = L.$('#wb-ctl', root);
    ctl.innerHTML = `<div id="wb-pwr"></div><div class="ctl-grp"><span class="lbl-s">الجزء</span><div id="wb-part"></div></div><div id="wb-rv"></div>
      <label class="field"><span>Ru</span><select id="wb-unk">${UNK.map((u, i) => `<option value="${i}"${i === st.unk ? ' selected' : ''}>${u.id}</option>`).join('')}</select></label>
      <label class="field"><span>R2</span><select id="wb-r2">${opts([100, 1000, 10000], st.r2)}</select></label>
      <label class="field"><span>R3</span><select id="wb-r3">${opts([100, 1000, 10000], st.r3)}</select></label>
      <label class="field" id="wb-r4w" hidden><span>R4</span><select id="wb-r4">${opts([220, 470, 1000, 2200, 4700], st.r4)}</select></label>`;
    const pwr = L.Power(L.$('#wb-pwr', root), { label: 'المجهز 5 V', value: false, onChange: (v) => { st.on = v; update(); } });
    const partSeg = L.Seg(L.$('#wb-part', root), { options: [{ v: 'A', label: 'أ: متزنة' }, { v: 'B', label: 'ب: غير متزنة' }], value: 'A', onChange: (v) => { st.partB = v === 'B'; L.$('#wb-r4w', root).hidden = !st.partB; update(); } });
    rvNum = L.Num(L.$('#wb-rv', root), { id: 'wb-rvn', label: 'صندوق المقاومات Rv', unit: 'Ω', min: 0, max: 9999, value: st.rv, steps: [1, 10, 100, 1000], quant: 1, decimals: 0, onInput: (v) => { st.rv = v; update(); } });
    L.$('#wb-unk', root).addEventListener('change', (e) => { st.unk = +e.target.value; putRu(); update(); });
    ['r2', 'r3', 'r4'].forEach((k) => L.$('#wb-' + k, root).addEventListener('change', (e) => { st[k] = +e.target.value; if (k !== 'r4') { putFixed(); bb.redraw(); } else { /* R4 band */ } update(); }));
    L.$('#wb-ro', root).innerHTML = L.ro('wb-vo', 'Vo = VD − VB', 'hl') + L.ro('wb-ru', 'Ru المحسوبة', 'hl') + L.ro('wb-st', 'الحالة');
    const guide = Lab3D.guide(L.$('#wb-guide', root), B, [
      { t: 'وصّل المجهز بين C (+) و A (−)، والصندوق بين طرفي Rv، والملتيميتر بين D و B.', wire: NETS, check: (s) => s.wired },
      { t: 'شغّل المجهز.', check: (s) => s.wired && s.on },
      { t: 'الجزء أ: غيّر الصندوق حتى يقرأ الملتيميتر صفراً، ثم سجّل.', check: () => data.rows.some((r) => !r.b) },
      { t: 'الجزء ب: أدخل R4 واضبط الصندوق على R1 = 1000 Ω، ثم سجّل Vo.', check: () => data.rows.some((r) => r.b) },
    ]);
    function compute() {
      const els = [];
      if (st.on) els.push({ a: 'ps.p', b: 'ps.n', v: 5, ri: 0.05, ilim: 1 });
      els.push({ a: 'bb.D', b: 'bb.M', r: st.partB ? st.r4 : 0.001 }, { a: 'bb.M', b: 'bb.A', r: UNK[st.unk].val }, { a: 'bb.D', b: 'bb.C', r: st.r3 }, { a: 'bb.B', b: 'bb.C', r: st.r2 });
      els.push({ a: 'dec.a', b: 'dec.b', r: Math.max(st.rv, 0.01) }, { a: 'dm.v', b: 'dm.com', r: 10e6 });
      const s = B.solve(els);
      const vo = s.vd('dm.v', 'dm.com')[0], vs = s.vd('bb.C', 'bb.A')[0];
      const voR = Math.round(vo * 1e5) / 1e5;
      let ru;
      if (!st.partB) ru = (st.r3 * st.rv) / st.r2;
      else { const k = voR / 5 + st.rv / (st.rv + st.r2); ru = (st.r3 * k) / (1 - k) - st.r4; }
      return { vo: voR, vs, ru };
    }
    function update() {
      const c = B.check(NETS); st.wired = c.ok;
      const k = compute();
      ps.lcd('5.00', st.on); ps.power(st.on); ps.knob(1 / 3);
      dec.set(st.rv);
      jmp.set(st.partB ? -50 : 50);
      const mv = k.vo * 1000;
      dm.show(Math.abs(mv) < 1000 ? L.lcdText(mv, 2, 5) : L.lcdText(k.vo, 3, 5), Math.abs(mv) < 1000 ? 'mV' : 'V', 'DC');
      const bal = st.wired && st.on && Math.abs(mv) < 0.5;
      L.setText('wb-vo', Math.abs(mv) < 1000 ? L.fx(mv, 2) + ' mV' : L.fx(k.vo, 3) + ' V', root);
      L.setText('wb-ru', isFinite(k.ru) && k.ru > 0 ? L.si(k.ru, 'Ω', 4) : '—', root);
      L.setText('wb-st', !st.wired || !st.on ? '—' : st.partB ? 'غير متزنة' : bal ? 'متزنة ✓' : mv > 0 ? 'زِد Rv' : 'أنقص Rv', root);
      L.$('#wb-st-box', root).className = 'ro ' + (bal && !st.partB ? 'good' : '');
      Lab3D.statusText(B, c, st.on, '');
      guide.update(st);
    }
    function table() {
      L.$('#wb-table', root).innerHTML = L.table(['الجزء', 'Ru', 'R2 / R3', 'Rv أو R1', 'R4', 'Vo', 'Ru المحسوبة', 'الاسمية'], data.rows.length ? data.rows.map((r) => [r.b ? 'ب' : 'أ', r.id, n(`${L.si(r.r2, 'Ω', 3)} / ${L.si(r.r3, 'Ω', 3)}`), n(r.rv + ' Ω'), r.b ? n(L.si(r.r4, 'Ω', 3)) : '—', n((r.vo * 1000).toFixed(2) + ' mV'), `<b>${n(L.si(r.ru, 'Ω', 4))}</b>`, n(L.si(r.nom, 'Ω', 3))]) : [['—', '', '', '', '', '', '', '']]);
    }
    L.$('#wb-rec', root).addEventListener('click', () => {
      const k = compute();
      if (!st.wired) return L.toast('أكمل التوصيل أولاً', 'warn');
      if (!st.on) return L.toast('شغّل المجهز', 'warn');
      if (!st.partB && Math.abs(k.vo) > 0.002) return L.toast('القنطرة غير متزنة: اجعل القراءة قريبة من الصفر', 'warn');
      if (!isFinite(k.ru) || k.ru <= 0) return L.toast('لا يمكن الحساب بهذه القيم', 'warn');
      const u = UNK[st.unk];
      data.rows.push({ b: st.partB, id: u.id, nom: u.nom, r2: st.r2, r3: st.r3, r4: st.r4, rv: st.rv, vo: k.vo, ru: k.ru });
      save(); table(); update();
      L.toast(`سُجّل: Ru = ${L.si(k.ru, 'Ω', 4)}`);
    });
    L.$('#wb-copy', root).addEventListener('click', () => L.copyTable(L.$('#wb-table table', root)));
    L.$('#wb-clear', root).addEventListener('click', () => { data = { rows: [] }; save(); table(); update(); });
    B.onWires(update);
    table(); update();
  }

  L.register({
    id: 'wheatstone', num: 3, group: 'resistance',
    title: 'قنطرة ويتستون وقياس المقاومة',
    en: 'Wheatstone DC Bridge',
    sheet: 'Experiment No. (3) — Wheatstone DC Bridge: Balanced & Unbalanced',
    tags: ['Balanced', 'Unbalanced'],
    summary: 'إيجاد مقاومة مجهولة بالقنطرة المتزنة وغير المتزنة.',
    goal: 'إيجاد مقاومة مجهولة بقنطرة ويتستون في حالتي الاتزان وعدم الاتزان.',
    mount,
    theory: () => `<div class="theory-grid"><div class="prose">
      <h2>الاتزان</h2>
      <p>عند الاتزان جهد D = جهد B، فلا يقرأ الفولتميتر شيئاً:</p>
      ${L.eq(`${L.frac('R<sub>3</sub>', 'R<sub>u</sub>')} = ${L.frac('R<sub>2</sub>', 'R<sub>v</sub>')} &nbsp;⟶&nbsp; R<sub>u</sub> = ${L.frac('R<sub>3</sub> R<sub>v</sub>', 'R<sub>2</sub>')}`)}
      <h2>عدم الاتزان</h2>
      ${L.eq(`V<sub>o</sub> = V (${L.frac('R<sub>x</sub>', 'R<sub>x</sub>+R<sub>3</sub>')} − ${L.frac('R<sub>1</sub>', 'R<sub>1</sub>+R<sub>2</sub>')}) , &nbsp; R<sub>x</sub> = R<sub>u</sub> + R<sub>4</sub>`)}
      <details class="qa"><summary><span class="qn">Ω</span><span class="qt"><b>جدول شفرة الألوان</b></span></summary><div class="ans" style="padding-inline-start:16px"><div class="table-wrap">${L.table(['اللون', 'الرقم', 'المضاعِف', 'السماحية'], CC.map((c) => [`<span class="swatch" style="background:${c[2]}"></span>${c[1]}`, c[3], n(c[4]), n(c[5])]))}</div></div></details>
      <details class="qa"><summary><span class="qn">≡</span><span class="qt"><b>طرق قياس المقاومة</b></span></summary><div class="ans" style="padding-inline-start:16px"><ul>
        <li><b>شفرة الألوان:</b> القيمة الاسمية فقط.</li><li><b>الأميتر والفولتميتر:</b> R = V/I.</li><li><b>الاستبدال:</b> صندوق مقاومات يعطي التأثير نفسه.</li>
        <li><b>الأوميتر:</b> قراءة مباشرة (تناظري: تدريج معكوس، رقمي: أدق).</li><li><b>قنطرة كلفن:</b> للمقاومات أقل من 1 Ω.</li><li><b>الميغر:</b> للمقاومات العالية (العزل).</li></ul></div></details>
    </div><figure class="figure">${schematic(false)}<figcaption>الجزء أ</figcaption></figure></div>`,
    calc: () => {
      const a = data.rows.filter((r) => !r.b).pop(), b = data.rows.filter((r) => r.b).pop();
      return `<h2>الجزء أ</h2>${L.eq(`R<sub>u</sub> = ${L.frac('R<sub>3</sub> R<sub>v</sub>', 'R<sub>2</sub>')}${a ? ` = ${L.frac(`${a.r3} × ${a.rv}`, a.r2)} = ${L.si(a.ru, 'Ω', 4)}` : ''}`)}
        <h2>الجزء ب</h2>${b ? (() => { const k = b.vo / 5 + b.rv / (b.rv + b.r2); return L.eq(`k = ${L.frac(b.vo.toFixed(4), '5')} + ${L.frac(b.rv, b.rv + b.r2)} = ${k.toFixed(4)}`) + L.eq(`R<sub>x</sub> = ${L.frac('k R<sub>3</sub>', '1 − k')} = ${L.si(b.ru + b.r4, 'Ω', 4)} , &nbsp; R<sub>u</sub> = R<sub>x</sub> − R<sub>4</sub> = ${L.si(b.ru, 'Ω', 4)}`); })() : '<p class="muted">سجّل قراءة من الجزء ب.</p>'}
        <h2>النتائج</h2><ul><li>الاتزان: الفولتميتر ${n(a ? (a.vo * 1000).toFixed(2) + ' mV' : '—')}، Ru = ${n(a ? L.si(a.ru, 'Ω', 4) : '—')}</li><li>عدم الاتزان: الفولتميتر ${n(b ? b.vo.toFixed(3) + ' V' : '—')}، Ru = ${n(b ? L.si(b.ru, 'Ω', 4) : '—')}</li></ul>
        <h2>الاستنتاج</h2><p>طريقة الاتزان أدق لأنها لا تعتمد على دقة الفولتميتر، والنتيجتان ضمن سماحية المقاومة.</p>`;
    },
    discussion: [
      { en: 'What is the principle of a Wheatstone Bridge?', ar: 'ما مبدأ القنطرة؟', a: '<p>مقارنة صفرية: مقسّما جهد متوازيان، ونغيّر Rv حتى يتساوى جهد D و B.</p>' },
      { en: 'What condition must be met for Wheatstone Bridge to be balanced?', ar: 'ما شرط الاتزان؟', a: `<p>${n('Ru·R2 = R3·Rv')}، أي لا تيار في الكاشف.</p>` },
      { en: 'How can the accuracy of the experiment be improved?', ar: 'كيف نحسّن الدقة؟', a: '<p>مقاومات دقيقة، كاشف حساس، نسبة أذرع مناسبة، أسلاك قصيرة، وتكرار القياس.</p>' },
      { en: 'Can Wheatstone Bridge work with AC circuits?', ar: 'هل تعمل مع التيار المتناوب؟', a: `<p>نعم بممانعات وكاشف متناوب، والشرط ${n('Z1·Z4 = Z2·Z3')} (مقداراً وطوراً).</p>` },
      { en: 'Why is the Wheatstone bridge not suitable for measuring very low resistance?', ar: 'لماذا لا تناسب المقاومات الصغيرة جداً؟', a: '<p>مقاومة الأسلاك والتلامس تصبح بحجم المقاومة نفسها؛ نستخدم قنطرة كلفن.</p>' },
      { en: 'Which method would you use to measure the insulation resistance of a cable?', ar: 'كيف نقيس مقاومة العزل؟', a: '<p>بالميغر (جهد اختبار عالٍ).</p>' },
      { en: 'Why is the scale of an analog ohmmeter reversed and non-linear?', ar: 'لماذا تدريج الأوميتر معكوس وغير خطي؟', a: `<p>${n('I = E/(Rint + Rx)')}: أكبر تيار عند Rx = 0 (يمين)، والعلاقة عكسية فتتزاحم العلامات نحو ∞.</p>` },
    ],
  });
})();
