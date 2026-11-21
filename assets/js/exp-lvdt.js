/* Experiment 7 — Linear Variable Differential Transformer (KL-620 kit). */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const KEY = 'lvdt';
  const F = 338, M = 0.42, G2 = 1.012, X0 = 8, SMAX = 0.85, VD = 0.55, OFFSET = 0.37, L0 = 15;
  const PX = 8; // px per mm in the drawing
  const TARGETS = [-3, -2, -1, 0, 1, 2, 3];
  let data = L.store.get(KEY + ':data', { nul: null, rows: {} });
  const save = () => L.store.set(KEY + ':data', data);

  function physics(st, screw = st.screw) {
    const xc = screw - L0 - OFFSET, s = SMAX * Math.tanh(xc / X0), vp = st.on ? st.vp : 0;
    const vs1 = M * vp * (1 - s), vs2 = M * vp * G2 * (1 + s);
    const dc1 = Math.max(0, vs1 - (st.on ? VD : 0)), dc2 = Math.max(0, vs2 - (st.on ? VD : 0));
    const vres = 0.012 * (vp / 10);
    return { xc, s, vp, vs1, vs2, dc1, dc2, diff: vs2 - vs1, vres, voAmp: Math.hypot(vs2 - vs1, vres), phase: vs2 >= vs1 ? 0 : 180 };
  }

  /* cross-section drawing of the transducer with the micrometer screw */
  function drawing(st, k) {
    const cxCore = 235 + k.xc * PX, coreL = 150;
    const knob = 444 + st.screw * PX;
    const coil = (x, w, label, glow, val) => {
      let stripes = '';
      for (let i = x + 4; i < x + w - 2; i += 5) stripes += `<line x1="${i}" y1="72" x2="${i}" y2="98" stroke="#7a4a1d" stroke-width="1"/><line x1="${i}" y1="122" x2="${i}" y2="148" stroke="#7a4a1d" stroke-width="1"/>`;
      return `<g><rect x="${x}" y="70" width="${w}" height="30" rx="3" fill="#c47a35" opacity="${glow.toFixed(2)}"/><rect x="${x}" y="120" width="${w}" height="30" rx="3" fill="#c47a35" opacity="${glow.toFixed(2)}"/>${stripes}
        <text x="${x + w / 2}" y="62" text-anchor="middle" class="lv-l">${label}</text>${val ? `<text x="${x + w / 2}" y="168" text-anchor="middle" class="lv-v">${val}</text>` : ''}</g>`;
    };
    const max = M * (st.on ? st.vp : 10) * 2 || 1;
    let ruler = '';
    for (let mm = 0; mm <= 27; mm++) {
      const x = 444 + mm * PX, big = mm % 5 === 0;
      ruler += `<line x1="${x}" y1="196" x2="${x}" y2="${big ? 206 : 201}" stroke="currentColor" stroke-width="${big ? 1.4 : 0.8}"/>` + (big ? `<text x="${x}" y="218" text-anchor="middle" class="lv-r">${mm}</text>` : '');
    }
    return `<svg viewBox="0 0 700 228" class="schem" role="img" aria-label="مقطع في محوّل LVDT" style="color:var(--ink-2)">
      <style>.lv-l{font:600 13px var(--font-mono);fill:var(--ink)}.lv-v{font:500 11px var(--font-mono);fill:var(--muted)}.lv-r{font:500 10px var(--font-mono);fill:var(--muted)}</style>
      <rect x="36" y="46" width="400" height="128" rx="12" fill="#c9ced2" stroke="#8c9399" stroke-width="1.5"/>
      <rect x="36" y="46" width="400" height="10" rx="5" fill="#e6e9eb" opacity=".7"/>
      ${coil(56, 112, 'S1', 0.3 + 0.7 * Math.min(1, k.vs1 / max * 1.6), st.on ? k.vs1.toFixed(2) + ' V' : '')}
      ${coil(180, 112, 'P', st.on ? 1 : 0.35, st.on ? 'Vp ' + st.vp.toFixed(1) + ' V' : '')}
      ${coil(304, 112, 'S2', 0.3 + 0.7 * Math.min(1, k.vs2 / max * 1.6), st.on ? k.vs2.toFixed(2) + ' V' : '')}
      <rect x="36" y="101" width="420" height="18" fill="#9aa1a6"/>
      <rect x="${(cxCore + coreL / 2).toFixed(1)}" y="106" width="${(knob - cxCore - coreL / 2).toFixed(1)}" height="8" fill="#b3b9bd" stroke="#7d858b"/>
      <rect x="${(cxCore - coreL / 2).toFixed(1)}" y="102" width="${coreL}" height="16" rx="2" fill="#3f454a" stroke="#22272b"/>
      <text x="${cxCore.toFixed(1)}" y="114" text-anchor="middle" style="font:600 9.5px var(--font-mono);fill:#e8eaec">CORE</text>
      <rect x="436" y="30" width="8" height="160" fill="#8f979d"/>
      ${Array.from({ length: Math.max(0, Math.floor((knob - 446) / 4)) }, (_, i) => `<line x1="${446 + i * 4}" y1="104" x2="${448 + i * 4}" y2="116" stroke="#6d757b" stroke-width="1"/>`).join('')}
      <rect x="${knob.toFixed(1)}" y="84" width="34" height="52" rx="6" fill="#262b2f"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${(knob + 5 + i * 5).toFixed(1)}" y1="88" x2="${(knob + 5 + i * 5).toFixed(1)}" y2="132" stroke="#4a5257" stroke-width="1.5"/>`).join('')}
      <line x1="444" y1="196" x2="660" y2="196" stroke="currentColor"/>${ruler}
      <path d="M${knob.toFixed(1)} 190 l-5 -8 h10 z" fill="var(--accent)"/>
      <text x="${(knob + 17).toFixed(1)}" y="76" text-anchor="middle" class="lv-l" style="fill:var(--accent)">${st.screw.toFixed(2)} mm</text>
      ${data.nul != null ? `<line x1="${(444 + data.nul * PX).toFixed(1)}" y1="182" x2="${(444 + data.nul * PX).toFixed(1)}" y2="206" stroke="var(--ok)" stroke-width="2"/><text x="${(444 + data.nul * PX).toFixed(1)}" y="179" text-anchor="middle" class="lv-v" style="fill:var(--ok)">null</text>` : ''}
      <text x="40" y="200" class="lv-v" text-anchor="start">← S1</text><text x="430" y="200" class="lv-v" text-anchor="end">S2 →</text>
    </svg>`;
  }

  function blockDiagram() {
    const box = (x, y, w, h, t1, t2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="body" stroke="var(--ink-2)" stroke-width="1.5"/><text x="${x + w / 2}" y="${y + h / 2 - (t2 ? 3 : -4)}" text-anchor="middle" class="lbl">${t1}</text>${t2 ? `<text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" class="lbl sub">${t2}</text>` : ''}`;
    const arr = (x1, y1, x2, y2) => `<line class="w" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrowhead)"/>`;
    let s = '';
    s += box(10, 100, 130, 54, 'Wien oscillator', 'U1, R1, C1, R2, C2 · 338 Hz');
    s += arr(140, 127, 168, 127) + box(170, 100, 110, 54, 'VR5 · Q1, Q2', 'amplitude + CR1, CR2');
    s += arr(280, 127, 310, 127);
    s += S.coil(320, 90, 320, 164, { turns: 5, body: 60 }) + S.text(320, 182, 'P', { cls: 'big' });
    s += `<rect x="340" y="80" width="8" height="94" fill="var(--ink-2)"/>`;
    s += S.coil(372, 44, 372, 104, { turns: 4, body: 48 }) + S.coil(372, 150, 372, 210, { turns: 4, body: 48 });
    s += S.text(386, 40, 'S1', { cls: 'big', anchor: 'start' }) + S.text(386, 226, 'S2', { cls: 'big', anchor: 'start' });
    s += arr(380, 74, 420, 74) + box(422, 48, 120, 52, 'CR3 · C4 · R10', 'rectifier → DC');
    s += arr(380, 180, 420, 180) + box(422, 154, 120, 52, 'CR4 · C5 · R11', 'rectifier → DC');
    s += arr(542, 74, 566, 74) + box(568, 52, 70, 44, 'U2', 'buffer') + arr(638, 74, 668, 74) + S.text(672, 78, 'Vo30-1', { anchor: 'start', cls: 'acc' });
    s += arr(542, 180, 566, 180) + box(568, 158, 70, 44, 'U3', 'buffer') + arr(638, 180, 668, 180) + S.text(672, 184, 'Vo30-2', { anchor: 'start', cls: 'acc' });
    return S.svg(740, 240, s, 'مخطط كتلي لدائرة KL-620');
  }

  function mount(root) {
    const st = { on: false, vp: 6.2, screw: 13.8, farSeen: false };
    root.innerHTML = `
    <div class="sim-grid">
      <div class="bench"><div class="bench-grid">
        <div class="card c6"><div class="sch-title"><b>محوّل LVDT مع برغي الإزاحة</b><span>KL-620 · SENSOR30 · excitation ${F} Hz</span></div><div id="lv-draw" style="overflow-x:auto"></div></div>
        <div class="inst c2">${L.ihead('مجهّز الوحدة و VR5', 'Power · Excitation amplitude')}<div id="lv-vplcd"></div><div id="lv-vp"></div><div class="inst-row"><div id="lv-pwr"></div></div></div>
        <div class="inst c2">${L.ihead('مقبض البرغي (الإزاحة)', 'Micrometer screw · visible length')}<div id="lv-sc"></div><div class="chips" id="lv-chips" style="justify-content:center"></div></div>
        <div class="inst c2">${L.ihead('ملتيميتر Vo30-1', 'DMM · DC output of S1')}<div id="lv-d1"></div>${L.ihead('ملتيميتر Vo30-2', 'DMM · DC output of S2')}<div id="lv-d2"></div><div class="inst-foot" id="lv-eq">—</div></div>
        <div class="card c3"><div class="card-head"><h3>راسم الإشارة</h3><span class="muted" style="font-size:12.5px">CH1 الابتدائي · CH2 الخرج التفاضلي</span></div><div id="lv-scope"></div></div>
        <div class="card c3">
          <div class="card-head"><h3>القراءات</h3><span class="status" id="lv-st">—</span></div>
          <div class="readouts">${L.ro('lv-disp', 'الإزاحة من الصفر', 'hl')}${L.ro('lv-diff', 'V2 − V1 (DC)')}${L.ro('lv-vo', 'Vo = VS2 − VS1 (AC)')}${L.ro('lv-ph', 'طور الخرج')}</div>
          <div class="meas-actions"><button type="button" class="btn" id="lv-null">سجّل موضع الصفر (Null)</button><button type="button" class="btn primary" id="lv-rec">سجّل القراءة</button></div>
        </div>
      </div></div>
      <aside class="side"><div id="lv-guide"></div></aside>
    </div>
    <div class="data-row">
      <div class="card"><div class="card-head"><h3>المشاهدات والقراءات (Observations)</h3><div class="actions"><button type="button" class="btn small" id="lv-copy">نسخ</button><button type="button" class="btn small ghost" id="lv-clear">مسح</button></div></div><div class="data-meta" id="lv-meta"></div><div class="table-wrap" id="lv-table"></div></div>
      <div class="card"><div class="card-head"><h3>موضع القلب مقابل جهد الخرج</h3></div><div id="lv-plot"></div></div>
    </div>`;
    const vplcd = L.LCD(L.$('#lv-vplcd', root), { digits: 4, unit: 'V', tag: 'Vp' });
    L.Control(L.$('#lv-vp', root), { id: 'lv-vpc', label: 'VR5 (جهد الابتدائي Vp)', unit: 'V', min: 0, max: 14, value: st.vp, step: 0.05, decimals: 2, size: 54, steps: [-1, 1, -0.05, 0.05], onInput: (v) => { st.vp = v; update(); } });
    L.Power(L.$('#lv-pwr', root), { label: 'تشغيل الوحدة', value: false, onChange: (v) => { st.on = v; update(); } });
    const screw = L.Control(L.$('#lv-sc', root), { id: 'lv-scc', label: 'طول البرغي الظاهر', unit: 'mm', min: 5, max: 25, value: st.screw, step: 0.01, decimals: 2, size: 60, travel: 600, steps: [-1, 1, -0.1, 0.1, -0.01, 0.01], onInput: (v) => { st.screw = v; update(); } });
    const d1 = L.LCD(L.$('#lv-d1', root), { digits: 5, unit: 'V', tag: 'DC' });
    const d2 = L.LCD(L.$('#lv-d2', root), { digits: 5, unit: 'V', tag: 'DC' });
    const plot = L.Plot(L.$('#lv-plot', root), { xLabel: 'Core position from null (mm)', yLabel: 'Output voltage (V)', x: [-10, 10], height: 270, tipX: (v) => (v > 0 ? '+' : '') + L.fx(v, 2) + ' mm', tipY: (v) => L.fx(v, 3) + ' V', markLabel: 'الموضع الحالي (V2 − V1)' });
    const guide = L.Guide(L.$('#lv-guide', root), [
      { t: 'صِل النموذج باستخدام وحدة KL-620 وشغّل مجهز القدرة.', check: (s) => s.on },
      { t: 'اضبط VR5 حتى يصبح جهد الإثارة للملف الابتدائي Vp = 10 V.', check: (s) => s.on && Math.abs(s.vp - 10) <= 0.05 },
      { t: 'أدر المقبض حتى يتساوى الجهدان المستمران Vo30-1 و Vo30-2 (موضع الصفر)، وسجّل طول البرغي عنده.', check: () => data.nul != null },
      { t: 'حرّك القلب 1 و2 و3 mm في الاتجاهين من موضع الصفر، وسجّل V1 و V2 والاتجاه في كل مرة.', check: () => TARGETS.every((t) => data.rows[t]) },
      { t: 'ارسم موضع القلب (mm) مقابل جهد الخرج (V) لتحليل خطية LVDT، وحرّك القلب أبعد من 6 mm لترى اللاخطية.', check: (s) => s.farSeen && TARGETS.every((t) => data.rows[t]) },
    ]);
    L.$('#lv-chips', root).addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c && data.nul != null) screw.set(+(data.nul + +c.dataset.d).toFixed(2)); });
    L.$('#lv-null', root).addEventListener('click', () => {
      const k = physics(st);
      if (!st.on) return L.toast('شغّل الوحدة أولاً', 'warn');
      if (Math.abs(st.vp - 10) > 0.05) return L.toast('اضبط VR5 أولاً حتى يصبح Vp = 10 V', 'warn');
      if (Math.abs(+k.dc1.toFixed(3) - +k.dc2.toFixed(3)) > 0.01) return L.toast('الجهدان غير متساويين بعد: حرّك المقبض بخطوات 0.01 mm', 'warn');
      const had = Object.keys(data.rows).length;
      data.nul = st.screw; data.rows = { 0: { v1: +k.dc1.toFixed(3), v2: +k.dc2.toFixed(3) } };
      save(); renderTable(); update();
      L.toast(`موضع الصفر عند ${st.screw.toFixed(2)} mm${had ? ' (تم تصفير الجدول لأن المرجع تغيّر)' : ''}`);
    });
    L.$('#lv-rec', root).addEventListener('click', () => {
      const k = physics(st);
      if (!st.on) return L.toast('شغّل الوحدة أولاً', 'warn');
      if (data.nul == null) return L.toast('حدّد موضع الصفر أولاً', 'warn');
      const d = st.screw - data.nul, t = Math.round(d);
      if (Math.abs(d - t) > 0.02 || Math.abs(t) > 3) return L.toast('حرّك القلب إلى ±1 أو ±2 أو ±3 mm من الصفر (استخدم الأزرار تحت المقبض)', 'warn');
      data.rows[t] = { v1: +k.dc1.toFixed(3), v2: +k.dc2.toFixed(3) };
      save(); renderTable(); update();
      L.toast(`سُجّلت القراءة عند ⁦${t > 0 ? '+' : ''}${t} mm⁩`);
    });
    L.$('#lv-copy', root).addEventListener('click', () => L.copyTable(L.$('#lv-table table', root)));
    L.$('#lv-clear', root).addEventListener('click', () => { data = { nul: null, rows: {} }; save(); renderTable(); update(); });

    function dirText(t) { return t === 0 ? 'Null' : t < 0 ? 'نحو S1 (يسار)' : 'نحو S2 (يمين)'; }
    function renderTable() {
      const rows = TARGETS.map((t) => {
        const r = data.rows[t];
        return [n(t === 0 ? '0.0 (Null)' : (t > 0 ? '+' : '') + t.toFixed(1)), r && n(r.v1.toFixed(3)), r && n(r.v2.toFixed(3)), r && n((r.v2 - r.v1).toFixed(3)), r && dirText(t)];
      });
      L.$('#lv-table', root).innerHTML = L.table(['Displacement (mm)', 'Output Voltage V1', 'Output Voltage V2', 'V2 − V1', 'Direction'], rows);
      L.$('#lv-meta', root).innerHTML = `<span>طول البرغي عند الصفر = <b>${data.nul != null ? data.nul.toFixed(2) + ' mm' : '—'}</b></span><span>Vp = <b>10 V</b></span><span>f = <b>${F} Hz</b></span>`;
      L.$('#lv-chips', root).innerHTML = data.nul == null ? '<span class="inst-foot">بعد تسجيل الصفر تظهر هنا أزرار الانتقال إلى ±1، ±2، ±3 mm</span>' : TARGETS.map((t) => `<button type="button" class="chip" data-d="${t}">${t > 0 ? '+' : ''}${t}</button>`).join('');
    }
    function update() {
      const k = physics(st);
      const ref = data.nul != null ? data.nul : L0 + OFFSET;
      const disp = st.screw - ref;
      if (Math.abs(disp) > 6 && st.on) st.farSeen = true;
      L.$('#lv-draw', root).innerHTML = drawing(st, k);
      vplcd.set(st.on ? L.lcdText(st.vp, 2, 4) : '    ');
      const r1 = +k.dc1.toFixed(3), r2 = +k.dc2.toFixed(3);
      d1.set(L.lcdText(r1, 3, 5)); d2.set(L.lcdText(r2, 3, 5));
      const eqEl = L.$('#lv-eq', root);
      eqEl.innerHTML = !st.on ? 'الوحدة مطفأة' : Math.abs(r1 - r2) <= 0.01 ? '<span class="status ok">Vo30-1 = Vo30-2 · موضع الصفر</span>' : r2 > r1 ? 'V2 أكبر: القلب نحو S2' : 'V1 أكبر: القلب نحو S1';
      L.setText('lv-disp', data.nul != null ? (disp >= 0 ? '+' : '') + L.fx(disp, 2) + ' mm' : 'حدّد الصفر', root);
      L.setText('lv-diff', L.fx(r2 - r1, 3) + ' V', root);
      L.setText('lv-vo', st.on ? L.fx(k.voAmp * 1000 < 100 ? k.voAmp * 1000 : k.voAmp, k.voAmp * 1000 < 100 ? 1 : 3) + (k.voAmp * 1000 < 100 ? ' mV' : ' V') + ' peak' : '—', root);
      L.setText('lv-ph', st.on ? (Math.abs(k.diff) < k.vres ? '≈ صفر (جهد الصفر المتبقي)' : k.phase + '° ' + (k.phase ? 'معاكس للابتدائي' : 'مع الابتدائي')) : '—', root);
      const s = L.$('#lv-st', root);
      if (!st.on) { s.className = 'status'; s.textContent = 'الوحدة مطفأة'; }
      else if (Math.abs(st.vp - 10) > 0.05) { s.className = 'status warn'; s.textContent = `Vp = ${st.vp.toFixed(2)} V (المطلوب 10 V)`; }
      else if (data.nul == null) { s.className = 'status warn'; s.textContent = 'ابحث عن موضع الصفر'; }
      else { s.className = 'status ok'; s.textContent = 'جاهز للقياس'; }
      L.$('#lv-scope', root).innerHTML = scope(k, st);
      // chart
      const m1 = [], m2 = [], m3 = [];
      for (let i = 0; i <= 80; i++) { const d = -10 + i / 4; const kk = physics({ ...st, on: true, vp: 10 }, ref + d); m1.push([d, kk.dc1]); m2.push([d, kk.dc2]); m3.push([d, kk.dc2 - kk.dc1]); }
      const p1 = [], p2 = [], p3 = [];
      TARGETS.forEach((t) => { const r = data.rows[t]; if (r) { p1.push([t, r.v1]); p2.push([t, r.v2]); p3.push([t, r.v2 - r.v1]); } });
      plot.set([
        { name: 'V1 (Vo30-1)', color: 'var(--s1)', points: p1, markers: true, marker: 'circle' },
        { name: 'V2 (Vo30-2)', color: 'var(--s2)', points: p2, markers: true, marker: 'square' },
        { name: 'V2 − V1', color: 'var(--s3)', points: p3, markers: true, marker: 'triangle' },
        { name: 'm1', color: 'var(--s1)', points: m1, faint: true, legend: false, hover: false },
        { name: 'm2', color: 'var(--s2)', points: m2, faint: true, legend: false, hover: false },
        { name: 'm3', color: 'var(--s3)', points: m3, faint: true, legend: false, hover: false },
      ], st.on ? [{ x: disp, y: k.dc2 - k.dc1, name: 'V2 − V1 الآن' }] : []);
      guide.update(st);
    }
    function scope(k, st) {
      const W = 300, H = 180, cy = H / 2, div = 30;
      let s = '';
      for (let i = 0; i <= 10; i++) s += `<line class="sg${i === 5 ? ' c' : ''}" x1="${i * div}" y1="0" x2="${i * div}" y2="${H}"/>`;
      for (let j = 0; j <= 6; j++) s += `<line class="sg${j === 3 ? ' c' : ''}" x1="0" y1="${j * div}" x2="${W}" y2="${j * div}"/>`;
      const v2div = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2].find((v) => k.voAmp <= v * 2.8) || 2;
      const tdiv = 0.5e-3, w = 2 * Math.PI * F;
      const tr = (fn, vdiv) => { let d = ''; for (let i = 0; i <= 160; i++) { const x = (i / 160) * W, t = (x / W) * 10 * tdiv; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (cy - (fn(t) / vdiv) * div).toFixed(1); } return d; };
      if (st.on) {
        s += `<path class="tr1" d="${tr((t) => st.vp * Math.sin(w * t), 5)}"/>`;
        s += `<path class="tr2" d="${tr((t) => k.diff * Math.sin(w * t) + k.vres * Math.cos(w * t), v2div)}"/>`;
      }
      const vf = (v) => (v < 1 ? v * 1000 + ' mV' : v + ' V');
      s += `<text class="t1" x="6" y="14">CH1 Vp 5 V/div</text><text class="t2" x="6" y="${H - 6}">CH2 Vo ${vf(v2div)}/div</text><text class="tt" x="${W - 6}" y="${H - 6}" text-anchor="end">0.5 ms/div</text>`;
      return `<div class="scope-wrap"><svg class="scope" viewBox="0 0 ${W} ${H}" role="img" aria-label="شاشة راسم الإشارة">${s}</svg></div>`;
    }
    renderTable(); update();
  }

  function calc() {
    const pts = TARGETS.filter((t) => data.rows[t]).map((t) => [t, data.rows[t].v2 - data.rows[t].v1]);
    let fit = '';
    if (pts.length >= 3) {
      const nn = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
      const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
      const m = (nn * sxy - sx * sy) / (nn * sxx - sx * sx), b = (sy - m * sx) / nn;
      const dev = Math.max(...pts.map((p) => Math.abs(p[1] - (m * p[0] + b))));
      const fs = Math.max(...pts.map((p) => Math.abs(p[1])));
      fit = `<h2>الحساسية والخطية</h2>
        <p>بملاءمة خط مستقيم (المربعات الصغرى) لقيم ${n('V2 − V1')} مقابل الإزاحة:</p>
        ${L.eq(`V<sub>o</sub> ≈ ${m.toFixed(3)} · x ${b >= 0 ? '+' : '−'} ${Math.abs(b).toFixed(3)} &nbsp;&nbsp; (V, mm)`)}
        <ul><li>الحساسية (الميل): ${n(m.toFixed(3) + ' V/mm')}</li><li>أكبر انحراف عن الخط: ${n((dev * 1000).toFixed(1) + ' mV')} أي ${n(((dev / fs) * 100).toFixed(2) + ' %')} من أقصى خرج، فالمحوّل خطي جيداً ضمن ±3 mm.</li></ul>`;
    }
    const rows = TARGETS.map((t) => { const r = data.rows[t]; return [n(t === 0 ? '0.0 (Null)' : (t > 0 ? '+' : '') + t.toFixed(1)), r && n(r.v1.toFixed(3)), r && n(r.v2.toFixed(3)), r && n((r.v2 - r.v1).toFixed(3)), r && (t === 0 ? 'Null' : t < 0 ? 'نحو S1' : 'نحو S2')]; });
    return `
      <h2>جدول القراءات</h2>
      <p>طول البرغي الظاهر عند موضع الصفر: ${n(data.nul != null ? data.nul.toFixed(2) + ' mm' : '______ mm')}</p>
      <div class="table-wrap">${L.table(['Displacement (mm)', 'V1', 'V2', 'V2 − V1', 'Direction'], rows)}</div>
      ${pts.length ? '' : `<p class="muted">سجّل القراءات من <a href="#" data-goto-tab="sim">المحاكاة</a> لتظهر هنا مع الحساسية والخطية.</p>`}
      ${fit}
      <h2>الاستنتاج (Conclusion)</h2>
      <p>يحوّل LVDT الإزاحة الخطية للقلب الحديدي إلى إشارة كهربائية: عند موضع الصفر يتساوى الجهدان المحتثان في الملفين الثانويين (Vo30-1 = Vo30-2) ويكون الخرج التفاضلي أقرب ما يمكن إلى الصفر (يبقى جهد صغير متبقٍّ بسبب عدم تطابق الملفين والتوافقيات). بتحريك القلب نحو S2 يزداد V2 وينقص V1، وبتحريكه نحو S1 يحدث العكس، ويتغير طور الخرج 180° عند عبور الصفر فيدل على الاتجاه. ضمن ±3 mm كانت العلاقة بين الإزاحة و ${n('V2 − V1')} خطية تقريباً، وتبتعد عن الخطية كلما ابتعد القلب عن المنتصف.</p>`;
  }

  L.register({
    id: 'lvdt', num: 7, group: 'transducers',
    title: 'المحوّل التفاضلي الخطي المتغير LVDT',
    en: 'Linear Variable Differential Transformer',
    sheet: 'Experiment No. (6) — Linear Variable Differential Transformer',
    tags: ['KL-620', 'Null position', 'Vo = VS2 − VS1', '338 Hz'],
    summary: 'دراسة مبدأ عمل LVDT وكيف تتحول إزاحة القلب الحديدي إلى إشارة كهربائية: ضبط جهد الإثارة، إيجاد موضع الصفر، وقياس الخرج عند إزاحات ±1 و±2 و±3 mm ورسم منحنى الخطية.',
    objectiveShort: 'دراسة مبدأ عمل المحوّل التفاضلي الخطي المتغير (LVDT) وفهم كيفية تحويل الإزاحة إلى إشارة كهربائية.',
    mount, calc,
    theory: () => `
      <h2>الهدف (Objective)</h2>
      <p>دراسة مبدأ عمل <b>المحوّل التفاضلي الخطي المتغير</b> (Linear Variable Differential Transformer, LVDT) وفهم كيفية تحويل الإزاحة إلى إشارة كهربائية.</p>
      <h2>النظرية (Theory)</h2>
      <p>الـ LVDT متحسس حثّي (Inductive transducer) يحوّل الإزاحة الخطية إلى إشارة كهربائية، ويتكون من:</p>
      <ul><li>ملف ابتدائي (Primary) في المنتصف.</li><li>ملفين ثانويين (S1 و S2) على جانبيه.</li><li><b>قلب من مادة فيرومغناطيسية</b> متحرك ينتقل بفعل الإزاحة.</li></ul>
      <p>عند تسليط <b>جهد إثارة متناوب</b> على الملف الابتدائي تُحتث جهود في الملفين الثانويين، والخرج التفاضلي يتناسب مع إزاحة القلب.</p>
      <h3>معادلة جهد الخرج (Output Voltage Equation)</h3>
      <p>الملفان الثانويان موصولان على <b>التوالي بتعاكس</b> (Series opposition)، فجهد الخرج هو <b>الفرق</b> بين جهديهما:</p>
      ${L.eq('V<sub>o</sub> = V<sub>S2</sub> − V<sub>S1</sub>')}
      <p><b>مقدار</b> Vo يدل على مقدار حركة القلب، و<b>طوره</b> يدل على <b>اتجاه</b> الحركة: عندما يعبر القلب موضع الصفر يتغير طور جهد الخرج بمقدار <b>180°</b>.</p>
      <h3>جهد الصفر (Null Voltage)</h3>
      <p>عملياً لا يكون الخرج عند موضع الصفر صفراً تماماً، إذ يبقى <b>جهد متبقٍّ</b> صغير (بضعة ملي فولت) لأن الملفين الثانويين غير متطابقين تماماً ولوجود توافقيات في إشارة الإثارة. لهذا قد لا يقرأ الجهاز 0 V بالضبط عند موضع الصفر.</p>
      <h3>شرح الدائرة (Circuit Explanation)</h3>
      <ul>
        <li>تحتوي الدائرة على <b>مذبذب جسر وين</b> (U1, R1, C1, R2, C2) يولّد إشارة الإثارة بتردد <b>338 Hz</b>.</li>
        <li>سعة الخرج يتحكم بها <b>VR5</b>.</li>
        <li>الثنائيان (CR1, CR2) والترانزستوران (Q1, Q2) يثبّتون السعة.</li>
        <li>يُحوَّل الخرج المتناوب إلى مستمر بواسطة <b>CR3</b> و<b>C4</b> مع مقاوماتهما (وبالمثل CR4 و C5 للملف الثاني).</li>
        <li>تابعا الجهد <b>(U2, U3)</b> يعملان كعازلين (Buffers) فيعطيان Vo30-1 و Vo30-2.</li>
      </ul>
      <figure class="figure">${blockDiagram()}<figcaption>مخطط كتلي مبسّط لدائرة KL-620</figcaption></figure>`,
    apparatus: () => `
      <h2>الأجهزة (Apparatus)</h2>
      <ul class="app-list">
        <li><b>وحدة KL-620</b><span class="en">KL-620 Kit (LVDT experiment kit)</span><span>تحوي المتحسس SENSOR30 ودائرة الإثارة والتقويم.</span></li>
        <li><b>مجهّز قدرة</b><span class="en">Power supply</span><span>±12 V للوحدة.</span></li>
        <li><b>ملتيميتر رقمي / راسم إشارة</b><span class="en">Digital multimeter / oscilloscope</span><span>لقراءة Vo30-1 و Vo30-2 ومشاهدة الإشارات.</span></li>
        <li><b>برغي ميكرومتري</b><span class="en">Micrometer screw gauge</span><span>لقياس الإزاحة.</span></li>
        <li><b>أسلاك توصيل</b><span class="en">Connecting wires</span><span>—</span></li>
      </ul>
      <h2>مخطط الدائرة</h2>
      <figure class="figure">${blockDiagram()}<figcaption>المذبذب يغذي الملف الابتدائي P، وكل ملف ثانوي يُقوَّم ثم يمر في تابع جهد.</figcaption></figure>
      <h2>خطوات العمل (Procedure)</h2>
      <ol class="steps">
        <li><div><b>تشغيل الوحدة:</b> صِل النموذج باستخدام وحدة KL-620 وشغّل مجهز القدرة.</div></li>
        <li><div><b>ضبط جهد الإثارة:</b> عدّل VR5 حتى يصبح جهد الإثارة للملف الابتدائي ${n('Vp = 10 V')}.</div></li>
        <li><div><b>إيجاد موضع الصفر:</b> أدر المقبض حتى يتساوى <b>الجهدان المستمران Vo30-1 و Vo30-2</b>.</div></li>
        <li><div><b>قياس الإزاحة:</b> استخدم مسطرة لقياس <b>الطول الظاهر الكلي للبرغي</b>، وسجّل الإزاحة من موضع الصفر (طول البرغي عنده) في الاتجاهين.</div></li>
        <li><div><b>رسم المنحنى:</b> ارسم موضع القلب (mm) مقابل جهد الخرج (V) لتحليل خطية LVDT.</div></li>
      </ol>`,
    discussion: [
      { en: 'What is the significance of the null position?', ar: 'ما أهمية موضع الصفر؟',
        a: `<p>هو الموضع الذي يكون فيه القلب في المنتصف تماماً بين الملفين الثانويين، فيتساوى الجهدان المحتثان ${n('VS1 = VS2')} ويكون الخرج التفاضلي صفراً (عملياً بضعة mV هي جهد الصفر المتبقي). يُتخذ <b>مرجعاً</b> لقياس الإزاحة في الاتجاهين، وعنده ينقلب طور الخرج 180°، والمنطقة حوله هي الأكثر خطية. في وحدة KL-620 يُعرف بتساوي Vo30-1 و Vo30-2.</p>` },
      { en: 'What happens to output voltage when the core moves left or right?', ar: 'ماذا يحدث لجهد الخرج عند تحريك القلب يساراً أو يميناً؟',
        a: `<p>عند تحريك القلب نحو <b>S2</b> يزداد الربط المغناطيسي مع S2 ويقل مع S1، فيزداد ${n('VS2')} (و Vo30-2) وينقص ${n('VS1')} (و Vo30-1)، ويكون الخرج ${n('Vo = VS2 − VS1')} موجباً وفي طور الابتدائي. وعند تحريكه نحو <b>S1</b> يحدث العكس ويكون الخرج بطور معاكس (180°). مقدار الخرج يتناسب مع مقدار الإزاحة، وطوره يحدد الاتجاه.</p>` },
      { en: 'Why must the primary winding of the LVDT be supplied with an AC voltage and not a DC voltage?', ar: 'لماذا يجب تغذية الملف الابتدائي بجهد متناوب لا مستمر؟',
        a: `<p>لأن الـ LVDT يعمل على مبدأ <b>الحث المتبادل</b> (قانون فاراداي): الجهد المحتث في الثانويين يتناسب مع معدل تغير الفيض ${n('dΦ/dt')}. الجهد المستمر يولّد فيضاً ثابتاً فلا يحتث أي جهد في الثانويين (إلا لحظة التشغيل). كما أن الملف الابتدائي على التيار المستمر لا يحدّ تياره إلا مقاومة سلكه الصغيرة فيسخن. لذلك يُغذى بجهد متناوب (338 Hz في وحدة KL-620) ثم يُقوَّم الخرج.</p>` },
      { en: 'Why does the output voltage become non-linear when the core moves far from the null position?', ar: 'لماذا يصبح جهد الخرج غير خطي عندما يبتعد القلب كثيراً عن موضع الصفر؟',
        a: `<p>قرب المنتصف يتغير الربط بين الابتدائي وكل ثانوي تغيراً شبه خطي مع الإزاحة. عندما يبتعد القلب كثيراً يبدأ طرفه بالخروج من منطقة الملف الابتدائي ويغطي الملف الثانوي القريب بالكامل، فلا يزداد الفيض المربوط بالمعدل نفسه (تشبّع في تغير الربط)، كما تزداد مجالات الأطراف (Fringing) والفيض المتسرب. فيقل الميل ويصبح المنحنى مسطحاً خارج المدى الخطي. لذلك يُحدد لكل LVDT مدى خطي يُستخدم ضمنه فقط. حرّك القلب أبعد من ±6 mm في المحاكاة لترى ذلك.</p>` },
    ],
  });
})();
