/* Shows my own NYT Wordle results (spoiler-free) from assets/data/wordle.json.
   Wordle is a New York Times game; this only displays results, it is not a copy of the game.
   Update the data with:  python3 tools/wordle.py  (see README). */
(() => {
  const box = document.getElementById('wordle');
  if (!box) return;
  const $ = (id) => document.getElementById(id);
  const TILE = { g: 'correct', y: 'present', b: 'absent' };
  const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const todayISO = () => {
    // Wordle days follow local time; compare in the visitor's local date.
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  fetch('assets/data/wordle.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const hasStats = data && data.stats && data.stats.played;
      if (!data || (!hasStats && !data.latest)) return; // nothing real yet → stay hidden
      render(data);
      box.hidden = false;
    })
    .catch(() => {});

  function render({ stats = {}, latest, updated }) {
    const today = $('wordle-title').parentElement;
    if (!latest) { today.hidden = true; } else renderLatest(latest);
    renderStats(stats, latest, updated);
  }

  function renderLatest(latest) {
    const rows = latest.rows || [];
    const guesses = latest.guesses || rows.length;
    const isToday = latest.date === todayISO();
    $('wordle-title').innerHTML =
      `<b>${isToday ? 'Today' : fmtDate(latest.date)}</b> · Wordle ${Number(latest.puzzle).toLocaleString('en-US')} · ` +
      `<b>${latest.solved ? `${guesses}/6` : 'X/6'}</b>${latest.hard ? ' <span class="faint">(hard mode)</span>' : ''}`;

    const grid = $('wordle-grid');
    if (!rows.length) { grid.hidden = true; return; }
    grid.setAttribute('aria-label', latest.solved ? `Solved in ${guesses} guesses` : 'Not solved');
    grid.innerHTML = rows.map((row) =>
      `<div class="w-row">${[...row].map((c, i) => `<i class="w-tile ${TILE[c] || 'absent'}" style="--d:${i * 60}ms"></i>`).join('')}</div>`).join('');

  }

  function renderStats(stats, latest, updated) {
    const nums = [
      ['Played', stats.played],
      ['Win %', stats.winPct],
      ['Current streak', stats.currentStreak],
      ['Max streak', stats.maxStreak],
    ].filter(([, v]) => v !== null && v !== undefined);
    $('wordle-nums').innerHTML = nums.map(([k, v]) => `<div><dd>${v}</dd><dt>${k}</dt></div>`).join('');

    const dist = Array.isArray(stats.distribution) ? stats.distribution : [];
    const max = Math.max(1, ...dist);
    const mine = latest && latest.solved ? (latest.guesses || (latest.rows || []).length) : -1;
    $('wordle-dist').innerHTML = dist.length
      ? dist.map((n, i) => `<div class="w-bar${i + 1 === mine ? ' me' : ''}"><span>${i + 1}</span><i style="width:${Math.max(6, (n / max) * 100)}%"><b>${n}</b></i></div>`).join('')
      : '';
    if (!dist.length) $('wordle-dist').previousElementSibling.hidden = true;

    if (updated) $('wordle-updated').textContent = `Stats updated ${fmtDate(updated)}.`;
  }
})();
