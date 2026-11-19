/* "Beat the bandit": you vs. a Thompson-sampling agent on 4 Bernoulli arms. */
(() => {
  const root = document.getElementById('panel-bandit');
  if (!root) return;

  const ARMS = [
    { name: 'Streak bonus', desc: 'finish k rides in a row' },
    { name: 'Tiered goal', desc: 'bigger reward, higher target' },
    { name: 'Peak-hour guarantee', desc: 'minimum earnings at rush hour' },
    { name: 'Weekly cashback', desc: '% of commission back' },
  ];
  const PULLS = 30;

  /* ── sampling helpers ── */
  const gauss = () => { let u = 0; while (u === 0) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
  function gamma(k) { // Marsaglia–Tsang, k ≥ 1 (always true here: Beta(1+s, 1+f))
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = gauss(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
    }
  }
  const betaSample = (a, b) => { const x = gamma(a); return x / (x + gamma(b)); };
  function lgamma(z) { // Lanczos
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1; let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  const betaPdf = (x, a, b) => Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (lgamma(a) + lgamma(b) - lgamma(a + b)));

  /* ── state ── */
  let p, you, agent, left, done;
  const $ = (id) => document.getElementById(id);
  const armsEl = $('arms');

  armsEl.innerHTML = ARMS.map((a, i) => `
    <button class="arm" data-i="${i}" aria-label="Pull arm: ${a.name}">
      <span class="flash"></span>
      <span class="agent-tag">agent ←</span>
      <span class="a-name">${a.name}</span>
      <span class="a-desc">${a.desc}</span>
      <span class="a-row"><span>you</span><span class="a-you">0 / 0</span></span>
      <span class="a-bar"><i></i></span>
      <span class="a-row"><span>agent</span><span class="a-agent">0 / 0</span></span>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path class="post"/><line class="truth" y1="0" y2="40" style="display:none"/></svg>
    </button>`).join('');
  const cards = [...armsEl.querySelectorAll('.arm')];

  function newRound() {
    // spread the arms so there is something to find
    const base = [0.2, 0.38, 0.55, 0.72].sort(() => Math.random() - 0.5);
    p = base.map((b) => Math.min(0.92, Math.max(0.05, b + (Math.random() - 0.5) * 0.12)));
    you = { n: [0, 0, 0, 0], s: [0, 0, 0, 0] };
    agent = { a: [1, 1, 1, 1], b: [1, 1, 1, 1] };
    left = PULLS; done = false;
    cards.forEach((c) => { c.disabled = false; c.classList.remove('agent-picked'); c.querySelector('.truth').style.display = 'none'; });
    $('b-msg').textContent = 'Click an arm to pull. Shaded curves = the agent\'s current beliefs (Beta posteriors).';
    render();
  }

  function render() {
    $('b-left').textContent = left;
    $('b-you').textContent = you.s.reduce((x, y) => x + y, 0);
    $('b-agent').textContent = agent.a.reduce((x, y) => x + y, 0) - 4;
    // posterior curves on a shared y-scale
    const xs = Array.from({ length: 61 }, (_, i) => 0.005 + (i / 60) * 0.99);
    const curves = agent.a.map((a, i) => xs.map((x) => betaPdf(x, a, agent.b[i])));
    const ymax = Math.max(2, ...curves.flat());
    cards.forEach((c, i) => {
      const n = you.n[i], s = you.s[i];
      c.querySelector('.a-you').textContent = `${s} / ${n}`;
      c.querySelector('.a-bar i').style.width = n ? `${(s / n) * 100}%` : '0';
      const an = agent.a[i] + agent.b[i] - 2;
      c.querySelector('.a-agent').textContent = `${agent.a[i] - 1} / ${an}`;
      const d = 'M0 40 ' + xs.map((x, k) => `L${(x * 100).toFixed(1)} ${(40 - (curves[i][k] / ymax) * 38).toFixed(1)}`).join(' ') + ' L100 40 Z';
      c.querySelector('.post').setAttribute('d', d);
    });
  }

  function flash(card, win) {
    const f = card.querySelector('.flash');
    f.textContent = win ? '+1' : '0';
    f.className = `flash ${win ? 'win' : 'lose'}`;
    void f.offsetWidth; // restart animation
    f.classList.add('go');
  }

  function pull(i) {
    if (done || left <= 0) return;
    const r1 = Math.random() < p[i];
    you.n[i]++; you.s[i] += r1;
    flash(cards[i], r1);

    // agent: Thompson sampling
    const samples = agent.a.map((a, k) => betaSample(a, agent.b[k]));
    const j = samples.indexOf(Math.max(...samples));
    const r2 = Math.random() < p[j];
    agent.a[j] += r2; agent.b[j] += 1 - r2;
    cards.forEach((c, k) => c.classList.toggle('agent-picked', k === j));

    left--;
    render();
    if (left === 0) finish();
  }

  function finish() {
    done = true;
    cards.forEach((c, i) => {
      c.disabled = true;
      const line = c.querySelector('.truth');
      line.setAttribute('x1', p[i] * 100); line.setAttribute('x2', p[i] * 100); line.style.display = '';
      c.querySelector('.a-desc').innerHTML = `true rate: <span class="truth-p">${(p[i] * 100).toFixed(0)}%</span>`;
      c.classList.remove('agent-picked');
    });
    const ys = you.s.reduce((x, y) => x + y, 0);
    const as = agent.a.reduce((x, y) => x + y, 0) - 4;
    const best = Math.max(...p) * PULLS;
    const verdict = ys > as ? 'You beat the agent. Nice exploration instincts.'
      : ys === as ? 'A draw. Respectable.'
      : 'The agent wins. Posterior sampling is hard to beat.';
    $('b-msg').innerHTML = `${verdict} Oracle (always best arm) expects <b>${best.toFixed(1)}</b>. Your regret ≈ ${(best - ys).toFixed(1)}, agent's ≈ ${(best - as).toFixed(1)}.`;
  }

  cards.forEach((c, i) => c.addEventListener('click', () => pull(i)));
  document.getElementById('b-reset').addEventListener('click', () => {
    cards.forEach((c, i) => { c.querySelector('.a-desc').textContent = ARMS[i].desc; });
    newRound();
  });
  newRound();
})();
