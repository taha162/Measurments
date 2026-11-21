/* Experiment 4 — Rotary potentiometer measured by analog and digital voltmeters (loading effect). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const RT = 9860, VS = 5, RDIG = 10e6, SWEEP = 270;
  const POS = [0, 0.25, 0.5, 0.75, 1];
  const ANG = ['0°', '≈ 68°', '≈ 135°', '≈ 203°', '270°'];
  const KEY = 'pot';
  let data = L.store.get(KEY + ':data', { RT: null, rows: [{}, {}, {}, {}, {}], sens: 2000 });
  const save = () => L.store.set(KEY + ':data', data);
  const loaded = (x, Rm) => { const vth = x * VS, rth = x * (1 - x) * RT; return Rm === Infinity ? vth : (vth * Rm) / (Rm + rth); };

  function schematic(x, meter, probe, on) {
    const yw = 225 - x * 150;
    let s = '';
    s += S.wire([[60, 112], [60, 50], [200, 50]]) + S.wire([[200, 250], [60, 250], [60, 188]]);
    s += S.bat(60, 112, 60, 188, { label: on ? 'Vs = 5 V' : 'OFF', off: -16, cls: on ? '' : 'dim' });
    s += S.res(200, 50, 200, 250, { body: 150 });
    s += S.gnd(60, 250);
    s += S.dot(200, 50) + S.text(212, 44, 'B (+)', { anchor: 'start' });
    s += S.dot(200, 250) + S.text(212, 268, 'A (GND)', { anchor: 'start' });
    s += `<line class="w" x1="252" y1="${yw}" x2="212" y2="${yw}" marker-end="url(#arrowhead)"/>`;
    s += S.text(258, yw - 8, 'W', { cls: 'acc big', anchor: 'start' });
    const letter = meter === 'ohm' ? 'Ω' : 'V';
    if (meter === 'ohm' && probe === 'AB') s += S.wire([[400, 183], [400, 30], [200, 30], [200, 50]], 'active');
    else s += S.wire([[252, yw], [300, yw], [300, 150], [400, 150], [400, 183]], 'active');
    s += S.wire([[400, 217], [400, 250], [200, 250]], 'active');
    s += S.meter(400, 200, letter, { label: meter === 'analog' ? 'Analog V' : meter === 'digital' ? 'Digital V' : 'Ohmmeter', lx: 424, ly: 204, anchor: 'start', lcls: 'sub' });
    s += S.flow([[60, 112], [60, 50], [200, 50], [200, 250], [60, 250], [60, 188]], 'pot');
    return S.svg(500, 290, s, 'دائرة مجزئ الجهد');
  }

  /* draggable rotary potentiometer dial */
  function PotDial(host, o) {
    const cx = 120, cy = 118;
    const pt = (r, deg) => { const a = ((deg - 135) * Math.PI) / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
    let ticks = '';
    for (let d = 0; d <= 270; d += 13.5) { const [x1, y1] = pt(92, d), [x2, y2] = pt(d % 67.5 === 0 ? 80 : 86, d); ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="${d % 67.5 === 0 ? 2 : 1}"/>`; }
    POS.forEach((p, i) => { const [x, y] = pt(108, p * 270); ticks += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" style="font:600 11px var(--font-mono);fill:currentColor">${p * 100}%</text>`; void i; });
    host.innerHTML = `<svg viewBox="0 0 240 232" style="width:100%;max-width:250px;display:block;margin-inline:auto;color:var(--panel-ink);touch-action:none;cursor:grab" role="slider" tabindex="0" aria-label="زاوية دوران مجزئ الجهد" aria-valuemin="0" aria-valuemax="270">
      ${ticks}
      <circle cx="${cx}" cy="${cy}" r="70" fill="#b7bcbf" stroke="#6d7377" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="58" fill="url(#potKnurl)" stroke="#2a2f33" stroke-width="1"/>
      <defs><radialGradient id="potKnurl" cx="40%" cy="35%"><stop offset="0" stop-color="#5a6268"/><stop offset=".7" stop-color="#262c30"/><stop offset="1" stop-color="#15191c"/></radialGradient></defs>
      <g class="pd-ptr"><line x1="${cx}" y1="${cy - 12}" x2="${cx}" y2="${cy - 54}" stroke="#f4f4f4" stroke-width="5" stroke-linecap="round"/></g>
      <text x="${cx}" y="${cy + 26}" text-anchor="middle" class="pd-val" style="font:600 13px var(--font-mono);fill:#f4f4f4"></text>
    </svg>`;
    const svg = host.querySelector('svg'), ptr = svg.querySelector('.pd-ptr'), val = svg.querySelector('.pd-val');
    let th = o.value || 0, drag = false;
    const paint = () => { ptr.setAttribute('transform', `rotate(${(th - 135).toFixed(2)} ${cx} ${cy})`); val.textContent = th.toFixed(1) + '°'; svg.setAttribute('aria-valuenow', th.toFixed(1)); };
    const set = (v, emit = true) => {
      v = L.clamp(v, 0, 270);
      for (const p of POS) if (Math.abs(v - p * 270) < 3) v = p * 270;
      th = +v.toFixed(2); paint(); if (emit) o.onInput(th);
    };
    const fromEvent = (e) => {
      const r = svg.getBoundingClientRect(), sc = 240 / r.width;
      const dx = (e.clientX - r.left) * sc - cx, dy = (e.clientY - r.top) * sc - cy;
      let a = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (Math.abs(a) > 135) a = th < 135 ? -135 : 135;
      set(a + 135);
    };
    svg.addEventListener('pointerdown', (e) => { drag = true; svg.setPointerCapture(e.pointerId); svg.style.cursor = 'grabbing'; fromEvent(e); e.preventDefault(); svg.focus({ preventScroll: true }); });
    svg.addEventListener('pointermove', (e) => { if (drag) fromEvent(e); });
    const end = () => { drag = false; svg.style.cursor = 'grab'; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', (e) => {
      const m = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };
      if (e.key in m) { e.preventDefault(); set(th + m[e.key] * (e.shiftKey ? 0.1 : 1)); }
      if (e.key === 'Home') { e.preventDefault(); set(0); }
      if (e.key === 'End') { e.preventDefault(); set(270); }
    });
    paint();
    return { set, get: () => th };
  }

  function mount(root) {
    const st = { th: 0, meter: 'ohm', probe: 'AB', on: false, sens: data.sens || 2000 };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="card sch c4"><div class="sch-title"><b>B إلى +Vs، A إلى الأرضي، W الذراع المنزلق</b><span>Connect only ONE meter between W and A</span></div><div id="pt-sch"></div></div>
        <div class="inst c2">${L.ihead('مجزئ الجهد الدوّار', 'Rotary pot · B10K linear')}<div id="pt-dial"></div><div class="chips" id="pt-chips" style="justify-content:center"></div></div>
        <div class="inst c2" id="pt-an-i">${L.ihead('فولتميتر تناظري', 'Analog voltmeter 0–10 V')}<div id="pt-an"></div>
          <label class="field"><span>الحساسية (المقاومة الداخلية)</span><select id="pt-sens">${[1000, 2000, 5000, 20000].map((s) => `<option value="${s}"${s === st.sens ? ' selected' : ''}>${s / 1000} kΩ/V ⇒ Rm = ${s / 100} kΩ</option>`).join('')}</select></label>
        </div>
        <div class="inst c2">${L.ihead('ملتيميتر رقمي', 'Digital multimeter · Rin 10 MΩ')}<div id="pt-lcd"></div><div class="inst-foot" id="pt-dmm-note">—</div></div>
        <div class="inst c2">${L.ihead('التوصيل والمصدر', 'Meter between W–A · Supply')}
          <div style="display:grid;gap:10px;justify-items:center">
            <div id="pt-meter"></div>
            <div id="pt-probe"></div>
            <div id="pt-pwr"></div>
          </div>
        </div>
        <div class="card c6">
          <div class="card-head"><h3>القراءات</h3><span class="status" id="pt-status">—</span></div>
          <div class="readouts">
            ${L.ro('pt-x', 'الموضع x')}${L.ro('pt-raw', 'RAW الحقيقية')}${L.ro('pt-vth', 'الجهد النظري x·Vs')}${L.ro('pt-rth', 'مقاومة ثفنن x(1−x)RT')}${L.ro('pt-read', 'قراءة الجهاز الموصول', 'hl')}${L.ro('pt-err', 'خطأ التحميل')}
          </div>
          <div class="meas-actions"><span class="muted" style="font-size:13px">أوقف المؤشر على إحدى العلامات الخمس ثم سجّل. الجدول يملأ العمود المناسب حسب الجهاز الموصول.</span><button type="button" class="btn primary" id="pt-rec">سجّل القراءة</button></div>
        </div>
      </div></div>
      <aside class="side"><div id="pt-guide"></div></aside>
    </div>
    <div class="data-row">
      <div class="card"><div class="card-head"><h3>جدول المشاهدات (Data Table)</h3><div class="actions"><button type="button" class="btn small" id="pt-copy">نسخ</button><button type="button" class="btn small ghost" id="pt-clear">مسح</button></div></div><div class="data-meta" id="pt-meta"></div><div class="table-wrap" id="pt-table"></div></div>
      <div class="card"><div class="card-head"><h3>Vout مقابل موضع المجزئ</h3></div><div id="pt-plot"></div></div>
    </div>`;
    const dial = PotDial(L.$('#pt-dial', root), { value: 0, onInput: (v) => { st.th = v; update(); } });
    const an = L.AnalogMeter(L.$('#pt-an', root), { unit: 'V', brand: 'DC V · CLASS 2.5', aria: 'مؤشر الفولتميتر التناظري', scales: [{ ticks: L.linTicks(0, 10, 1, 0.2), name: 'V' }] });
    const lcd = L.LCD(L.$('#pt-lcd', root), { digits: 4, unit: 'kΩ', tag: 'Ω' });
    L.$('#pt-chips', root).innerHTML = POS.map((p, i) => `<button type="button" class="chip" data-p="${p}">${p * 100}% ${ANG[i]}</button>`).join('');
    L.$('#pt-chips', root).addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) dial.set(+c.dataset.p * SWEEP); });
    const meterSeg = L.Seg(L.$('#pt-meter', root), { options: [{ v: 'ohm', label: 'أوميتر' }, { v: 'analog', label: 'تناظري' }, { v: 'digital', label: 'رقمي' }], value: st.meter, aria: 'الجهاز الموصول', onChange: (v) => { st.meter = v; update(); } });
    L.Seg(L.$('#pt-probe', root), { options: [{ v: 'AB', label: 'بين A و B' }, { v: 'AW', label: 'بين A و W' }], value: st.probe, aria: 'طرفا الأوميتر', onChange: (v) => { st.probe = v; update(); } });
    const pwr = L.Power(L.$('#pt-pwr', root), { label: 'المجهز 5 V', value: false, onChange: (v) => { st.on = v; update(); } });
    L.$('#pt-sens', root).addEventListener('change', (e) => { st.sens = +e.target.value; data.sens = st.sens; save(); update(); renderTable(); });
    const plot = L.Plot(L.$('#pt-plot', root), { xLabel: 'Potentiometer position x (%)', yLabel: 'Vout (V)', x: [0, 100], y: [0, 5.5], height: 260, tipX: (v) => L.fx(v, 0) + ' %', tipY: (v) => L.fx(v, 3) + ' V', markLabel: 'القراءة الحالية' });
    const guide = L.Guide(L.$('#pt-guide', root), [
      { t: 'والمجهز مطفأ ومفصول، قِس المقاومة الكلية RT بين A و B بالأوميتر وسجّلها.', check: () => data.RT != null },
      { t: 'علّم مواضع المقبض: 0% و25% (≈68°) و50% (≈135°) و75% (≈203°) و100% (270°).', check: (s) => POS.some((p) => p > 0 && Math.abs(s.th - p * 270) < 0.01) },
      { t: 'عند كل موضع قِس RAW بين A و W بالأوميتر وسجّلها.', check: () => data.rows.every((r) => r.R != null) },
      { t: 'صِل الدائرة: B إلى +5 V و A إلى الأرضي و W هو الخرج، ثم شغّل المجهز.', check: (s) => s.on },
      { t: 'صِل الفولتميتر التناظري بين W و A وسجّل القراءة عند كل موضع.', check: () => data.rows.every((r) => r.Va != null) },
      { t: 'استبدل به الفولتميتر الرقمي وكرّر القراءات (لا تصل الجهازين معاً).', check: () => data.rows.every((r) => r.Vd != null) },
      { t: 'ارسم الجهود التناظرية والرقمية والنظرية مقابل الموضع (الرسم يُحدَّث تلقائياً).', check: () => data.rows.every((r) => r.Vd != null && r.Va != null) },
    ]);
    L.$('#pt-rec', root).addEventListener('click', () => {
      const k = compute();
      const idx = POS.findIndex((p) => Math.abs(st.th - p * 270) < 0.5);
      if (st.meter === 'ohm') {
        if (st.on) return L.toast('افصل المجهز قبل استخدام الأوميتر', 'bad');
        if (st.probe === 'AB') { data.RT = RT; save(); renderTable(); update(); return L.toast('سُجّلت المقاومة الكلية RT'); }
        if (idx < 0) return L.toast('أوقف المقبض على إحدى العلامات الخمس أولاً (استخدم الأزرار تحت المقبض)', 'warn');
        data.rows[idx].R = +(k.raw / 1000).toFixed(3);
      } else {
        if (!st.on) return L.toast('شغّل المجهز أولاً', 'warn');
        if (idx < 0) return L.toast('أوقف المقبض على إحدى العلامات الخمس أولاً (استخدم الأزرار تحت المقبض)', 'warn');
        if (st.meter === 'analog') { data.rows[idx].Va = k.read; data.rows[idx].sens = st.sens; } else data.rows[idx].Vd = k.read;
      }
      save(); renderTable(); update();
      L.toast(`سُجّلت القراءة عند الموضع ${POS[idx] * 100}%`);
    });
    L.$('#pt-copy', root).addEventListener('click', () => L.copyTable(L.$('#pt-table table', root)));
    L.$('#pt-clear', root).addEventListener('click', () => { data = { RT: null, rows: [{}, {}, {}, {}, {}], sens: st.sens }; save(); renderTable(); update(); });

    function compute() {
      const x = st.th / SWEEP, raw = x * RT, Rm = st.sens * 10;
      const va = st.on ? loaded(x, Rm) : 0, vd = st.on ? loaded(x, RDIG) : 0;
      let read = null;
      if (st.meter === 'analog') read = Math.round(va / 0.05) * 0.05;
      else if (st.meter === 'digital') read = Math.round(vd * 1000) / 1000;
      return { x, raw, Rm, va, vd, read, vth: st.on ? x * VS : 0, rth: x * (1 - x) * RT };
    }
    function renderTable() {
      const rows = POS.map((p, i) => {
        const r = data.rows[i];
        return [n(`${p * 100}% (${ANG[i]})`), r.R != null ? n(r.R.toFixed(3)) : '', r.Va != null ? n(r.Va.toFixed(2)) : '', r.Vd != null ? n(r.Vd.toFixed(3)) : '', n((p * VS).toFixed(2))];
      });
      L.$('#pt-table', root).innerHTML = L.table(['الموضع x (الزاوية)', 'المقاومة المقاسة (kΩ)', 'Analog V (V)', 'Digital V (V)', 'النظري (V)'], rows);
      L.$('#pt-meta', root).innerHTML = `<span>RT = <b>${data.RT != null ? (data.RT / 1000).toFixed(2) + ' kΩ' : '—'}</b></span><span>Vs = <b>5 V</b></span><span>حساسية التناظري = <b>${(st.sens / 1000)} kΩ/V</b></span>`;
      const th = [], va = [], vd = [];
      for (let i = 0; i <= 50; i++) th.push([i * 2, (i * 2 / 100) * VS]);
      data.rows.forEach((r, i) => { if (r.Va != null) va.push([POS[i] * 100, r.Va]); if (r.Vd != null) vd.push([POS[i] * 100, r.Vd]); });
      const model = [];
      for (let i = 0; i <= 50; i++) model.push([i * 2, loaded(i / 50, st.sens * 10)]);
      lastSeries = [
        { name: 'النظري x·Vs', color: 'var(--muted)', points: th, dash: true, hover: false },
        { name: 'نموذج التحميل للتناظري', color: 'var(--s1)', points: model, faint: true, hover: false },
        { name: 'Analog V (مقاسة)', color: 'var(--s1)', points: va, markers: true, marker: 'circle' },
        { name: 'Digital V (مقاسة)', color: 'var(--s2)', points: vd, markers: true, marker: 'square' },
      ];
    }
    let lastSeries = [];
    function update() {
      const k = compute();
      L.$('#pt-sch', root).innerHTML = schematic(k.x, st.meter, st.probe, st.on);
      L.$('#pt-probe', root).hidden = st.meter !== 'ohm';
      L.setFlow(root, 'pot', st.on, 0.7);
      an.set(st.meter === 'analog' ? k.va / 10 : 0);
      L.$('#pt-an-i', root).style.opacity = st.meter === 'analog' ? 1 : 0.6;
      const note = L.$('#pt-dmm-note', root);
      if (st.meter === 'ohm') {
        lcd.unit('kΩ');
        if (st.on) { lcd.set('Err'); note.textContent = 'لا تستخدم الأوميتر والمصدر موصول!'; }
        else { lcd.set(L.lcdText((st.probe === 'AB' ? RT : k.raw) / 1000, 3, 4)); note.textContent = st.probe === 'AB' ? 'المقاومة الكلية RT بين A و B' : 'المقاومة RAW بين A و W'; }
      } else if (st.meter === 'digital') { lcd.unit('V'); lcd.set(L.lcdText(k.vd, 3, 4)); note.textContent = 'الفولتميتر الرقمي بين W و A'; }
      else { lcd.unit(''); lcd.set('    '); note.textContent = 'غير موصول (جهاز واحد في كل مرة)'; }
      L.setText('pt-x', `${L.fx(k.x * 100, 1)} %`, root);
      L.setText('pt-raw', L.fx(k.raw / 1000, 3) + ' kΩ', root);
      L.setText('pt-vth', L.fx(k.vth, 3) + ' V', root);
      L.setText('pt-rth', L.fx(k.rth / 1000, 3) + ' kΩ', root);
      const read = st.meter === 'ohm' ? (st.on ? 'Err' : L.fx((st.probe === 'AB' ? RT : k.raw) / 1000, 3) + ' kΩ') : st.on ? (st.meter === 'analog' ? '≈ ' + L.fx(k.read, 2) : L.fx(k.read, 3)) + ' V' : '0 V (المجهز مطفأ)';
      L.setText('pt-read', read, root);
      const err = st.meter === 'ohm' || !st.on || k.vth === 0 ? null : ((st.meter === 'analog' ? k.va : k.vd) - k.vth) / k.vth * 100;
      L.setText('pt-err', err == null ? '—' : L.fx(err, 2) + ' %', root);
      L.$('#pt-err-box', root).className = 'ro ' + (err == null ? '' : Math.abs(err) < 0.5 ? 'good' : Math.abs(err) < 3 ? 'warn' : 'bad');
      const s = L.$('#pt-status', root);
      if (st.meter === 'ohm' && st.on) { s.className = 'status bad'; s.textContent = 'افصل المجهز قبل قياس المقاومة'; }
      else if (POS.some((p) => Math.abs(st.th - p * 270) < 0.5)) { s.className = 'status ok'; s.textContent = 'المقبض على علامة: جاهز للتسجيل'; }
      else { s.className = 'status'; s.textContent = 'المقبض بين العلامات'; }
      const cur = st.meter !== 'ohm' && st.on ? [{ x: k.x * 100, y: st.meter === 'analog' ? k.va : k.vd, name: st.meter === 'analog' ? 'التناظري الآن' : 'الرقمي الآن' }] : [];
      plot.set(lastSeries, cur);
      guide.update(st);
    }
    renderTable(); update();
    void meterSeg; void pwr;
  }

  function calc() {
    const Rm = (data.sens || 2000) * 10;
    const rows = POS.map((p, i) => {
      const r = data.rows[i];
      const va = r.Va != null ? r.Va : loaded(p, (r.sens || data.sens || 2000) * 10);
      const vd = r.Vd != null ? r.Vd : loaded(p, RDIG);
      const th = p * VS;
      const e = (v) => (th ? (((v - th) / th) * 100).toFixed(2) + '%' : '—');
      return [`${p * 100}%`, n(L.fx(p * (1 - p) * RT / 1000, 3) + ' kΩ'), n(th.toFixed(3)), n(va.toFixed(3)) + (r.Va == null ? '<small>محسوبة</small>' : ''), n(e(va)), n(vd.toFixed(3)) + (r.Vd == null ? '<small>محسوبة</small>' : ''), n(e(vd))];
    });
    return `
      <h2>تحليل تأثير التحميل (Loading effect)</h2>
      <p>من نظرية ثفنن، يُرى الخرج بين W و A كمصدر جهد ${n('Vth = x·Vs')} على التوالي مع مقاومة ${n('Rth = RAW ∥ RWB = x(1−x)·RT')}. عند توصيل فولتميتر مقاومته الداخلية ${n('Rm')}:</p>
      ${L.eq(`V<sub>out</sub> = V<sub>th</sub> · ${L.frac('R<sub>m</sub>', 'R<sub>m</sub> + R<sub>th</sub>')} = x V<sub>s</sub> · ${L.frac('R<sub>m</sub>', 'R<sub>m</sub> + x(1−x)R<sub>T</sub>')}`)}
      <p>للفولتميتر التناظري بحساسية ${n((data.sens || 2000) / 1000 + ' kΩ/V')} على مدى 10 V تكون ${n('Rm = ' + Rm / 1000 + ' kΩ')}، وللرقمي ${n('Rm ≈ 10 MΩ')}، و${n('RT = 9.86 kΩ')}.</p>
      <div class="table-wrap">${L.table(['الموضع', 'Rth', 'النظري (V)', 'التناظري (V)', 'خطأ التناظري', 'الرقمي (V)', 'خطأ الرقمي'], rows)}</div>
      <p class="muted" style="font-size:13.5px">القيم المعلّمة «محسوبة» من المعادلة لأنك لم تسجّلها بعد في المحاكاة.</p>
      <div class="note">الخطأ صفر عند 0% و100% لأن ${n('Rth = 0')}. الخطأ النسبي أكبر عند 50% حيث ${n('Rth = RT/4')} أعظم ما يمكن، أما الفرق المطلق بين الجهازين فأكبر قرب ${n('x ≈ 2/3')} أي عند الموضع 75% من المواضع المقاسة.</div>
      <h2>الاستنتاج (Conclusion)</h2>
      <p>قراءات الفولتميتر الرقمي (مقاومة دخل 10 MΩ) تطابق الجهد النظري ${n('x·Vs')} تقريباً عند كل المواضع، وترسم خطاً مستقيماً يؤكد أن المجزئ خطي (B10K) وأن ${n('RAW')} تتناسب مع زاوية الدوران. أما الفولتميتر التناظري فيقرأ أقل من النظري بسبب <b>تأثير التحميل</b>، لأن مقاومته الداخلية (عشرات الكيلو أوم) ليست كبيرة مقارنة بمقاومة ثفنن للمجزئ، ويزداد الخطأ كلما قلت حساسيته (Ω/V). لذلك يفضَّل الجهاز ذو مقاومة الدخل العالية عند قياس جهود في دوائر ذات مقاومات كبيرة.</p>`;
  }

  const typesTable = `<div class="table-wrap"><table class="data"><thead><tr><th>النوع (Type)</th><th>الأطراف</th><th>الوصف</th><th>الاستخدام الشائع</th></tr></thead><tbody>
    <tr><td class="row-h">مجزئ الجهد <span class="en muted">Potentiometer</span></td><td>3</td><td style="white-space:normal">مسار مقاوم مع ذراع منزلق (Wiper)، يعمل مجزئ جهد قابلاً للضبط.</td><td style="white-space:normal">التحكم بالصوت والإضاءة، استشعار الموضع</td></tr>
    <tr><td class="row-h">الريوستات <span class="en muted">Rheostat</span></td><td>2</td><td style="white-space:normal">مجزئ (سلكي عادةً وعالي القدرة) يُستخدم منه طرفان فقط للتحكم بالتيار.</td><td style="white-space:normal">سرعة المحركات، إعتام المصابيح، التحكم بتيار المختبر</td></tr>
    <tr><td class="row-h">التريمر <span class="en muted">Trimmer (Preset)</span></td><td>3</td><td style="white-space:normal">مجزئ صغير يُضبط بمفك مرة واحدة أثناء المعايرة.</td><td style="white-space:normal">معايرة الدوائر وضبطها</td></tr>
    <tr><td class="row-h">المجزئ الرقمي <span class="en muted">Digital Potentiometer</span></td><td>IC (SPI / I²C)</td><td style="white-space:normal">سلّم مقاومات مع مفاتيح إلكترونية تحدد المقاومة بواسطة متحكم دقيق.</td><td style="white-space:normal">كسب قابل للبرمجة، معايرة تلقائية</td></tr>
  </tbody></table></div>`;

  L.register({
    id: 'potentiometer', num: 4, group: 'resistance',
    title: 'قياس مقاومة مجزئ الجهد الدوّار بالفولتميتر التناظري والرقمي',
    en: 'Measuring Resistance of Rotary Potentiometer by Analog and Digital Voltmeters',
    sheet: 'Experiment No. (4) — Rotary Potentiometer: Analog vs Digital Voltmeters',
    tags: ['B10K pot', 'Loading effect', 'Analog vs DMM'],
    summary: 'قياس جهد خرج مجزئ جهد دوّار 10 kΩ عند خمسة مواضع بفولتميتر تناظري ثم رقمي، ومقارنتهما بالقيمة النظرية لفهم تأثير التحميل والمقاومة الداخلية لكل جهاز.',
    objectiveShort: 'قياس جهد خرج مجزئ جهد دوّار (مقاومة متغيرة) بفولتميتر تناظري وآخر رقمي، وحساب مقاومة الذراع المنزلق من هذه القراءات.',
    mount, calc,
    theory: () => `
      <h2>الهدف (Objective)</h2>
      <p>قياس جهد خرج مجزئ جهد دوّار (مقاومة متغيرة) باستخدام فولتميتر تناظري وفولتميتر رقمي، وحساب مقاومة الذراع المنزلق (Wiper) من هذه القراءات.</p>
      <h2>تطبيقات مجزئات الجهد (Applications)</h2>
      <ol>
        <li><b>التحكم بالصوت في الأجهزة الصوتية:</b> في الراديو والسماعات والمضخمات لضبط مستوى الصوت بتغيير سعة الإشارة.</li>
        <li><b>التحكم بالإضاءة في المصابيح والشاشات:</b> في مفاتيح الإعتام (Dimmer) لمصابيح LED والمصابيح المتوهجة، وفي التلفاز والشاشات ولوحات العدادات.</li>
        <li><b>معايرة الدوائر الإلكترونية وضبطها:</b> في المذبذبات والمرشحات ومجهزات القدرة لضبط الجهد والمقاومة بدقة، ومعايرة المتحسسات (الحرارة والضغط والضوء).</li>
        <li><b>قياس الإزاحة في المتحسسات:</b> المجزئات الخطية والدوارة في الأنظمة الميكانيكية لقياس الإزاحة أو الدوران (مكائن CNC والأتمتة الصناعية).</li>
        <li><b>الأجهزة الطبية:</b> في أسرّة المستشفيات وأجهزة التنفس والتشخيص لضبط تدفق الهواء ومستويات الجهد والوضعية.</li>
        <li><b>الآلات الموسيقية وخلط الصوت:</b> في القيثارات الكهربائية والمُركِّبات لضبط النغمة والصوت، وفي طاولات المزج.</li>
        <li><b>الأتمتة الصناعية والروبوتات:</b> التحكم بسرعة الأحزمة الناقلة، وقياس زوايا مفاصل الأذرع الآلية.</li>
        <li><b>الاستخدامات المختبرية والتعليمية:</b> في تجارب تنظيم الجهد والتيار لفهم المقاومة المتغيرة وسلوك الدوائر.</li>
      </ol>
      <h2>أنواع المقاومات المتغيرة (Types of Variable Resistors)</h2>
      <p>المقاومة المتغيرة مقاومة يمكن تغيير قيمتها يدوياً (بمقبض أو منزلق أو برغي) أو بكمية فيزيائية (الحرارة، الضوء، القوة).</p>
      <h3>أ) حسب الوظيفة (عدد الأطراف)</h3>
      ${typesTable}
      <h3>ب) حسب الشكل الميكانيكي</h3>
      <ul>
        <li><b>المجزئ الدوّار (Rotary):</b> دورة واحدة (نحو 270°–300°)، وهو النوع المستخدم في هذه التجربة.</li>
        <li><b>متعدد الدورات (Multi-turn):</b> 10 دورات أو أكثر للضبط الدقيق.</li>
        <li><b>المنزلق الخطي (Slide):</b> يتحرك الذراع في خط مستقيم (طاولات المزج، متحسسات الإزاحة الخطية).</li>
        <li><b>المزدوج (Dual-gang):</b> مجزئان على محور واحد (التحكم بصوت الستيريو).</li>
      </ul>
      <h3>ج) حسب المادة المقاومة</h3>
      <ul>
        <li><b>الكربون:</b> رخيص للأغراض العامة، سماحيته ±20%.</li>
        <li><b>السيرمت (Cermet):</b> مستقر ومعامل حراري جيد، شائع في التريمرات.</li>
        <li><b>السلكي (Wire-wound):</b> قدرة ودقة عاليتان، يستخدم في الريوستات.</li>
        <li><b>البلاستيك الموصل:</b> عمر طويل وخرج ناعم، في متحسسات الموضع الدقيقة.</li>
      </ul>
      <h2>لماذا تختلف قراءة الجهازين؟ (Loading effect)</h2>
      <p>الجهد على الذراع ${n('Vout = x·Vs')} صحيح فقط إذا لم يُسحب تيار من الذراع. الفولتميتر يوصل على التوازي مع ${n('RAW')}، فإن كانت مقاومته الداخلية ${n('Rm')} غير كبيرة جداً قلّت المقاومة المكافئة وانخفض الجهد المقاس:</p>
      ${L.eq(`V<sub>out</sub> = x V<sub>s</sub> · ${L.frac('R<sub>m</sub>', 'R<sub>m</sub> + x(1−x)R<sub>T</sub>')}`)}
      <p>مقاومة الفولتميتر التناظري ${n('Rm = S × المدى')} (مثلاً ${n('2 kΩ/V × 10 V = 20 kΩ')})، بينما مقاومة الرقمي نحو ${n('10 MΩ')} في كل المديات.</p>`,
    apparatus: () => `
      <h2>مخطط الدائرة (Circuit Diagram)</h2>
      <figure class="figure">${schematic(0.5, 'analog', 'AW', true)}<figcaption>الطرف B إلى +Vs والطرف A إلى الأرضي و W الذراع المنزلق. صِل فولتميتراً واحداً فقط في كل مرة بين W و A.</figcaption></figure>
      <h2>المواد المطلوبة (Materials Required)</h2>
      <ul class="app-list">
        <li><b>مجزئ جهد دوّار</b><span class="en">Rotary potentiometer 10 kΩ, linear (B10K)</span><span>المقاومة الكلية الاسمية 10 kΩ بتدرج خطي.</span></li>
        <li><b>مجهّز قدرة مستمرة</b><span class="en">DC power supply (5 V)</span><span>يوصل بين B و A.</span></li>
        <li><b>فولتميتر تناظري</b><span class="en">Analog voltmeter (0–10 V)</span><span>جهاز بملف متحرك ومؤشر.</span></li>
        <li><b>ملتيميتر رقمي</b><span class="en">Digital multimeter</span><span>يُستخدم فولتميتراً وأوميتراً.</span></li>
        <li><b>أسلاك توصيل</b><span class="en">Connecting wires</span><span>—</span></li>
      </ul>
      <h2>خطوات العمل (Procedure)</h2>
      <ol class="steps">
        <li><div>والمجهز مطفأ ومفصول، <b>قِس</b> المقاومة الكلية RT بين الطرفين A و B بالأوميتر. سجّل RT و Vs.</div></li>
        <li><div>علّم مواضع المقبض على تدريج الزاوية: 0° و25% (≈68°) و50% (≈135°) و75% (≈203°) و100% (270°).</div></li>
        <li><div>عند كل موضع قِس RAW بين الطرفين A و W بالأوميتر وسجّلها في الجدول.</div></li>
        <li><div>صِل الدائرة كما في المخطط: B إلى +5 V و A إلى الأرضي و W هو الخرج.</div></li>
        <li><div>صِل <b>الفولتميتر التناظري</b> بين W و A، واضبط المقبض على كل موضع معلّم وسجّل القراءة.</div></li>
        <li><div>انزع التناظري وصِل <b>الفولتميتر الرقمي</b> بين W و A وكرّر القراءات عند المواضع نفسها. (لا تصل الجهازين معاً: على التوازي يتجمع تأثير تحميلهما.)</div></li>
        <li><div>ارسم الجهود التناظرية والرقمية والنظرية مقابل الموضع على الرسم نفسه، برمز مختلف لكل منها.</div></li>
      </ol>`,
    discussion: [
      { en: 'Why did the analog and digital readings differ? Explain using the loading effect and the internal resistance of each meter.', ar: 'لماذا اختلفت قراءات الجهازين التناظري والرقمي؟ فسّر باستخدام تأثير التحميل والمقاومة الداخلية لكل جهاز.',
        a: `<p>الفولتميتر يوصل على التوازي مع الجزء A–W من المجزئ، فيكوّن معه مقاومة مكافئة أصغر ويسحب تياراً من الذراع، فيهبط جهد الخرج (<b>تأثير التحميل</b>). من نظرية ثفنن ${n('Vth = x·Vs')} و${n('Rth = x(1−x)RT')}، والقراءة ${n('Vm = Vth · Rm/(Rm + Rth)')}.</p><p>الفولتميتر التناظري مقاومته الداخلية صغيرة نسبياً (${n('Rm = S × range')}، مثلاً 20 kΩ)، وهي من رتبة مقاومة المجزئ نفسها، فيقرأ أقل بوضوح. أما الرقمي فمقاومة دخله نحو ${n('10 MΩ')} فيكاد لا يحمّل الدائرة وتطابق قراءته القيمة النظرية.</p>` },
      { en: 'At which position was the difference between the two meters the largest?', ar: 'عند أي موضع كان الفرق بين الجهازين أكبر؟',
        a: `<p>الفرق المطلق ${n('ΔV = Vth · Rth/(Rm + Rth)')} يكون أعظم قرب ${n('x ≈ 2/3')} من الدوران، فمن بين المواضع المقاسة يكون أكبر عند <b>75%</b> (مثلاً مع Rm = 20 kΩ: نحو 0.32 V عند 75% مقابل 0.28 V عند 50% و0.11 V عند 25%).</p><p>أما الخطأ <b>النسبي</b> فأكبر عند <b>50%</b> لأن مقاومة ثفنن ${n('Rth = RT/4')} أعظم هناك. وعند 0% و100% لا يوجد فرق لأن ${n('Rth = 0')}.</p>` },
      { en: 'From your graph, is the potentiometer linear or logarithmic? Justify your answer.', ar: 'من الرسم البياني، هل المجزئ خطي أم لوغاريتمي؟ علّل.',
        a: `<p><b>خطي</b> (B10K): قراءات الأوميتر لـ RAW وقراءات الفولتميتر الرقمي تزداد بخطوات متساوية تقريباً (نحو 2.46 kΩ و1.25 V لكل 25%) وتقع على خط مستقيم يمر بنقطة الأصل. المجزئ اللوغاريتمي (النوع A) يعطي منحنى أُسّياً: تغيّر صغير في بداية الدوران وكبير في نهايته. انحناء منحنى الفولتميتر التناظري سببه التحميل وليس نوع المجزئ.</p>` },
      { en: 'Define accuracy, precision and resolution of a voltmeter. Which meter is better in each, and why?', ar: 'عرّف الدقة والضبط والتمييز للفولتميتر. أي الجهازين أفضل في كلٍّ منها ولماذا؟',
        a: `<ul><li><b>الدقة (Accuracy):</b> مدى قرب القراءة من القيمة الحقيقية. الرقمي أفضل: دقته نحو ±0.5% من القراءة، ومقاومة دخله العالية تقلل خطأ التحميل، بينما التناظري ±2.5% من نهاية التدريج تقريباً.</li><li><b>الضبط أو التكرارية (Precision):</b> مدى تقارب القراءات المتكررة لنفس الكمية. الرقمي أفضل لأنه لا يتأثر باختلاف زاوية النظر (Parallax) أو تقدير الطالب للمؤشر.</li><li><b>التمييز (Resolution):</b> أصغر تغيّر يستطيع الجهاز إظهاره. الرقمي أفضل (1 mV على مدى 20 V) مقابل نحو 0.1 V يمكن تقديرها بين أقسام التدريج في التناظري.</li></ul>` },
      { en: 'Give two advantages of an analog voltmeter over a digital voltmeter.', ar: 'اذكر ميزتين للفولتميتر التناظري على الرقمي.',
        a: `<ul><li>يُظهر <b>اتجاه التغير وسرعته</b> بشكل مستمر، فهو مناسب لمتابعة الإشارات المتغيرة وعمليات الضبط إلى قيمة عظمى أو صفر (Peaking / Nulling).</li><li>لا يحتاج إلى بطارية لقياس الجهد (الملف المتحرك يعمل من طاقة الدائرة)، ولا يوجد زمن تحويل أو تذبذب في الأرقام.</li><li>أقل تأثراً بالضوضاء والنبضات العابرة لأن المؤشر يأخذ المتوسط ميكانيكياً، وهو بسيط ومتين ورخيص.</li></ul>` },
    ],
  });
})();
