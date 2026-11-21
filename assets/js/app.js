/* App shell: home page (lab-manual contents), experiment pages with tabs, routing on plain #names. */
(function () {
  'use strict';
  const L = window.Lab;
  const main = document.getElementById('app');
  const EXPS = L.experiments.slice().sort((a, b) => a.num - b.num);

  const GROUPS = [
    { k: 'meters', t: 'تصميم أجهزة القياس', d: 'تحويل جلفانوميتر حساس إلى فولتميتر وأميتر متعدد المديات.' },
    { k: 'resistance', t: 'قياس المقاومة', d: 'شفرة الألوان، الأوميتر، قنطرة ويتستون، وتأثير تحميل الفولتميتر.' },
    { k: 'ac', t: 'القياس بالتيار المتناوب', d: 'إيجاد المحاثة والسعة المجهولة بطريقة تساوي الجهدين عند 1 kHz.' },
    { k: 'transducers', t: 'المتحسّسات', d: 'تحويل الإزاحة الخطية إلى إشارة كهربائية.' },
  ];

  const TABS = [
    { k: 'sim', t: 'المحاكاة', i: '<path d="M4 18h16M6 18V9m4 9V5m4 13v-7m4 7V8"/>' },
    { k: 'theory', t: 'النظرية والهدف', i: '<path d="M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h6"/>' },
    { k: 'apparatus', t: 'الأجهزة والدائرة', i: '<circle cx="12" cy="12" r="7"/><path d="M12 12l4-4M5 12H2m20 0h-3"/>' },
    { k: 'calc', t: 'الحسابات والنتائج', i: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2"/>' },
    { k: 'discussion', t: 'المناقشة', i: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 9h6M9 12h4"/>' },
  ];

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const savedTheme = L.store.get('theme', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  document.getElementById('theme-btn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    L.store.set('theme', root.dataset.theme);
  });

  /* ---------- nav menu ---------- */
  const navList = document.getElementById('nav-list');
  const navMenu = document.getElementById('nav-menu');
  navList.innerHTML = EXPS.map((e) => `<a href="#${e.id}" data-id="${e.id}"><span class="n">${e.num}</span><span>${e.title}</span></a>`).join('');
  navList.addEventListener('click', () => navMenu.removeAttribute('open'));
  document.addEventListener('click', (e) => { if (!navMenu.contains(e.target)) navMenu.removeAttribute('open'); });

  /* ---------- home ---------- */
  function renderHome() {
    document.title = 'مختبر القياسات الكهربائية';
    main.innerHTML = `
    <section class="hero"><div class="wrap hero-grid">
      <div>
        <div class="eyebrow">Electrical Measurements · Virtual Lab</div>
        <h1>مختبر القياسات الكهربائية</h1>
        <p class="lead">سبع تجارب من مختبر القياسات، لكل منها محاكاة تفاعلية تعمل بمعادلات ورقة التجربة نفسها: تدير المقابض وتقرأ المؤشرات وتسجّل النتائج في الجدول، ثم تراجع النظرية والحسابات وأجوبة أسئلة المناقشة.</p>
        <div class="hero-cta"><a class="btn primary" href="#${EXPS[0].id}">ابدأ بالتجربة الأولى</a><a class="btn" href="#contents">فهرس التجارب</a></div>
      </div>
      <div class="hero-meter" aria-label="جلفانوميتر تجريبي">
        <div class="inst">${L.ihead('جلفانوميتر المختبر', 'Galvanometer · 50 µA · 6000 Ω')}<div id="hero-meter"></div>
          <div class="ctl" id="hero-ctl"></div>
        </div>
        <div class="hero-facts">
          <div><b>7</b>تجارب بمحاكاة كاملة</div>
          <div><b>0.3 V</b>انحراف كامل للجلفانوميتر</div>
          <div><b>1 kHz</b>تردد قياس L و C</div>
        </div>
      </div>
    </div></section>
    <section class="toc" id="contents"><div class="wrap">
      <h2>فهرس التجارب</h2>
      ${GROUPS.map((g) => {
        const list = EXPS.filter((e) => e.group === g.k);
        if (!list.length) return '';
        return `<div class="toc-group"><header><h3>${g.t}</h3><p>${g.d}</p></header>${list.map((e) => `
          <a class="toc-row" href="#${e.id}">
            <div class="toc-num">${String(e.num).padStart(2, '0')}<small>EXP</small></div>
            <div class="toc-main"><h3>${e.title}</h3><span class="en">${e.en}</span><p>${e.summary}</p><div class="tags">${e.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div></div>
            <span class="toc-go">افتح التجربة</span>
          </a>`).join('')}</div>`;
      }).join('')}
    </div></section>
    <section class="howto"><div class="wrap">
      <h2>طريقة استخدام المختبر</h2>
      <ol>
        <li><b>اقرأ النظرية والدائرة</b><span>كل تجربة تبدأ بالهدف والقانون المستخدم وقائمة الأجهزة ومخطط الدائرة كما في ورقة المختبر.</span></li>
        <li><b>نفّذ الخطوات في المحاكاة</b><span>قائمة خطوات العمل بجانب الطاولة تتأشر تلقائياً عند إنجاز كل خطوة. اضغط «سجّل القراءة» لملء جدول النتائج.</span></li>
        <li><b>راجع الحسابات وأجب عن الأسئلة</b><span>تبويب الحسابات يعرض الحل خطوة بخطوة بقراءاتك أنت، وتبويب المناقشة يضم أجوبة نموذجية لكل سؤال.</span></li>
      </ol>
    </div></section>`;
    const meter = L.AnalogMeter(L.$('#hero-meter'), {
      unit: 'V', brand: 'DC VOLTMETER · 20 kΩ/V',
      scales: [{ ticks: L.linTicks(0, 12, 3, 0.5), name: 'V' }, { ticks: L.linTicks(0, 50, 10, 5), name: 'µA' }],
    });
    L.Control(L.$('#hero-ctl'), {
      id: 'hero-v', label: 'الجهد المسلّط', unit: 'V', min: 0, max: 13, value: 7.5, step: 0.05, decimals: 2, size: 54, steps: [-1, 1],
      onInput: (v) => meter.set(v / 12),
    });
    setTimeout(() => meter.set(7.5 / 12), 250);
  }

  /* ---------- experiment page ---------- */
  function renderExp(exp) {
    document.title = `${exp.title} · مختبر القياسات`;
    const idx = EXPS.indexOf(exp), prev = EXPS[idx - 1], next = EXPS[idx + 1];
    const group = GROUPS.find((g) => g.k === exp.group);
    main.innerHTML = `
    <section class="exp-head"><div class="wrap">
      <a class="crumb" href="#home">→ فهرس التجارب</a>
      <div class="exp-kicker"><span class="badge">التجربة ${exp.num}</span><span>${group ? group.t : ''}</span></div>
      <h1>${exp.title}</h1>
      <div class="en-title">${exp.sheet}</div>
      <p class="obj">${exp.objectiveShort || exp.summary}</p>
    </div></section>
    <div class="tabs-bar"><div class="wrap"><div class="tabs" role="tablist" aria-label="أقسام التجربة">
      ${TABS.map((t) => `<button class="tab" role="tab" id="tab-${t.k}" aria-controls="panel-${t.k}" data-k="${t.k}"><svg viewBox="0 0 24 24" aria-hidden="true">${t.i}</svg>${t.t}</button>`).join('')}
    </div></div></div>
    <div class="wrap panels">
      ${TABS.map((t) => `<section class="panel" role="tabpanel" id="panel-${t.k}" aria-labelledby="tab-${t.k}" hidden></section>`).join('')}
    </div>
    <nav class="wrap pager" aria-label="التنقل بين التجارب">
      ${prev ? `<a href="#${prev.id}"><small>→ التجربة السابقة</small>${prev.title}</a>` : '<span></span>'}
      ${next ? `<a href="#${next.id}" style="text-align:left"><small>التجربة التالية ←</small>${next.title}</a>` : '<span></span>'}
    </nav>`;

    const panels = {};
    TABS.forEach((t) => { panels[t.k] = L.$('#panel-' + t.k); });
    // static content
    panels.theory.innerHTML = `<div class="prose">${typeof exp.theory === 'function' ? exp.theory() : exp.theory}</div>`;
    panels.apparatus.innerHTML = `<div class="prose">${typeof exp.apparatus === 'function' ? exp.apparatus() : exp.apparatus}</div>`;
    panels.discussion.innerHTML = renderDiscussion(exp);
    const simHost = document.createElement('div');
    panels.sim.appendChild(simHost);
    exp.mount(simHost);

    const tabs = L.$$('.tab', main);
    const show = (k) => {
      tabs.forEach((b) => { const on = b.dataset.k === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      TABS.forEach((t) => { panels[t.k].hidden = t.k !== k; });
      if (k === 'calc') panels.calc.innerHTML = `<div class="prose">${exp.calc()}</div>`;
      L.store.set('tab:' + exp.id, k);
      window.dispatchEvent(new Event('resize'));
    };
    tabs.forEach((b) => b.addEventListener('click', () => {
      show(b.dataset.k);
      const bar = L.$('.tabs-bar');
      if (bar && bar.getBoundingClientRect().top > 80) return;
      window.scrollTo({ top: L.$('.exp-head').offsetHeight - 4, behavior: L.reduced ? 'auto' : 'smooth' });
    }));
    L.$('.tabs', main).addEventListener('keydown', (e) => {
      const i = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      let j = -1;
      if (e.key === 'ArrowLeft') j = Math.min(tabs.length - 1, i + 1);
      if (e.key === 'ArrowRight') j = Math.max(0, i - 1);
      if (j >= 0) { e.preventDefault(); show(tabs[j].dataset.k); tabs[j].focus(); }
    });
    // open the tab the viewer used last for this experiment, otherwise the simulation
    const last = L.store.get('tab:' + exp.id, 'sim');
    show(TABS.some((t) => t.k === last) ? last : 'sim');
    currentShow = show;
  }
  let currentShow = null;
  main.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto-tab]');
    if (go && currentShow) { e.preventDefault(); currentShow(go.dataset.gotoTab); window.scrollTo({ top: 0 }); }
  });

  function renderDiscussion(exp) {
    return `<div class="prose">
      <div class="qa-tools"><button type="button" class="btn small" data-qa="open">إظهار كل الأجوبة</button><button type="button" class="btn small ghost" data-qa="close">إخفاء الأجوبة</button></div>
      ${exp.discussion.map((q, i) => `
        <details class="qa">
          <summary><span class="qn">${i + 1}</span><span class="qt"><b>${q.ar}</b><span class="en">${q.en}</span></span></summary>
          <div class="ans">${q.a}</div>
        </details>`).join('')}
    </div>`;
  }
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qa]');
    if (!b) return;
    L.$$('.qa', main).forEach((d) => { d.open = b.dataset.qa === 'open'; });
  });

  /* ---------- routing ---------- */
  function route() {
    L.runCleanup();
    const id = decodeURIComponent(location.hash.slice(1));
    const exp = EXPS.find((e) => e.id === id);
    L.$$('a', navList).forEach((a) => a.toggleAttribute('aria-current', a.dataset.id === id));
    if (exp) renderExp(exp);
    else {
      renderHome();
      if (id === 'contents') { const t = L.$('#contents'); if (t) t.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
