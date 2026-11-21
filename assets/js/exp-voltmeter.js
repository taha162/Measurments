/* Experiment 1 — Designing a multi-range DC voltmeter from a 0.3 V / 6000 Ω galvanometer. */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const Vg = 0.3, Rg = 6000, Ig = Vg / Rg;
  const RANGES = [3, 6, 9, 12];
  const RS = RANGES.map((v) => v / Ig - Rg); // 54k, 114k, 174k, 234k
  const TARGETS = [0.25, 0.5, 0.75, 1];
  const KEY = 'voltmeter';
  let data = L.store.get(KEY + ':data', { cells: {} });
  const save = () => L.store.set(KEY + ':data', data);

  /* ---------- schematic (matches the lab sheet) ---------- */
  function schematic(sel, values) {
    const ys = [100, 140, 180, 220];
    let s = '';
    s += S.text(250, 24, 'Rg = 6000 Ω    Vg = 0.3 V', { cls: 'sub' });
    s += S.wire([[232, 52], [60, 52], [60, 262]]);
    s += S.wire([[268, 52], [480, 52], [480, 220]]);
    ys.forEach((y, i) => {
      const act = i === sel;
      s += S.wire([[300, y], [340, y]], act ? 'active' : '');
      s += S.res(340, y, 450, y, { cls: act ? 'active' : sel >= 0 ? 'dim' : '', label: values ? values[i] : `Rs${i + 1}`, off: 13, lx: 405, lid: `vm-rl-${i}` });
      s += S.wire([[450, y], [480, y]], act ? 'active' : '');
      if (i < 3) s += S.dot(480, y);
      s += S.term(300, y);
      s += S.text(306, y - 7, `${RANGES[i]} V`, { anchor: 'start', cls: act ? 'acc' : '' });
    });
    const ty = ys[Math.max(0, sel)];
    s += `<line id="vm-arm" class="w active" x1="205" y1="250" x2="${296 - 4}" y2="${ty}"/>`;
    s += S.dot(205, 250);
    s += S.text(150, 236, 'range selector', { cls: 'sub', anchor: 'middle' });
    s += S.wire([[205, 250], [205, 290]], 'redlead');
    s += S.wire([[60, 262], [60, 290], [120, 290]]);
    s += S.bat(160, 290, 120, 290, { label: 'Vs', ly: 272, lx: 140 });
    s += S.wire([[160, 290], [205, 290]], 'redlead');
    s += S.term(60, 262) + S.term(205, 268);
    s += S.text(52, 252, 'COM −', { anchor: 'end', cls: 'sub' });
    s += S.text(214, 274, '+ red', { anchor: 'start', cls: 'sub' });
    s += S.flow(flowPts(Math.max(0, sel)), 'vm');
    s += S.meter(250, 52, 'G', { label: '' });
    return S.svg(520, 326, s, 'دائرة الفولتميتر متعدد المديات');
  }
  function flowPts(i) {
    const y = [100, 140, 180, 220][i];
    return [[160, 290], [205, 290], [205, 250], [296, y], [450, y], [480, y], [480, 52], [268, 52], [232, 52], [60, 52], [60, 290], [120, 290]];
  }

  /* ---------- simulation ---------- */
  function mount(root) {
    const solved0 = L.store.get(KEY + ':ws', {});
    const st = { vs: 0, range: 0, dev: 0, solved: [0, 1, 2, 3].map((i) => !!(solved0[i] && solved0[i].ok)), over: false };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench">
        <div class="bench-grid">
          <div class="card sch c4"><div class="sch-title"><b>الفولتميتر متعدد المديات</b><span>A multi-range voltmeter</span></div><div id="vm-sch"></div></div>
          <div class="inst c2">${L.ihead('الجلفانوميتر', 'Galvanometer')}<div id="vm-galv"></div><div class="inst-foot">التدريج العلوي بوحدة V للمدى المختار، والسفلي تيار الملف بـ µA</div></div>
          <div class="inst c2">${L.ihead('مجهّز القدرة المستمرة', 'DC Power Supply 0–15 V')}<div id="vm-ps-lcd"></div><div id="vm-ps"></div></div>
          <div class="inst c2">${L.ihead('مفتاح اختيار المدى', 'Range selector switch')}<div id="vm-rot"></div><div id="vm-dev"></div></div>
          <div class="inst c2">${L.ihead('فولتميتر تجاري للمقارنة', 'Reference DMM · V DC')}<div id="vm-dmm"></div><div class="inst-foot">موصول على التوازي مع المجهز لقراءة الجهد الحقيقي Vs</div></div>
          <div class="card c6">
            <div class="card-head"><h3>القراءات</h3><span class="status" id="vm-status">المصدر مطفأ</span></div>
            <div class="readouts">
              ${L.ro('vm-ig', 'تيار الجلفانوميتر Ig')}
              ${L.ro('vm-defl', 'الانحراف (من التدريج)')}
              ${L.ro('vm-read', 'قراءة الجهاز المصمَّم', 'hl')}
              ${L.ro('vm-true', 'قراءة الفولتميتر التجاري')}
              ${L.ro('vm-err', 'الخطأ النسبي')}
              ${L.ro('vm-rm', 'مقاومة الجهاز Rm = Rs + Rg')}
            </div>
            <div class="meas-actions">
              <div class="chips" id="vm-chips"></div>
              <button type="button" class="btn primary" id="vm-rec">سجّل القراءة في الجدول</button>
            </div>
          </div>
        </div>
      </div>
      <aside class="side"><div id="vm-guide"></div><div id="vm-ws"></div></aside>
    </div>
    <div class="data-row one">
      <div class="card">
        <div class="card-head"><h3>جدول النتائج (Results)</h3><div class="actions"><button type="button" class="btn small" id="vm-copy">نسخ الجدول</button><button type="button" class="btn small ghost" id="vm-clear">مسح القراءات</button></div></div>
        <p class="muted" style="font-size:13.5px;margin-bottom:10px">كل خلية تعرض الجهد المسلّط (قراءة الفولتميتر التجاري) الذي أعطى الانحراف المطلوب، وتحته قراءة الجهاز المصمَّم.</p>
        <div class="table-wrap" id="vm-table"></div>
      </div>
    </div>`;

    const galv = L.AnalogMeter(L.$('#vm-galv', root), { unit: 'V', brand: 'Vg 0.3 V · Rg 6 kΩ', aria: 'مؤشر الجلفانوميتر' });
    const setScales = () => {
      const vf = RANGES[st.range];
      galv.scales([{ ticks: L.linTicks(0, vf, vf / 6, vf / 30), name: 'V' }, { ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }]);
    };
    const psLcd = L.LCD(L.$('#vm-ps-lcd', root), { digits: 4, unit: 'V', tag: 'OUT' });
    const dmm = L.LCD(L.$('#vm-dmm', root), { digits: 5, unit: 'V', tag: 'DC' });
    const ps = L.Control(L.$('#vm-ps', root), {
      id: 'vm-vs', label: 'جهد الخرج', unit: 'V', min: 0, max: 15, value: 0, step: 0.01, decimals: 2, steps: [-1, 1, -0.1, 0.1, -0.01, 0.01],
      onInput: (v) => { st.vs = v; update(); },
    });
    L.Rotary(L.$('#vm-rot', root), {
      positions: RANGES.map((v, i) => ({ v: i, label: v + ' V' })), value: 0, span: 120,
      onChange: (v) => { st.range = +v; L.$('#vm-sch', root).innerHTML = schematic(st.range, labels()); setScales(); update(); },
    });
    L.Control(L.$('#vm-dev', root), {
      id: 'vm-devc', label: 'انحراف Rs عن قيمته المحسوبة', unit: '%', min: -30, max: 30, value: 0, step: 1, decimals: 0, size: 46, steps: [-5, 5],
      hint: 'اجعلها 0% للتصميم الصحيح، وجرّب قيماً أخرى لترى أثر خطأ المقاومة',
      onInput: (v) => { st.dev = v; update(); },
    });
    const labels = () => RS.map((r, i) => `Rs${i + 1} = ${st.solved[i] ? L.si(r, 'Ω', 3) : '? kΩ'}`);
    L.$('#vm-sch', root).innerHTML = schematic(st.range, labels());

    L.Worksheet(L.$('#vm-ws', root), {
      key: KEY + ':ws', title: 'ورقة التصميم',
      intro: `${L.ieq(`I<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'R<sub>g</sub>')} = ${L.frac('0.3', '6000')} = 50 µA`)} ثم احسب ${L.ieq(`R<sub>s</sub> = ${L.frac('V<sub>f</sub>', 'I<sub>g</sub>')} − R<sub>g</sub>`)}`,
      items: RANGES.map((v, i) => ({
        label: `Rs${i + 1}`, sub: `(${v} V)`, unit: 'kΩ', answer: RS[i] / 1000, tol: 0.005,
        hint: 'غير صحيح: اقسم Vf على 50 µA ثم اطرح 6000 Ω',
        solution: `${n(`${v} / 50µA − 6000 = ${v / Ig} − 6000 = ${RS[i]} Ω`)}`,
      })),
      onSolve: (sv) => { st.solved = sv; L.$('#vm-sch', root).innerHTML = schematic(st.range, labels()); update(); },
    });

    const guide = L.Guide(L.$('#vm-guide', root), [
      { t: 'احسب مقاومات التوالي Rs1 إلى Rs4 في ورقة التصميم.', check: (s) => s.solved.every(Boolean) },
      { t: 'اختر المدى 3 V بمفتاح المديات، ثم ارفع جهد المجهز تدريجياً.', check: (s) => s.range === 0 && s.vs > 0.2 },
      { t: 'اضبط الجهد حتى يصل المؤشر إلى 25% ثم 50% ثم 75% ثم 100% من التدريج، وسجّل كل قراءة.', check: () => colDone(0) },
      { t: 'كرّر القياس للمديات 6 V و9 V و12 V.', check: () => [1, 2, 3].every(colDone) },
      { t: 'قارن قراءة الجهاز المصمَّم بالفولتميتر التجاري: غيّر انحراف Rs عن 0% ولاحظ الخطأ.', check: (s) => s.dev !== 0 && s.vs > 0 },
      { t: 'سلّط جهداً أكبر من المدى المختار ولاحظ ارتطام المؤشر بنهاية التدريج (لا تفعل ذلك بالجهاز الحقيقي).', check: (s) => s.over },
    ]);

    const chips = L.$('#vm-chips', root);
    chips.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      const t = +c.dataset.t;
      const Rs = RS[st.range] * (1 + st.dev / 100);
      ps.set(+(t * Ig * (Rs + Rg)).toFixed(2));
    });
    L.$('#vm-rec', root).addEventListener('click', record);
    L.$('#vm-copy', root).addEventListener('click', () => L.copyTable(L.$('#vm-table table', root)));
    L.$('#vm-clear', root).addEventListener('click', () => { data = { cells: {} }; save(); renderTable(); update(); L.toast('تم مسح القراءات'); });

    function compute() {
      const Rs = RS[st.range] * (1 + st.dev / 100);
      const I = st.vs / (Rs + Rg);
      const defl = I / Ig;
      const reading = Math.min(defl, 1.07) * RANGES[st.range];
      return { Rs, I, defl, reading, err: st.vs > 0.02 && defl <= 1.02 ? ((defl * RANGES[st.range] - st.vs) / st.vs) * 100 : null };
    }
    function colDone(c) { return TARGETS.every((_, r) => data.cells[r + '-' + c]); }
    function record() {
      const c = compute();
      if (st.vs <= 0.01) return L.toast('ارفع جهد المجهز أولاً', 'warn');
      if (c.defl > 1.02) return L.toast('المؤشر تجاوز نهاية التدريج: خفّض الجهد', 'bad');
      const row = TARGETS.findIndex((t) => Math.abs(c.defl - t) <= 0.02);
      if (row < 0) return L.toast('اضبط الجهد ليكون الانحراف 25% أو 50% أو 75% أو 100% (±2%)، أو استخدم أزرار الضبط', 'warn');
      data.cells[row + '-' + st.range] = { v: +st.vs.toFixed(3), r: +c.reading.toFixed(3), dev: st.dev };
      save(); renderTable(); update();
      L.toast(`سُجّلت القراءة: ${TARGETS[row] * 100}% في المدى ${RANGES[st.range]} V`);
    }
    function renderTable() {
      const head = ['الانحراف المتوقع', ...RANGES.map((v, i) => `المدى ${i + 1} (${v} V)`)];
      const rows = TARGETS.map((t, r) => [
        t === 1 ? '100% (Full Scale)' : t * 100 + '%',
        ...RANGES.map((_, c) => { const d = data.cells[r + '-' + c]; return d ? `${n(d.v.toFixed(2) + ' V')}<small>قراءة الجهاز ${d.r.toFixed(2)}</small>` : ''; }),
      ]);
      L.$('#vm-table', root).innerHTML = L.table(head, rows);
    }
    function update() {
      const c = compute();
      st.over = st.over || c.defl > 1.05;
      galv.set(c.defl);
      psLcd.set(L.lcdText(st.vs, 2, 4));
      dmm.set(L.lcdText(st.vs, 3, 5));
      L.setText('vm-ig', L.fx(c.I * 1e6, 2) + ' µA', root);
      L.setText('vm-defl', L.fx(c.defl * 100, 1) + ' %', root);
      L.setText('vm-read', c.defl > 1.02 ? 'خارج التدريج' : L.fx(c.reading, 3) + ' V', root);
      L.setText('vm-true', L.fx(st.vs, 3) + ' V', root);
      L.setText('vm-err', c.err == null ? '—' : (c.err >= 0 ? '+' : '') + L.fx(c.err, 2) + ' %', root);
      L.setText('vm-rm', L.si(c.Rs + Rg, 'Ω', 4), root);
      const eb = L.$('#vm-err-box', root);
      eb.classList.toggle('good', c.err != null && Math.abs(c.err) < 0.5);
      eb.classList.toggle('bad', c.err != null && Math.abs(c.err) >= 0.5);
      const status = L.$('#vm-status', root);
      if (st.vs <= 0.001) { status.className = 'status'; status.textContent = 'المصدر على 0 V'; }
      else if (c.defl > 1.02) { status.className = 'status bad'; status.textContent = 'تجاوز التدريج: خطر على الجلفانوميتر'; }
      else { status.className = 'status ok'; status.textContent = 'ضمن التدريج'; }
      L.setFlow(root, 'vm', st.vs > 0.001, 0.25 + 1.6 * Math.min(c.defl, 1.3));
      const Rs = RS[st.range] * (1 + st.dev / 100);
      chips.innerHTML = '<span class="muted" style="font-size:13px">اضبط المؤشر على:</span>' + TARGETS.map((t) => `<button type="button" class="chip" data-t="${t}">${t * 100}% ← ${n((t * Ig * (Rs + Rg)).toFixed(2) + ' V')}</button>`).join('');
      guide.update(st);
    }
    setScales();
    renderTable();
    update();
  }

  /* ---------- calculations tab ---------- */
  function calc() {
    const rows = RANGES.map((v, i) => [`${v} V`, n(`${v} / (50×10⁻⁶) − 6000`), n(L.si(RS[i], 'Ω', 4)), n(L.si(RS[i] + Rg, 'Ω', 4)), n('20 kΩ/V')]);
    const exp = TARGETS.map((t) => [t === 1 ? '100%' : t * 100 + '%', ...RANGES.map((v) => n((t * v).toFixed(2) + ' V'))]);
    const meas = TARGETS.map((t, r) => [t === 1 ? '100%' : t * 100 + '%', ...RANGES.map((v, c) => {
      const d = data.cells[r + '-' + c];
      if (!d) return '';
      const e = ((d.v - t * v) / (t * v)) * 100;
      return `${n(d.v.toFixed(2) + ' V')}<small>${e >= 0 ? '+' : ''}${e.toFixed(2)}% عن المتوقع</small>`;
    })]);
    const any = Object.keys(data.cells).length;
    return `
      <h2>المعطيات</h2>
      <p>جلفانوميتر انحرافه الكامل عند ${n('Vg = 0.3 V')} ومقاومته الداخلية ${n('Rg = 6000 Ω')}.</p>
      ${L.eq(`I<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'R<sub>g</sub>')} = ${L.frac('0.3', '6000')} = 50 × 10<sup>−6</sup> A = 50 µA`)}
      <h2>حساب مقاومات التوالي (Calculations for Each Scale)</h2>
      ${L.eq(`R<sub>s</sub> = ${L.frac('V<sub>f</sub>', 'I<sub>g</sub>')} − R<sub>g</sub>`)}
      <ol class="steps">
        ${RANGES.map((v, i) => `<li><div><b>للمدى ${v} V:</b> ${L.ieq(`R<sub>s${i + 1}</sub> = ${L.frac(v, '50×10<sup>−6</sup>')} − 6000 = ${v / Ig} − 6000 = <b>${RS[i].toLocaleString('en')} Ω</b>`)}</div></li>`).join('')}
      </ol>
      <div class="table-wrap">${L.table(['المدى Vf', 'التعويض', 'Rs', 'Rm = Rs + Rg', 'الحساسية 1/Ig'], rows)}</div>
      <div class="note">لاحظ أن المقاومة الكلية للجهاز ${n('Rm = Vf / Ig')} تتناسب مع المدى، وأن الحساسية ثابتة ${n('S = 1/Ig = 20 kΩ/V')} لكل المديات.</div>
      <h2>الجهود المتوقعة لكل انحراف (Results)</h2>
      <p>عند انحراف نسبته ${n('k')} يكون الجهد المسلّط ${n('V = k × Vf')}:</p>
      <div class="table-wrap">${L.table(['الانحراف', 'المدى 1 (3 V)', 'المدى 2 (6 V)', 'المدى 3 (9 V)', 'المدى 4 (12 V)'], exp)}</div>
      <h3>قراءاتك من المحاكاة</h3>
      ${any ? `<div class="table-wrap">${L.table(['الانحراف', 'المدى 1 (3 V)', 'المدى 2 (6 V)', 'المدى 3 (9 V)', 'المدى 4 (12 V)'], meas)}</div>` : `<p class="muted">لم تسجّل قراءات بعد. ارجع إلى <a href="#" data-goto-tab="sim">المحاكاة</a> وسجّل القراءات لتظهر هنا مع نسبة الخطأ.</p>`}
      <h2>الاستنتاج (Conclusion)</h2>
      <p>بحساب قيم مقاومات التوالي بدقة (${n('54 kΩ')} و${n('114 kΩ')} و${n('174 kΩ')} و${n('234 kΩ')}) وتجميع الدائرة، يمكن بناء فولتميتر تيار مستمر بمديات قابلة للاختيار 3 و6 و9 و12 V. تؤكد المعايرة وتحليل الخطأ أن استجابة الجهاز خطية على امتداد مداه، وأن مقاومة التوالي تضمن عمل الجلفانوميتر بأمان عند انحرافه الكامل 0.3 V. وأي خطأ في قيمة Rs ينعكس مباشرة خطأً في القراءة بالنسبة نفسها تقريباً.</p>`;
  }

  L.register({
    id: 'voltmeter', num: 1, group: 'meters',
    title: 'تصميم فولتميتر تيار مستمر متعدد المديات',
    en: 'Designing a DC Voltmeter',
    sheet: 'Experiment No. (1) — Designing a DC Voltmeter',
    tags: ['Galvanometer', 'Multiplier Rs', '3 / 6 / 9 / 12 V'],
    summary: 'تحويل جلفانوميتر (0.3 V، 6000 Ω) إلى فولتميتر بأربعة مديات 3 و6 و9 و12 V بإضافة مقاومة توالٍ (مضاعِف) لكل مدى، ثم معايرته بفولتميتر تجاري.',
    objectiveShort: 'تصميم ومعايرة فولتميتر تيار مستمر بمديات 3 V و6 V و9 V و12 V باستخدام جلفانوميتر انحرافه الكامل 0.3 V ومقاومته الداخلية 6000 Ω، بحساب مقاومات التوالي المناسبة.',
    mount, calc,
    theory: () => `
      <h2>الهدف (Objective)</h2>
      <p>تصميم ومعايرة فولتميتر تيار مستمر بمديات قابلة للاختيار <b>3 V و6 V و9 V و12 V</b> باستخدام جلفانوميتر (انحرافه الكامل عند ${n('0.3 V')}، ومقاومته الداخلية ${n('6000 Ω')}) وذلك بتحديد مقاومات التوالي (المضاعِفات) المناسبة.</p>
      <h2>النظرية (Theory)</h2>
      <p>يمكن تحويل الجلفانوميتر إلى فولتميتر بإضافة مقاومة كبيرة القيمة على التوالي معه تُسمّى <b>مقاومة المضاعِف</b> (Multiplier resistor). عند تسليط جهد على الفولتميتر يسقط معظم الجهد على هذه المقاومة، بينما يظهر على الجلفانوميتر جهد ثابت ${n('Vg')} عند الانحراف الكامل. يُعطى تيار الانحراف الكامل للجلفانوميتر بالعلاقة:</p>
      ${L.eq(`I<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'R<sub>g</sub>')}`)}
      <p>ولأي جهد انحراف كامل ${n('Vf')} يجب أن تُسقط مقاومة التوالي ${n('Rs')} الجهد الزائد، فتكون المعادلة:</p>
      ${L.eq(`R<sub>s</sub> = ${L.frac('V<sub>f</sub>', 'I<sub>g</sub>')} − R<sub>g</sub>`)}
      <h3>لماذا تعمل الفكرة؟</h3>
      <p>التيار المار في الجهاز ${n('I = V / (Rs + Rg)')} يتناسب طردياً مع الجهد المسلّط، وانحراف المؤشر يتناسب مع التيار. فإذا اخترنا ${n('Rs')} بحيث يكون ${n('I = Ig')} عندما ${n('V = Vf')}، صار التدريج من 0 إلى ${n('Vf')} خطياً تماماً. مفتاح اختيار المدى (range selector) يوصل مقاومة واحدة فقط في كل مرة بين الطرف الأحمر والجلفانوميتر.</p>
      <div class="note"><b>الحساسية:</b> ${n('S = 1/Ig = 1 / 50 µA = 20 kΩ/V')}. أي أن مقاومة الفولتميتر الكلية في أي مدى تساوي ${n('S × Vf')}، وكلما كبرت قلّ تأثير التحميل على الدائرة المقاسة.</div>`,
    apparatus: () => `
      <h2>مخطط الدائرة (Circuit Diagram)</h2>
      <figure class="figure">${schematic(2, null)}<figcaption>فولتميتر متعدد المديات: الجلفانوميتر على التوالي مع إحدى مقاومات المضاعِف Rs1–Rs4 حسب وضع مفتاح المديات.</figcaption></figure>
      <h2>المواد (Materials)</h2>
      <ul class="app-list">
        <li><b>الجلفانوميتر</b><span class="en">Galvanometer</span><span>انحراف كامل عند Vg = 0.3 V، مقاومة داخلية Rg = 6000 Ω.</span></li>
        <li><b>مقاومات التوالي</b><span class="en">Series resistors</span><span>تُحسب قيمها حسب المدى المطلوب.</span></li>
        <li><b>مجهّز قدرة مستمرة</b><span class="en">DC power supply</span><span>متغير ومعاير.</span></li>
        <li><b>فولتميتر تجاري</b><span class="en">Commercial voltmeter</span><span>للتحقق من دقة القراءات.</span></li>
        <li><b>أسلاك توصيل</b><span class="en">Connecting wires</span><span>لربط الدائرة.</span></li>
        <li><b>لوحة توصيل</b><span class="en">Breadboard</span><span>لتثبيت المقاومات والتوصيلات.</span></li>
      </ul>
      <h2>خطوات العمل (Procedure)</h2>
      <ol class="steps">
        <li><div><b>تجميع الدائرة:</b> صِل الجلفانوميتر على التوالي مع مقاومة التوالي المحسوبة Rs.</div></li>
        <li><div><b>تسليط جهد معلوم:</b> استخدم مجهز القدرة المتغير لتسليط جهود حسب المدى.</div></li>
        <li><div><b>ملاحظة الانحراف:</b> تحقق من وصول مؤشر الجلفانوميتر إلى نهاية التدريج.</div></li>
        <li><div><b>التحقق من الدقة:</b> قارن القراءات مع فولتميتر تجاري.</div></li>
      </ol>`,
    discussion: [
      { en: 'Why is a series resistance needed in a voltmeter?', ar: 'لماذا نحتاج مقاومة توالٍ في الفولتميتر؟',
        a: `<p>الجلفانوميتر وحده لا يتحمل أكثر من ${n('0.3 V')} (أي ${n('50 µA')}) عند الانحراف الكامل. عند قياس جهد أكبر تُسقط مقاومة التوالي الجهد الزائد ${n('(Vf − Vg)')} وتحدّ التيار بحيث لا يتجاوز ${n('Ig')} عند نهاية التدريج، فيبقى الانحراف متناسباً خطياً مع الجهد المقاس ويُحمى ملف الجلفانوميتر.</p><p>كما أنها ترفع المقاومة الكلية للجهاز، فلا يسحب من الدائرة المقاسة إلا تياراً صغيراً جداً.</p>` },
      { en: 'How did we determine the value of the series resistance Rs?', ar: 'كيف حدّدنا قيمة مقاومة التوالي Rs؟',
        a: `<p>من قانون أوم: عند الانحراف الكامل يمر ${n('Ig = 50 µA')} في الدائرة كلها، فالمقاومة الكلية اللازمة ${n('Vf / Ig')}، ونطرح منها مقاومة الجلفانوميتر:</p>${L.eq(`R<sub>s</sub> = ${L.frac('V<sub>f</sub>', 'I<sub>g</sub>')} − R<sub>g</sub>`)}<p>مثلاً للمدى 3 V: ${n('Rs = 3 / 50µA − 6000 = 60 000 − 6000 = 54 kΩ')}، وبالطريقة نفسها 114 و174 و234 kΩ للمديات 6 و9 و12 V.</p>` },
      { en: 'What would happen if Rs was smaller than the calculated value?', ar: 'ماذا يحدث لو كانت Rs أصغر من القيمة المحسوبة؟',
        a: `<p>يزداد التيار المار لنفس الجهد، فينحرف المؤشر أكثر مما يجب ويقرأ الجهاز <b>قيمة أكبر من الحقيقية</b> (خطأ موجب). ويصل المؤشر إلى نهاية التدريج عند جهد أقل من المدى المكتوب، وعند تسليط جهد المدى كاملاً يتجاوز التيار ${n('50 µA')} فيرتطم المؤشر بنهاية التدريج وقد يتلف ملف الجلفانوميتر.</p><p>مثال: لو كانت ${n('Rs1')} أقل بـ 10% (${n('48.6 kΩ')}) فإن 3 V تعطي ${n('I = 3 / 54.6 kΩ = 54.9 µA')}، أي انحرافاً قدره 110%. جرّب ذلك في المحاكاة بمقبض انحراف Rs.</p>` },
      { en: 'What is the significance of the internal resistance of the voltmeter?', ar: 'ما أهمية المقاومة الداخلية للفولتميتر؟',
        a: `<p>الفولتميتر يوصل على التوازي مع العنصر المراد قياس جهده، فيشكّل مساراً إضافياً يسحب تياراً من الدائرة (<b>تأثير التحميل</b> Loading effect) ويغيّر الجهد الذي يقيسه. كلما كانت مقاومته الداخلية ${n('Rm = Rs + Rg')} أكبر قلّ التيار المسحوب وقلّ الخطأ.</p><p>يُعبَّر عنها بالحساسية ${n('S = 1/Ig = 20 kΩ/V')}، فتكون مقاومة الجهاز 60 kΩ في مدى 3 V و240 kΩ في مدى 12 V. الفولتميتر المثالي مقاومته لا نهائية.</p>` },
      { en: 'How would the design change if we wanted a 8V full-scale voltmeter instead?', ar: 'كيف يتغير التصميم لو أردنا فولتميتر انحرافه الكامل 8 V؟',
        a: `<p>نغيّر قيمة مقاومة التوالي فقط، فالجلفانوميتر نفسه:</p>${L.eq(`R<sub>s</sub> = ${L.frac('8', '50×10<sup>−6</sup>')} − 6000 = 160 000 − 6000 = 154 kΩ`)}<p>ونضيف موضعاً جديداً في مفتاح المديات ونعيد ترقيم التدريج من 0 إلى 8 V. تصبح مقاومة الجهاز الكلية ${n('160 kΩ')}.</p>` },
    ],
  });
})();
