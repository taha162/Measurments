/* Experiment 2 — Multi-range DC ammeter: galvanometer (50 µA, 0.3 V) with selectable shunts. */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const Vg = 0.3, Ig = 50e-6, Rg = Vg / Ig, RLOAD = 1000;
  const RANGES = [3e-3, 6e-3, 9e-3, 12e-3];
  const RSH = RANGES.map((i) => Vg / (i - Ig)); // 101.69, 50.42, 33.52, 25.10 Ω
  const XSH = [450, 380, 310, 240]; // drawing positions of Rsh1..Rsh4 (sheet order: Rsh4 … Rsh1 left→right)
  const KEY = 'ammeter';
  let data = L.store.get(KEY + ':data', { rows: {} });
  const save = () => L.store.set(KEY + ':data', data);
  const mA = (v) => (v * 1e3).toFixed(0);

  function schematic(sel, showVals) {
    const off = sel === 'off';
    const xs = off ? 175 : XSH[sel];
    let s = '';
    s += S.wire([[50, 122], [50, 50], [85, 50]]);
    s += S.res(85, 50, 165, 50, { label: 'R load', sub: '1 kΩ', off: 30, lx: 125, ly: 22 });
    s += S.wire([[165, 50], [520, 50], [520, 142]]);
    s += S.text(196, 42, 'I →', { cls: 'cop' });
    XSH.forEach((x, i) => {
      const act = !off && i === sel;
      s += S.dot(x, 50);
      s += S.wire([[x, 50], [x, 82]], act ? 'active' : '');
      s += S.res(x, 82, x, 150, { cls: act ? 'active' : 'dim', label: `Rsh${i + 1}`, sub: showVals ? L.sig(RSH[i], 4) + ' Ω' : '', off: 11, lcls: act ? 'acc' : '' });
      s += S.wire([[x, 150], [x, 172]], act ? 'active' : '');
      s += S.term(x, 176);
    });
    s += S.term(175, 176) + S.text(175, 198, 'OFF', { cls: 'sub' });
    s += `<line class="w active" x1="345" y1="245" x2="${xs + (xs < 345 ? 3 : -3)}" y2="180"/>`;
    s += S.dot(345, 245) + S.text(372, 250, 'S', { cls: 'sub' });
    s += S.wire([[345, 245], [345, 272]]);
    s += S.wire([[520, 178], [520, 272], [50, 272], [50, 168]]);
    s += S.dot(345, 272);
    s += S.bat(50, 122, 50, 168, { label: 'Vs', off: -14 });
    s += S.text(540, 110, 'Ig', { cls: 'cop', anchor: 'start' });
    if (!off) s += S.text(xs - 10, 128, 'Ish', { cls: 'cop', anchor: 'end' });
    s += S.flow([[50, 122], [50, 50], [xs, 50]], 'tot');
    s += S.flow([[345, 272], [50, 272], [50, 168]], 'tot');
    if (!off) s += S.flow([[xs, 50], [xs, 176], [345, 245], [345, 272]], 'sh');
    s += S.flow([[xs, 50], [520, 50], [520, 272], [345, 272]], 'g', 'thin');
    s += S.meter(520, 160, 'G', { label: 'Galvanometer', lx: 520, ly: 206, lcls: 'sub' });
    return S.svg(570, 290, s, 'دائرة الأميتر متعدد المديات');
  }

  function mount(root) {
    const ws0 = L.store.get(KEY + ':ws', {});
    const st = { vs: 0, range: 0, solved: [0, 1, 2, 3].map((i) => !!(ws0[i] && ws0[i].ok)), fsSeen: false };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench">
        <div class="bench-grid">
          <div class="card sch c4"><div class="sch-title"><b>الأميتر متعدد المديات</b><span>Galvanometer ∥ Rsh, in series with R load</span></div><div id="am-sch"></div></div>
          <div class="inst c2">${L.ihead('الجلفانوميتر بعد التحويل', 'Galvanometer → Ammeter')}<div id="am-galv"></div><div class="inst-foot">التدريج العلوي بالـ mA للمدى المختار، والسفلي تيار الملف µA</div></div>
          <div class="inst c2">${L.ihead('مجهّز القدرة المستمرة', 'DC Power Supply 0–15 V')}<div id="am-ps-lcd"></div><div id="am-ps"></div></div>
          <div class="inst c2">${L.ihead('مفتاح الشنت S', 'Shunt selector')}<div id="am-rot"></div><div class="inst-foot">الوضع OFF يفصل كل الشنتات، فيمر التيار كله في الجلفانوميتر</div></div>
          <div class="inst c2">${L.ihead('أميتر رقمي مرجعي', 'Reference DMM · mA DC')}<div id="am-dmm"></div><div class="inst-foot">موصول على التوالي في الدائرة لقراءة التيار الحقيقي I</div></div>
          <div class="card c6">
            <div class="card-head"><h3>توزيع التيار والقراءات</h3><span class="status" id="am-status">—</span></div>
            <div class="readouts">
              ${L.ro('am-i', 'التيار الكلي I (المرجعي)')}
              ${L.ro('am-ig', 'تيار الجلفانوميتر Ig')}
              ${L.ro('am-ish', 'تيار الشنت Ish')}
              ${L.ro('am-read', 'قراءة الأميتر المصمَّم', 'hl')}
              ${L.ro('am-defl', 'الانحراف')}
              ${L.ro('am-rm', 'مقاومة الأميتر Rm = Rg ∥ Rsh')}
              ${L.ro('am-vm', 'الجهد على الأميتر')}
              ${L.ro('am-i0', 'التيار لو لم يُدخل الأميتر')}
            </div>
            <div class="meas-actions"><div class="chips" id="am-chips"></div><button type="button" class="btn primary" id="am-rec">سجّل القراءة في الجدول</button></div>
          </div>
        </div>
      </div>
      <aside class="side"><div id="am-guide"></div><div id="am-ws"></div></aside>
    </div>
    <div class="data-row one">
      <div class="card">
        <div class="card-head"><h3>جدول النتائج</h3><div class="actions"><button type="button" class="btn small" id="am-copy">نسخ الجدول</button><button type="button" class="btn small ghost" id="am-clear">مسح القراءات</button></div></div>
        <div class="table-wrap" id="am-table"></div>
      </div>
    </div>`;

    const galv = L.AnalogMeter(L.$('#am-galv', root), { unit: 'mA', brand: 'Ig 50 µA · Vg 0.3 V', aria: 'مؤشر الأميتر' });
    const psLcd = L.LCD(L.$('#am-ps-lcd', root), { digits: 4, unit: 'V', tag: 'OUT' });
    const dmm = L.LCD(L.$('#am-dmm', root), { digits: 5, unit: 'mA', tag: 'DC' });
    const ps = L.Control(L.$('#am-ps', root), {
      id: 'am-vs', label: 'جهد الخرج', unit: 'V', min: 0, max: 15, value: 0, step: 0.01, decimals: 2, steps: [-1, 1, -0.1, 0.1, -0.01, 0.01],
      onInput: (v) => { st.vs = v; update(); },
    });
    L.Rotary(L.$('#am-rot', root), {
      positions: [...RANGES.map((v, i) => ({ v: i, label: mA(v) + ' mA' })), { v: 'off', label: 'OFF', danger: true }], value: 0, span: 140,
      onChange: (v) => { st.range = v === 'off' ? 'off' : +v; drawSch(); setScales(); update(); },
    });
    const drawSch = () => { L.$('#am-sch', root).innerHTML = schematic(st.range, true); };
    const setScales = () => {
      if (st.range === 'off') { galv.scales([{ ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }, { ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }]); galv.unit('µA'); return; }
      const f = RANGES[st.range] * 1e3;
      galv.scales([{ ticks: L.linTicks(0, f, f / 6, f / 30), name: 'mA' }, { ticks: L.linTicks(0, 50, 10, 2), name: 'µA' }]);
      galv.unit('mA');
    };
    L.Worksheet(L.$('#am-ws', root), {
      key: KEY + ':ws', title: 'ورقة التصميم',
      intro: `${L.ieq(`R<sub>sh</sub> = ${L.frac('V<sub>g</sub>', 'I − I<sub>g</sub>')} = ${L.frac('0.3', 'I − 50×10<sup>−6</sup>')}`)}`,
      items: RANGES.map((v, i) => ({
        label: `Rsh${i + 1}`, sub: `(${mA(v)} mA)`, unit: 'Ω', answer: RSH[i], tol: 0.004,
        hint: 'غير صحيح: Ish = I − 50 µA ثم Rsh = 0.3 / Ish',
        solution: n(`Ish = ${(v - Ig).toFixed(5)} A ⇒ Rsh = 0.3 / ${(v - Ig).toFixed(5)} = ${RSH[i].toFixed(2)} Ω`),
      })),
      onSolve: (sv) => { st.solved = sv; update(); },
    });
    const guide = L.Guide(L.$('#am-guide', root), [
      { t: 'تحقق من مواصفات الجلفانوميتر (50 µA و0.3 V) واحسب Rsh لكل مدى في ورقة التصميم.', check: (s) => s.solved.every(Boolean) },
      { t: 'اختر المدى 3 mA (الشنت Rsh1)، ثم شغّل المجهز وارفع الجهد تدريجياً.', check: (s) => s.range === 0 && s.vs > 0.2 },
      { t: 'اضبط الجهد للانحراف الكامل وقارن القراءة بالأميتر الرقمي المرجعي، ثم سجّل.', check: () => !!data.rows[0] },
      { t: 'كرّر لبقية المديات 6 و9 و12 mA.', check: () => [1, 2, 3].every((i) => data.rows[i]) },
      { t: 'لاحظ توزّع التيار: عند الانحراف الكامل يبقى Ig = 50 µA في كل المديات ويمر الباقي في الشنت.', check: (s) => s.fsSeen },
      { t: 'اختر الوضع OFF بجهد صغير لترى لماذا لا يجوز فتح الشنت أثناء القياس.', check: (s) => s.range === 'off' && s.vs > 0.05 },
    ]);

    const chips = L.$('#am-chips', root);
    chips.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      const k = compute();
      ps.set(+(+c.dataset.t * k.full * (RLOAD + k.Rm)).toFixed(2));
    });
    L.$('#am-rec', root).addEventListener('click', () => {
      const k = compute();
      if (st.range === 'off') return L.toast('لا يمكن التسجيل والشنت مفصول: اختر أحد المديات', 'warn');
      if (st.vs <= 0.01) return L.toast('ارفع جهد المجهز أولاً', 'warn');
      if (k.defl > 1.02) return L.toast('المؤشر تجاوز نهاية التدريج: خفّض الجهد', 'bad');
      if (k.defl < 0.1) return L.toast('الانحراف صغير جداً: ارفع الجهد قرب نهاية التدريج لقراءة أدق', 'warn');
      data.rows[st.range] = { vs: st.vs, I: k.I, read: k.reading, ig: k.Igal, ish: k.Ish, defl: k.defl };
      save(); renderTable(); update();
      L.toast(`سُجّلت قراءة المدى ${mA(RANGES[st.range])} mA`);
    });
    L.$('#am-copy', root).addEventListener('click', () => L.copyTable(L.$('#am-table table', root)));
    L.$('#am-clear', root).addEventListener('click', () => { data = { rows: {} }; save(); renderTable(); update(); L.toast('تم مسح القراءات'); });

    function compute() {
      const off = st.range === 'off';
      const Rsh = off ? Infinity : RSH[st.range];
      const Rm = off ? Rg : (Rsh * Rg) / (Rsh + Rg);
      const I = st.vs / (RLOAD + Rm);
      const Igal = (I * Rm) / Rg;
      const full = off ? Ig : RANGES[st.range];
      const defl = Igal / Ig;
      return { off, Rsh, Rm, I, Igal, Ish: I - Igal, defl, full, reading: Math.min(defl, 1.07) * full, I0: st.vs / RLOAD, Vm: I * Rm };
    }
    function renderTable() {
      const head = ['المدى', 'Rsh (Ω)', 'Vs (V)', 'I المرجعي (mA)', 'قراءة الأميتر (mA)', 'Ig (µA)', 'Ish (mA)', 'الخطأ %'];
      const rows = RANGES.map((v, i) => {
        const d = data.rows[i];
        const e = d ? ((d.read - d.I) / d.I) * 100 : null;
        return [mA(v) + ' mA', n(RSH[i].toFixed(2)), d && n(d.vs.toFixed(2)), d && n((d.I * 1e3).toFixed(3)), d && n((d.read * 1e3).toFixed(3)), d && n((d.ig * 1e6).toFixed(1)), d && n((d.ish * 1e3).toFixed(3)), d && n(e.toFixed(2))];
      });
      L.$('#am-table', root).innerHTML = L.table(head, rows);
    }
    function update() {
      const k = compute();
      if (!k.off && k.defl > 0.97 && k.defl < 1.03 && st.range > 0) st.fsSeen = true;
      galv.set(k.defl);
      psLcd.set(L.lcdText(st.vs, 2, 4));
      dmm.set(L.lcdText(k.I * 1e3, 3, 5));
      L.setText('am-i', L.fx(k.I * 1e3, 3) + ' mA', root);
      L.setText('am-ig', L.fx(k.Igal * 1e6, 2) + ' µA', root);
      L.setText('am-ish', k.off ? '0 (مفصول)' : L.fx(k.Ish * 1e3, 3) + ' mA', root);
      L.setText('am-read', k.defl > 1.02 ? 'خارج التدريج' : k.off ? L.fx(k.reading * 1e6, 1) + ' µA' : L.fx(k.reading * 1e3, 3) + ' mA', root);
      L.setText('am-defl', L.fx(k.defl * 100, 1) + ' %', root);
      L.setText('am-rm', L.fx(k.Rm, 2) + ' Ω', root);
      L.setText('am-vm', L.fx(k.Vm, 3) + ' V', root);
      L.setText('am-i0', L.fx(k.I0 * 1e3, 3) + ' mA', root);
      const status = L.$('#am-status', root);
      if (st.vs <= 0.001) { status.className = 'status'; status.textContent = 'المصدر على 0 V'; }
      else if (k.defl > 1.02) { status.className = 'status bad'; status.textContent = k.off ? 'الشنت مفصول: تيار الملف تجاوز 50 µA' : 'تجاوز التدريج'; }
      else { status.className = 'status ok'; status.textContent = 'ضمن التدريج'; }
      const sp = (i) => 0.25 + 1.6 * Math.sqrt(Math.min(i, 0.014) / 0.012);
      L.setFlow(root, 'tot', st.vs > 0.001, sp(k.I));
      L.setFlow(root, 'sh', st.vs > 0.001 && !k.off, sp(k.Ish));
      L.setFlow(root, 'g', st.vs > 0.001, sp(k.Igal));
      chips.innerHTML = k.off ? '' : '<span class="muted" style="font-size:13px">اضبط المؤشر على:</span>' + [0.25, 0.5, 0.75, 1].map((t) => `<button type="button" class="chip" data-t="${t}">${t * 100}% ← ${n((t * k.full * (RLOAD + k.Rm)).toFixed(2) + ' V')}</button>`).join('');
      guide.update(st);
    }
    drawSch(); setScales(); renderTable(); update();
  }

  function calc() {
    const rows = RANGES.map((v, i) => {
      const d = data.rows[i];
      return [mA(v) + ' mA', n(RSH[i].toFixed(2) + ' Ω'), n((RSH[i] * Rg / (RSH[i] + Rg)).toFixed(2) + ' Ω'), d ? n((d.I * 1e3).toFixed(3)) : '', d ? n((d.read * 1e3).toFixed(3)) : '', d ? n((d.ig * 1e6).toFixed(1) + ' µA') : ''];
    });
    return `
      <h2>حساب مقاومة الجلفانوميتر</h2>
      ${L.eq(`R<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'I<sub>g</sub>')} = ${L.frac('0.3', '50 × 10<sup>−6</sup>')} = 6000 Ω`)}
      <h2>حسابات التصميم (Design Calculations)</h2>
      <ol class="steps">
        ${RANGES.map((v, i) => `<li><div><b>للانحراف الكامل ${mA(v)} mA:</b>
          <ul>
            <li>التيار الكلي: ${n(`I = ${mA(v)} mA = ${v.toFixed(3)} A`)}</li>
            <li>تيار الشنت: ${n(`Ish = ${v.toFixed(3)} − 50×10⁻⁶ = ${(v - Ig).toFixed(5)} A`)}</li>
            <li>مقاومة الشنت: ${L.ieq(`R<sub>sh</sub> = ${L.frac('0.3', (v - Ig).toFixed(5))} ≈ <b>${RSH[i].toFixed(2)} Ω</b>`)}</li>
          </ul></div></li>`).join('')}
      </ol>
      <h2>قيم المقاومات المطلوبة (Components)</h2>
      <ul>
        ${RANGES.map((v, i) => `<li>تقريباً ${n(RSH[i].toFixed(i ? 2 : 1) + ' Ω')} لمدى ${mA(v)} mA</li>`).join('')}
        <li>مقاومة حمل ${n('R load = 1000 Ω')}</li>
      </ul>
      <h2>النتائج</h2>
      <div class="table-wrap">${L.table(['المدى', 'Rsh', 'Rm = Rg∥Rsh', 'I المرجعي (mA)', 'قراءة الأميتر (mA)', 'Ig'], rows)}</div>
      ${Object.keys(data.rows).length ? '' : `<p class="muted">سجّل القراءات من <a href="#" data-goto-tab="sim">المحاكاة</a> لتظهر في الأعمدة الأخيرة.</p>`}
      <div class="note"><b>ملاحظة على خطأ الإدخال:</b> مقاومة الأميتر في مدى 3 mA تساوي تقريباً ${n('100 Ω')}، وهي ليست صغيرة مقارنة بمقاومة الحمل ${n('1 kΩ')}، لذا ينخفض تيار الدائرة نحو 9% عند إدخال الأميتر. القراءة صحيحة للتيار المار فعلاً، لكنه أقل من التيار قبل إدخال الجهاز.</div>
      <h2>مبدأ العمل (Principle of Operation)</h2>
      <p>ينحرف الجلفانوميتر انحرافاً كاملاً عند 50 µA. بوضع مقاومة شنت على التوازي معه يتجاوز معظم التيار الجلفانوميتر، فيصبح الجهاز قادراً على قياس تيارات أكبر بكثير من 50 µA. ويحكم تقسيم التيار نسبة مقاومة الجلفانوميتر إلى مقاومة الشنت: ${n('Ig / Ish = Rsh / Rg')}.</p>
      <h2>الاستنتاج (Conclusion)</h2>
      <p>تم تحويل جلفانوميتر حساس (50 µA، 0.3 V، 6000 Ω) إلى أميتر متعدد المديات بإضافة مقاومة شنت صغيرة على التوازي لكل مدى: ${n('101.7 Ω')} لمدى 3 mA و${n('50.42 Ω')} لمدى 6 mA و${n('33.52 Ω')} لمدى 9 mA و${n('25.10 Ω')} لمدى 12 mA. كلما كبر المدى صغرت مقاومة الشنت لأنه يجب أن يمرر جزءاً أكبر من التيار، بينما يبقى تيار الملف عند الانحراف الكامل 50 µA وجهده 0.3 V في كل المديات. كما تبيّن أن مقاومة الأميتر الداخلية تُضاف إلى الدائرة فتقلل التيار قليلاً، لذا يجب أن تكون صغيرة جداً مقارنة بمقاومة الدائرة المقاسة.</p>`;
  }

  L.register({
    id: 'ammeter', num: 2, group: 'meters',
    title: 'تصميم أميتر تيار مستمر متعدد المديات',
    en: 'Design of a Multi-Range DC Ammeter',
    sheet: 'Experiment No. (2) — Design and a Multi-Range DC Ammeter',
    tags: ['Shunt Rsh', 'Current divider', '3 / 6 / 9 / 12 mA'],
    summary: 'تحويل الجلفانوميتر نفسه (50 µA، 0.3 V) إلى أميتر يقيس حتى 3 و6 و9 و12 mA بإضافة مقاومة تفرّع (Shunt) مناسبة لكل مدى، مع ملاحظة توزّع التيار بين الملف والشنت.',
    objectiveShort: 'تصميم أميتر تيار مستمر بمديات 3 و6 و9 و12 mA بتحويل جلفانوميتر (0.3 V، 50 µA) بإضافة مقاومة شنت لكل مدى، وفهم مبدأ تقسيم التيار في الدوائر المتوازية.',
    mount, calc,
    theory: () => `
      <h2>الأهداف (Objective)</h2>
      <ul>
        <li>تصميم أميتر تيار مستمر قادر على قياس تيارات حتى <b>3 و6 و9 و12 mA</b>.</li>
        <li>تحويل جلفانوميتر حساس (${n('0.3 V')}، ${n('50 µA')} انحراف كامل) إلى أميتر عملي بإضافة مقاومة شنت مناسبة لكل مدى.</li>
        <li>فهم مبدأ تقسيم التيار في الدوائر المتوازية وتطبيقه في تحويل أجهزة القياس.</li>
      </ul>
      <h2>النظرية (Theory)</h2>
      <p>الجلفانوميتر جهاز حساس ينحرف انحرافاً كاملاً عند تيار صغير. في هذه التجربة يحدث الانحراف الكامل عند ${n('Ig = 50 µA')} مع هبوط جهد ${n('Vg = 0.3 V')}، فتكون مقاومته الداخلية:</p>
      ${L.eq(`R<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'I<sub>g</sub>')} = ${L.frac('0.3', '50 × 10<sup>−6</sup>')} = 6000 Ω`)}
      <p>لقياس تيارات أكبر يوصل الجلفانوميتر على التوازي مع مقاومة شنت ${n('Rsh')}. عند توصيل الأميتر على التوالي مع الدائرة المراد قياس تيارها، ينقسم التيار الكلي ${n('I')} بين الجلفانوميتر والشنت. عند الانحراف الكامل:</p>
      ${L.eq('I = I<sub>g</sub> + I<sub>sh</sub>')}
      <p>حيث ${n('Ish = I − Ig')}. وبما أن هبوط الجهد على الجلفانوميتر والشنت متساوٍ (توازي):</p>
      ${L.eq(`R<sub>sh</sub> = ${L.frac('V<sub>g</sub>', 'I<sub>sh</sub>')} = ${L.frac('V<sub>g</sub>', 'I − I<sub>g</sub>')}`)}
      <p>تُستخدم هذه المعادلة لتحديد قيمة مقاومة الشنت لكل مدى.</p>
      <figure class="figure">${S.svg(360, 200, `${S.wire([[40, 40], [300, 40], [300, 80]])}${S.wire([[40, 160], [300, 160], [300, 120]])}${S.dot(150, 40)}${S.dot(150, 160)}${S.res(150, 40, 150, 160, { label: 'Rsh', off: 14 })}${S.meter(300, 100, 'G')}${S.text(320, 104, 'Galvanometer', { anchor: 'start', cls: 'sub' })}${S.term(40, 40)}${S.term(40, 160)}${S.text(30, 44, '+', { anchor: 'end' })}${S.text(30, 164, '−', { anchor: 'end' })}${S.text(80, 30, 'I →', { cls: 'cop' })}${S.text(166, 76, 'Ish ↓', { cls: 'cop', anchor: 'start' })}${S.text(312, 70, 'Ig ↓', { cls: 'cop', anchor: 'start' })}`, 'الجلفانوميتر مع الشنت')}<figcaption>تقسيم التيار بين الشنت والجلفانوميتر</figcaption></figure>
      <h2>مبدأ العمل (Principle of Operation)</h2>
      <p>ينحرف الجلفانوميتر انحرافاً كاملاً عند 50 µA. بوضع مقاومة شنت على التوازي يتجاوز معظم التيار الجلفانوميتر، فيقيس الجهاز تيارات أكبر بكثير من 50 µA. ويحكم تقسيم التيار نسبة مقاومة الجلفانوميتر إلى مقاومة الشنت.</p>
      <div class="note"><b>ملاحظة:</b> في كثير من التصاميم لا تلزم مقاومة التوالي ${n('Rseries')} إذا كان هبوط الجهد على الجلفانوميتر (0.3 V) مقبولاً، وقد تُضاف للحماية أو المعايرة.</div>`,
    apparatus: () => `
      <h2>مخطط الدائرة (Circuit Diagram)</h2>
      <figure class="figure">${schematic(0, false)}<figcaption>المجهز ثم مقاومة الحمل ثم الأميتر (الجلفانوميتر على التوازي مع الشنت المختار بالمفتاح S).</figcaption></figure>
      <h2>المكوّنات (Components)</h2>
      <ul class="app-list">
        <li><b>جلفانوميتر</b><span class="en">Galvanometer</span><span>0.3 V انحراف كامل، حساسية 50 µA، مقاومة داخلية ≈ 6000 Ω.</span></li>
        <li><b>مقاومة حمل</b><span class="en">Load resistor</span><span>1000 Ω.</span></li>
        <li><b>مقاومات دقيقة للشنت</b><span class="en">Precision shunt resistors</span><span>≈ 102 Ω (3 mA)، 50.4 Ω (6 mA)، 33.5 Ω (9 mA)، 25.1 Ω (12 mA).</span></li>
        <li><b>مجهّز قدرة مستمرة</b><span class="en">DC power supply</span><span>متغير.</span></li>
        <li><b>أسلاك ولوحة توصيل</b><span class="en">Connecting wires, breadboard</span><span>لتجميع الدائرة.</span></li>
      </ul>
      <h2>خطوات العمل (Procedure)</h2>
      <ol class="steps">
        <li><div><b>التحضير:</b> تحقق من مواصفات الجلفانوميتر (انحراف كامل عند 50 µA وهبوط جهد 0.3 V)، واحسب قيمة الشنت لكل مدى بالمعادلة ${L.ieq(`R<sub>sh</sub> = ${L.frac('0.3', 'I<sub>range</sub> − 50×10<sup>−6</sup>')}`)} حيث ${n('Irange')} تيار الانحراف الكامل للمدى المختار.</div></li>
        <li><div><b>تجميع الدائرة:</b> لكل مدى صِل الجلفانوميتر على التوازي مع الشنت المناظر له، ثم صِل المجموعة على التوالي مع المصدر. أضف مقاومة توالٍ عند الحاجة للمعايرة أو الحماية. تأكد من إحكام التوصيلات وعدم وجود قصر.</div></li>
      </ol>`,
    discussion: [
      { en: 'How is the galvanometer’s internal resistance determined?', ar: 'كيف تُحدَّد المقاومة الداخلية للجلفانوميتر؟',
        a: `<p>من مواصفاته: جهد الانحراف الكامل ${n('Vg = 0.3 V')} وتياره ${n('Ig = 50 µA')}، فبقانون أوم:</p>${L.eq(`R<sub>g</sub> = ${L.frac('V<sub>g</sub>', 'I<sub>g</sub>')} = ${L.frac('0.3', '50×10<sup>−6</sup>')} = 6000 Ω`)}<p>وعملياً يمكن قياسها بطريقة <b>نصف الانحراف</b> (Half-deflection): نضبط مقاومة توالٍ كبيرة لانحراف كامل، ثم نوصل مقاومة متغيرة على التوازي مع الجلفانوميتر ونعدّلها حتى ينزل المؤشر إلى نصف التدريج، فتكون قيمتها مساوية ${n('Rg')} تقريباً. لا يُفضّل قياسها بالأوميتر مباشرة لأن تيار الأوميتر قد يتجاوز 50 µA فيتلف الملف.</p>` },
      { en: 'Why is a shunt resistor needed?', ar: 'لماذا نحتاج مقاومة الشنت؟',
        a: `<p>لأن الجلفانوميتر لا يتحمل أكثر من 50 µA. الشنت مسار منخفض المقاومة على التوازي معه يمرر معظم التيار ${n('Ish = I − Ig')}، فيبقى تيار الملف ضمن حدوده ويتوسّع مدى القياس. كما يجعل مقاومة الأميتر الكلية صغيرة (≈ Rsh) فلا يغيّر كثيراً التيار المراد قياسه.</p>` },
      { en: 'What formula is used to calculate the shunt resistor?', ar: 'ما المعادلة المستخدمة لحساب مقاومة الشنت؟',
        a: `${L.eq(`R<sub>sh</sub> = ${L.frac('V<sub>g</sub>', 'I − I<sub>g</sub>')} = ${L.frac('I<sub>g</sub> R<sub>g</sub>', 'I − I<sub>g</sub>')} = ${L.frac('R<sub>g</sub>', 'm − 1')}`)}<p>حيث ${n('m = I / Ig')} معامل التكبير. مثال لمدى 3 mA: ${n('m = 60')} ⇒ ${n('Rsh = 6000 / 59 = 101.7 Ω')}.</p>` },
      { en: 'What are some potential sources of error in this design?', ar: 'ما مصادر الخطأ المحتملة في هذا التصميم؟',
        a: `<ul>
          <li><b>سماحية مقاومات الشنت:</b> قيمها صغيرة، فأي خطأ نسبي فيها ينتقل مباشرة إلى القراءة.</li>
          <li><b>مقاومة التلامس والأسلاك:</b> مقاومة تلامس المفتاح (مثلاً 0.5 Ω) تُضاف على التوالي مع الشنت، وهي نحو 2% من شنت 25 Ω.</li>
          <li><b>تأثير الحرارة:</b> تتغير مقاومة الملف النحاسي والشنت مع درجة الحرارة.</li>
          <li><b>خطأ الإدخال (التحميل):</b> مقاومة الأميتر تضاف إلى الدائرة فتقلل التيار، فمثلاً في مدى 3 mA (≈100 Ω) مع حمل 1 kΩ ينخفض التيار نحو 9%.</li>
          <li><b>عدم دقة قيم Rg و Ig</b> المعتمدة في الحساب، وخطأ الصفر الميكانيكي للمؤشر.</li>
          <li><b>خطأ القراءة (Parallax)</b> عند النظر إلى المؤشر بزاوية.</li>
          <li><b>تبديل المدى أثناء مرور التيار:</b> فتح الشنت لحظياً يمرر التيار كله في الملف وقد يتلفه.</li>
        </ul>` },
    ],
  });
})();
