/* App shell: home page, experiment pages with tabs, routing on plain #names. */
(function () {
  'use strict';
  const L = window.Lab;
  const main = document.getElementById('app');
  const EXPS = L.experiments.slice().sort((a, b) => a.num - b.num);
  const GROUPS = { meters: 'أجهزة القياس', resistance: 'المقاومة', ac: 'التيار المتناوب', transducers: 'المتحسسات' };
  const TABS = [
    { k: 'sim', t: 'المختبر' },
    { k: 'theory', t: 'الشرح' },
    { k: 'calc', t: 'الحسابات' },
    { k: 'discussion', t: 'المناقشة' },
  ];

  const root = document.documentElement;
  const savedTheme = L.store.get('theme', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  document.getElementById('theme-btn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    L.store.set('theme', root.dataset.theme);
  });

  const navList = document.getElementById('nav-list'), navMenu = document.getElementById('nav-menu');
  navList.innerHTML = EXPS.map((e) => `<a href="#${e.id}" data-id="${e.id}"><span class="n">${e.num}</span><span>${e.title}</span></a>`).join('');
  navList.addEventListener('click', () => navMenu.removeAttribute('open'));
  document.addEventListener('click', (e) => { if (!navMenu.contains(e.target)) navMenu.removeAttribute('open'); });

  function renderHome() {
    document.title = 'مختبر القياسات الكهربائية';
    main.innerHTML = `
    <section class="hero"><div class="wrap">
      <div class="eyebrow">Electrical Measurements · 3D Lab</div>
      <h1>مختبر القياسات الكهربائية</h1>
      <p class="lead">طاولة مختبر ثلاثية الأبعاد: وصّل الأسلاك بنفسك، شغّل الأجهزة، وسجّل القراءات.</p>
    </div></section>
    <section class="wrap cards">
      ${EXPS.map((e) => `<a class="xcard" href="#${e.id}">
        <span class="xnum">${e.num}</span>
        <span class="xbody"><b>${e.title}</b><small>${e.summary}</small></span>
        <span class="xtag">${GROUPS[e.group] || ''}</span>
      </a>`).join('')}
    </section>`;
  }

  let currentShow = null;
  function renderExp(exp) {
    document.title = `${exp.title} · مختبر القياسات`;
    const idx = EXPS.indexOf(exp), prev = EXPS[idx - 1], next = EXPS[idx + 1];
    main.innerHTML = `
    <section class="exp-head"><div class="wrap">
      <div class="exp-kicker"><a class="crumb" href="#home">التجارب</a><span>›</span><span class="badge">التجربة ${exp.num}</span><span class="en-title">${exp.sheet}</span></div>
      <h1>${exp.title}</h1>
      <p class="obj">${exp.goal}</p>
    </div></section>
    <div class="tabs-bar"><div class="wrap"><div class="tabs" role="tablist" aria-label="أقسام التجربة">
      ${TABS.map((t) => `<button class="tab" role="tab" id="tab-${t.k}" aria-controls="panel-${t.k}" data-k="${t.k}">${t.t}</button>`).join('')}
    </div></div></div>
    <div class="wrap panels">${TABS.map((t) => `<section class="panel" role="tabpanel" id="panel-${t.k}" aria-labelledby="tab-${t.k}" hidden></section>`).join('')}</div>
    <nav class="wrap pager" aria-label="التنقل بين التجارب">
      ${prev ? `<a href="#${prev.id}"><small>→ السابقة</small>${prev.title}</a>` : '<span></span>'}
      ${next ? `<a href="#${next.id}" style="text-align:left"><small>التالية ←</small>${next.title}</a>` : '<span></span>'}
    </nav>`;
    const panels = {};
    TABS.forEach((t) => { panels[t.k] = L.$('#panel-' + t.k); });
    panels.theory.innerHTML = exp.theory();
    panels.discussion.innerHTML = `<div class="prose">${exp.discussion.map((q, i) => `
      <details class="qa"><summary><span class="qn">${i + 1}</span><span class="qt"><b>${q.ar}</b><span class="en">${q.en}</span></span></summary><div class="ans">${q.a}</div></details>`).join('')}</div>`;
    const simHost = document.createElement('div');
    panels.sim.appendChild(simHost);
    const tabs = L.$$('.tab', main);
    const show = (k) => {
      tabs.forEach((b) => { const on = b.dataset.k === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      TABS.forEach((t) => { panels[t.k].hidden = t.k !== k; });
      if (k === 'calc') panels.calc.innerHTML = `<div class="prose">${exp.calc()}</div>`;
      L.store.set('tab:' + exp.id, k);
      window.dispatchEvent(new Event('resize'));
    };
    tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.k)));
    L.$('.tabs', main).addEventListener('keydown', (e) => {
      const i = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const j = e.key === 'ArrowLeft' ? Math.min(tabs.length - 1, i + 1) : e.key === 'ArrowRight' ? Math.max(0, i - 1) : -1;
      if (j >= 0) { e.preventDefault(); show(tabs[j].dataset.k); tabs[j].focus(); }
    });
    show('sim');
    exp.mount(simHost);
    currentShow = show;
  }
  main.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto-tab]');
    if (go && currentShow) { e.preventDefault(); currentShow(go.dataset.gotoTab); window.scrollTo({ top: 0 }); }
  });

  function route() {
    L.runCleanup();
    currentShow = null;
    const id = decodeURIComponent(location.hash.slice(1));
    const exp = EXPS.find((e) => e.id === id);
    L.$$('a', navList).forEach((a) => a.toggleAttribute('aria-current', a.dataset.id === id));
    if (exp) renderExp(exp); else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
