/* Experiments 5 & 6 — unknown L and C by equal voltages with a series R at 1 kHz (3D bench). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const TAU = 2 * Math.PI;

  function schematic(kind) {
    const top = kind === 'L' ? 'L' : 'R', bot = kind === 'L' ? 'R' : 'C';
    const comp = (k, y1, y2) => (k === 'L' ? S.coil(250, y1, 250, y2, { label: 'L (r)', off: -16 }) : k === 'C' ? S.cap(250, y1, 250, y2, { label: 'C', off: -18 }) : S.res(250, y1, 250, y2, { variable: true, label: 'R', off: -18 }));
    let s = S.wire([[70, 132], [70, 40], [250, 40]]) + S.wire([[250, 260], [70, 260], [70, 168]]) + comp(top, 40, 150) + comp(bot, 150, 260);
    s += S.dot(250, 40) + S.dot(250, 150) + S.dot(250, 260) + S.wire([[250, 40], [370, 40], [370, 78]]) + S.wire([[370, 112], [370, 188]]) + S.wire([[370, 222], [370, 260], [250, 260]]) + S.wire([[250, 150], [370, 150]]) + S.dot(370, 150);
    s += S.meter(370, 95, 'V', { label: 'V' + top, lx: 394, ly: 99, anchor: 'start', lcls: 'acc' }) + S.meter(370, 205, 'V', { label: 'V' + bot, lx: 394, ly: 209, anchor: 'start', lcls: 'acc' });
    s += S.ac(70, 150, { label: 'sine', sub: '1 kHz', lx: 96, ly: 146, anchor: 'start' });
    return S.svg(450, 290, s, 'مخطط الدائرة');
  }

  function makeAC(cfg) {
    const K = cfg.kind, KEY = cfg.id, VX = K === 'L' ? 'VL' : 'VC';
    let data = L.store.get(KEY + ':data2', { rows: [], r: {} });
    const save = () => L.store.set(KEY + ':data2', data);
    const fmtX = (v) => L.si(v, K === 'L' ? 'H' : 'F', 4);
    const result = (R, VR, VXv, f, r) => (K === 'L' ? (R * R - r * r > 0 ? Math.sqrt(R * R - r * r) / (TAU * f) : NaN) : VR / (TAU * f * R * VXv));

    function mount(root) {
      if (!window.Lab3D || !Lab3D.ok()) return Lab3D.fallback(root);
      const st = { f: 1000, vs: 5, R: cfg.R0, unk: 0, on: false, d1: 0, wired: false };
      root.innerHTML = Lab3D.layout(KEY);
      const $ = (id) => L.$('#' + KEY + '-' + id, root);
      const B = Lab3D.Bench($('stage'), { cam: [0, 70, 88] });
      let fNum, aNum, rNum; const acc = [0, 0, 0, 0];
      const fg = B.generator({ id: 'fg', x: -42, z: -15, onFreq: (d) => fNum.set(st.f + Math.round(d) * 10), onAmp: (d) => aNum.set(st.vs + d * 0.05), onPower: () => pwr.set(!st.on) });
      const dec = B.decade({ id: 'dec', x: -6, z: -15, onDial: (i, d) => { acc[i] += d; const k = Math.trunc(acc[i] / 14); if (k) { acc[i] -= k * 14; rNum.set(st.R + k * [1000, 100, 10, 1][i]); } } });
      const d1 = B.dmm({ id: 'd1', x: 22, z: -14, modes: K === 'L' ? ['V~', 'Ω'] : ['V~'], title: 'DMM 1', jacks: [['d1.com', 'black', 'COM', -2.4], ['d1.v', 'red', 'VΩ', 2.4]], onMode: (i) => modeSeg && modeSeg.set(i) });
      const d2 = B.dmm({ id: 'd2', x: 38, z: -14, modes: ['V~'], title: 'DMM 2', color: 0xe8901a, jacks: [['d2.com', 'black', 'COM', -2.4], ['d2.v', 'red', 'VΩ', 2.4]] });
      const xb = B.board({ id: 'xb', x: -4, z: 15, w: 26, d: 15, color: 0x24456e });
      xb.text(0, -5.8, K === 'L' ? 'UNKNOWN INDUCTOR' : 'UNKNOWN CAPACITOR', 15, '#fff');
      xb.trace([[-9, 3], [-5, 3], [-5, 0]]); xb.trace([[9, 3], [5, 3], [5, 0]]);
      if (K === 'L') xb.coil(0, 0); else xb.cap(0, 0.4, { text: '? nF', css: '#2f6fd6' });
      xb.dyn((ctx, Q) => { const [x, y] = Q(0, 4.6); Lab3D.txt(ctx, cfg.unknowns[st.unk].id, x, y, 17, '#ffe08a'); });
      xb.jack('xb.1', -9, 3, 'yellow', 'X1'); xb.jack('xb.2', 9, 3, 'yellow', 'X2');
      B.tipFor('d1.sel', 'وضع الملتيميتر: اضغط للتبديل');

      $('ctl').innerHTML = `<div id="${KEY}-pwr"></div><div id="${KEY}-f"></div><div id="${KEY}-a"></div><div id="${KEY}-R"></div>
        <div class="ctl-grp"><span class="lbl-s">${K === 'L' ? 'الملف' : 'المتسعة'}</span><div id="${KEY}-unk"></div></div>${K === 'L' ? `<div class="ctl-grp"><span class="lbl-s">الملتيميتر 1</span><div id="${KEY}-m1"></div></div>` : ''}`;
      const pwr = L.Power($('pwr'), { label: 'المولّد', value: false, onChange: (v) => { st.on = v; update(); } });
      fNum = L.Num($('f'), { id: KEY + '-fn', label: 'التردد', unit: 'Hz', min: 100, max: 5000, value: st.f, steps: [10, 100], quant: 10, decimals: 0, onInput: (v) => { st.f = v; update(); } });
      aNum = L.Num($('a'), { id: KEY + '-an', label: 'الجهد (rms)', unit: 'V', min: 0.5, max: 10, value: st.vs, steps: [0.1, 1], quant: 0.1, decimals: 1, onInput: (v) => { st.vs = v; update(); } });
      rNum = L.Num($('R'), { id: KEY + '-rn', label: 'صندوق المقاومات R', unit: 'Ω', min: 0, max: 9999, value: st.R, steps: [1, 10, 100], quant: 1, decimals: 0, onInput: (v) => { st.R = v; update(); } });
      L.Seg($('unk'), { options: cfg.unknowns.map((u, i) => ({ v: i, label: u.id })), value: 0, onChange: (v) => { st.unk = +v; xb.redraw(); update(); } });
      const modeSeg = K === 'L' ? L.Seg($('m1'), { options: [{ v: 0, label: 'V~' }, { v: 1, label: 'Ω' }], value: 0, onChange: (v) => { st.d1 = +v; d1.mode(+v); update(); } }) : null;
      $('ro').innerHTML = L.ro(KEY + '-vr', 'VR', 'hl') + L.ro(KEY + '-vx', VX, 'hl') + L.ro(KEY + '-res', K === 'L' ? 'L المحسوبة' : 'C المحسوبة') + (K === 'L' ? L.ro(KEY + '-r', 'r (الملف)') : L.ro(KEY + '-ph', 'الفرق'));
      const W_R = [['d1.v', 'xb.1'], ['d1.com', 'xb.2']];
      const NETS = K === 'L' ? [['fg.p', 'xb.1', 'd1.v'], ['xb.2', 'dec.a', 'd1.com', 'd2.v'], ['dec.b', 'fg.n', 'd2.com']] : [['fg.p', 'dec.a', 'd1.v'], ['dec.b', 'xb.1', 'd1.com', 'd2.v'], ['xb.2', 'fg.n', 'd2.com']];
      const steps = K === 'L' ? [
        { t: 'قِس r: الملتيميتر 1 على Ω بين X1 و X2 (المولّد غير موصول)، ثم سجّل.', wire: W_R, check: () => Object.keys(data.r).length > 0 },
        { t: 'وصّل: المولّد ← الملف ← الصندوق، وملتيميتر (V~) على كلٍّ منهما.', wire: NETS, check: (s) => s.wired && s.d1 === 0 },
        { t: 'شغّل المولّد على 1000 Hz.', check: (s) => s.wired && s.on && s.f === 1000 },
        { t: 'غيّر R حتى VR = VL، ثم سجّل.', check: () => data.rows.length > 0 },
        { t: 'أعد القياس عند 2000 Hz.', check: () => data.rows.some((r) => r.f === 2000) },
      ] : [
        { t: 'وصّل: المولّد ← الصندوق ← المتسعة، وملتيميتر على كلٍّ منهما.', wire: NETS, check: (s) => s.wired },
        { t: 'شغّل المولّد على 1000 Hz.', check: (s) => s.wired && s.on && s.f === 1000 },
        { t: 'غيّر R حتى VR = VC، ثم سجّل.', check: () => data.rows.length > 0 },
        { t: 'كرّر لمتسعة أخرى.', check: () => new Set(data.rows.map((r) => r.id)).size > 1 },
      ];
      const guide = Lab3D.guide($('guide'), B, steps);

      function compute() {
        const u = cfg.unknowns[st.unk], w = TAU * st.f;
        const ac = [], dc = [];
        if (st.on) { ac.push({ a: 'fg.p', b: 'fg.n', v: st.vs, ri: 50 }); dc.push({ a: 'fg.p', b: 'fg.n', r: 50 }); }
        if (K === 'L') { ac.push({ a: 'xb.1', b: 'xb.2', z: [u.r, w * u.L] }); dc.push({ a: 'xb.1', b: 'xb.2', r: u.r }); }
        else ac.push({ a: 'xb.1', b: 'xb.2', z: [0, -1 / (w * u.C)] });
        ac.push({ a: 'dec.a', b: 'dec.b', r: Math.max(st.R, 0.01) }); dc.push({ a: 'dec.a', b: 'dec.b', r: Math.max(st.R, 0.01) });
        ac.push({ a: 'd2.v', b: 'd2.com', r: 10e6 });
        if (st.d1 === 0) ac.push({ a: 'd1.v', b: 'd1.com', r: 10e6 }); else dc.push({ a: 'd1.v', b: 'd1.com', i: 1e-4 });
        const sa = B.solve(ac, w), sd = B.solve(dc, 0);
        const m1 = st.d1 === 0 ? Lab3D.cabs(sa.vd('d1.v', 'd1.com')) : sd.vd('d1.v', 'd1.com')[0] / 1e-4;
        const m2 = Lab3D.cabs(sa.vd('d2.v', 'd2.com'));
        const VR = K === 'L' ? m2 : m1, VXv = K === 'L' ? m1 : m2;
        return { u, m1, m2, VR: +VR.toFixed(3), VXv: +VXv.toFixed(3) };
      }
      function update() {
        const c = B.check(); st.wired = c.ok;
        const k = compute();
        fg.lcd(String(st.f), st.on); fg.power(st.on); fg.knobF((st.f - 100) / 4900); fg.knobA((st.vs - 0.5) / 9.5);
        dec.set(st.R);
        if (st.d1 === 1) d1.show(Math.abs(k.m1) > 4e7 ? 'OL' : L.lcdText(k.m1, 1, 5), 'Ω', 'Ω');
        else d1.show(L.lcdText(k.m1, 3, 5), 'V', 'AC');
        d2.show(L.lcdText(k.m2, 3, 5), 'V', 'AC');
        const ac = st.d1 === 0 && st.on && c.ok;
        const bal = ac && Math.abs(k.VR - k.VXv) <= 0.004 * Math.max(k.VR, k.VXv) && k.VR > 0.01;
        const rKnown = data.r[k.u.id];
        const live = ac ? result(st.R, k.VR, k.VXv, st.f, K === 'L' ? (rKnown != null ? rKnown : NaN) : 0) : NaN;
        L.setText(KEY + '-vr', ac ? L.fx(k.VR, 3) + ' V' : '—', root);
        L.setText(KEY + '-vx', ac ? L.fx(k.VXv, 3) + ' V' : '—', root);
        L.setText(KEY + '-res', isFinite(live) ? fmtX(live) + (bal ? '' : ' *') : '—', root);
        if (K === 'L') L.setText(KEY + '-r', rKnown != null ? rKnown + ' Ω' : 'لم تُقس', root);
        else L.setText(KEY + '-ph', ac ? L.fx(k.VR - k.VXv, 3) + ' V' : '—', root);
        const ohmOn = st.d1 === 1 && st.on && B.connected('fg.p', 'xb.1');
        Lab3D.statusText(B, c, st.d1 === 1 ? true : st.on, ohmOn ? 'افصل المولّد قبل قياس r' : bal ? '' : '');
        if (c.ok && bal) B.status(`VR = ${VX} ✓`, 'ok');
        guide.update(st);
      }
      function record() {
        const k = compute();
        if (st.d1 === 1) {
          if (!(B.connected('d1.v', 'xb.1') && B.connected('d1.com', 'xb.2')) && !(B.connected('d1.v', 'xb.2') && B.connected('d1.com', 'xb.1'))) return L.toast('وصّل الملتيميتر 1 بين طرفي الملف', 'warn');
          if (st.on && B.connected('fg.p', 'xb.1')) return L.toast('افصل المولّد أولاً', 'bad');
          data.r[k.u.id] = Math.round(k.m1 * 10) / 10; save(); table(); update();
          return L.toast(`r = ${data.r[k.u.id]} Ω`);
        }
        if (!st.wired) return L.toast('أكمل التوصيل أولاً', 'warn');
        if (!st.on) return L.toast('شغّل المولّد', 'warn');
        if (Math.abs(k.VR - k.VXv) > 0.004 * Math.max(k.VR, k.VXv)) return L.toast(`غيّر R حتى يتساوى VR و ${VX}`, 'warn');
        const r = K === 'L' ? data.r[k.u.id] : 0;
        if (K === 'L' && r == null) return L.toast('قِس r لهذا الملف أولاً (الخطوة 1)', 'warn');
        data.rows.push({ id: k.u.id, f: st.f, R: st.R, VR: k.VR, VX: k.VXv, r, val: result(st.R, k.VR, k.VXv, st.f, r) });
        save(); table(); update();
        L.toast(`سُجّل: ${K} = ${fmtX(data.rows[data.rows.length - 1].val)}`);
      }
      function table() {
        const head = ['العنصر', 'f (Hz)', 'R (Ω)', 'VR (V)', VX + ' (V)'].concat(K === 'L' ? ['r (Ω)'] : [], [K === 'L' ? 'L' : 'C']);
        const rows = data.rows.map((r) => [r.id, n(r.f), n(r.R), n(r.VR.toFixed(3)), n(r.VX.toFixed(3))].concat(K === 'L' ? [n(r.r)] : [], [`<b>${n(fmtX(r.val))}</b>`]));
        $('table').innerHTML = L.table(head, rows.length ? rows : [Array(head.length).fill('')]);
      }
      $('rec').addEventListener('click', record);
      $('copy').addEventListener('click', () => L.copyTable(L.$('table', $('table'))));
      $('clear').addEventListener('click', () => { data = { rows: [], r: {} }; save(); table(); update(); });
      B.onWires(update);
      table(); update();
    }

    L.register({
      id: cfg.id, num: cfg.num, group: 'ac', title: cfg.title, en: cfg.en, sheet: cfg.sheet, tags: cfg.tags, summary: cfg.summary, goal: cfg.goal, mount,
      theory: () => `<div class="theory-grid"><div class="prose">${cfg.theory()}</div><figure class="figure">${schematic(K)}<figcaption>مخطط الدائرة</figcaption></figure></div>`,
      calc: () => {
        const r = data.rows[data.rows.length - 1];
        if (!r) return `<p class="muted">سجّل قراءة من <a href="#" data-goto-tab="sim">المختبر</a> لتظهر الحسابات هنا.</p>`;
        return cfg.calcText(r) + `<h2>كل القراءات</h2><div class="table-wrap">${L.table(['العنصر', 'f', 'R', K], data.rows.map((x) => [x.id, n(x.f + ' Hz'), n(x.R + ' Ω'), n(fmtX(x.val))]))}</div>`;
      },
      discussion: cfg.discussion,
    });
  }

  makeAC({
    kind: 'L', id: 'inductance', num: 5, R0: 100,
    title: 'قياس المحاثة', en: 'Inductive Measurement', sheet: 'Experiment No. (3) — Inductive Measurement',
    tags: ['1 kHz'], summary: 'إيجاد محاثة ملف بتساوي VR و VL.',
    goal: 'قياس محاثة ملف موصول على التوالي مع مقاومة، عند تساوي الجهدين وتردد 1000 Hz.',
    unknowns: [{ id: 'L-A', L: 47e-3, r: 62 }, { id: 'L-B', L: 100e-3, r: 145 }, { id: 'L-C', L: 220e-3, r: 280 }],
    theory: () => `<h2>الفكرة</h2><p>نغيّر R حتى يتساوى الجهدان، فتتساوى الممانعتان: ${n('R = √(r² + XL²)')}.</p>
      ${L.eq(`L = ${L.frac(L.sqrt('R<sup>2</sup> − r<sup>2</sup>'), '2πf')}`)}
      <ul><li>${n('r')}: مقاومة سلك الملف (تُقاس بالأوميتر).</li><li>${n('VR + VL ≠ Vs')} لأن الجهدين مختلفان في الطور.</li></ul>
      <h3>الأجهزة</h3><div class="chips-eq"><span>مولّد دوال</span><span>صندوق مقاومات</span><span>ملف مجهول</span><span>ملتيميتر ×2</span></div>`,
    calcText: (r) => `<h2>الحساب</h2>${L.eq(`L = ${L.frac(L.sqrt(`${r.R}<sup>2</sup> − ${r.r}<sup>2</sup>`), `2π × ${r.f}`)} = ${L.si(r.val, 'H', 4)}`)}
      <h2>الاستنتاج</h2><p>محاثة الملف ${n(r.id)} = ${n(L.si(r.val, 'H', 4))}، ولا تتغير بتغيير التردد لأنها خاصية للملف.</p>`,
    discussion: [
      { en: 'Why is it important that VR equals VL?', ar: 'لماذا يجب أن يتساوى VR و VL؟', a: `<p>لأن التيار واحد، فتساوي الجهدين يعني ${n('R = |ZL|')}، وعليه بُنيت المعادلة.</p>` },
      { en: 'How does frequency affect inductive reactance?', ar: 'كيف يؤثر التردد في الرادة الحثية؟', a: `<p>${n('XL = 2πfL')}: تزداد طردياً مع التردد.</p>` },
      { en: 'What if the frequency were increased to 2000 Hz?', ar: 'ماذا لو صار التردد 2000 Hz؟', a: '<p>تتضاعف XL فنحتاج R أكبر للاتزان، لكن L المحسوبة تبقى نفسها.</p>' },
      { en: 'What are the potential sources of error?', ar: 'ما مصادر الخطأ؟', a: '<p>دقة قياس r، دقة الفولتميتر عند 1 kHz، تشوه الموجة، وصعوبة الضبط الدقيق لتساوي الجهدين.</p>' },
    ],
  });

  makeAC({
    kind: 'C', id: 'capacitance', num: 6, R0: 500,
    title: 'قياس السعة', en: 'Capacitance Measurement', sheet: 'Experiment No. (4) — Capacitance Measurement',
    tags: ['1 kHz'], summary: 'إيجاد سعة متسعة بتساوي VR و VC.',
    goal: 'إيجاد سعة متسعة موصولة على التوالي مع مقاومة بقياس VR و VC عند 1000 Hz.',
    unknowns: [{ id: 'C-A', C: 97.6e-9 }, { id: 'C-B', C: 224.3e-9 }, { id: 'C-C', C: 46.1e-9 }],
    theory: () => `<h2>الفكرة</h2><p>التيار واحد في R و C، لذلك:</p>
      ${L.eq(`C = ${L.frac('V<sub>R</sub>', '2π f R V<sub>C</sub>')}`)}
      <p>وعند ${n('VR = VC')}: ${L.ieq(`C = ${L.frac('1', '2πfR')}`)}.</p>
      <h3>الأجهزة</h3><div class="chips-eq"><span>مولّد دوال</span><span>صندوق مقاومات</span><span>متسعة مجهولة</span><span>ملتيميتر ×2</span></div>`,
    calcText: (r) => `<h2>الحساب</h2>${L.eq(`C = ${L.frac(r.VR.toFixed(3), `2π × ${r.f} × ${r.R} × ${r.VX.toFixed(3)}`)} = ${L.si(r.val, 'F', 4)}`)}
      <h2>الاستنتاج</h2><p>عند التساوي ${n('R = XC')}، فسعة ${n(r.id)} = ${n(L.si(r.val, 'F', 4))}.</p>`,
    discussion: [
      { en: 'Why is the voltage across R and C the same?', ar: 'لماذا يتساوى الجهدان؟', a: `<p>نضبط R عمداً حتى ${n('R = XC')}، فتصبح المعادلة ${n('C = 1/(2πfR)')}.</p>` },
      { en: 'How does the frequency affect the measurement?', ar: 'كيف يؤثر التردد؟', a: `<p>${n('XC = 1/(2πfC)')} تقل بزيادة التردد فنحتاج R أصغر، و C المحسوبة لا تتغير.</p>` },
      { en: 'How can this method measure unknown inductances?', ar: 'كيف نقيس بها المحاثة؟', a: `<p>نستبدل المتسعة بالملف: ${n('L = √(R² − r²)/(2πf)')} (التجربة 5).</p>` },
    ],
  });
})();
