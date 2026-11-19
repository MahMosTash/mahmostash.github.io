/* Synthetic market (playground tab): price paths from a 2-regime Markov-switching GARCH(1,1).
   Also renders the prior-family sparklines in the research section. */
(() => {
  // ── seeded RNG (mulberry32) + Box–Muller ──
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = (r) => {
    let u = 0; while (u === 0) u = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  };
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* σ²_t = ω_s + α ε²_{t-1} + β σ²_{t-1},  s ∈ {calm, turbulent} follows a Markov chain */
  const T = 420, N = 22;
  const P_ENTER = 0.008, P_EXIT = 0.045, ALPHA = 0.08, BETA = 0.9, OMEGA = [2e-6, 5e-5];

  function simulate(seed) {
    const r = mulberry32(seed);
    return Array.from({ length: N }, () => {
      let s2 = 1e-4, eps = 0, logp = 0, regime = r() < 0.1 ? 1 : 0;
      const p = new Float32Array(T), reg = new Uint8Array(T), ret = new Float32Array(T);
      for (let t = 0; t < T; t++) {
        if (regime === 0 ? r() < P_ENTER : r() < P_EXIT) regime ^= 1;
        s2 = OMEGA[regime] + ALPHA * eps * eps + BETA * s2;
        eps = Math.sqrt(s2) * gauss(r);
        logp += eps + 0.0002;
        p[t] = logp; reg[t] = regime; ret[t] = eps;
      }
      return { p, reg, ret };
    });
  }

  const canvas = document.getElementById('market-canvas');
  const readout = document.getElementById('market-readout');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const DEFAULT = readout.innerHTML;
    let W = 0, H = 0, paths = [], lo = 0, hi = 1, progress = 0, raf = 0, hoverT = -1, colors = {}, started = false;

    const readColors = () => { colors = { calm: cssVar('--cool'), turb: cssVar('--accent'), text: cssVar('--text') }; };
    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return false;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    function reseed(seed = (Math.random() * 2 ** 31) | 0) {
      paths = simulate(seed);
      lo = Infinity; hi = -Infinity;
      for (const { p } of paths) for (let t = 0; t < T; t++) { lo = Math.min(lo, p[t]); hi = Math.max(hi, p[t]); }
      progress = reduce ? T : 0;
      cancelAnimationFrame(raf);
      loop();
    }
    const PAD = 16;
    const x = (t) => PAD + (t / (T - 1)) * (W - 2 * PAD);
    const y = (v) => PAD + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * PAD);

    function draw() {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const upto = Math.min(T, Math.floor(progress));
      ctx.lineJoin = 'round';
      paths.forEach(({ p, reg }, i) => {
        for (const regime of [0, 1]) {
          ctx.beginPath();
          let pen = false;
          for (let t = 1; t < upto; t++) {
            if (reg[t] === regime) {
              if (!pen) { ctx.moveTo(x(t - 1), y(p[t - 1])); pen = true; }
              ctx.lineTo(x(t), y(p[t]));
            } else pen = false;
          }
          ctx.strokeStyle = regime ? colors.turb : colors.calm;
          ctx.globalAlpha = i === 0 ? 1 : regime ? 0.6 : 0.35;
          ctx.lineWidth = i === 0 ? 2 : 1;
          ctx.stroke();
        }
      });
      if (hoverT >= 0 && hoverT < upto) {
        ctx.globalAlpha = 0.45; ctx.strokeStyle = colors.text; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x(hoverT), 0); ctx.lineTo(x(hoverT), H); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        paths.forEach(({ p, reg }) => {
          ctx.fillStyle = reg[hoverT] ? colors.turb : colors.calm;
          ctx.beginPath(); ctx.arc(x(hoverT), y(p[hoverT]), 2.4, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.globalAlpha = 1;
    }
    function loop() {
      draw();
      if (progress < T) { progress += T / 140; raf = requestAnimationFrame(loop); }
    }
    function start() {
      if (!resize()) return;
      readColors();
      if (!started) { started = true; reseed(20041); } else draw();
    }

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const t = Math.round(((e.clientX - rect.left - PAD) / (W - 2 * PAD)) * (T - 1));
      if (t < 0 || t >= T) return;
      hoverT = t;
      let turb = 0, abs = 0;
      paths.forEach(({ reg, ret }) => { turb += reg[t]; abs += Math.abs(ret[t]); });
      const sigma = (abs / N) * Math.sqrt(Math.PI / 2) * 100; // E|ε| = σ·√(2/π)
      readout.textContent = `t = ${t} · cross-sectional σ̂ ≈ ${sigma.toFixed(2)}% per step · ${turb}/${N} paths in the turbulent regime`;
      draw();
    });
    canvas.addEventListener('mouseleave', () => { hoverT = -1; readout.innerHTML = DEFAULT; draw(); });
    document.getElementById('market-reseed').addEventListener('click', () => { if (!started) start(); else reseed(); });
    addEventListener('tabshown', (e) => { if (e.detail === 'market') start(); });
    addEventListener('palettechange', () => { readColors(); draw(); });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (started && resize()) draw(); }, 120); });

    window.marketSim = { reseed: () => (started ? reseed() : start()) };
  }

  /* ── research sparklines: one sample path per prior family ── */
  function sparkPath(kind, r) {
    const n = 90, xs = [];
    let v = 0, s2 = 1e-4, eps = 0, regime = 0, prev = 0;
    for (let t = 0; t < n; t++) {
      const k = kind === 'mixed' ? ['generic', 'vol', 'regime'][Math.floor(t / 30)] : kind;
      if (k === 'generic') { prev = 0.6 * prev + 0.01 * gauss(r); v += prev * 0.6; }             // AR(1)
      else if (k === 'vol') { s2 = 3e-6 + 0.12 * eps * eps + 0.85 * s2; eps = Math.sqrt(s2) * gauss(r); v += eps; } // GARCH
      else {                                                                                     // regimes + jumps
        if (r() < (regime ? 0.12 : 0.05)) regime ^= 1;
        v += (regime ? 0.03 : 0.006) * gauss(r) + (r() < 0.04 ? (r() < 0.5 ? -1 : 1) * 0.08 : 0);
      }
      xs.push(v);
    }
    const mn = Math.min(...xs), mx = Math.max(...xs);
    return xs.map((v, i) => `${i ? 'L' : 'M'}${(i / (n - 1) * 100).toFixed(1)} ${(22 - ((v - mn) / (mx - mn || 1)) * 20).toFixed(1)}`).join(' ');
  }
  let sparkSeed = (Math.random() * 1e9) | 0;
  function renderSparks() {
    const r = mulberry32(sparkSeed);
    document.querySelectorAll('svg.spark').forEach((svg) => { svg.innerHTML = `<path d="${sparkPath(svg.dataset.kind, r)}"/>`; });
  }
  renderSparks();
  document.querySelectorAll('.prior').forEach((el) => el.addEventListener('click', () => { sparkSeed++; renderSparks(); }));
})();
