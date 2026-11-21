/* Experiment 2 — Multi-range DC ammeter: galvanometer ∥ selectable shunt (3D bench). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const Vg = 0.3, Ig = 50e-6, Rg = Vg / Ig, RLOAD = 1000;
  const RANGES = [3e-3, 6e-3, 9e-3, 12e-3];
  const RSH = RANGES.map((i) => Vg / (i - Ig));
  const BANDS = [['brown', 'black', 'brown', 'black', 'brown'], ['green', 'black', 'yellow', 'gold', 'brown'], ['orange', 'orange', 'green', 'gold', 'brown'], ['red', 'green', 'brown', 'gold', 'brown']];
  const KEY = 'ammeter';
  const NETS = [['ps.p', 'dm.ma'], ['dm.com', 'lb.1'], ['lb.2', 'sb.p', 'g.p'], ['ps.n', 'sb.n', 'g.n']];
  const mA = (v) => Math.round(v * 1e3);
  let data = L.store.get(KEY + ':data2', { rows: {} });
  const save = () => L.store.set(KEY + ':data2', data);

  function schematic() {
    let s = S.wire([[50, 122], [50, 50], [85, 50]]) + S.res(85, 50, 165, 50, { label: 'R load 1 kΩ', off: 16 }) + S.wire([[165, 50], [520, 50], [520, 142]]);
    [450, 380, 310, 240].forEach((x, i) => { s += S.dot(x, 50) + S.wire([[x, 50], [x, 82]]) + S.res(x, 82, x, 150, { label: `Rsh${i + 1}`, off: 11 }) + S.wire([[x, 150], [x, 172]]) + S.term(x, 176); });
    s += `<line class="w active" x1="345" y1="245" x2="447" y2="180"/>` + S.dot(345, 245) + S.wire([[345, 245], [345, 272]]);
    s += S.wire([[520, 178], [520, 272], [50, 272], [50, 168]]) + S.dot(345, 272) + S.bat(50, 122, 50, 168, { label: 'Vs', off: -14 }) + S.meter(520, 160, 'G');
    return S.svg(570, 290, s, 'دائرة الأميتر');
  }

  function mount(root) {
    if (!window.Lab3D || !Lab3D.ok()) return Lab3D.fallback(root);
    const st = { vs: 0, on: false, range: 0, wired: false, offSeen: false };
    root.innerHTML = Lab3D.layout('am');
    const B = Lab3D.Bench(L.$('#am-stage', root), { cam: [0, 70, 88] });
    let num;
    const ps = B.supply({ id: 'ps', x: -42, z: -15, onDrag: (d, f) => num.set(st.vs + d * (f ? 0.002 : 0.02)), onPower: () => pwr.set(!st.on) });
    const dm = B.dmm({ id: 'dm', x: -14, z: -14, modes: ['mA'], title: 'REFERENCE DMM', jacks: [['dm.ma', 'red', 'mA', -2.4], ['dm.com', 'black', 'COM', 2.4]] });
    const g = B.analog({ id: 'g', x: 14, z: -16, unit: 'mA', brand: 'Ig 50 µA · Rg 6 kΩ' });
    const lb = B.board({ id: 'lb', x: -30, z: 16, w: 20, d: 13 });
    lb.text(0, -4.6, 'LOAD  1 kΩ', 15, '#fff');
    lb.trace([[-7, 1], [-4, 1]]); lb.trace([[4, 1], [7, 1]]);
    lb.resistor(-4, 1, 4, 1, ['brown', 'black', 'red', 'gold']);
    lb.jack('lb.1', -7, 1, 'yellow', 'L1'); lb.jack('lb.2', 7, 1, 'yellow', 'L2');
    const sb = B.board({ id: 'sb', x: 14, z: 15, w: 36, d: 21 });
    sb.text(0, -8.6, 'SHUNT SELECTOR  Rsh', 15, '#fff');
    const ang = [-70, -35, 0, 35, 70];
    sb.trace([[-15, 6], [-10, 6], [-10, 0]]);
    RANGES.forEach((v, i) => {
      const z = -5.6 + i * 3.6, a = (ang[i] * Math.PI) / 180;
      sb.trace([[-10 + Math.sin(a) * 2.6, -Math.cos(a) * 2.6], [-3, z], [0, z]]);
      sb.trace([[11, z], [13, z]]);
      sb.resistor(0, z, 11, z, BANDS[i], { label: `Rsh${i + 1}  ${L.sig(RSH[i], 4)} Ω`, lx: 0, lz: -1.4, size: 13 });
    });
    sb.trace([[13, -5.6], [13, 6], [15, 6]]);
    const sel = sb.selector('sb.sel', -10, 0, [...RANGES.map((v, i) => ({ a: ang[i], label: mA(v) + 'mA' })), { a: ang[4], label: 'OFF', color: '#ff9b8f' }], () => rangeSeg.set(st.range === 'off' ? 0 : st.range === 3 ? 'off' : st.range + 1));
    sb.jack('sb.p', -15, 6, 'red', 'SH +'); sb.jack('sb.n', 15, 6, 'black', 'SH −');
    B.tipFor('sb.sel', 'مفتاح الشنت: اضغط للتبديل');

    const ctl = L.$('#am-ctl', root);
    ctl.innerHTML = '<div id="am-pwr"></div><div id="am-vs"></div><div class="ctl-grp"><span class="lbl-s">المدى</span><div id="am-rng"></div></div><div class="ctl-grp"><span class="lbl-s">اضبط المؤشر على</span><div class="chips" id="am-chips"></div></div>';
    const pwr = L.Power(L.$('#am-pwr', root), { label: 'المجهز', value: false, onChange: (v) => { st.on = v; update(); } });
    num = L.Num(L.$('#am-vs', root), { id: 'am-vsn', label: 'جهد المجهز', unit: 'V', min: 0, max: 15, value: 0, steps: [0.01, 0.1, 1], onInput: (v) => { st.vs = v; update(); } });
    const rangeSeg = L.Seg(L.$('#am-rng', root), { options: [...RANGES.map((v, i) => ({ v: i, label: mA(v) + ' mA' })), { v: 'off', label: 'OFF' }], value: 0, onChange: (v) => { st.range = v === 'off' ? 'off' : +v; scales(); update(); } });
    const chips = L.$('#am-chips', root);
    chips.innerHTML = [0.25, 0.5, 0.75, 1].map((t) => `<button type="button" class="chip" data-t="${t}">${t * 100}%</button>`).join('');
    chips.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c || st.range === 'off') return;
      const Rm = (RSH[st.range] * Rg) / (RSH[st.range] + Rg);
      num.set(+(+c.dataset.t * RANGES[st.range] * (RLOAD + Rm + 1)).toFixed(2));
    });
    L.$('#am-ro', root).innerHTML = L.ro('am-i', 'التيار الكلي (المرجعي)') + L.ro('am-read', 'قراءة الأميتر', 'hl') + L.ro('am-ig', 'تيار الجلفانوميتر') + L.ro('am-ish', 'تيار الشنت');
    const guide = Lab3D.guide(L.$('#am-guide', root), B, [
      { t: 'وصّل الدائرة: المجهز ← الأميتر المرجعي ← الحمل ← (الجلفانوميتر ∥ الشنت).', wire: NETS, check: (s) => s.wired },
      { t: 'شغّل المجهز واختر مدى 3 mA.', check: (s) => s.wired && s.on && s.range === 0 },
      { t: 'اضبط الانحراف الكامل وسجّل.', check: () => !!data.rows[0] },
      { t: 'كرّر لمديات 6 و9 و12 mA.', check: () => [1, 2, 3].every((i) => data.rows[i]) },
      { t: 'جرّب الوضع OFF بجهد صغير ولاحظ الخطر على الجلفانوميتر.', check: (s) => s.offSeen },
    ]);
    function scales() {
      if (st.range === 'off') { g.scales([{ ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }], 'µA'); return; }
      const f = mA(RANGES[st.range]);
      g.scales([{ ticks: L.linTicks(0, f, f / 6, f / 30), name: 'mA' }, { ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }], 'mA');
    }
    function compute() {
      const off = st.range === 'off', els = [];
      if (st.on) els.push({ a: 'ps.p', b: 'ps.n', v: st.vs, ri: 0.05, ilim: 1 });
      els.push({ a: 'dm.ma', b: 'dm.com', r: 1 }, { a: 'lb.1', b: 'lb.2', r: RLOAD }, { a: 'g.p', b: 'g.n', r: Rg });
      if (!off) els.push({ a: 'sb.p', b: 'sb.n', r: RSH[st.range] });
      const s = B.solve(els);
      const I = s.vd('dm.ma', 'dm.com')[0] / 1, ig = s.vd('g.p', 'g.n')[0] / Rg, ish = off ? 0 : s.vd('sb.p', 'sb.n')[0] / RSH[st.range];
      const full = off ? Ig : RANGES[st.range];
      return { off, I, ig, ish, defl: ig / Ig, full, reading: (ig / Ig) * full };
    }
    function update() {
      const c = B.check(NETS); st.wired = c.ok;
      const k = compute();
      if (k.off && st.on && st.vs > 0.05 && st.wired) st.offSeen = true;
      g.set(k.defl);
      ps.lcd(st.vs.toFixed(2), st.on); ps.knob(st.vs / 15); ps.power(st.on);
      dm.show(Math.abs(k.I) > 0.4 ? 'OL' : L.lcdText(k.I * 1e3, 3, 5), 'mA', 'DC');
      sel.set(ang[k.off ? 4 : st.range]);
      L.setText('am-i', L.fx(k.I * 1e3, 3) + ' mA', root);
      L.setText('am-read', Math.abs(k.defl) > 1.02 ? 'خارج التدريج' : k.off ? L.fx(k.reading * 1e6, 1) + ' µA' : L.fx(k.reading * 1e3, 3) + ' mA', root);
      L.setText('am-ig', L.fx(k.ig * 1e6, 2) + ' µA', root);
      L.setText('am-ish', k.off ? '—' : L.fx(k.ish * 1e3, 3) + ' mA', root);
      Lab3D.statusText(B, c, st.on, k.defl > 1.02 ? (k.off ? 'الشنت مفصول: الجلفانوميتر في خطر!' : 'تجاوز التدريج!') : k.defl < -0.02 ? 'القطبية معكوسة!' : '');
      guide.update(st);
    }
    function table() {
      L.$('#am-table', root).innerHTML = L.table(['المدى', 'Rsh (Ω)', 'Vs (V)', 'المرجعي (mA)', 'الأميتر (mA)', 'Ig (µA)'], RANGES.map((v, i) => {
        const d = data.rows[i];
        return [mA(v) + ' mA', n(RSH[i].toFixed(2)), d && n(d.vs.toFixed(2)), d && n((d.I * 1e3).toFixed(3)), d && n((d.read * 1e3).toFixed(3)), d && n((d.ig * 1e6).toFixed(1))];
      }));
    }
    L.$('#am-rec', root).addEventListener('click', () => {
      const k = compute();
      if (!st.wired) return L.toast('أكمل توصيل الدائرة أولاً', 'warn');
      if (k.off) return L.toast('اختر أحد المديات', 'warn');
      if (!st.on || st.vs <= 0.01) return L.toast('شغّل المجهز وارفع الجهد', 'warn');
      if (k.defl > 1.02) return L.toast('تجاوز التدريج: خفّض الجهد', 'bad');
      if (k.defl < 0.1) return L.toast('ارفع الجهد قرب نهاية التدريج', 'warn');
      data.rows[st.range] = { vs: st.vs, I: k.I, read: k.reading, ig: k.ig };
      save(); table(); update();
      L.toast(`سُجّل مدى ${mA(RANGES[st.range])} mA`);
    });
    L.$('#am-copy', root).addEventListener('click', () => L.copyTable(L.$('#am-table table', root)));
    L.$('#am-clear', root).addEventListener('click', () => { data = { rows: {} }; save(); table(); update(); });
    B.onWires(update);
    scales(); table(); update();
  }

  L.register({
    id: 'ammeter', num: 2, group: 'meters',
    title: 'تصميم أميتر تيار مستمر',
    en: 'Design of a Multi-Range DC Ammeter',
    sheet: 'Experiment No. (2) — Multi-Range DC Ammeter',
    tags: ['3 / 6 / 9 / 12 mA'],
    summary: 'جلفانوميتر ∥ شنت = أميتر بأربعة مديات.',
    goal: 'تحويل الجلفانوميتر (50 µA، 0.3 V) إلى أميتر بمديات 3 و6 و9 و12 mA.',
    mount,
    theory: () => `<div class="theory-grid"><div class="prose">
      <h2>الفكرة</h2>
      <p>مقاومة صغيرة <b>Rsh</b> على التوازي مع الجلفانوميتر تمرر معظم التيار، فيبقى تيار الملف 50 µA عند الانحراف الكامل.</p>
      ${L.eq(`R<sub>g</sub> = ${L.frac('0.3', '50×10<sup>−6</sup>')} = 6000 Ω`)}
      ${L.eq(`R<sub>sh</sub> = ${L.frac('V<sub>g</sub>', 'I − I<sub>g</sub>')}`)}
      <div class="table-wrap">${L.table(['المدى', 'Rsh'], RANGES.map((v, i) => [mA(v) + ' mA', n(RSH[i].toFixed(2) + ' Ω')]))}</div>
      <h3>الأجهزة</h3><div class="chips-eq"><span>جلفانوميتر</span><span>مقاومات شنت</span><span>مقاومة حمل 1 kΩ</span><span>مجهز قدرة</span><span>أميتر مرجعي</span></div>
    </div><figure class="figure">${schematic()}<figcaption>مخطط الدائرة</figcaption></figure></div>`,
    calc: () => `<h2>حساب Rsh</h2>
      <ol class="steps">${RANGES.map((v, i) => `<li><div>${L.ieq(`R<sub>sh${i + 1}</sub> = ${L.frac('0.3', `${v.toFixed(3)} − 0.00005`)} = <b>${RSH[i].toFixed(2)} Ω</b>`)}</div></li>`).join('')}</ol>
      <h2>النتائج</h2><div class="table-wrap">${L.table(['المدى', 'المرجعي (mA)', 'الأميتر (mA)', 'الخطأ'], RANGES.map((v, i) => { const d = data.rows[i]; return [mA(v) + ' mA', d && n((d.I * 1e3).toFixed(3)), d && n((d.read * 1e3).toFixed(3)), d && n((((d.read - d.I) / d.I) * 100).toFixed(2) + '%')]; }))}</div>
      <h2>الاستنتاج</h2><p>كلما كبر المدى صغرت Rsh، ويبقى تيار الجلفانوميتر 50 µA عند الانحراف الكامل في كل المديات.</p>`,
    discussion: [
      { en: 'How is the galvanometer’s internal resistance determined?', ar: 'كيف تُحدَّد مقاومة الجلفانوميتر؟', a: `<p>${n('Rg = Vg/Ig = 0.3/50µA = 6000 Ω')}، أو عملياً بطريقة نصف الانحراف.</p>` },
      { en: 'Why is a shunt resistor needed?', ar: 'لماذا نحتاج الشنت؟', a: '<p>الملف يتحمل 50 µA فقط؛ الشنت يمرر الباقي فيتوسع المدى، ويجعل مقاومة الأميتر صغيرة.</p>' },
      { en: 'What formula is used to calculate the shunt resistor?', ar: 'ما معادلة الشنت؟', a: `<p>${n('Rsh = Vg/(I − Ig)')}. مثال 3 mA: ${n('0.3/0.00295 = 101.7 Ω')}.</p>` },
      { en: 'What are some potential sources of error in this design?', ar: 'ما مصادر الخطأ؟', a: '<p>سماحية الشنت، مقاومة التلامس والأسلاك، الحرارة، مقاومة الأميتر التي تقلل تيار الدائرة، وخطأ قراءة المؤشر.</p>' },
    ],
  });
})();
