/* Experiment 1 — DC voltmeter from a 0.3 V / 6000 Ω galvanometer (3D bench). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const Vg = 0.3, Rg = 6000, Ig = Vg / Rg;
  const RANGES = [3, 6, 9, 12];
  const RS = RANGES.map((v) => v / Ig - Rg);
  const TARGETS = [0.25, 0.5, 0.75, 1];
  const BANDS = [['green', 'yellow', 'black', 'red', 'brown'], ['brown', 'brown', 'yellow', 'orange', 'brown'], ['brown', 'violet', 'yellow', 'orange', 'brown'], ['red', 'orange', 'yellow', 'orange', 'brown']];
  const KEY = 'voltmeter';
  const NETS = [['rb.red', 'ps.p', 'dm.v'], ['rb.out', 'g.p'], ['g.n', 'ps.n', 'dm.com']];
  let data = L.store.get(KEY + ':data2', { cells: {} });
  const save = () => L.store.set(KEY + ':data2', data);

  function schematic(sel) {
    const ys = [100, 140, 180, 220];
    let s = S.text(250, 24, 'Rg = 6000 Ω   Vg = 0.3 V', { cls: 'sub' });
    s += S.wire([[232, 52], [60, 52], [60, 262]]) + S.wire([[268, 52], [480, 52], [480, 220]]);
    ys.forEach((y, i) => {
      s += S.wire([[300, y], [340, y]]) + S.res(340, y, 450, y, { label: `Rs${i + 1} = ${L.si(RS[i], 'Ω', 3)}`, off: 13, lx: 405, cls: i === sel ? 'active' : '' }) + S.wire([[450, y], [480, y]]);
      if (i < 3) s += S.dot(480, y);
      s += S.term(300, y) + S.text(306, y - 7, `${RANGES[i]} V`, { anchor: 'start' });
    });
    s += `<line class="w active" x1="205" y1="250" x2="292" y2="${ys[sel]}"/>` + S.dot(205, 250);
    s += S.wire([[205, 250], [205, 290]], 'redlead') + S.wire([[60, 262], [60, 290], [120, 290]]);
    s += S.bat(160, 290, 120, 290, { label: 'Vs', ly: 272, lx: 140 }) + S.wire([[160, 290], [205, 290]], 'redlead');
    s += S.meter(250, 52, 'G');
    return S.svg(520, 310, s, 'دائرة الفولتميتر متعدد المديات');
  }

  function mount(root) {
    if (!window.Lab3D || !Lab3D.ok()) return Lab3D.fallback(root);
    const st = { vs: 0, on: false, range: 0, dev: 0, wired: false };
    root.innerHTML = Lab3D.layout('vm');
    const B = Lab3D.Bench(L.$('#vm-stage', root), { cam: [0, 64, 80] });
    let num;
    const ps = B.supply({ id: 'ps', x: -38, z: -15, onDrag: (d, f) => num.set(st.vs + d * (f ? 0.002 : 0.02)), onPower: () => pwr.set(!st.on) });
    const g = B.analog({ id: 'g', x: -4, z: -16, unit: 'V', brand: 'Ig 50 µA · Rg 6 kΩ' });
    const dm = B.dmm({ id: 'dm', x: 30, z: -14, modes: ['V⎓'], title: 'REFERENCE DMM', jacks: [['dm.com', 'black', 'COM', -2.4], ['dm.v', 'red', 'VΩ', 2.4]] });
    const rb = B.board({ id: 'rb', x: 2, z: 15, w: 46, d: 21 });
    rb.text(0, -8.4, 'RANGE SELECTOR  ·  MULTIPLIER RESISTORS', 15, '#ffffff');
    const ang = [-60, -20, 20, 60];
    rb.trace([[-18, 5], [-10, 0]]);
    RANGES.forEach((v, i) => {
      const z = -5.4 + i * 3.7, a = (ang[i] * Math.PI) / 180;
      rb.trace([[-10 + Math.sin(a) * 2.6, -Math.cos(a) * 2.6], [-3, z], [-1, z]]);
      rb.trace([[13, z], [16, z]]);
      rb.resistor(-1, z, 13, z, BANDS[i], { label: `Rs${i + 1}  ${L.si(RS[i], 'Ω', 3)}`, lx: 0, lz: -1.45, size: 13 });
    });
    rb.trace([[16, -5.4], [16, 5.7], [19, 5.7]]);
    const sel = rb.selector('rb.sel', -10, 0, RANGES.map((v, i) => ({ a: ang[i], label: v + 'V' })), () => rangeSeg.set((st.range + 1) % 4));
    rb.jack('rb.red', -18, 5, 'red', 'IN +');
    rb.jack('rb.out', 19, 5.7, 'yellow', 'OUT → G+');
    B.tipFor('rb.sel', 'مفتاح المديات: اضغط للتبديل');
    B.tipFor('ps.pwr', 'تشغيل / إطفاء');

    /* dock controls */
    const ctl = L.$('#vm-ctl', root);
    ctl.innerHTML = '<div id="vm-pwr"></div><div id="vm-vs"></div><div class="ctl-grp"><span class="lbl-s">المدى</span><div id="vm-rng"></div></div><label class="field"><span>Rs</span><select id="vm-dev"><option value="0">القيمة المحسوبة</option><option value="-10">أقل بـ 10%</option><option value="10">أكبر بـ 10%</option></select></label><div class="ctl-grp"><span class="lbl-s">اضبط المؤشر على</span><div class="chips" id="vm-chips"></div></div>';
    const pwr = L.Power(L.$('#vm-pwr', root), { label: 'المجهز', value: false, onChange: (v) => { st.on = v; update(); } });
    num = L.Num(L.$('#vm-vs', root), { id: 'vm-vsn', label: 'جهد المجهز', unit: 'V', min: 0, max: 15, value: 0, steps: [0.01, 0.1, 1], decimals: 2, onInput: (v) => { st.vs = v; update(); } });
    const rangeSeg = L.Seg(L.$('#vm-rng', root), { options: RANGES.map((v, i) => ({ v: i, label: v + ' V' })), value: 0, aria: 'المدى', onChange: (v) => { st.range = +v; g.scales(scales(), 'V'); update(); } });
    L.$('#vm-dev', root).addEventListener('change', (e) => { st.dev = +e.target.value; update(); });
    const chips = L.$('#vm-chips', root);
    chips.innerHTML = TARGETS.map((t) => `<button type="button" class="chip" data-t="${t}">${t * 100}%</button>`).join('');
    chips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; num.set(+(+c.dataset.t * Ig * (RS[st.range] * (1 + st.dev / 100) + Rg)).toFixed(2)); });
    L.$('#vm-ro', root).innerHTML = L.ro('vm-ig', 'تيار الجلفانوميتر') + L.ro('vm-defl', 'الانحراف') + L.ro('vm-read', 'قراءة الجهاز', 'hl') + L.ro('vm-true', 'الفولتميتر المرجعي');

    const guide = Lab3D.guide(L.$('#vm-guide', root), B, [
      { t: 'وصّل الدائرة كما في المخطط.', wire: NETS, check: (s) => s.wired },
      { t: 'شغّل المجهز واختر مدى 3 V.', check: (s) => s.wired && s.on && s.range === 0 },
      { t: 'سجّل الجهد عند انحراف 25، 50، 75، 100%.', check: () => colDone(0) },
      { t: 'كرّر لمديات 6 و9 و12 V.', check: () => [1, 2, 3].every(colDone) },
    ]);
    const scales = () => { const vf = RANGES[st.range]; return [{ ticks: L.linTicks(0, vf, vf / 6, vf / 30), name: 'V' }, { ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }]; };
    g.scales(scales(), 'V');

    function compute() {
      const els = [];
      if (st.on) els.push({ a: 'ps.p', b: 'ps.n', v: st.vs, ri: 0.05, ilim: 1 });
      els.push({ a: 'rb.red', b: 'rb.out', r: RS[st.range] * (1 + st.dev / 100) });
      els.push({ a: 'g.p', b: 'g.n', r: Rg });
      els.push({ a: 'dm.v', b: 'dm.com', r: 10e6 });
      const s = B.solve(els);
      const ig = s.vd('g.p', 'g.n')[0] / Rg;
      return { ig, defl: ig / Ig, dmm: s.vd('dm.v', 'dm.com')[0], reading: (ig / Ig) * RANGES[st.range] };
    }
    function colDone(c) { return TARGETS.every((_, r) => data.cells[r + '-' + c]); }
    function update() {
      const c = B.check(NETS);
      st.wired = c.ok;
      const k = compute();
      g.set(k.defl);
      ps.lcd(st.vs.toFixed(2), st.on); ps.knob(st.vs / 15); ps.power(st.on);
      dm.show(L.lcdText(k.dmm, 3, 5), 'V', 'DC');
      sel.set(ang[st.range]);
      L.setText('vm-ig', L.fx(k.ig * 1e6, 2) + ' µA', root);
      L.setText('vm-defl', L.fx(k.defl * 100, 1) + ' %', root);
      L.setText('vm-read', Math.abs(k.defl) > 1.02 ? 'خارج التدريج' : L.fx(k.reading, 3) + ' V', root);
      L.setText('vm-true', L.fx(k.dmm, 3) + ' V', root);
      status(B, c, st.on, Math.abs(k.defl) > 1.02 ? 'تجاوز التدريج!' : k.defl < -0.02 ? 'القطبية معكوسة!' : '');
      guide.update(st);
    }
    function record() {
      const k = compute();
      if (!st.wired) return L.toast('أكمل توصيل الدائرة أولاً', 'warn');
      if (!st.on || st.vs <= 0.01) return L.toast('شغّل المجهز وارفع الجهد', 'warn');
      if (k.defl > 1.02) return L.toast('المؤشر تجاوز التدريج: خفّض الجهد', 'bad');
      const row = TARGETS.findIndex((t) => Math.abs(k.defl - t) <= 0.02);
      if (row < 0) return L.toast('اجعل الانحراف 25 أو 50 أو 75 أو 100%', 'warn');
      data.cells[row + '-' + st.range] = { v: +k.dmm.toFixed(3), r: +k.reading.toFixed(3) };
      save(); table(); update();
      L.toast(`سُجّلت: ${TARGETS[row] * 100}% في مدى ${RANGES[st.range]} V`);
    }
    function table() {
      L.$('#vm-table', root).innerHTML = L.table(['الانحراف', ...RANGES.map((v) => `مدى ${v} V`)], TARGETS.map((t, r) => [t * 100 + '%', ...RANGES.map((_, c) => { const d = data.cells[r + '-' + c]; return d ? n(d.v.toFixed(2) + ' V') : ''; })]));
    }
    L.$('#vm-rec', root).addEventListener('click', record);
    L.$('#vm-copy', root).addEventListener('click', () => L.copyTable(L.$('#vm-table table', root)));
    L.$('#vm-clear', root).addEventListener('click', () => { data = { cells: {} }; save(); table(); update(); });
    B.onWires(update);
    table(); update();
  }

  /* shared status pill text */
  function status(B, c, on, warn) {
    if (c.shorts || c.stray) return B.status('توصيل خاطئ: افصل السلك الزائد', 'bad');
    if (!c.ok) return B.status(`الأسلاك ${c.done}/${c.total}`, 'warn');
    if (!on) return B.status('الدائرة موصولة · شغّل المصدر', 'warn');
    if (warn) return B.status(warn, 'bad');
    B.status('الدائرة تعمل', 'ok');
  }
  window.Lab3D.statusText = status;

  L.register({
    id: 'voltmeter', num: 1, group: 'meters',
    title: 'تصميم فولتميتر تيار مستمر',
    en: 'Designing a DC Voltmeter',
    sheet: 'Experiment No. (1) — Designing a DC Voltmeter',
    tags: ['3 / 6 / 9 / 12 V'],
    summary: 'جلفانوميتر + مقاومة توالٍ = فولتميتر بأربعة مديات.',
    goal: 'تحويل جلفانوميتر (0.3 V، 6000 Ω) إلى فولتميتر بمديات 3 و6 و9 و12 V.',
    mount,
    theory: () => `<div class="theory-grid"><div class="prose">
      <h2>الفكرة</h2>
      <p>مقاومة كبيرة <b>Rs</b> على التوالي مع الجلفانوميتر تُسقط الجهد الزائد، ومفتاح المديات يختار واحدة منها.</p>
      ${L.eq(`I<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'R<sub>g</sub>')} = ${L.frac('0.3', '6000')} = 50 µA`)}
      ${L.eq(`R<sub>s</sub> = ${L.frac('V<sub>f</sub>', 'I<sub>g</sub>')} − R<sub>g</sub>`)}
      <div class="table-wrap">${L.table(['المدى', 'Rs'], RANGES.map((v, i) => [v + ' V', n(L.si(RS[i], 'Ω', 3))]))}</div>
      <h3>الأجهزة</h3><div class="chips-eq"><span>جلفانوميتر</span><span>مقاومات التوالي</span><span>مجهز قدرة متغير</span><span>فولتميتر للمقارنة</span><span>أسلاك</span></div>
    </div><figure class="figure">${schematic(2)}<figcaption>مخطط الدائرة</figcaption></figure></div>`,
    calc: () => {
      const meas = TARGETS.map((t, r) => [t * 100 + '%', ...RANGES.map((v, c) => { const d = data.cells[r + '-' + c]; if (!d) return n((t * v).toFixed(2)) + '<small>متوقع</small>'; const e = ((d.v - t * v) / (t * v)) * 100; return `${n(d.v.toFixed(2))}<small>${e >= 0 ? '+' : ''}${e.toFixed(1)}%</small>`; })]);
      return `<h2>حساب Rs</h2>
        <ol class="steps">${RANGES.map((v, i) => `<li><div>${L.ieq(`R<sub>s${i + 1}</sub> = ${L.frac(v, '50×10<sup>−6</sup>')} − 6000 = <b>${L.si(RS[i], 'Ω', 3)}</b>`)}</div></li>`).join('')}</ol>
        <h2>النتائج (V)</h2><div class="table-wrap">${L.table(['الانحراف', ...RANGES.map((v) => `مدى ${v} V`)], meas)}</div>
        <h2>الاستنتاج</h2><p>استجابة الجهاز خطية في كل المديات، وقيمة Rs الصحيحة تجعل الانحراف الكامل عند الجهد المطلوب تماماً.</p>`;
    },
    discussion: [
      { en: 'Why is a series resistance needed in a voltmeter?', ar: 'لماذا نحتاج مقاومة توالٍ؟', a: '<p>الجلفانوميتر يتحمل 0.3 V فقط (50 µA). مقاومة التوالي تُسقط الجهد الزائد وتحدّ التيار، فيبقى الانحراف متناسباً مع الجهد.</p>' },
      { en: 'How did we determine the value of the series resistance Rs?', ar: 'كيف حدّدنا Rs؟', a: `<p>من قانون أوم: ${n('Rs = Vf/Ig − Rg')}. مثلاً 3 V: ${n('3/50µA − 6000 = 54 kΩ')}.</p>` },
      { en: 'What would happen if Rs was smaller than the calculated value?', ar: 'ماذا لو كانت Rs أصغر؟', a: '<p>يزداد التيار فيقرأ الجهاز أكثر من الحقيقي، ويتجاوز المؤشر التدريج عند جهد المدى وقد يتلف الملف.</p>' },
      { en: 'What is the significance of the internal resistance of the voltmeter?', ar: 'ما أهمية المقاومة الداخلية للفولتميتر؟', a: `<p>كلما كبرت قلّ التيار الذي يسحبه من الدائرة وقلّ خطأ التحميل. هنا ${n('20 kΩ/V')}.</p>` },
      { en: 'How would the design change if we wanted a 8V full-scale voltmeter instead?', ar: 'كيف نصمم مدى 8 V؟', a: `<p>نغيّر Rs فقط: ${n('8/50µA − 6000 = 154 kΩ')}.</p>` },
    ],
  });
})();
