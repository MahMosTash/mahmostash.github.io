/* A tiny fake shell. Press ` (backtick) or Ctrl/⌘+K anywhere on the page. */
(() => {
  const dlg = document.getElementById('terminal');
  if (!dlg) return;
  const out = document.getElementById('term-out');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-input');

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LINKS = {
    github: 'https://github.com/mahmostash',
    linkedin: 'https://www.linkedin.com/in/mahdyar-mostashar',
    cv: 'assets/Mahdyar_Mostashar_CV.pdf',
    email: 'mailto:MahdyarMostasharH@gmail.com',
  };
  const SECTIONS = ['questions', 'research', 'work', 'teaching', 'projects', 'playground', 'about', 'contact'];

  const FILES = {
    'about.txt': `Final-year CE @ Sharif University of Technology, minor in Economics.
I use ML to understand how people make economic decisions,
and how the systems we build end up changing them.
Builder by reflex, TA by passion, trader since high school.`,
    'questions.md': `Q1  When a system makes decisions, how do people respond?
Q2  Can AI help people decide better, not just predict better?
Q3  Can a model learn markets from markets that never existed?
Q4  What do economic shocks do to the choices families make?`,
    'now.txt': `<span class="hl">●</span> researching  synthetic pretraining for financial TS foundation models (Dr. Ali Habibnia, Virginia Tech)
<span class="hl">●</span> shipping     Associate Data Product Manager @ Snapp!
<span class="wm">●</span> teaching     Head TA ×3: ML, ML (practical), P&amp;S (practical)
<span class="hl">●</span> applying     Master's programs &amp; research internships
<span class="dim">●</span> learning     German`,
    'research.md': `# interests
- applied machine learning
- data-driven decision making
- computational economics

# current
1. Can compact time-series foundation models pretrained ONLY on simulated
   processes forecast realized volatility zero-shot on real markets?
   priors: generic | volatility-specific | regime-and-tail | mixed`,
    'teaching.log': `[Fall 26]   HEAD  Machine Learning                (Jafari Siavoshani)
[Fall 26]   HEAD  Machine Learning, practical     (Soleymani)
[Fall 26]   HEAD  Prob & Stats, practical         (Motahari)
[Fall 26]   TA    Sci. & Tech. Presentation       (Arshadi)
[Fall 26]   TA    Artificial Intelligence @ AUT   (Yousefimehr)
[Spr 26]    HEAD  Prob & Stats, project           (Jafari Siavoshani)
[Spr 26]    TA    ML · AI · Comp. Structure · P&amp;S
[Fall 25]   TA    P&amp;S ×2 · Comp. Structure
[Spr 25]    TA    Advanced Programming            (Fazli)
<span class="dim">-- 14 roles, 4 as head TA. would do it again.</span>`,
    'contact.txt': `email     <a href="${LINKS.email}">MahdyarMostasharH@gmail.com</a>
github    <a href="${LINKS.github}" target="_blank" rel="noopener">github.com/mahmostash</a>
linkedin  <a href="${LINKS.linkedin}" target="_blank" rel="noopener">linkedin.com/in/mahdyar-mostashar</a>`,
  };
  const PROJECTS = ['finformer', 'inflation-school-attendance', 'fpl-decision-model', 'ops-assistant', 'gpu-monitor', 'mips-cpu', 'neo-git', 'area-measurement-cv', 'justiceflow'];

  const NEOFETCH = `<span class="hl">   __  __ __  __ </span>   <span class="hl">mahdyar</span>@<span class="hl">sharif</span>
<span class="hl">  |  \\/  |  \\/  |</span>   ──────────────
<span class="hl">  | |\\/| | |\\/| |</span>   <span class="wm">OS</span>        Computer Engineering (BS) + Economics (minor)
<span class="hl">  | |  | | |  | |</span>   <span class="wm">Host</span>      Sharif University of Technology
<span class="hl">  |_|  |_|_|  |_|</span>   <span class="wm">Kernel</span>    applied ML × computational economics
                    <span class="wm">Uptime</span>    at Sharif since Sep 2023
                    <span class="wm">Shell</span>     python · pytorch · sql · c · docker
                    <span class="wm">Processes</span> 1 research · 1 job · 5 TA roles · 1 Master's application
                    <span class="wm">GPA</span>       18.71 / 20  (major 19.36)
                    <span class="wm">Locale</span>    fa_IR · en_US · de_DE (beta)`;

  function print(html, cls = '') {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function goTo(id) {
    close();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  const COMMANDS = {
    help: () => print(`available commands:
  <span class="hl">whoami</span>             who is this guy
  <span class="hl">neofetch</span>           system info, but it's me
  <span class="hl">ls</span> [projects]       list files / projects
  <span class="hl">cat</span> &lt;file&gt;         read a file   (try: cat questions.md)
  <span class="hl">cd</span> &lt;section&gt;       jump to a section on the page
  <span class="hl">theme</span> dark|light
  <span class="hl">cv</span> · <span class="hl">github</span> · <span class="hl">linkedin</span> · <span class="hl">email</span>
  <span class="hl">clear</span> · <span class="hl">history</span> · <span class="hl">exit</span>
<span class="dim">tab completes · ↑/↓ for history · there may be a few undocumented ones</span>`),
    whoami: () => print(FILES['about.txt']),
    neofetch: () => print(NEOFETCH),
    ls: (a) => {
      if (a[0] && a[0].replace(/\/$/, '') === 'projects') return print(PROJECTS.map((p) => `<span class="hl">${p}/</span>`).join('  '));
      print(Object.keys(FILES).join('  ') + '  <span class="hl">projects/</span>');
    },
    cat: (a) => {
      if (!a[0]) return print('cat: missing file operand. try <span class="hl">ls</span>', 'err');
      const f = FILES[a[0]];
      if (f) return print(f);
      if (a[0].startsWith('projects')) return print(`cat: ${esc(a[0])}: Is a directory. try <span class="hl">cd projects</span>`, 'err');
      print(`cat: ${esc(a[0])}: No such file or directory`, 'err');
    },
    cd: (a) => {
      const t = (a[0] || '').replace(/[/~.]/g, '');
      if (!t) return print('already home.', 'dim');
      if (SECTIONS.includes(t)) return goTo(t);
      print(`cd: ${esc(a[0])}: No such section. options: ${SECTIONS.join(' ')}`, 'err');
    },
    theme: (a) => {
      const t = a[0] || (document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      if (!['dark', 'light'].includes(t)) return print('usage: theme dark|light', 'err');
      window.site.setTheme(t); print(`theme → ${t}`, 'dim');
    },
    cv: () => { window.open(LINKS.cv, '_blank', 'noopener'); print('opening CV…', 'dim'); },
    github: () => { window.open(LINKS.github, '_blank', 'noopener'); print('opening github…', 'dim'); },
    linkedin: () => { window.open(LINKS.linkedin, '_blank', 'noopener'); print('opening linkedin…', 'dim'); },
    email: () => print(FILES['contact.txt']),
    clear: () => { out.innerHTML = ''; },
    history: () => print(history.map((h, i) => `${String(i + 1).padStart(3)}  ${esc(h)}`).join('\n') || '(empty)', 'dim'),
    exit: () => close(),
    echo: (a) => print(esc(a.join(' '))),
    date: () => print(new Date().toString()),
    pwd: () => print('/home/mahdyar'),
    // undocumented
    sudo: (a) => {
      if (a.join(' ').toLowerCase().replace(/\s+/g, ' ') === 'hire mahdyar') {
        print('[sudo] password for recruiter: ********\n<span class="hl">access granted.</span> redirecting to contact…');
        setTimeout(() => goTo('contact'), 900);
      } else print('mahdyar is not in the sudoers file. This incident will be reported.', 'err');
    },
    rm: (a) => print(a.includes('-rf') ? 'nice try. 🙂' : 'rm: permission denied', 'err'),
    vim: () => print('you are now trapped in vim. just kidding, type <span class="hl">exit</span>.', 'dim'),
    coffee: () => print('☕ brewing… this is how the TA solutions get written at 2am.', 'dim'),
    bandit: () => { window.site.selectTab('bandit'); goTo('playground'); },
    crowd: () => { window.site.selectTab('crowd'); goTo('playground'); },
    market: () => { window.site.selectTab('market'); goTo('playground'); },
    music: () => print('🎸 rock &amp; metal, loud. ask me for recommendations.', 'dim'),
    trade: () => print('been trading since high school. it\'s what got me into economics.\n<span class="dim">this is not financial advice. neither is anything else here.</span>'),
  };
  COMMANDS.open = COMMANDS.cd;
  COMMANDS.goto = COMMANDS.cd;
  COMMANDS.ll = COMMANDS.ls;
  COMMANDS.man = COMMANDS.help;

  const history = [];
  let hIdx = 0;

  function run(line) {
    print(`<span class="hl">❯</span> <span class="cmd">${esc(line)}</span>`);
    const [cmd, ...args] = line.trim().split(/\s+/);
    if (!cmd) return;
    history.push(line); hIdx = history.length;
    const fn = COMMANDS[cmd.toLowerCase()];
    if (fn) fn(args);
    else print(`command not found: ${esc(cmd)}. type <span class="hl">help</span>`, 'err');
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; run(v); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.value.split(' ');
      const last = parts[parts.length - 1];
      const pool = parts.length === 1
        ? Object.keys(COMMANDS)
        : parts[0] === 'cat' ? Object.keys(FILES)
        : ['cd', 'open', 'goto'].includes(parts[0]) ? SECTIONS
        : parts[0] === 'theme' ? ['dark', 'light'] : [];
      const hits = pool.filter((c) => c.startsWith(last));
      if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + (parts.length === 1 ? ' ' : ''); }
      else if (hits.length > 1) print(hits.join('  '), 'dim');
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); }); // backdrop
  document.getElementById('term-close').addEventListener('click', () => close());

  let greeted = false;
  function open() {
    if (dlg.open) return;
    dlg.showModal();
    if (!greeted) {
      greeted = true;
      print(`<span class="dim">last login: ${new Date().toDateString()} on ttys000</span>`);
      print(`welcome. type <span class="hl">help</span> to see what I can do, or try <span class="hl">neofetch</span>.`);
    }
    setTimeout(() => input.focus(), 10);
  }
  function close() { if (dlg.open) dlg.close(); }

  window.terminal = { open, close, run };
})();
