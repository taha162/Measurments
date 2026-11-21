/* Experiments 5 & 6 — Measuring an unknown inductance / capacitance with a series R and equal voltages at 1 kHz. */
(function () {
  'use strict';
  const L = window.Lab, S = L.S, n = L.n;
  const TAU = 2 * Math.PI;

  function schematic(kind, o = {}) {
    const top = kind === 'L' ? 'L' : 'R', bot = kind === 'L' ? 'R' : 'C';
    const comp = (k, y1, y2, extra = {}) => {
      if (k === 'L') return S.coil(250, y1, 250, y2, { label: 'L', sub: o.lsub || 'r', off: -16, ...extra });
      if (k === 'C') return S.cap(250, y1, 250, y2, { label: 'C', sub: o.csub || 'unknown', off: -18, ...extra });
      return S.res(250, y1, 250, y2, { variable: true, label: 'R', sub: o.rsub || 'variable', off: -18, ...extra });
    };
    let s = '';
    s += S.wire([[70, 132], [70, 40], [250, 40]]) + S.wire([[250, 260], [70, 260], [70, 168]]);
    s += comp(top, 40, 150) + comp(bot, 150, 260);
    s += S.dot(250, 40) + S.dot(250, 150) + S.dot(250, 260);
    s += S.wire([[250, 40], [370, 40], [370, 78]]) + S.wire([[370, 112], [370, 188]]) + S.wire([[370, 222], [370, 260], [250, 260]]) + S.wire([[250, 150], [370, 150]]);
    s += S.dot(370, 150);
    const vTop = 'V' + (top === 'L' ? 'L' : 'R'), vBot = 'V' + (bot === 'R' ? 'R' : 'C');
    s += S.meter(370, 95, 'V', { label: vTop, lx: 394, ly: 99, anchor: 'start', lcls: 'acc' });
    s += S.meter(370, 205, 'V', { label: vBot, lx: 394, ly: 209, anchor: 'start', lcls: 'acc' });
    s += S.ac(70, 150, { label: 'sine', sub: o.f || '1 kHz', lx: 96, ly: 146, anchor: 'start' });
    s += S.flow([[70, 132], [70, 40], [250, 40], [250, 260], [70, 260], [70, 168]], 'ac');
    return S.svg(450, 290, s, kind === 'L' ? 'دائرة قياس المحاثة' : 'دائرة قياس السعة');
  }

  function makeAC(cfg) {
    const K = cfg.kind, KEY = cfg.id;
    let data = L.store.get(KEY + ':data', { rows: [] });
    const save = () => L.store.set(KEY + ':data', data);
    const vxName = K === 'L' ? 'VL' : 'VC';

    function physics(st) {
      const u = cfg.unknowns[st.unk], w = TAU * st.f, V = st.on ? st.vs : 0;
      if (K === 'L') {
        const X = w * u.L, r = u.r, Zx = Math.hypot(r, X), Z = Math.hypot(st.R + r, X), I = V / Z;
        return { X, r, Zx, Z, I, VR: I * st.R, VX: I * Zx, thX: Math.atan2(X, r), phi: Math.atan2(X, st.R + r) };
      }
      const X = 1 / (w * u.C), Z = Math.hypot(st.R, X), I = V / Z;
      return { X, r: 0, Zx: X, Z, I, VR: I * st.R, VX: I * X, thX: -Math.PI / 2, phi: -Math.atan2(X, st.R) };
    }
    const result = (R, VR, VX, f, r) => {
      if (K === 'L') { const v = R * R - r * r; return v > 0 ? Math.sqrt(v) / (TAU * f) : NaN; }
      return VX > 0 && R > 0 ? VR / (TAU * f * R * VX) : NaN;
    };
    const fmtX = (v) => (K === 'L' ? L.si(v, 'H', 4) : L.si(v, 'F', 4));

    function phasor(k, st) {
      const W = 300, H = 210;
      const up = K === 'L';
      const ox = 30, oy = up ? 178 : 30;
      const horiz = k.VR + (K === 'L' ? k.I * k.r : 0), vert = K === 'L' ? k.I * k.X : k.VX;
      const sc = Math.min(230 / Math.max(horiz, 1e-6), 150 / Math.max(vert, 1e-6));
      const vr = k.VR * sc, vrr = k.I * k.r * sc, vx = (K === 'L' ? k.I * k.X : k.VX) * sc;
      const ex = ox + vr + vrr, ey = up ? oy - vx : oy + vx;
      const arrow = (x1, y1, x2, y2, col, lab, lx, ly, anchor = 'middle') => {
        const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 2) return '';
        const hx = x2 - 9 * Math.cos(a), hy = y2 - 9 * Math.sin(a);
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${col}" stroke-width="2.6"/><polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(hx - 4.5 * Math.sin(a)).toFixed(1)},${(hy + 4.5 * Math.cos(a)).toFixed(1)} ${(hx + 4.5 * Math.sin(a)).toFixed(1)},${(hy - 4.5 * Math.cos(a)).toFixed(1)}" fill="${col}"/>` +
          (lab ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="pl" fill="${col}">${lab}</text>` : '');
      };
      let s = `<line class="ax" x1="${ox}" y1="${oy}" x2="${W - 8}" y2="${oy}"/><text x="${W - 10}" y="${oy + (up ? 14 : -6)}" text-anchor="end" class="pl" fill="var(--muted)">I (مرجع)</text>`;
      if (!st.on) return `<svg class="phasor" viewBox="0 0 ${W} ${H}" role="img" aria-label="مخطط الطور">${s}<text x="150" y="105" text-anchor="middle" class="pl" fill="var(--muted)">شغّل المولّد</text></svg>`;
      s += arrow(ox, oy, ex, ey, 'var(--ink)', 'Vs', ox + (ex - ox) / 2 - 14, oy + (ey - oy) / 2 + (up ? -6 : 14), 'end');
      s += arrow(ox, oy, ox + vr, oy, 'var(--s1)', 'VR', ox + vr / 2, oy + (up ? 16 : -8));
      if (K === 'L') {
        s += `<line class="dash" x1="${(ox + vr).toFixed(1)}" y1="${oy}" x2="${ex.toFixed(1)}" y2="${oy}"/><line class="dash" x1="${ex.toFixed(1)}" y1="${oy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/>`;
        s += arrow(ox + vr, oy, ex, ey, 'var(--s2)', 'VL', ex + 6, (oy + ey) / 2, 'start');
        s += `<text x="${(ex + 6).toFixed(1)}" y="${((oy + ey) / 2 + 15).toFixed(1)}" class="pl" fill="var(--muted)" text-anchor="start">θ = ${(k.thX * 180 / Math.PI).toFixed(1)}°</text>`;
      } else {
        s += arrow(ox + vr, oy, ex, ey, 'var(--s2)', 'VC', ex + 6, (oy + ey) / 2, 'start');
      }
      const ra = 34, a = k.phi;
      s += `<path class="arcm" d="M${ox + ra} ${oy} A${ra} ${ra} 0 0 ${up ? 0 : 1} ${(ox + ra * Math.cos(a)).toFixed(1)} ${(oy - ra * Math.sin(a)).toFixed(1)}"/><text x="${ox + ra + 6}" y="${oy + (up ? -8 : 16)}" class="pl" fill="var(--muted)">φ = ${(Math.abs(a) * 180 / Math.PI).toFixed(1)}°</text>`;
      return `<svg class="phasor" viewBox="0 0 ${W} ${H}" role="img" aria-label="مخطط الطور للجهود">${s}</svg>`;
    }
    function scope(k, st) {
      const W = 300, H = 180, cx = W / 2, cy = H / 2, div = 30;
      let s = '';
      for (let i = 0; i <= 10; i++) s += `<line class="sg${i === 5 ? ' c' : ''}" x1="${i * div}" y1="0" x2="${i * div}" y2="${H}"/>`;
      for (let j = 0; j <= 6; j++) s += `<line class="sg${j === 3 ? ' c' : ''}" x1="0" y1="${j * div}" x2="${W}" y2="${j * div}"/>`;
      const peak = Math.max(k.VR, k.VX) * Math.SQRT2;
      const vdiv = [0.2, 0.5, 1, 2, 5].find((v) => peak <= v * 2.8) || 5;
      const tdiv = (2 / st.f) / 10;
      const tr = (amp, ph) => {
        let d = '';
        for (let i = 0; i <= 150; i++) { const x = (i / 150) * W, t = (x / W) * 10 * tdiv; const y = cy - (amp * Math.SQRT2 * Math.sin(TAU * st.f * t + ph) / vdiv) * div; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
        return d;
      };
      if (st.on) { s += `<path class="tr1" d="${tr(k.VR, 0)}"/><path class="tr2" d="${tr(k.VX, k.thX)}"/>`; }
      const tFmt = tdiv >= 1e-3 ? (tdiv * 1e3).toPrecision(2) + ' ms' : (tdiv * 1e6).toPrecision(3) + ' µs';
      s += `<text class="t1" x="6" y="14">CH1 VR ${vdiv} V/div</text><text class="t2" x="6" y="${H - 6}">CH2 ${vxName} ${vdiv} V/div</text><text class="tt" x="${W - 6}" y="${H - 6}" text-anchor="end">${tFmt}/div</text>`;
      return `<div class="scope-wrap"><svg class="scope" viewBox="0 0 ${W} ${H}" role="img" aria-label="شاشة راسم الإشارة">${s}</svg></div>`;
    }

    function mount(root) {
      const st = { f: 1000, vs: 5, R: cfg.R0, unk: 0, on: false, rMeasured: false, everBal: false, Rtouched: false };
      root.innerHTML = `
      <div class="sim-grid">
        <div class="bench"><div class="bench-grid">
          <div class="card sch c3"><div class="sch-title"><b>${K === 'L' ? 'الملف على التوالي مع R' : 'المتسعة على التوالي مع R'}</b><span>sine 1 kHz</span></div><div id="${KEY}-sch"></div></div>
          <div class="inst c3">${L.ihead('مولّد الدوال', 'Function generator · sine')}<div id="${KEY}-flcd"></div>
            <div class="inst-row" style="align-items:flex-start"><div id="${KEY}-f"></div><div id="${KEY}-a"></div></div><div class="inst-row"><div id="${KEY}-pwr"></div></div></div>
          <div class="inst c2">${L.ihead('ملتيميتر 1: الجهد على R', 'DMM · VR (AC rms)')}<div id="${KEY}-vr"></div>${L.ihead(`ملتيميتر 2: الجهد على ${K === 'L' ? 'الملف' : 'المتسعة'}`, `DMM · ${vxName} (AC rms)`)}<div id="${KEY}-vx"></div><div class="inst-foot" id="${KEY}-eq">—</div></div>
          <div class="inst c2">${L.ihead('المقاومة المتغيرة R', 'Variable resistor (decade)')}<div id="${KEY}-R"></div></div>
          <div class="inst c2">${L.ihead(K === 'L' ? 'الملف المجهول' : 'المتسعة المجهولة', K === 'L' ? 'Unknown inductor' : 'Unknown capacitor')}
            <div id="${KEY}-unk" style="display:flex;justify-content:center"></div>
            ${K === 'L' ? `<button type="button" class="btn small" id="${KEY}-rbtn" style="justify-self:center">قِس r بالأوميتر (DC)</button><div id="${KEY}-rlcd"></div><div class="inst-foot">الجهاز مفصول عن الدائرة عند قياس r</div>` : `<div class="inst-foot">قيمتها مخفية، وستحسبها من القياس</div>`}
          </div>
          <div class="card c3"><div class="card-head"><h3>مخطط الطور (Phasors)</h3></div><div id="${KEY}-ph"></div></div>
          <div class="card c3"><div class="card-head"><h3>راسم الإشارة</h3><span class="muted" style="font-size:12.5px">${K === 'L' ? 'VL تسبق VR بزاوية θ' : 'VC تتأخر عن VR بـ 90°'}</span></div><div id="${KEY}-sc"></div></div>
          <div class="card c6">
            <div class="card-head"><h3>القراءات والحساب</h3><span class="status" id="${KEY}-st">—</span></div>
            <div class="readouts">${L.ro(KEY + '-i', 'التيار I')}${L.ro(KEY + '-x', K === 'L' ? 'الرادة XL' : 'الرادة XC')}${L.ro(KEY + '-zx', K === 'L' ? '|ZL| = √(r² + XL²)' : 'R − XC')}${L.ro(KEY + '-sum', 'VR + ' + vxName + ' (مقابل Vs)')}${L.ro(KEY + '-res', K === 'L' ? 'L المحسوبة' : 'C المحسوبة', 'hl')}</div>
            <div class="calc-live" id="${KEY}-live"></div>
            <div class="meas-actions"><span class="muted" style="font-size:13px">${K === 'L' ? 'تُعد المعادلة صحيحة عند VR = VL فقط.' : 'المعادلة صحيحة لأي R، لكن الاتزان يعطي أدق قراءة.'}</span><button type="button" class="btn primary" id="${KEY}-rec">سجّل القراءة</button></div>
          </div>
        </div></div>
        <aside class="side"><div id="${KEY}-guide"></div></aside>
      </div>
      <div class="data-row">
        <div class="card"><div class="card-head"><h3>جدول القراءات</h3><div class="actions"><button type="button" class="btn small" id="${KEY}-reveal">كشف القيم الحقيقية</button><button type="button" class="btn small" id="${KEY}-copy">نسخ</button><button type="button" class="btn small ghost" id="${KEY}-clear">مسح</button></div></div><div class="table-wrap" id="${KEY}-table"></div></div>
        <div class="card"><div class="card-head"><h3>VR و ${vxName} مقابل R</h3></div><div id="${KEY}-plot"></div></div>
      </div>`;
      const $ = (id) => L.$('#' + KEY + '-' + id, root);
      const flcd = L.LCD($('flcd'), { digits: 5, unit: 'Hz', tag: 'FREQ' });
      const vrl = L.LCD($('vr'), { digits: 5, unit: 'V', tag: 'AC' });
      const vxl = L.LCD($('vx'), { digits: 5, unit: 'V', tag: 'AC' });
      L.Control($('f'), { id: KEY + '-fc', label: 'التردد', unit: 'Hz', min: 100, max: 5000, value: st.f, step: 10, decimals: 0, size: 52, steps: [-100, 100, -10, 10], onInput: (v) => { st.f = v; update(); } });
      L.Control($('a'), { id: KEY + '-ac', label: 'السعة (rms)', unit: 'V', min: 0.5, max: 10, value: st.vs, step: 0.1, decimals: 1, size: 52, steps: [-1, 1], onInput: (v) => { st.vs = v; update(); } });
      L.Power($('pwr'), { label: 'تشغيل المولّد', value: false, onChange: (v) => { st.on = v; update(); } });
      L.Control($('R'), { id: KEY + '-Rc', label: 'R', unit: 'Ω', min: 0, max: cfg.Rmax, value: st.R, step: 1, decimals: 0, size: 60, travel: 420, steps: [-100, 100, -10, 10, -1, 1], onInput: (v) => { st.R = v; st.Rtouched = true; update(); } });
      L.Seg($('unk'), { options: cfg.unknowns.map((u, i) => ({ v: i, label: u.id })), value: 0, aria: 'العنصر المجهول', onChange: (v) => { st.unk = +v; st.rMeasured = false; update(); } });
      let rl = null;
      if (K === 'L') {
        rl = L.LCD($('rlcd'), { digits: 4, unit: 'Ω', tag: 'Ω' });
        rl.set('----');
        $('rbtn').addEventListener('click', () => { st.rMeasured = true; update(); L.toast(`مقاومة سلك الملف r = ${cfg.unknowns[st.unk].r} Ω`); });
      }
      const plot = L.Plot($('plot'), { xLabel: 'R (Ω)', yLabel: 'الجهد (V rms)', x: [0, cfg.Rmax], height: 250, yZero: true, tipX: (v) => L.fx(v, 0) + ' Ω', tipY: (v) => L.fx(v, 3) + ' V', markLabel: 'R الحالية' });
      const guide = L.Guide($('guide'), cfg.steps);
      let reveal = false;
      $('reveal').addEventListener('click', (e) => { reveal = !reveal; e.target.textContent = reveal ? 'إخفاء القيم الحقيقية' : 'كشف القيم الحقيقية'; renderTable(); });
      $('rec').addEventListener('click', () => {
        const k = physics(st);
        if (!st.on) return L.toast('شغّل مولّد الدوال أولاً', 'warn');
        if (K === 'L' && !st.rMeasured) return L.toast('قِس مقاومة الملف r بالأوميتر أولاً', 'warn');
        const vr = +k.VR.toFixed(3), vx = +k.VX.toFixed(3);
        if (Math.abs(vr - vx) > 0.004 * Math.max(vr, vx)) return L.toast(`غيّر R حتى يتساوى VR و ${vxName}`, 'warn');
        const u = cfg.unknowns[st.unk];
        const val = result(st.R, vr, vx, st.f, K === 'L' ? u.r : 0);
        data.rows.push({ id: u.id, f: st.f, R: st.R, VR: vr, VX: vx, r: K === 'L' ? u.r : null, val, truth: K === 'L' ? u.L : u.C });
        save(); renderTable(); update();
        L.toast(`سُجّلت القراءة: ${K} = ${fmtX(val)}`);
      });
      $('copy').addEventListener('click', () => L.copyTable(L.$('table', $('table'))));
      $('clear').addEventListener('click', () => { data.rows = []; save(); renderTable(); update(); });

      function renderTable() {
        const head = ['#', 'العنصر', 'f (Hz)', 'R (Ω)', 'VR (V)', vxName + ' (V)'].concat(K === 'L' ? ['r (Ω)'] : [], [K === 'L' ? 'L المحسوبة' : 'C المحسوبة'], reveal ? ['الحقيقية', 'الخطأ'] : []);
        const rows = data.rows.map((r, i) => [i + 1, r.id, n(r.f), n(r.R), n(r.VR.toFixed(3)), n(r.VX.toFixed(3))].concat(K === 'L' ? [n(r.r)] : [], [`<b>${n(fmtX(r.val))}</b>`], reveal ? [n(fmtX(r.truth)), n((((r.val - r.truth) / r.truth) * 100).toFixed(2) + '%')] : []));
        $('table').innerHTML = L.table(head, rows.length ? rows : [['—', 'لا توجد قراءات بعد'].concat(Array(head.length - 2).fill(''))]);
      }
      function update() {
        const k = physics(st), u = cfg.unknowns[st.unk];
        $('sch').innerHTML = schematic(K, { f: st.f + ' Hz', rsub: st.R + ' Ω', lsub: u.id, csub: u.id });
        L.setFlow(root, 'ac', st.on, 1, true);
        flcd.set(st.on ? String(st.f) + '.' : '     ');
        const vr = k.VR, vx = k.VX;
        vrl.set(st.on ? L.lcdText(vr, 3, 5) : ' 0.000');
        vxl.set(st.on ? L.lcdText(vx, 3, 5) : ' 0.000');
        const bal = st.on && Math.abs(+vr.toFixed(3) - +vx.toFixed(3)) <= 0.004 * Math.max(vr, vx) && vr > 0.01;
        if (bal) st.everBal = true;
        if (rl) rl.set(st.rMeasured ? L.lcdText(u.r, 1, 4) : '----');
        $('eq').innerHTML = !st.on ? 'المولّد مطفأ' : bal ? `<span class="status ok">VR = ${vxName}</span>` : vr > vx ? `VR أكبر: أنقص R` : `${vxName} أكبر: زِد R`;
        $('ph').innerHTML = phasor(k, st);
        $('sc').innerHTML = scope(k, st);
        L.setText(KEY + '-i', st.on ? L.fx(k.I * 1000, 3) + ' mA' : '—', root);
        L.setText(KEY + '-x', L.fx(k.X, 1) + ' Ω', root);
        L.setText(KEY + '-zx', K === 'L' ? L.fx(k.Zx, 1) + ' Ω' : L.fx(st.R - k.X, 1) + ' Ω', root);
        L.setText(KEY + '-sum', st.on ? `${L.fx(vr + vx, 3)} ≠ ${L.fx(st.vs, 2)} V` : '—', root);
        const rUse = K === 'L' ? (st.rMeasured ? u.r : null) : 0;
        const live = st.on && rUse != null ? result(st.R, +vr.toFixed(3), +vx.toFixed(3), st.f, rUse) : NaN;
        L.setText(KEY + '-res', isFinite(live) ? fmtX(live) + (K === 'L' && !bal ? ' (غير صالحة)' : '') : '—', root);
        const s = $('st');
        if (!st.on) { s.className = 'status'; s.textContent = 'المولّد مطفأ'; }
        else if (bal) { s.className = 'status ok'; s.textContent = `متزنة: VR = ${vxName}`; }
        else { s.className = 'status warn'; s.textContent = `غير متساويين: الفرق ${L.fx(Math.abs(vr - vx), 3)} V`; }
        if (K === 'L') {
          $('live').innerHTML = `${L.ieq(`L = ${L.frac(L.sqrt('R<sup>2</sup> − r<sup>2</sup>'), '2πf')} = ${L.frac(L.sqrt(`${st.R}<sup>2</sup> − ${st.rMeasured ? u.r : 'r'}<sup>2</sup>`), `2π × ${st.f}`)}${isFinite(live) ? ' = ' + fmtX(live) : ''}`)} ${st.rMeasured ? '' : '<span class="status warn">قِس r أولاً</span>'}`;
        } else {
          $('live').innerHTML = `${L.ieq(`C = ${L.frac('V<sub>R</sub>', '2πf R V<sub>C</sub>')} = ${L.frac(L.fx(vr, 3), `2π × ${st.f} × ${st.R} × ${L.fx(vx, 3)}`)}${isFinite(live) ? ' = ' + fmtX(live) : ''}`)}`;
        }
        const a = [], b = [];
        for (let i = 0; i <= 120; i++) { const R = (cfg.Rmax * i) / 120; const kk = physics({ ...st, R }); a.push([R, kk.VR]); b.push([R, kk.VX]); }
        plot.set([{ name: 'VR', color: 'var(--s1)', points: a, hover: false }, { name: vxName, color: 'var(--s2)', points: b, hover: false, dash: true }], st.on ? [{ x: st.R, y: vr, name: 'VR' }, { x: st.R, y: vx, name: vxName }] : []);
        guide.update({ ...st, rows: data.rows });
      }
      renderTable(); update();
    }

    function calc() {
      const r = data.rows[data.rows.length - 1];
      const u0 = cfg.unknowns[0];
      const ex = r || (() => {
        // worked example with the first unknown at 1 kHz, balanced
        const R = K === 'L' ? Math.round(Math.hypot(u0.r, TAU * 1000 * u0.L)) : Math.round(1 / (TAU * 1000 * u0.C));
        const st = { f: 1000, vs: 5, R, unk: 0, on: true }; const k = physics(st);
        return { id: u0.id, f: 1000, R, VR: +k.VR.toFixed(3), VX: +k.VX.toFixed(3), r: u0.r, val: result(R, +k.VR.toFixed(3), +k.VX.toFixed(3), 1000, u0.r || 0), example: true };
      })();
      return cfg.calcText(ex, !!r);
    }

    L.register({
      id: cfg.id, num: cfg.num, group: 'ac', title: cfg.title, en: cfg.en, sheet: cfg.sheet, tags: cfg.tags, summary: cfg.summary, objectiveShort: cfg.objective,
      mount, calc, theory: cfg.theory, apparatus: () => cfg.apparatus(schematic(K, {})), discussion: cfg.discussion,
    });
  }

  /* ================= Experiment 5: inductance ================= */
  makeAC({
    kind: 'L', id: 'inductance', num: 5, R0: 100, Rmax: 5000,
    title: 'قياس المحاثة لملف بطريقة تساوي الجهدين',
    en: 'Inductive Measurement',
    sheet: 'Experiment No. (3) — Inductive Measurement',
    tags: ['L = √(R² − r²) / 2πf', '1 kHz', 'VR = VL'],
    summary: 'إيجاد محاثة ملف مجهول موصول على التوالي مع مقاومة متغيرة، بضبط المقاومة حتى يتساوى الجهد عليها مع الجهد على الملف عند تردد 1000 Hz.',
    objective: 'قياس محاثة ملف في دائرة توالٍ مع مقاومة، بحيث يتساوى الجهد على المقاومة والجهد على الملف، عند تردد 1000 Hz.',
    unknowns: [{ id: 'L-A', L: 47e-3, r: 62 }, { id: 'L-B', L: 100e-3, r: 145 }, { id: 'L-C', L: 220e-3, r: 280 }],
    steps: [
      { t: 'صِل الدائرة كما في المخطط وشغّل مولّد الدوال.', check: (s) => s.on },
      { t: 'اضبط تردد المولّد على 1000 Hz.', check: (s) => s.on && s.f === 1000 },
      { t: 'قِس مقاومة سلك الملف r بالأوميتر (يلزم للمعادلة).', check: (s) => s.rMeasured },
      { t: 'قِس VR و VL بالملتيميتر، وغيّر المقاومة المتغيرة حتى يصبح VR = VL.', check: (s) => s.everBal },
      { t: 'سجّل قيمة R واحسب L من المعادلة.', check: (s) => s.rows.length >= 1 },
      { t: 'أعد القياس عند 2000 Hz ولاحظ أن L المحسوبة لا تتغير.', check: (s) => s.rows.some((r) => r.f === 2000) },
    ],
    theory: () => `
      <h2>الهدف (Objective)</h2>
      <p>قياس محاثة ملف في دائرة توالٍ مع مقاومة، حيث يكون الجهد على المقاومة مساوياً للجهد على الملف، عند تردد ${n('1000 Hz')}.</p>
      <h2>النظرية (Theory)</h2>
      <p>تقاس المحاثة بوحدة الهنري (H). لا تقاس بدقة إلا بدائرة قنطرة متناوبة (A.C. bridge)، وتتوفر قناطر محاثة تجارية مختلفة. هذه الطريقة <b>تقريبية</b>: يوصل الملف المجهول على التوالي مع مقاومة متغيرة في دائرة تغذيها موجة جيبية.</p>
      <p>تُضبط المقاومة المتغيرة حتى يتساوى الجهد المقاس على المقاومة مع الجهد المقاس على الملف. عندها تتساوى الممانعتان، ويمكن حساب المحاثة من:</p>
      ${L.eq(`L = ${L.frac(L.sqrt('R<sup>2</sup> − r<sup>2</sup>'), '2πf')}`)}
      <p>حيث ${n('R')} قيمة المقاومة المتغيرة، و${n('r')} مقاومة سلك الملف، و${n('f')} تردد التغذية.</p>
      <h3>اشتقاق المعادلة</h3>
      <p>التيار نفسه ${n('I')} يمر في العنصرين، والملف الحقيقي له مقاومة سلك ${n('r')} على التوالي مع رادته ${n('XL = 2πfL')}:</p>
      ${L.eq(`V<sub>R</sub> = I R &nbsp;&nbsp;,&nbsp;&nbsp; V<sub>L</sub> = I ${L.sqrt('r<sup>2</sup> + X<sub>L</sub><sup>2</sup>')}`)}
      <p>عند ${n('VR = VL')}: ${L.ieq(`R = ${L.sqrt('r<sup>2</sup> + X<sub>L</sub><sup>2</sup>')} ⇒ X<sub>L</sub> = 2πfL = ${L.sqrt('R<sup>2</sup> − r<sup>2</sup>')}`)}</p>
      <div class="note">الجهدان على R و L ليسا في الطور نفسه، لذلك ${n('VR + VL > Vs')}. الجهد على الملف يسبق التيار بزاوية ${n('θ = tan⁻¹(XL / r)')} تقترب من 90° كلما صغرت r. لاحظ ذلك في مخطط الطور وراسم الإشارة في المحاكاة.</div>`,
    apparatus: (sch) => `
      <h2>مخطط الدائرة (Circuit Diagram)</h2>
      <figure class="figure">${sch}<figcaption>مصدر جيبي 1 kHz، والملف L على التوالي مع المقاومة المتغيرة R، وفولتميتر على كلٍّ منهما.</figcaption></figure>
      <h2>المواد (Materials)</h2>
      <ul class="app-list">
        <li><b>مولّد دوال</b><span class="en">Function generator (1000 Hz)</span><span>موجة جيبية.</span></li>
        <li><b>مقاومة متغيرة</b><span class="en">Variable resistor</span><span>تُضبط حتى VR = VL.</span></li>
        <li><b>ملف مجهول القيمة</b><span class="en">Inductor (unknown value)</span><span>له مقاومة سلك r.</span></li>
        <li><b>ملتيميتر</b><span class="en">Multimeter</span><span>لقياس الجهد المتناوب (وقياس r بالأوميتر).</span></li>
        <li><b>أسلاك توصيل</b><span class="en">Connecting wires</span><span>—</span></li>
      </ul>
      <h2>خطوات العمل (Procedure)</h2>
      <ol class="steps">
        <li><div>صِل الدائرة كما في المخطط.</div></li>
        <li><div>اضبط مولّد الدوال على تردد 1000 Hz.</div></li>
        <li><div>قِس الجهد على المقاومة (VR) وعلى الملف (VL) بالملتيميتر.</div></li>
        <li><div>تأكد من أن VR = VL بتعديل المقاومة المتغيرة.</div></li>
        <li><div>سجّل قيمة المقاومة (R).</div></li>
        <li><div>احسب المحاثة L من المعادلة ${L.ieq(`L = ${L.frac(L.sqrt('R<sup>2</sup> − r<sup>2</sup>'), '2πf')}`)}.</div></li>
      </ol>
      <h3>البيانات (Data)</h3>
      <ul><li>قيمة المقاومة (R): ______ Ω</li><li>التردد (f): 1000 Hz</li><li>الجهد على المقاومة (VR): ______ V</li><li>الجهد على الملف (VL): ______ V</li></ul>`,
    calcText: (r, real) => `
      <h2>البيانات (Data)${real ? '' : ' — مثال محلول'}</h2>
      ${real ? '' : `<p class="muted">لم تسجّل قراءة بعد، لذلك نعرض مثالاً بالملف ${r.id}. سجّل قراءتك من <a href="#" data-goto-tab="sim">المحاكاة</a> لتظهر أرقامك هنا.</p>`}
      <ul><li>قيمة المقاومة: ${n('R = ' + r.R + ' Ω')}</li><li>التردد: ${n('f = ' + r.f + ' Hz')}</li><li>الجهد على المقاومة: ${n('VR = ' + r.VR.toFixed(3) + ' V')}</li><li>الجهد على الملف: ${n('VL = ' + r.VX.toFixed(3) + ' V')}</li><li>مقاومة سلك الملف: ${n('r = ' + r.r + ' Ω')}</li></ul>
      <h2>الحسابات (Calculations)</h2>
      ${L.eq(`L = ${L.frac(L.sqrt('R<sup>2</sup> − r<sup>2</sup>'), '2πf')} = ${L.frac(L.sqrt(`${r.R}<sup>2</sup> − ${r.r}<sup>2</sup>`), `2π × ${r.f}`)} = ${L.frac(Math.sqrt(r.R * r.R - r.r * r.r).toFixed(1), (TAU * r.f).toFixed(1))} = ${L.si(r.val, 'H', 4)}`)}
      <h2>النتيجة (Results)</h2>
      <p>المحاثة المحسوبة للملف ${n(r.id)} هي <b>${n(L.si(r.val, 'H', 4))}</b>.</p>
      <h2>الاستنتاج (Conclusion)</h2>
      <p>بضبط المقاومة المتغيرة حتى يتساوى الجهد عليها مع الجهد على الملف تصبح ممانعة الملف ${n('√(r² + XL²)')} مساوية لـ R، ومنها تُحسب المحاثة. هذه الطريقة بسيطة وتحتاج فولتميتراً واحداً فقط، لكنها تقريبية: تعتمد على معرفة r بدقة وعلى دقة تساوي القراءتين. وبتكرار القياس عند 2000 Hz تتضاعف الرادة الحثية وتلزم R أكبر للاتزان، بينما تبقى L المحسوبة ثابتة لأنها خاصية للملف لا للتردد.</p>`,
    discussion: [
      { en: 'Why is it important to ensure that the voltage across the resistor and the inductor is the same in this experiment?', ar: 'لماذا يجب أن يتساوى الجهد على المقاومة والملف في هذه التجربة؟',
        a: `<p>لأن التيار نفسه يمر في المقاومة والملف (توالٍ)، فتساوي الجهدين يعني تساوي الممانعتين ${n('|ZL| = R')}، وهذا أساس المعادلة ${n('L = √(R² − r²)/(2πf)')}. إذا لم يتساوَ الجهدان لا تصح المعادلة. كما أن مقارنة قراءتين متساويتين بالجهاز نفسه وعلى المدى نفسه تلغي أثر خطأ معايرة الفولتميتر.</p>` },
      { en: 'How does the frequency of the AC signal affect the inductive reactance?', ar: 'كيف يؤثر تردد الإشارة المتناوبة في الرادة الحثية؟',
        a: `${L.eq('X<sub>L</sub> = 2πfL')}<p>الرادة الحثية تتناسب <b>طردياً</b> مع التردد: مضاعفة التردد تضاعف ${n('XL')}، وعند التيار المستمر (${n('f = 0')}) تكون صفراً ولا يبقى إلا مقاومة السلك r.</p>` },
      { en: 'What would happen if the frequency were increased to 2000 Hz? How would this affect the measured inductance?', ar: 'ماذا يحدث لو رُفع التردد إلى 2000 Hz؟ وكيف يؤثر ذلك في المحاثة المقاسة؟',
        a: `<p>تتضاعف ${n('XL')} (مثلاً من 628 Ω إلى 1257 Ω لملف 100 mH)، فيرتفع ${n('VL')} وينخفض ${n('VR')}، ونحتاج قيمة أكبر للمقاومة كي يتحقق الاتزان (${n('R = √(r² + XL²)')}). لكن <b>المحاثة المحسوبة تبقى نفسها تقريباً</b> لأن ${n('f')} في مقام المعادلة تضاعف أيضاً؛ فالمحاثة خاصية للملف لا تعتمد على التردد (إلا عند ترددات عالية جداً تظهر فيها السعة الشاردة وخسائر القلب). جرّب ذلك في المحاكاة.</p>` },
      { en: 'What are the potential sources of error in this experiment?', ar: 'ما مصادر الخطأ المحتملة في هذه التجربة؟',
        a: `<ul><li>عدم معرفة ${n('r')} بدقة: تقاس بالتيار المستمر، بينما المقاومة الفعالة عند 1 kHz أكبر قليلاً (التأثير الجلدي وخسائر القلب الحديدي).</li><li>دقة الفولتميتر عند 1 kHz (كثير من الملتيميترات مصممة لـ 50 Hz) وتحميله للدائرة.</li><li>عدم دقة تردد المولّد أو تشوّه الموجة الجيبية (التوافقيات).</li><li>صعوبة ضبط تساوي القراءتين تماماً، ودقة قراءة قيمة R وسماحيتها.</li><li>السعة الشاردة بين لفات الملف، وتأثير الأجسام المعدنية القريبة في المجال المغناطيسي.</li><li>الطريقة نفسها تقريبية، والقناطر المتناوبة (ماكسويل، هاي) أدق.</li></ul>` },
    ],
  });

  /* ================= Experiment 6: capacitance ================= */
  makeAC({
    kind: 'C', id: 'capacitance', num: 6, R0: 500, Rmax: 10000,
    title: 'قياس السعة لمتسعة بطريقة تساوي الجهدين',
    en: 'Capacitance Measurement',
    sheet: 'Experiment No. (4) — Capacitance Measurement',
    tags: ['C = VR / (2πfRVC)', '1 kHz', 'VR = VC'],
    summary: 'إيجاد سعة متسعة مجهولة موصولة على التوالي مع مقاومة متغيرة، بقياس الجهد على كلٍّ منهما عند 1000 Hz وضبط المقاومة حتى يتساوى الجهدان.',
    objective: 'إيجاد قيمة متسعة موصولة على التوالي مع مقاومة بقياس الجهد على المقاومة والمتسعة عند تردد محدد (f = 1000 Hz).',
    unknowns: [{ id: 'C-A', C: 97.6e-9 }, { id: 'C-B', C: 224.3e-9 }, { id: 'C-C', C: 46.1e-9 }],
    steps: [
      { t: 'صِل دائرة RC على التوالي على لوحة التوصيل.', check: (s) => s.on },
      { t: 'صِل مولّد الدوال بالدائرة واضبط التردد على 1000 Hz.', check: (s) => s.on && s.f === 1000 },
      { t: 'قِس الجهد على المقاومة (VR) وعلى المتسعة (VC) بالفولتميتر.', check: (s) => s.on && s.Rtouched },
      { t: 'غيّر قيمة المقاومة المتغيرة حتى يتساوى الجهد على المتسعة والمقاومة.', check: (s) => s.everBal },
      { t: 'سجّل قيم VR و VC وقيمة R.', check: (s) => s.rows.length >= 1 },
      { t: 'احسب السعة من الجهود المقاسة وقيمة المقاومة، وكرّر لمتسعة أخرى.', check: (s) => new Set(s.rows.map((r) => r.id)).size >= 2 },
    ],
    theory: () => `
      <h2>الهدف (Objective)</h2>
      <p>إيجاد قيمة متسعة موصولة على التوالي مع مقاومة، بقياس الجهد على المقاومة والمتسعة عند تردد محدد (${n('f = 1000 Hz')}).</p>
      <h2>النظرية (Theory)</h2>
      <p>من الأجهزة التي يكون خرجها على شكل تغيّر في السعة: مقياس المستوى السعوي، ومتحسس الإزاحة السعوي، ومقياس الرطوبة السعوي، ومقياس الرطوبة الجوية (Hygrometer) السعوي. لا يمكن قياس السعة بدقة إلا بمصدر متناوب (A.C.).</p>
      ${L.eq(`C = ${L.frac('V<sub>R</sub>', '2π f R V<sub>C</sub>')}`)}
      <h3>اشتقاق المعادلة</h3>
      <p>التيار نفسه ${n('I')} يمر في المقاومة والمتسعة:</p>
      ${L.eq(`V<sub>R</sub> = I R &nbsp;&nbsp;,&nbsp;&nbsp; V<sub>C</sub> = I X<sub>C</sub> = ${L.frac('I', '2πfC')} &nbsp; ⇒ &nbsp; ${L.frac('V<sub>R</sub>', 'V<sub>C</sub>')} = 2πfRC`)}
      <p>ومنها ${n('C = VR / (2πfR·VC)')}. وعند ضبط R حتى ${n('VR = VC')} تصبح ${L.ieq(`C = ${L.frac('1', '2πfR')}`)}.</p>
      <div class="note">الجهد على المتسعة يتأخر 90° عن الجهد على المقاومة، لذلك ${n('Vs = √(VR² + VC²)')}، وعند التساوي يكون كلٌّ منهما ${n('0.707 Vs')} وليس نصفه.</div>`,
    apparatus: (sch) => `
      <h2>مخطط الدائرة (Circuit Diagram)</h2>
      <figure class="figure">${sch}<figcaption>المقاومة المتغيرة R على التوالي مع المتسعة المجهولة C، وفولتميتر على كلٍّ منهما (VR و VC).</figcaption></figure>
      <h2>المواد (Materials)</h2>
      <ul class="app-list">
        <li><b>مولّد دوال</b><span class="en">Function generator (f = 1000 Hz)</span><span>موجة جيبية.</span></li>
        <li><b>مقاومة متغيرة</b><span class="en">Variable resistor</span><span>تُضبط حتى VR = VC.</span></li>
        <li><b>متسعة مجهولة</b><span class="en">Capacitor (unknown value)</span><span>—</span></li>
        <li><b>فولتميتر</b><span class="en">Voltmeter</span><span>AC.</span></li>
        <li><b>لوحة توصيل</b><span class="en">Breadboard</span><span>—</span></li>
        <li><b>أسلاك توصيل</b><span class="en">Connecting wires</span><span>—</span></li>
      </ul>
      <h2>خطوات العمل (Procedure)</h2>
      <ol class="steps">
        <li><div>صِل دائرة RC على التوالي على لوحة التوصيل.</div></li>
        <li><div>صِل مولّد الدوال بالدائرة واضبط التردد على 1000 Hz.</div></li>
        <li><div>استخدم الفولتميتر لقياس الجهد على المقاومة (VR) وعلى المتسعة (VC).</div></li>
        <li><div>غيّر قيمة المقاومة المتغيرة للحصول على الجهد نفسه على المتسعة والمقاومة.</div></li>
        <li><div>سجّل قيم VR و VC.</div></li>
        <li><div>احسب السعة باستخدام الجهود المقاسة وقيمة المقاومة المتغيرة.</div></li>
      </ol>`,
    calcText: (r, real) => `
      <h2>النتائج (Results)${real ? '' : ' — مثال محلول'}</h2>
      ${real ? '' : `<p class="muted">لم تسجّل قراءة بعد، لذلك نعرض مثالاً بالمتسعة ${r.id}. سجّل قراءتك من <a href="#" data-goto-tab="sim">المحاكاة</a> لتظهر أرقامك هنا.</p>`}
      <ul><li>التردد (f): ${n(r.f + ' Hz')}</li><li>المقاومة (R): ${n(r.R + ' Ω')}</li><li>الجهد على المقاومة (VR): ${n(r.VR.toFixed(3) + ' V')}</li><li>الجهد على المتسعة (VC): ${n(r.VX.toFixed(3) + ' V')}</li></ul>
      <h2>الحسابات (Calculations)</h2>
      ${L.eq(`C = ${L.frac('V<sub>R</sub>', '2π f R V<sub>C</sub>')} = ${L.frac(r.VR.toFixed(3), `2π × ${r.f} × ${r.R} × ${r.VX.toFixed(3)}`)} = ${L.si(r.val, 'F', 4)}`)}
      <p>وبما أن ${n('VR ≈ VC')} فإن ${L.ieq(`C ≈ ${L.frac('1', '2πfR')} = ${L.frac('1', `2π × ${r.f} × ${r.R}`)} = ${L.si(1 / (TAU * r.f * r.R), 'F', 4)}`)}</p>
      <h2>الاستنتاج (Conclusion)</h2>
      <p>عند ضبط المقاومة المتغيرة حتى يتساوى الجهدان تصبح المقاومة مساوية لرادة المتسعة ${n('R = XC = 1/(2πfC)')}، فتُحسب السعة من قيمة R والتردد فقط. وُجدت سعة المتسعة ${n(r.id)} مساوية ${n(L.si(r.val, 'F', 4))}. الطريقة بسيطة وتعتمد على دقة R والتردد وقراءة الفولتميتر، ويمكن تطبيقها بالأسلوب نفسه لقياس المحاثة.</p>`,
    discussion: [
      { en: 'Why is the voltage across the resistor and capacitor the same in this experiment?', ar: 'لماذا يتساوى الجهد على المقاومة والمتسعة في هذه التجربة؟',
        a: `<p>لأننا نضبط المقاومة المتغيرة عمداً حتى يتساوى الجهدان. ولأن التيار نفسه يمر في العنصرين، فتساوي الجهدين يعني تساوي الممانعتين ${n('R = XC = 1/(2πfC)')}، فتصبح المعادلة ${n('C = 1/(2πfR)')} ولا تعتمد على دقة معايرة الفولتميتر (يكفي أن يقرأ القيمتين بالجهاز نفسه). كما يجعل التساوي القراءتين في المدى نفسه فيقل خطأ القراءة. ويكون كلٌّ منهما ${n('0.707 Vs')} لا نصف Vs لأن الجهدين متعامدان طورياً.</p>` },
      { en: 'How does the frequency of the input signal affect the measurement?', ar: 'كيف يؤثر تردد إشارة الدخل في القياس؟',
        a: `<p>رادة المتسعة ${n('XC = 1/(2πfC)')} تتناسب <b>عكسياً</b> مع التردد: بزيادة التردد تقل XC فيقل VC ويزداد VR، ونحتاج R أصغر للاتزان. قيمة C المحسوبة لا تتغير لأن التردد يدخل في المعادلة، لكن يجب أن يكون التردد معلوماً بدقة، وضمن مدى تردد الفولتميتر، ومناسباً لقيمة C بحيث تقع R المطلوبة ضمن مدى المقاومة المتغيرة.</p>` },
      { en: 'How can this method be applied to measure unknown inductances?', ar: 'كيف يمكن تطبيق هذه الطريقة لقياس محاثة مجهولة؟',
        a: `<p>نستبدل المتسعة بالملف ونضبط R حتى ${n('VR = VL')}، فتكون ${n('R = |ZL| = √(r² + XL²)')} حيث r مقاومة سلك الملف المقاسة بالأوميتر، ومنها:</p>${L.eq(`L = ${L.frac(L.sqrt('R<sup>2</sup> − r<sup>2</sup>'), '2πf')}`)}<p>وهذه هي التجربة الخامسة في هذا المختبر.</p>` },
    ],
  });
})();
