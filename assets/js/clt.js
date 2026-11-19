/* Central Limit Theorem playground: histogram of sample means vs. N(μ, σ²/n). */
(() => {
  const root = document.getElementById('panel-clt');
  if (!root) return;

  const gauss = () => { let u = 0; while (u === 0) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
  const DIST = {
    exponential: { sample: () => -Math.log(1 - Math.random()), mu: 1, sd: 1, lo: 0, hi: 4 },
    uniform:     { sample: () => Math.random(), mu: 0.5, sd: Math.sqrt(1 / 12), lo: 0, hi: 1 },
    bimodal:     { sample: () => (Math.random() < 0.5 ? -2 : 2) + 0.5 * gauss(), mu: 0, sd: Math.sqrt(4.25), lo: -4, hi: 4 },
    die:         { sample: () => 1 + Math.floor(6 * Math.random()), mu: 3.5, sd: Math.sqrt(35 / 12), lo: 0.5, hi: 6.5 },
    coin:        { sample: () => (Math.random() < 0.1 ? 1 : 0), mu: 0.1, sd: 0.3, lo: -0.05, hi: 1.05 },
    cauchy:      { sample: () => Math.tan(Math.PI * (Math.random() - 0.5)), mu: null, sd: null, lo: -8, hi: 8 },
  };
  const BINS = 64, MAX_MEANS = 6000;

  const $ = (id) => document.getElementById(id);
  const sel = $('clt-dist'), nIn = $('clt-n'), nOut = $('clt-n-out'), statsEl = $('clt-stats');
  const srcC = $('clt-src'), meanC = $('clt-means'), streamBtn = $('clt-stream');
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  let D, n, counts, total, sum, sumsq, outside, streaming = false, raf = 0, srcCounts;

  function binOf(x) { return Math.floor(((x - D.lo) / (D.hi - D.lo)) * BINS); }

  function setup() {
    D = DIST[sel.value];
    n = +nIn.value; nOut.textContent = n;
    counts = new Float64Array(BINS); total = 0; sum = 0; sumsq = 0; outside = 0;
    srcCounts = new Float64Array(BINS);
    for (let i = 0; i < 30000; i++) { const b = binOf(D.sample()); if (b >= 0 && b < BINS) srcCounts[b]++; }
    stop();
    drawAll();
  }

  function addMeans(k) {
    for (let j = 0; j < k && total < MAX_MEANS; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += D.sample();
      const m = s / n;
      total++; sum += m; sumsq += m * m;
      const b = binOf(m);
      if (b >= 0 && b < BINS) counts[b]++; else outside++;
    }
    drawAll();
    if (total >= MAX_MEANS) stop();
  }

  function sizeCanvas(c) {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  function drawHist(canvas, cnts, tot, curve) {
    const { ctx, w, h } = sizeCanvas(canvas);
    const accent = css('--cool'), warm = css('--accent'), faint = css('--faint');
    const pad = { l: 6, r: 6, t: 8, b: 18 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const bw = (D.hi - D.lo) / BINS;
    const dens = Array.from(cnts, (c) => (tot ? c / (tot * bw) : 0));
    let ymax = Math.max(...dens);
    const cx = Array.from({ length: 200 }, (_, i) => D.lo + (i / 199) * (D.hi - D.lo));
    const cy = curve ? cx.map(curve) : null;
    if (cy) ymax = Math.max(ymax, ...cy);
    ymax = ymax * 1.08 || 1;

    ctx.clearRect(0, 0, w, h);
    // axis
    ctx.strokeStyle = faint; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ph + 0.5); ctx.lineTo(pad.l + pw, pad.t + ph + 0.5); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = faint; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left'; ctx.fillText(+D.lo.toFixed(2), pad.l, h - 4);
    ctx.textAlign = 'right'; ctx.fillText(+D.hi.toFixed(2), pad.l + pw, h - 4);
    if (D.mu !== null) {
      ctx.textAlign = 'center';
      const mx = pad.l + ((D.mu - D.lo) / (D.hi - D.lo)) * pw;
      ctx.fillText('μ', mx, h - 4);
    }
    // bars
    ctx.fillStyle = accent; ctx.globalAlpha = 0.75;
    const bpx = pw / BINS;
    dens.forEach((d, i) => {
      if (!d) return;
      const bh = (d / ymax) * ph;
      ctx.fillRect(pad.l + i * bpx + 0.5, pad.t + ph - bh, Math.max(1, bpx - 1), bh);
    });
    ctx.globalAlpha = 1;
    // theory curve
    if (cy) {
      ctx.strokeStyle = warm; ctx.lineWidth = 2;
      ctx.beginPath();
      cx.forEach((x, i) => {
        const px = pad.l + ((x - D.lo) / (D.hi - D.lo)) * pw, py = pad.t + ph - (cy[i] / ymax) * ph;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
    }
  }

  function drawAll() {
    drawHist(srcC, srcCounts, 30000, null);
    let curve = null;
    if (D.mu !== null) {
      const s = D.sd / Math.sqrt(n);
      curve = (x) => Math.exp(-0.5 * ((x - D.mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
    } else {
      curve = (x) => 1 / (Math.PI * (1 + x * x)); // mean of n Cauchys is still standard Cauchy
    }
    drawHist(meanC, counts, total, curve);

    if (!total) { statsEl.innerHTML = `n = ${n}. Hit <b>▶ stream</b> to start drawing sample means.`; return; }
    const m = sum / total, sd = Math.sqrt(Math.max(0, sumsq / total - m * m));
    if (D.mu !== null) {
      statsEl.innerHTML = `means drawn: <b>${total}</b> · mean of means <b>${m.toFixed(3)}</b> <span class="faint">(μ = ${D.mu})</span>`
        + ` · sd of means <b>${sd.toFixed(3)}</b> <span class="faint">(σ/√n = ${(D.sd / Math.sqrt(n)).toFixed(3)})</span>`;
    } else {
      statsEl.innerHTML = `means drawn: <b>${total}</b> · ${(100 * outside / total).toFixed(1)}% fell off the plot · sample sd <b>${sd.toFixed(1)}</b> and it won't settle. `
        + `<span class="accent">No finite variance → no CLT.</span> <span class="faint">The mean of n Cauchys is still Cauchy (orange), whatever n is.</span>`;
    }
  }

  function tick() { addMeans(30); if (streaming) raf = requestAnimationFrame(tick); }
  function start() { if (total >= MAX_MEANS) setup(); streaming = true; streamBtn.textContent = '❚❚ pause'; tick(); }
  function stop() { streaming = false; cancelAnimationFrame(raf); streamBtn.textContent = '▶ stream'; }

  sel.addEventListener('change', setup);
  nIn.addEventListener('input', setup);

  $('clt-100').addEventListener('click', () => addMeans(100));
  $('clt-reset').addEventListener('click', setup);
  streamBtn.addEventListener('click', () => (streaming ? stop() : start()));
  addEventListener('palettechange', drawAll);
  addEventListener('tabshown', (e) => { if (e.detail === 'clt') drawAll(); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawAll, 120); });

  setup();
})();
