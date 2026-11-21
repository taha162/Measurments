/* Experiment 7 — LVDT on the KL-620 kit (3D bench with a see-through transducer). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const KEY = 'lvdt';
  const M0 = 0.42, G2 = 1.012, X0 = 8, SMAX = 0.85, VD = 0.55, OFFSET = 0.37, L0 = 15;
  const TARGETS = [-3, -2, -1, 0, 1, 2, 3];
  const NETS = [['ps.p', 'kit.p12'], ['kit.gnd', 'ps.c', 'd1.com', 'd2.com'], ['ps.n', 'kit.m12'], ['kit.o1', 'd1.v'], ['kit.o2', 'd2.v']];
  let data = L.store.get(KEY + ':data2', { nul: null, rows: {} });
  const save = () => L.store.set(KEY + ':data2', data);
  function model(vp, screw, powered) {
    const xc = screw - L0 - OFFSET, s = SMAX * Math.tanh(xc / X0), v = powered ? vp : 0;
    const vs1 = M0 * v * (1 - s), vs2 = M0 * v * G2 * (1 + s);
    return { xc, vs1, vs2, dc1: powered ? Math.max(0, vs1 - VD) : 0, dc2: powered ? Math.max(0, vs2 - VD) : 0 };
  }

  function mount(root) {
    if (!window.Lab3D || !Lab3D.ok()) return Lab3D.fallback(root);
    const st = { on: false, vp: 6.2, screw: 13.8, wired: false, far: false };
    root.innerHTML = Lab3D.layout('lv', { chart: 'موضع القلب مقابل الجهد', extraBtn: '<button type="button" class="btn" id="lv-null">سجّل الصفر</button>' });
    const B = Lab3D.Bench(L.$('#lv-stage', root), { cam: [0, 72, 90] });
    let vpNum, scNum;
    const ps = B.supply({ id: 'ps', x: -46, z: -15, triple: true, title: 'DUAL POWER SUPPLY', sub: '±12 V  FIXED', onPower: () => pwr.set(!st.on) });
    const d1 = B.dmm({ id: 'd1', x: 26, z: -14, modes: ['V⎓'], title: 'Vo30-1', jacks: [['d1.com', 'black', 'COM', -2.4], ['d1.v', 'red', 'VΩ', 2.4]] });
    const d2 = B.dmm({ id: 'd2', x: 42, z: -14, modes: ['V⎓'], title: 'Vo30-2', color: 0xe8901a, jacks: [['d2.com', 'black', 'COM', -2.4], ['d2.v', 'red', 'VΩ', 2.4]] });
    const kit = B.board({ id: 'kit', x: -6, z: 13, w: 62, d: 26, color: 0x1f4f8a });
    kit.text(-21, -10.6, 'KL-620  ·  LVDT  (SENSOR30)', 16, '#fff');
    const T = B.THREE, cy = kit.y + 5.2, cz = -3.5;
    const glass = new T.Mesh(new T.CylinderGeometry(4.2, 4.2, 30, 40, 1, true), new T.MeshStandardMaterial({ color: 0xcfe3ee, transparent: true, opacity: 0.18, roughness: 0.1, side: T.DoubleSide, depthWrite: false }));
    glass.renderOrder = 3;
    glass.rotation.z = Math.PI / 2; glass.position.set(-8, cy, cz); kit.add(glass);
    [-22, 6].forEach((x) => { const b = B.mesh(new T.BoxGeometry(2.4, 5.4, 8.6), B.M(0x8f979d, { r: 0.4, m: 0.6 })); b.position.set(x, kit.y + 2.7, cz); kit.add(b); });
    const coilMat = (c) => B.M(c, { r: 0.5, m: 0, x: { transparent: true, opacity: 0.8, emissive: 0x000000, depthWrite: false } });
    const coils = [['S1', -17], ['P', -8], ['S2', 1]].map(([nm, x]) => { const m = B.mesh(new T.CylinderGeometry(3.5, 3.5, 7.6, 32, 1, true), coilMat(0xc0651c)); m.material.side = T.DoubleSide; m.rotation.z = Math.PI / 2; m.position.set(x, cy, cz); kit.add(m); return m; });
    const core = B.mesh(new T.CylinderGeometry(1.3, 1.3, 13, 24), B.M(0x3c4247, { r: 0.45, m: 0.5 })); core.rotation.z = Math.PI / 2; kit.add(core);
    const rod = B.mesh(new T.CylinderGeometry(0.35, 0.35, 1, 12), B.M(0xc9cdd1, { r: 0.3, m: 0.8 })); rod.rotation.z = Math.PI / 2; kit.add(rod);
    const sleeve = B.mesh(new T.CylinderGeometry(1.2, 1.2, 9, 24), B.M(0xb8bdc1, { r: 0.3, m: 0.85 })); sleeve.rotation.z = Math.PI / 2; sleeve.position.set(12.5, cy, cz); kit.add(sleeve);
    const thimble = new T.Group();
    const th = B.mesh(new T.CylinderGeometry(1.9, 1.9, 4.2, 28), B.M(0x2a2f33, { r: 0.45 })); th.rotation.z = Math.PI / 2; thimble.add(th);
    for (let i = 0; i < 12; i++) { const r = B.mesh(new T.BoxGeometry(4.2, 0.18, 0.18), B.M(0x50585e), false); const a = (i / 12) * Math.PI * 2; r.position.set(0, Math.cos(a) * 1.9, Math.sin(a) * 1.9); thimble.add(r); }
    kit.add(thimble);
    B.draggable(th, 'kit.mic', (d, f) => scNum.set(st.screw + d * (f ? 0.002 : 0.02)));
    B.tipFor('kit.mic', 'اسحب لتحريك القلب');
    const vr5 = kit.knob('kit.vr5', 24, -5, { r: 1.5, h: 1.2, color: 0x2a62c9, drag: (d, f) => vpNum.set(st.vp + d * (f ? 0.005 : 0.05)) });
    kit.dyn((ctx, Q) => {
      const t = (x, z, s, c = '#fff', sz = 15) => { const [px, py] = Q(x, z); Lab3D.txt(ctx, s, px, py, sz, c); };
      t(-17, cz - 6.2, 'S1', '#ffd28a', 18); t(-8, cz - 6.2, 'P', '#ffd28a', 18); t(1, cz - 6.2, 'S2', '#ffd28a', 18); t(24, -8.6, 'VR5', '#cfe1ff');
      for (let mm = 5; mm <= 25; mm++) { const [px, py] = Q(10 + (mm - 5) * 0.5, cz + 5.2); ctx.fillStyle = '#e8eef5'; ctx.fillRect(px - 1, py - (mm % 5 ? 6 : 12), 2, mm % 5 ? 6 : 12); if (mm % 5 === 0) Lab3D.txt(ctx, String(mm), px, py + 12, 12, '#e8eef5'); }
    });
    [['kit.p12', -26, 'red', '+12V'], ['kit.gnd', -19, 'black', 'GND'], ['kit.m12', -12, 'blue', '−12V'], ['kit.o1', 10, 'yellow', 'Vo30-1'], ['kit.o2', 19, 'green', 'Vo30-2']].forEach(([id, x, c, lab]) => { kit.jack(id, x, 7.5, c, lab); B.pins[id].label = lab; });
    kit.redraw();

    const ctl = L.$('#lv-ctl', root);
    ctl.innerHTML = '<div id="lv-pwr"></div><div id="lv-vp"></div><div id="lv-sc"></div><div class="ctl-grp"><span class="lbl-s">انتقل من الصفر (mm)</span><div class="chips" id="lv-chips"></div></div>';
    const pwr = L.Power(L.$('#lv-pwr', root), { label: 'المجهز', value: false, onChange: (v) => { st.on = v; update(); } });
    vpNum = L.Num(L.$('#lv-vp', root), { id: 'lv-vpn', label: 'VR5 → Vp', unit: 'V', min: 0, max: 14, value: st.vp, steps: [0.05, 1], quant: 0.05, decimals: 2, onInput: (v) => { st.vp = v; update(); } });
    scNum = L.Num(L.$('#lv-sc', root), { id: 'lv-scn', label: 'طول البرغي', unit: 'mm', min: 5, max: 25, value: st.screw, steps: [0.01, 0.1, 1], quant: 0.01, decimals: 2, onInput: (v) => { st.screw = v; update(); } });
    const chips = L.$('#lv-chips', root);
    chips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c && data.nul != null) scNum.set(+(data.nul + +c.dataset.d).toFixed(2)); });
    L.$('#lv-ro', root).innerHTML = L.ro('lv-v1', 'V1 (Vo30-1)', 'hl') + L.ro('lv-v2', 'V2 (Vo30-2)', 'hl') + L.ro('lv-df', 'V2 − V1') + L.ro('lv-x', 'الإزاحة من الصفر');
    const plot = L.Plot(L.$('#lv-plot', root), { xLabel: 'Core position from null (mm)', yLabel: 'Output (V)', x: [-10, 10], height: 250, tipX: (v) => (v > 0 ? '+' : '') + L.fx(v, 2) + ' mm', tipY: (v) => L.fx(v, 3) + ' V' });
    const guide = Lab3D.guide(L.$('#lv-guide', root), B, [
      { t: 'وصّل المجهز (+12، COM، −12) بالوحدة، والملتيميترين على Vo30-1 و Vo30-2.', wire: NETS, check: (s) => s.wired },
      { t: 'شغّل واضبط VR5 حتى Vp = 10 V.', check: (s) => s.wired && s.on && Math.abs(s.vp - 10) <= 0.05 },
      { t: 'أدر البرغي حتى V1 = V2، ثم «سجّل الصفر».', check: () => data.nul != null },
      { t: 'سجّل عند ±1 و±2 و±3 mm من الصفر.', check: () => TARGETS.every((t) => data.rows[t]) },
      { t: 'حرّك القلب أبعد من 6 mm ولاحظ اللاخطية في الرسم.', check: (s) => s.far },
    ]);
    function compute() {
      const powered = st.on && B.connected('ps.p', 'kit.p12') && B.connected('ps.n', 'kit.m12') && B.connected('ps.c', 'kit.gnd');
      const m = model(st.vp, st.screw, powered);
      const els = [];
      if (st.on) els.push({ a: 'ps.p', b: 'ps.c', v: 12, ri: 0.05, ilim: 1 }, { a: 'ps.c', b: 'ps.n', v: 12, ri: 0.05, ilim: 1 });
      if (powered) els.push({ a: 'kit.o1', b: 'kit.gnd', v: m.dc1, ri: 100 }, { a: 'kit.o2', b: 'kit.gnd', v: m.dc2, ri: 100 });
      els.push({ a: 'd1.v', b: 'd1.com', r: 10e6 }, { a: 'd2.v', b: 'd2.com', r: 10e6 });
      const s = B.solve(els);
      return { powered, m, v1: +s.vd('d1.v', 'd1.com')[0].toFixed(3), v2: +s.vd('d2.v', 'd2.com')[0].toFixed(3) };
    }
    function update() {
      const c = B.check(NETS); st.wired = c.ok;
      const k = compute();
      const ref = data.nul != null ? data.nul : L0 + OFFSET, disp = st.screw - ref;
      if (Math.abs(disp) > 6 && k.powered) st.far = true;
      const xc = -8 + k.m.xc * 0.5;
      core.position.set(xc, cy, cz);
      const coreEnd = xc + 6.5, thX = 12.5 + (st.screw - 15) * 0.5;
      rod.scale.y = Math.max(0.1, thX - 2.1 - coreEnd); rod.position.set((coreEnd + thX - 2.1) / 2, cy, cz);
      thimble.position.set(thX, cy, cz); thimble.rotation.x = st.screw * 4;
      const mx = M0 * 10 * 2;
      coils[0].material.emissive.setRGB(0.55 * k.m.vs1 / mx, 0.22 * k.m.vs1 / mx, 0);
      coils[2].material.emissive.setRGB(0.55 * k.m.vs2 / mx, 0.22 * k.m.vs2 / mx, 0);
      coils[1].material.emissive.setRGB(k.powered ? 0.25 : 0, k.powered ? 0.1 : 0, 0);
      vr5.set(-135 + 270 * (st.vp / 14));
      ps.lcd('12.00', st.on); ps.power(st.on); ps.knob(0.8);
      d1.show(L.lcdText(k.v1, 3, 5), 'V', 'DC'); d2.show(L.lcdText(k.v2, 3, 5), 'V', 'DC');
      B.dirty();
      L.setText('lv-v1', L.fx(k.v1, 3) + ' V', root); L.setText('lv-v2', L.fx(k.v2, 3) + ' V', root);
      L.setText('lv-df', L.fx(k.v2 - k.v1, 3) + ' V', root);
      L.setText('lv-x', data.nul != null ? (disp >= 0 ? '+' : '') + L.fx(disp, 2) + ' mm' : '—', root);
      chips.innerHTML = data.nul == null ? '<span class="muted" style="font-size:13px">بعد تسجيل الصفر</span>' : TARGETS.map((t) => `<button type="button" class="chip" data-d="${t}">${t > 0 ? '+' : ''}${t}</button>`).join('');
      Lab3D.statusText(B, c, st.on, st.on && c.ok && Math.abs(st.vp - 10) > 0.05 ? `Vp = ${st.vp.toFixed(2)} V (المطلوب 10)` : '');
      if (c.ok && st.on && Math.abs(st.vp - 10) <= 0.05 && Math.abs(k.v1 - k.v2) <= 0.01) B.status('V1 = V2 · موضع الصفر', 'ok');
      guide.update(st);
      const m1 = [], m2 = [], m3 = [], p1 = [], p2 = [], p3 = [];
      for (let i = 0; i <= 80; i++) { const d = -10 + i / 4, mm = model(10, ref + d, true); m1.push([d, mm.dc1]); m2.push([d, mm.dc2]); m3.push([d, mm.dc2 - mm.dc1]); }
      TARGETS.forEach((t) => { const r = data.rows[t]; if (r) { p1.push([t, r.v1]); p2.push([t, r.v2]); p3.push([t, r.v2 - r.v1]); } });
      plot.set([
        { name: 'V1', color: 'var(--s1)', points: p1, markers: true },
        { name: 'V2', color: 'var(--s2)', points: p2, markers: true, marker: 'square' },
        { name: 'V2 − V1', color: 'var(--s3)', points: p3, markers: true, marker: 'triangle' },
        { name: 'a', color: 'var(--s1)', points: m1, faint: true, legend: false, hover: false },
        { name: 'b', color: 'var(--s2)', points: m2, faint: true, legend: false, hover: false },
        { name: 'c', color: 'var(--s3)', points: m3, faint: true, legend: false, hover: false },
      ], []);
    }
    function table() {
      L.$('#lv-table', root).innerHTML = L.table(['الإزاحة (mm)', 'V1', 'V2', 'V2 − V1', 'الاتجاه'], TARGETS.map((t) => { const r = data.rows[t]; return [n(t === 0 ? '0 (Null)' : (t > 0 ? '+' : '') + t), r && n(r.v1.toFixed(3)), r && n(r.v2.toFixed(3)), r && n((r.v2 - r.v1).toFixed(3)), r && (t === 0 ? 'Null' : t < 0 ? 'نحو S1' : 'نحو S2')]; })) + `<p class="muted" style="padding:8px 12px;font-size:13px">طول البرغي عند الصفر: ${n(data.nul != null ? data.nul.toFixed(2) + ' mm' : '—')}</p>`;
    }
    L.$('#lv-null', root).addEventListener('click', () => {
      const k = compute();
      if (!st.wired || !k.powered) return L.toast('أكمل التوصيل وشغّل المجهز', 'warn');
      if (Math.abs(st.vp - 10) > 0.05) return L.toast('اضبط Vp = 10 V أولاً', 'warn');
      if (Math.abs(k.v1 - k.v2) > 0.01) return L.toast('V1 ≠ V2 بعد: حرّك البرغي بخطوات 0.01', 'warn');
      data.nul = st.screw; data.rows = { 0: { v1: k.v1, v2: k.v2 } };
      save(); table(); update(); L.toast(`الصفر عند ${st.screw.toFixed(2)} mm`);
    });
    L.$('#lv-rec', root).addEventListener('click', () => {
      const k = compute();
      if (!k.powered) return L.toast('أكمل التوصيل وشغّل المجهز', 'warn');
      if (data.nul == null) return L.toast('سجّل موضع الصفر أولاً', 'warn');
      const d = st.screw - data.nul, t = Math.round(d);
      if (Math.abs(d - t) > 0.02 || Math.abs(t) > 3) return L.toast('انتقل إلى ±1 أو ±2 أو ±3 mm', 'warn');
      data.rows[t] = { v1: k.v1, v2: k.v2 };
      save(); table(); update(); L.toast(`سُجّلت عند ⁦${t > 0 ? '+' : ''}${t} mm⁩`);
    });
    L.$('#lv-copy', root).addEventListener('click', () => L.copyTable(L.$('#lv-table table', root)));
    L.$('#lv-clear', root).addEventListener('click', () => { data = { nul: null, rows: {} }; save(); table(); update(); });
    B.onWires(update);
    table(); update();
  }

  L.register({
    id: 'lvdt', num: 7, group: 'transducers',
    title: 'المحوّل التفاضلي LVDT', en: 'Linear Variable Differential Transformer', sheet: 'Experiment No. (6) — LVDT',
    tags: ['KL-620'], summary: 'تحويل إزاحة القلب الحديدي إلى جهد كهربائي.',
    goal: 'دراسة مبدأ عمل LVDT وكيف تتحول الإزاحة إلى إشارة كهربائية.',
    mount,
    theory: () => `<div class="theory-grid"><div class="prose">
      <h2>الفكرة</h2>
      <p>ملف ابتدائي P في الوسط وملفان ثانويان S1 و S2، والقلب الحديدي يغيّر الربط بينها:</p>
      ${L.eq('V<sub>o</sub> = V<sub>S2</sub> − V<sub>S1</sub>')}
      <ul><li><b>المقدار</b> = مقدار الإزاحة، <b>الطور</b> = الاتجاه (ينقلب 180° عند الصفر).</li><li>عند الصفر يبقى جهد صغير متبقٍّ (mV).</li><li>وحدة KL-620: مذبذب 338 Hz، و VR5 يضبط Vp، والخرج مقوَّم إلى Vo30-1 و Vo30-2.</li></ul>
      <h3>الأجهزة</h3><div class="chips-eq"><span>وحدة KL-620</span><span>مجهز ±12 V</span><span>ملتيميتر ×2</span><span>برغي ميكرومتري</span></div>
    </div><figure class="figure">${S.svg(360, 170, `${S.coil(70, 40, 70, 130, { turns: 6, body: 80 })}<rect x="104" y="30" width="10" height="110" fill="var(--ink-2)"/>${S.coil(150, 20, 150, 75, { turns: 4, body: 46 })}${S.coil(150, 95, 150, 150, { turns: 4, body: 46 })}${S.text(40, 90, 'P', { cls: 'big' })}${S.text(176, 52, 'S1', { cls: 'big', anchor: 'start' })}${S.text(176, 128, 'S2', { cls: 'big', anchor: 'start' })}${S.wire([[150, 75], [150, 95]])}${S.wire([[150, 20], [250, 20]])}${S.wire([[150, 150], [250, 150]])}${S.text(270, 90, 'Vo', { cls: 'big acc', anchor: 'start' })}`, 'LVDT')}<figcaption>الثانويان على التوالي بتعاكس</figcaption></figure></div>`,
    calc: () => {
      const pts = TARGETS.filter((t) => data.rows[t]).map((t) => [t, data.rows[t].v2 - data.rows[t].v1]);
      let fit = '<p class="muted">سجّل ثلاث قراءات على الأقل.</p>';
      if (pts.length >= 3) {
        const N = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0), sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
        const m = (N * sxy - sx * sy) / (N * sxx - sx * sx);
        fit = `${L.eq(`الحساسية ≈ ${m.toFixed(3)} V/mm`)}`;
      }
      return `<h2>الحساسية</h2>${fit}<h2>الاستنتاج</h2><p>الخرج خطي تقريباً ضمن ±3 mm، يزداد V2 نحو S2 و V1 نحو S1، ويبتعد عن الخطية كلما ابتعد القلب عن الوسط.</p>`;
    },
    discussion: [
      { en: 'What is the significance of the null position?', ar: 'ما أهمية موضع الصفر؟', a: '<p>القلب في المنتصف، VS1 = VS2، وهو مرجع القياس في الاتجاهين وأكثر المناطق خطية.</p>' },
      { en: 'What happens to output voltage when the core moves left or right?', ar: 'ماذا يحدث عند تحريك القلب؟', a: '<p>نحو S2 يزداد V2 وينقص V1، ونحو S1 العكس، وينقلب طور الخرج 180°.</p>' },
      { en: 'Why must the primary be supplied with AC and not DC?', ar: 'لماذا جهد متناوب لا مستمر؟', a: '<p>الحث المتبادل يحتاج فيضاً متغيراً؛ المستمر لا يحتث جهداً في الثانويين.</p>' },
      { en: 'Why does the output become non-linear far from null?', ar: 'لماذا اللاخطية بعيداً عن الصفر؟', a: '<p>يخرج طرف القلب من منطقة الملفات فيتشبّع تغيّر الربط ويقل الميل.</p>' },
    ],
  });
})();
