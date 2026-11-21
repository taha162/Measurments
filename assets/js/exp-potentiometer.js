/* Experiment 4 — Rotary potentiometer with analog and digital voltmeters (3D bench). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const RT = 9860, VS = 5, POS = [0, 0.25, 0.5, 0.75, 1];
  const KEY = 'pot';
  const W_RT = [['dm.v', 'pb.B'], ['dm.com', 'pb.A']];
  const W_RAW = [['dm.v', 'pb.W'], ['dm.com', 'pb.A']];
  const W_AN = [['ps.p', 'pb.B'], ['ps.n', 'pb.A', 'av.n'], ['pb.W', 'av.p']];
  const W_DG = [['ps.p', 'pb.B'], ['ps.n', 'pb.A', 'dm.com'], ['pb.W', 'dm.v']];
  let data = L.store.get(KEY + ':data2', { RT: null, rows: [{}, {}, {}, {}, {}] });
  const save = () => L.store.set(KEY + ':data2', data);
  const loaded = (x, Rm) => { const vth = x * VS, rth = x * (1 - x) * RT; return (vth * Rm) / (Rm + rth); };

  function schematic() {
    let s = S.wire([[60, 112], [60, 50], [200, 50]]) + S.wire([[200, 250], [60, 250], [60, 188]]) + S.bat(60, 112, 60, 188, { label: 'Vs = 5 V', off: -16 });
    s += S.res(200, 50, 200, 250, { body: 150 }) + S.gnd(60, 250) + S.dot(200, 50) + S.text(212, 44, 'B (+)', { anchor: 'start' }) + S.dot(200, 250) + S.text(212, 268, 'A (GND)', { anchor: 'start' });
    s += `<line class="w" x1="252" y1="150" x2="212" y2="150" marker-end="url(#arrowhead)"/>` + S.text(258, 142, 'W', { cls: 'acc big', anchor: 'start' });
    s += S.wire([[252, 150], [400, 150], [400, 183]]) + S.wire([[400, 217], [400, 250], [200, 250]]) + S.meter(400, 200, 'V', { label: 'Voltmeter', lx: 424, ly: 204, anchor: 'start', lcls: 'sub' });
    return S.svg(500, 290, s, 'دائرة مجزئ الجهد');
  }

  function mount(root) {
    if (!window.Lab3D || !Lab3D.ok()) return Lab3D.fallback(root);
    const st = { th: 0, on: false, sens: 2000, dmode: 1, wired: false };
    root.innerHTML = Lab3D.layout('pt', { chart: 'Vout مقابل الموضع' });
    const B = Lab3D.Bench(L.$('#pt-stage', root), { cam: [0, 64, 80] });
    const ps = B.supply({ id: 'ps', x: -42, z: -15, sub: 'FIXED 5 V', onPower: () => pwr.set(!st.on) });
    const av = B.analog({ id: 'av', x: -8, z: -16, unit: 'V', title: 'DC VOLTMETER', brand: 'CLASS 2.5', scales: [{ ticks: L.linTicks(0, 10, 1, 0.2), name: 'V' }] });
    const dm = B.dmm({ id: 'dm', x: 28, z: -14, modes: ['V⎓', 'Ω'], title: 'DIGITAL MULTIMETER', jacks: [['dm.com', 'black', 'COM', -2.4], ['dm.v', 'red', 'VΩ', 2.4]], onMode: (i) => modeSeg.set(i) });
    const pb = B.board({ id: 'pb', x: 4, z: 15, w: 30, d: 20, color: 0x7a2f2f });
    pb.text(0, -8.2, 'ROTARY POT  B10K', 15, '#fff');
    pb.trace([[-10, 5], [-4, 1.5]]); pb.trace([[0, 6], [0, 2.4]]); pb.trace([[10, 5], [4, 1.5]]);
    const T = B.THREE;
    const base = B.mesh(new T.CylinderGeometry(3.4, 3.4, 1.4, 32), B.M(0xa9aeb2, { r: 0.35, m: 0.7 })); base.position.set(0, pb.y + 0.7, -1.5); pb.add(base);
    const shaft = B.mesh(new T.CylinderGeometry(0.9, 0.9, 1.6, 20), B.M(0xc4c8cc, { r: 0.3, m: 0.8 })); shaft.position.set(0, pb.y + 2.2, -1.5); pb.add(shaft);
    const kn = pb.knob('pb.k', 0, -1.5, { r: 2.6, h: 2.0, color: 0x1f2326, drag: (d, f) => setTh(st.th + d * (f ? 0.1 : 0.9)) });
    kn.cap.parent.parent.position.y = pb.y + 2.6;
    pb.dyn((ctx, Q) => {
      const [cx, cy] = Q(0, -1.5);
      POS.forEach((p) => { const a = ((-135 + 270 * p) * Math.PI) / 180, r = 5.6 * 22; Lab3D.txt(ctx, p * 100 + '%', cx + Math.sin(a) * r, cy - Math.cos(a) * r, 15, '#ffe08a'); });
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 4.3 * 22, (-135 - 90) * Math.PI / 180, (135 - 90) * Math.PI / 180); ctx.stroke();
    });
    pb.jack('pb.A', -10, 5, 'black', 'A'); pb.jack('pb.W', 0, 6, 'yellow', 'W'); pb.jack('pb.B', 10, 5, 'red', 'B');
    B.tipFor('dm.sel', 'وضع الملتيميتر: اضغط للتبديل');

    const ctl = L.$('#pt-ctl', root);
    ctl.innerHTML = `<div id="pt-pwr"></div><div id="pt-th"></div><div class="ctl-grp"><span class="lbl-s">المواضع</span><div class="chips" id="pt-chips"></div></div><div class="ctl-grp"><span class="lbl-s">الملتيميتر</span><div id="pt-mode"></div></div>
      <label class="field"><span>حساسية التناظري</span><select id="pt-sens">${[1000, 2000, 5000, 20000].map((s) => `<option value="${s}"${s === st.sens ? ' selected' : ''}>${s / 1000} kΩ/V</option>`).join('')}</select></label>`;
    const pwr = L.Power(L.$('#pt-pwr', root), { label: 'المجهز 5 V', value: false, onChange: (v) => { st.on = v; update(); } });
    const thNum = L.Num(L.$('#pt-th', root), { id: 'pt-thn', label: 'زاوية المقبض', unit: '°', min: 0, max: 270, value: 0, steps: [1, 10], quant: 0.5, decimals: 1, onInput: (v) => { st.th = v; update(); } });
    const setTh = (v) => { v = L.clamp(v, 0, 270); for (const p of POS) if (Math.abs(v - p * 270) < 3) v = p * 270; thNum.set(v); };
    L.$('#pt-chips', root).innerHTML = POS.map((p) => `<button type="button" class="chip" data-p="${p}">${p * 100}%</button>`).join('');
    L.$('#pt-chips', root).addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) setTh(+c.dataset.p * 270); });
    const modeSeg = L.Seg(L.$('#pt-mode', root), { options: [{ v: 0, label: 'V' }, { v: 1, label: 'Ω' }], value: 1, onChange: (v) => { st.dmode = +v; dm.mode(+v); update(); } });
    dm.mode(1);
    L.$('#pt-sens', root).addEventListener('change', (e) => { st.sens = +e.target.value; update(); });
    L.$('#pt-ro', root).innerHTML = L.ro('pt-x', 'الموضع') + L.ro('pt-av', 'التناظري', 'hl') + L.ro('pt-dm', 'الرقمي', 'hl') + L.ro('pt-th', 'النظري x·Vs');
    const plot = L.Plot(L.$('#pt-plot', root), { xLabel: 'Potentiometer position x (%)', yLabel: 'Vout (V)', x: [0, 100], y: [0, 5.5], height: 250, tipX: (v) => L.fx(v, 0) + ' %', tipY: (v) => L.fx(v, 3) + ' V' });
    const guide = Lab3D.guide(L.$('#pt-guide', root), B, [
      { t: 'المجهز مفصول: الملتيميتر (Ω) بين A و B، سجّل RT.', wire: W_RT, check: () => data.RT != null },
      { t: 'انقل الطرف الأحمر إلى W، وسجّل RAW عند المواضع الخمسة.', wire: W_RAW, check: () => data.rows.every((r) => r.R != null) },
      { t: 'وصّل المجهز (B +5 V، A أرضي) والفولتميتر التناظري بين W و A، وسجّل.', wire: W_AN, check: () => data.rows.every((r) => r.Va != null) },
      { t: 'استبدل التناظري بالملتيميتر (V) وسجّل.', wire: W_DG, check: () => data.rows.every((r) => r.Vd != null) },
    ]);

    function compute() {
      const x = st.th / 270, els = [];
      if (st.on) els.push({ a: 'ps.p', b: 'ps.n', v: VS, ri: 0.05, ilim: 1 });
      els.push({ a: 'pb.A', b: 'pb.W', r: Math.max(x * RT, 0.5) }, { a: 'pb.W', b: 'pb.B', r: Math.max((1 - x) * RT, 0.5) });
      els.push({ a: 'av.p', b: 'av.n', r: st.sens * 10 });
      if (st.dmode === 0) els.push({ a: 'dm.v', b: 'dm.com', r: 10e6 }); else els.push({ a: 'dm.v', b: 'dm.com', i: 1e-4 });
      const s = B.solve(els);
      const va = s.vd('av.p', 'av.n')[0], dv = s.vd('dm.v', 'dm.com')[0];
      return { x, va, dmV: dv, dmR: dv / 1e-4, s };
    }
    function update() {
      const k = compute();
      const steps = [W_RT, W_RAW, W_AN, W_DG];
      const c = B.check(); st.wired = c.ok;
      kn.set(-135 + st.th);
      ps.lcd('5.00', st.on); ps.power(st.on); ps.knob(1 / 3);
      av.set(k.va / 10);
      if (st.dmode === 0) dm.show(L.lcdText(k.dmV, 3, 5), 'V', 'DC');
      else dm.show(Math.abs(k.dmR) > 4e7 ? 'OL' : L.lcdText(k.dmR / 1000, 3, 5), 'kΩ', 'Ω');
      L.setText('pt-x', `${L.fx(k.x * 100, 1)} %`, root);
      L.setText('pt-av', L.fx(k.va, 2) + ' V', root);
      L.setText('pt-dm', st.dmode === 0 ? L.fx(k.dmV, 3) + ' V' : Math.abs(k.dmR) > 4e7 ? 'OL' : L.fx(k.dmR / 1000, 3) + ' kΩ', root);
      L.setText('pt-th', L.fx(k.x * VS, 3) + ' V', root);
      const ohmBad = st.dmode === 1 && st.on && B.connected('ps.p', 'pb.B');
      Lab3D.statusText(B, c, true, ohmBad ? 'افصل المجهز قبل استخدام الأوميتر' : '');
      if (c.ok && !st.on && B.connected('ps.p', 'pb.B')) B.status('الدائرة موصولة · شغّل المجهز', 'warn');
      void steps;
      guide.update(st);
      chart(k);
    }
    function record() {
      const k = compute(), idx = POS.findIndex((p) => Math.abs(st.th - p * 270) < 0.6);
      const across = (p, m, a = 'pb.A') => B.connected(p, m) && B.connected('dm.com', a);
      const dmAB = B.connected('dm.v', 'pb.B') && B.connected('dm.com', 'pb.A');
      const dmWA = B.connected('dm.v', 'pb.W') && B.connected('dm.com', 'pb.A');
      const avWA = B.connected('av.p', 'pb.W') && B.connected('av.n', 'pb.A');
      void across;
      if (st.dmode === 1 && (dmAB || dmWA)) {
        if (st.on && B.connected('ps.p', 'pb.B')) return L.toast('افصل المجهز قبل قياس المقاومة', 'bad');
        if (dmAB) { data.RT = +(k.dmR / 1000).toFixed(3); save(); table(); update(); return L.toast('سُجّلت RT'); }
        if (idx < 0) return L.toast('ضع المقبض على أحد المواضع الخمسة', 'warn');
        data.rows[idx].R = +(k.dmR / 1000).toFixed(3);
      } else {
        if (!st.on || !B.connected('ps.p', 'pb.B') || !B.connected('ps.n', 'pb.A')) return L.toast('وصّل المجهز بين B و A وشغّله', 'warn');
        if (avWA && st.dmode === 0 && dmWA) return L.toast('وصّل جهازاً واحداً فقط بين W و A', 'warn');
        if (idx < 0) return L.toast('ضع المقبض على أحد المواضع الخمسة', 'warn');
        if (avWA) data.rows[idx].Va = Math.round(k.va / 0.05) * 0.05;
        else if (dmWA && st.dmode === 0) data.rows[idx].Vd = +k.dmV.toFixed(3);
        else return L.toast('وصّل الفولتميتر بين W و A', 'warn');
      }
      save(); table(); update();
      L.toast(`سُجّلت القراءة عند ${POS[idx] * 100}%`);
    }
    function table() {
      L.$('#pt-table', root).innerHTML = L.table(['الموضع', 'RAW (kΩ)', 'التناظري (V)', 'الرقمي (V)', 'النظري (V)'], POS.map((p, i) => { const r = data.rows[i]; return [p * 100 + '%', r.R != null ? n(r.R.toFixed(3)) : '', r.Va != null ? n(r.Va.toFixed(2)) : '', r.Vd != null ? n(r.Vd.toFixed(3)) : '', n((p * VS).toFixed(2))]; })) + `<p class="muted" style="padding:8px 12px;font-size:13px">RT = ${n(data.RT != null ? data.RT + ' kΩ' : '—')}</p>`;
    }
    function chart(k) {
      const th = [[0, 0], [100, VS]], va = [], vd = [], model = [];
      data.rows.forEach((r, i) => { if (r.Va != null) va.push([POS[i] * 100, r.Va]); if (r.Vd != null) vd.push([POS[i] * 100, r.Vd]); });
      for (let i = 0; i <= 40; i++) model.push([i * 2.5, loaded(i / 40, st.sens * 10)]);
      plot.set([
        { name: 'النظري', color: 'var(--muted)', points: th, dash: true, hover: false },
        { name: 'نموذج التحميل', color: 'var(--s1)', points: model, faint: true, hover: false, legend: false },
        { name: 'التناظري', color: 'var(--s1)', points: va, markers: true },
        { name: 'الرقمي', color: 'var(--s2)', points: vd, markers: true, marker: 'square' },
      ], []);
      void k;
    }
    L.$('#pt-rec', root).addEventListener('click', record);
    L.$('#pt-copy', root).addEventListener('click', () => L.copyTable(L.$('#pt-table table', root)));
    L.$('#pt-clear', root).addEventListener('click', () => { data = { RT: null, rows: [{}, {}, {}, {}, {}] }; save(); table(); update(); });
    B.onWires(update);
    table(); update();
  }

  L.register({
    id: 'potentiometer', num: 4, group: 'resistance',
    title: 'مجزئ الجهد بالفولتميتر التناظري والرقمي',
    en: 'Rotary Potentiometer: Analog vs Digital Voltmeters',
    sheet: 'Experiment No. (4) — Rotary Potentiometer by Analog and Digital Voltmeters',
    tags: ['B10K', 'Loading effect'],
    summary: 'مقارنة الفولتميتر التناظري والرقمي على مجزئ 10 kΩ.',
    goal: 'قياس خرج مجزئ جهد دوّار 10 kΩ بفولتميتر تناظري ورقمي، ومقارنتهما بالقيمة النظرية.',
    mount,
    theory: () => `<div class="theory-grid"><div class="prose">
      <h2>الفكرة</h2>
      <p>الجهد بين W و A يساوي نظرياً ${n('x · Vs')}. الفولتميتر يسحب تياراً فيخفض القراءة (تأثير التحميل):</p>
      ${L.eq(`V<sub>out</sub> = x V<sub>s</sub> · ${L.frac('R<sub>m</sub>', 'R<sub>m</sub> + x(1−x)R<sub>T</sub>')}`)}
      <ul><li><b>التناظري:</b> ${n('Rm = S × 10 V')} (مثلاً 20 kΩ) ⇒ خطأ واضح.</li><li><b>الرقمي:</b> ${n('Rm ≈ 10 MΩ')} ⇒ خطأ مهمل.</li><li>قِس المقاومة والمجهز <b>مفصول</b>.</li></ul>
      <h3>الأجهزة</h3><div class="chips-eq"><span>مجزئ B10K</span><span>مجهز 5 V</span><span>فولتميتر تناظري 0–10 V</span><span>ملتيميتر رقمي</span></div>
    </div><figure class="figure">${schematic()}<figcaption>جهاز واحد فقط بين W و A</figcaption></figure></div>`,
    calc: () => {
      const rows = POS.map((p, i) => { const r = data.rows[i], th = p * VS, va = r.Va != null ? r.Va : loaded(p, 20000), vd = r.Vd != null ? r.Vd : loaded(p, 10e6); const e = (v) => (th ? (((v - th) / th) * 100).toFixed(1) + '%' : '—'); return [p * 100 + '%', n(th.toFixed(2)), n(va.toFixed(2)), n(e(va)), n(vd.toFixed(3)), n(e(vd))]; });
      return `<h2>المقارنة</h2><div class="table-wrap">${L.table(['الموضع', 'النظري', 'التناظري', 'خطأ', 'الرقمي', 'خطأ'], rows)}</div>
        <p class="muted" style="font-size:13.5px">القيم غير المسجّلة محسوبة من المعادلة.</p>
        <h2>الاستنتاج</h2><p>الرقمي يطابق النظري، والتناظري أقل بسبب التحميل، وأكبر فرق قرب 2/3 من الدوران. المجزئ خطي (B).</p>`;
    },
    discussion: [
      { en: 'Why did the analog and digital readings differ?', ar: 'لماذا اختلف الجهازان؟', a: '<p>تأثير التحميل: مقاومة التناظري (عشرات kΩ) تقارب مقاومة المجزئ، أما الرقمي (10 MΩ) فلا يحمّل الدائرة.</p>' },
      { en: 'At which position was the difference between the two meters the largest?', ar: 'أين كان الفرق أكبر؟', a: '<p>الفرق المطلق أكبر عند 75% (قرب 2/3)، والنسبي أكبر عند 50%. لا فرق عند 0% و100%.</p>' },
      { en: 'From your graph, is the potentiometer linear or logarithmic?', ar: 'هل المجزئ خطي أم لوغاريتمي؟', a: '<p>خطي: RAW وقراءات الرقمي تزداد بخطوات متساوية على خط مستقيم.</p>' },
      { en: 'Define accuracy, precision and resolution of a voltmeter.', ar: 'عرّف الدقة والضبط والتمييز.', a: '<ul><li><b>الدقة:</b> قرب القراءة من الحقيقة.</li><li><b>الضبط:</b> تقارب القراءات المتكررة.</li><li><b>التمييز:</b> أصغر تغيّر يُظهره الجهاز.</li></ul><p>الرقمي أفضل في الثلاثة.</p>' },
      { en: 'Give two advantages of an analog voltmeter over a digital voltmeter.', ar: 'ميزتان للتناظري؟', a: '<p>يُظهر اتجاه التغيّر بشكل مستمر، ولا يحتاج بطارية لقياس الجهد.</p>' },
    ],
  });
})();
