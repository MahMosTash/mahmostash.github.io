/* Core site behaviour: theme, nav, reveal, teaching heatmap, playground tabs, email copy. */
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ── toast ── */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ── theme ── */
  function setTheme(t) {
    root.dataset.theme = t === 'light' ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
    $('meta[name="theme-color"]').setAttribute('content', root.dataset.theme === 'light' ? '#faf8f4' : '#0b0c0e');
    window.dispatchEvent(new Event('palettechange'));
  }
  $('#theme-toggle').addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* ── nav: border on scroll + active section ── */
  const navEl = $('#nav');
  addEventListener('scroll', () => navEl.classList.toggle('scrolled', scrollY > 8), { passive: true });
  const links = new Map($$('.nav-links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove('active'));
      links.get(e.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section').forEach((s) => secObs.observe(s));

  /* ── reveal on scroll ── */
  if ('IntersectionObserver' in window && !reduceMotion) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el) => ro.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  /* ── teaching heatmap ── */
  const TA = [
    ['Advanced Programming', 'S25', 'TA', 'Dr. Mohammad Amin Fazli'],
    ['Probability & Statistics', 'F25', 'TA', 'Dr. Mahdi Jafari Siavoshani'],
    ['Computer Structure', 'F25', 'TA', 'Dr. Hossein Asadi'],
    ['Probability & Statistics', 'F25', 'TA', 'Dr. Amir Najafi'],
    ['Probability & Statistics', 'S26', 'Head TA', 'Dr. Mahdi Jafari Siavoshani', 'project'],
    ['Machine Learning', 'S26', 'TA', 'Dr. Abolfazl Motahari'],
    ['Artificial Intelligence', 'S26', 'TA', 'Arash Maryoriyad'],
    ['Computer Structure', 'S26', 'TA', 'Dr. Laleh Arshadi'],
    ['Probability & Statistics', 'S26', 'TA', 'Dr. Amir Najafi'],
    ['Machine Learning', 'F26', 'Head TA', 'Dr. Mahdi Jafari Siavoshani'],
    ['Machine Learning', 'F26', 'Head TA', 'Dr. Mahdieh Soleymani', 'practical'],
    ['Probability & Statistics', 'F26', 'Head TA', 'Dr. Abolfazl Motahari', 'practical'],
    ['Sci. & Tech. Presentation', 'F26', 'TA', 'Dr. Laleh Arshadi'],
    ['Artificial Intelligence', 'F26', 'TA', 'Behnam Yousefimehr', 'Amirkabir'],
  ];
  const SEMS = [['S25', 'Spr 25'], ['F25', 'Fall 25'], ['S26', 'Spr 26'], ['F26', 'Fall 26']];
  const COURSES = ['Machine Learning', 'Probability & Statistics', 'Artificial Intelligence', 'Computer Structure', 'Sci. & Tech. Presentation', 'Advanced Programming'];
  const hm = $('#heatmap');
  const tip = $('#heat-tip');
  if (hm) {
    const TIP_DEFAULT = tip.textContent;
    const cell = (cls, text, attrs = {}) => {
      const d = document.createElement('div');
      d.className = cls;
      if (text) d.textContent = text;
      Object.entries(attrs).forEach(([k, v]) => d.setAttribute(k, v));
      return d;
    };
    hm.append(cell('hm-h', '', { role: 'columnheader' }));
    SEMS.forEach(([, label]) => hm.append(cell('hm-h', label, { role: 'columnheader' })));
    COURSES.forEach((course) => {
      hm.append(cell('hm-row', course, { role: 'rowheader', title: course }));
      SEMS.forEach(([sem, semLabel]) => {
        const roles = TA.filter((r) => r[0] === course && r[1] === sem);
        const head = roles.some((r) => r[2] === 'Head TA');
        const desc = roles.length
          ? `${course}, ${semLabel}: ` + roles.map((r) => `${r[2]}${r[4] ? ` (${r[4]})` : ''} with ${r[3]}`).join('; ')
          : `${course}, ${semLabel}: none`;
        const c = cell(`hm-cell${roles.length ? ` lvl-${Math.min(roles.length, 2)}` : ''}${head ? ' head' : ''}`, '',
          { role: 'cell', tabindex: roles.length ? '0' : '-1', 'aria-label': desc });
        roles.forEach(() => c.append(document.createElement('i')));
        const show = () => { tip.textContent = desc; };
        c.addEventListener('mouseenter', show);
        c.addEventListener('focus', show);
        hm.append(c);
      });
    });
    hm.append(cell('hm-total', 'total'));
    SEMS.forEach(([sem]) => hm.append(cell('hm-total', String(TA.filter((r) => r[1] === sem).length))));
    hm.addEventListener('mouseleave', () => { tip.textContent = TIP_DEFAULT; });
  }

  /* ── playground tabs ── */
  const tabs = $$('[role="tab"]');
  function selectTab(id, { focus = false } = {}) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
    window.dispatchEvent(new CustomEvent('tabshown', { detail: id }));
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) selectTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, { focus: true });
    });
  });
  $$('a[data-tab]').forEach((a) => a.addEventListener('click', () => selectTab(a.dataset.tab)));

  /* ── copy email ── */
  const copyBtn = $('#copy-email');
  copyBtn?.addEventListener('click', async () => {
    const email = copyBtn.dataset.email;
    try { await navigator.clipboard.writeText(email); toast(`copied ${email}`); }
    catch { location.href = `mailto:${email}`; }
  });

  /* ── keyboard: ` or Ctrl/⌘+K opens the terminal ── */
  addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if (e.key === '`' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      window.terminal?.open();
    }
  });
  $('#term-open').addEventListener('click', () => window.terminal?.open());

  $('#year').textContent = new Date().getFullYear();

  console.log(
    '%c mm~$ %c hi! you opened devtools, so you\'re my kind of person.\n      press ` on the page for a terminal.',
    'background:#ee8a5c;color:#0b0c0e;font-weight:700;border-radius:4px;padding:2px 4px', 'color:inherit'
  );

  window.site = { setTheme, selectTab, toast };
})();
