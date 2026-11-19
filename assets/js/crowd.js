/* "Read the crowd": you vs. 99 bots in a small casino where payoffs depend on how many others pick the same game.
   Historical averages mislead; you have to forecast the crowd. */
(function () {
  const N = 100, ROUNDS = 15, START = 20;
  const ACTIONS = ['work', 'jackpot', 'red', 'blue', 'lounge'];
  const RULES = {
    work:    { cost: 0, label: 'Work',     desc: '+2 coins, guaranteed' },
    jackpot: { cost: 4, label: 'Jackpot',  desc: 'pay 4 · up to 8 random entrants win 15' },
    red:     { cost: 3, label: 'Red room', desc: 'pay 3 · smaller room splits 240 (max 12 each)' },
    blue:    { cost: 3, label: 'Blue room',desc: 'pay 3 · smaller room splits 240 (max 12 each)' },
    lounge:  { cost: 5, label: 'Lounge',   desc: 'pay 5 if admitted (10 seats) · wins 20 with unknown p' },
  };
  const BOT_MIX = [['greedy', 34], ['herd', 20], ['contrarian', 19], ['random', 15], ['worker', 10], ['forecaster', 1]];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createGame(seed = (Math.random() * 2 ** 31) | 0) {
    const rnd = mulberry32(seed);
    const types = ['you'];
    BOT_MIX.forEach(([t, k]) => { for (let i = 0; i < k; i++) types.push(t); });
    return {
      rnd, types,
      coins: new Array(N).fill(START),
      p: 0.3 + 0.2 * rnd(),                 // hidden lounge win rate
      round: 0,
      history: [],                           // [{att, net, loungeWins, loungeAdmitted, payoff[]}]
    };
  }

  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  const PAID = ['jackpot', 'red', 'blue', 'lounge'];
  const JACKPOT_WINNERS = 8, JACKPOT_PRIZE = 15;

  /* Public summary bots can use: attendance + average realized net per option. */
  function publicStats(g) {
    const H = g.history, last = H[H.length - 1];
    const avgNet = {}, cnt = {};
    ACTIONS.forEach((a) => { avgNet[a] = 0; cnt[a] = 0; });
    H.forEach((h) => ACTIONS.forEach((a) => { if (h.att[a]) { avgNet[a] += h.net[a]; cnt[a]++; } }));
    ACTIONS.forEach((a) => { avgNet[a] = cnt[a] ? avgNet[a] / cnt[a] : (a === 'work' ? 2 : 1.5); });
    return { last, avgNet };
  }

  /* Expected attendance next round, by modelling how each bot type reacts to public info. */
  function expectedAttendance(g) {
    const { last, avgNet } = publicStats(g);
    const att = {}; ACTIONS.forEach((a) => { att[a] = 0; });
    const add = (a, k) => { att[a] += k; };
    const spread = (list, k) => list.forEach((a) => add(a, k / list.length));
    BOT_MIX.forEach(([t, k]) => {
      if (t === 'forecaster') return;
      if (t === 'worker') return add('work', k);
      if (t === 'random' || !last) return spread(ACTIONS, k);
      if (t === 'greedy') { spread(ACTIONS, 0.15 * k); return add(ACTIONS.reduce((b, a) => (avgNet[a] > avgNet[b] ? a : b), 'work'), 0.85 * k); }
      if (t === 'herd') { spread(PAID, 0.2 * k); return add(PAID.reduce((b, a) => (last.att[a] > last.att[b] ? a : b)), 0.8 * k); }
      if (t === 'contrarian') { spread(PAID, 0.2 * k); return add(PAID.reduce((b, a) => (last.att[a] < last.att[b] ? a : b)), 0.8 * k); }
    });
    return att;
  }
  const phi = (z) => 1 / (1 + Math.exp(-1.702 * z)); // logistic approx. of the normal CDF

  function forecast(g) {
    const att = expectedAttendance(g);
    let w = 0, l = 0;
    g.history.forEach((h) => { w += h.loungeWins; l += h.loungeAdmitted - h.loungeWins; });
    const p = (w + 1) / (w + l + 2);
    const n = (a) => att[a] + 1;                  // +1 = me
    const prize = (m) => Math.min(12, Math.floor(240 / Math.max(1, m)));
    const pRed = phi((n('blue') - n('red')) / Math.sqrt(n('red') + n('blue')));
    const ev = {
      work: 2,
      jackpot: JACKPOT_PRIZE * Math.min(JACKPOT_WINNERS, n('jackpot')) / n('jackpot') - 4,
      red: pRed * prize(n('red')) - 3,
      blue: (1 - pRed) * prize(n('blue')) - 3,
      lounge: Math.min(1, 10 / n('lounge')) * (20 * p - 5),
    };
    return { ev, att, p };
  }

  function botAction(g, type) {
    const r = g.rnd, { last, avgNet } = publicStats(g);
    if (type === 'worker') return 'work';
    if (type === 'random' || !last) return pick(r, ACTIONS);
    if (type === 'greedy') {
      if (r() < 0.15) return pick(r, ACTIONS);
      return ACTIONS.reduce((b, a) => (avgNet[a] + 0.4 * r() > avgNet[b] ? a : b), 'work');
    }
    if (type === 'herd') return r() < 0.2 ? pick(r, PAID) : PAID.reduce((b, a) => (last.att[a] > last.att[b] ? a : b));
    if (type === 'contrarian') return r() < 0.2 ? pick(r, PAID) : PAID.reduce((b, a) => (last.att[a] < last.att[b] ? a : b));
    if (type === 'forecaster') {
      const { ev } = forecast(g);
      return ACTIONS.reduce((b, a) => (ev[a] > ev[b] ? a : b), 'work');
    }
    return 'work';
  }

  /* Play one round. `yourAction` is the visitor's choice (or null to let a forecaster play your seat). */
  function playRound(g, yourAction) {
    const r = g.rnd;
    const acts = g.types.map((t, i) => {
      let a = i === 0 ? (yourAction || botAction(g, 'forecaster')) : botAction(g, t);
      if (g.coins[i] < RULES[a].cost) a = 'work';      // can't afford it → forced to work
      return a;
    });
    const att = {}; ACTIONS.forEach((a) => { att[a] = 0; });
    acts.forEach((a) => att[a]++);
    const payoff = new Array(N).fill(0);
    const byAct = (a) => acts.map((x, i) => (x === a ? i : -1)).filter((i) => i >= 0);
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    byAct('work').forEach((i) => { payoff[i] = 2; });

    const jp = shuffle(byAct('jackpot'));
    jp.forEach((i, k) => { payoff[i] = (k < JACKPOT_WINNERS ? JACKPOT_PRIZE : 0) - 4; });

    const red = byAct('red'), blue = byAct('blue');
    let winSide = null;
    if (red.length && blue.length) winSide = red.length < blue.length ? 'red' : blue.length < red.length ? 'blue' : (r() < 0.5 ? 'red' : 'blue');
    const winners = winSide === 'red' ? red : winSide === 'blue' ? blue : [];
    const prize = Math.min(12, Math.floor(240 / Math.max(1, winners.length)));
    red.concat(blue).forEach((i) => { payoff[i] = -3; });
    winners.forEach((i) => { payoff[i] = prize - 3; });

    const lo = shuffle(byAct('lounge'));
    let loungeWins = 0, loungeAdmitted = 0;
    lo.forEach((i, k) => {
      if (k < 10) { loungeAdmitted++; const win = r() < g.p; loungeWins += win; payoff[i] = (win ? 20 : 0) - 5; }
      else payoff[i] = 0; // turned away: no cost, but the round is lost
    });

    payoff.forEach((v, i) => { g.coins[i] += v; });
    const net = {}; ACTIONS.forEach((a) => { const ix = byAct(a); net[a] = ix.length ? ix.reduce((s, i) => s + payoff[i], 0) / ix.length : 0; });
    const rec = { att, net, loungeWins, loungeAdmitted, payoff, acts, winSide, prize };
    g.history.push(rec);
    g.round++;
    return rec;
  }

  const engine = { N, ROUNDS, START, ACTIONS, RULES, BOT_MIX, createGame, playRound, forecast };
  if (typeof module !== 'undefined') { module.exports = engine; return; }

  /* ───────── UI ───────── */
  const root = document.getElementById('panel-crowd');
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const choices = $('crowd-choices'), board = $('crowd-board'), msg = $('crowd-msg'), hist = $('crowd-hist');
  let g, lastRec = null;

  choices.innerHTML = ACTIONS.map((a) => `
    <button class="choice" data-a="${a}">
      <span class="c-name">${RULES[a].label}</span>
      <span class="c-desc">${RULES[a].desc}</span>
      <span class="c-last mono" data-last="${a}">last round: –</span>
    </button>`).join('');
  const btns = [...choices.querySelectorAll('.choice')];

  function rankOf(i) { return 1 + g.coins.filter((c, j) => j !== i && c > g.coins[i]).length; }
  function typeAvg(t) {
    const ix = g.types.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0);
    return ix.reduce((s, i) => s + g.coins[i], 0) / ix.length;
  }

  function render() {
    $('crowd-round').textContent = `${Math.min(g.round + 1, ROUNDS)} / ${ROUNDS}`;
    $('crowd-coins').textContent = g.coins[0];
    $('crowd-rank').textContent = `#${rankOf(0)}`;
    btns.forEach((b) => {
      const a = b.dataset.a;
      b.disabled = g.round >= ROUNDS || g.coins[0] < RULES[a].cost;
      b.classList.toggle('picked', !!lastRec && lastRec.acts[0] === a);
      const el = b.querySelector('[data-last]');
      if (lastRec) {
        const n = lastRec.att[a], net = lastRec.net[a];
        el.innerHTML = `last round: <b>${n}</b> players · avg <b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${net.toFixed(1)}</b>`;
      }
    });
    // leaderboard by strategy type
    const NAMES = { forecaster: 'crowd-model bot', greedy: 'average-chasers', herd: 'herders', contrarian: 'contrarians', random: 'random', worker: 'always work' };
    const rows = [['you', g.coins[0]], ...BOT_MIX.map(([t]) => [NAMES[t], typeAvg(t)])];
    rows.sort((x, y) => y[1] - x[1]);
    const max = Math.max(...rows.map((r) => r[1]), 1);
    board.innerHTML = rows.map(([name, v]) => `
      <div class="lb-row${name === 'you' ? ' me' : ''}"><span>${name}</span><i style="width:${Math.max(2, (v / max) * 100)}%"></i><b>${v.toFixed(0)}</b></div>`).join('');
    drawHist();
  }

  function drawHist() {
    const c = hist, dpr = Math.min(devicePixelRatio || 1, 2), rect = c.getBoundingClientRect();
    if (!rect.width) return;
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height, pad = 6;
    ctx.clearRect(0, 0, W, H);
    const cols = { work: css('--faint'), jackpot: css('--accent'), red: '#e05d5d', blue: css('--cool'), lounge: css('--ok') };
    const x = (t) => pad + (t / (ROUNDS - 1)) * (W - 2 * pad);
    const y = (v) => H - pad - (v / 60) * (H - 2 * pad);
    ACTIONS.forEach((a) => {
      if (!g.history.length) return;
      ctx.strokeStyle = cols[a]; ctx.lineWidth = 1.6; ctx.beginPath();
      g.history.forEach((h, t) => (t ? ctx.lineTo(x(t), y(h.att[a])) : ctx.moveTo(x(t), y(h.att[a]))));
      ctx.stroke();
    });
  }

  function choose(a) {
    if (g.round >= ROUNDS) return;
    const before = g.coins[0];
    lastRec = playRound(g, a);
    const d = g.coins[0] - before;
    let detail = '';
    if (a === 'jackpot') detail = `${lastRec.att.jackpot} entered the jackpot`;
    if (a === 'red' || a === 'blue') detail = lastRec.winSide ? `red ${lastRec.att.red} vs blue ${lastRec.att.blue}; ${lastRec.winSide} won ${lastRec.prize} each` : 'one room was empty, so nobody won';
    if (a === 'lounge') detail = lastRec.att.lounge > 10 ? `${lastRec.att.lounge} queued for 10 seats` : `${lastRec.att.lounge} in the lounge`;
    if (a === 'work') detail = 'steady';
    msg.innerHTML = `Round ${g.round}: you ${d >= 0 ? 'gained' : 'lost'} <b>${Math.abs(d)}</b> (${detail}).`;
    if (g.round >= ROUNDS) finish();
    render();
  }

  function finish() {
    const you = g.coins[0], work = START + 2 * ROUNDS, rank = rankOf(0);
    const verdict = you > work ? `You beat the “always work” baseline (${work}).` : `“Always work” would have ended at ${work}.`;
    msg.innerHTML = `Game over: <b>${you}</b> coins, rank <b>#${rank}</b> of ${N}. ${verdict} The lounge's hidden win rate was <b>${Math.round(g.p * 100)}%</b>.`;
  }

  function reset() { g = createGame(); lastRec = null; msg.textContent = 'Pick a move. Everyone moves at once.'; render(); }

  btns.forEach((b) => b.addEventListener('click', () => choose(b.dataset.a)));
  $('crowd-reset').addEventListener('click', reset);
  addEventListener('tabshown', (e) => { if (e.detail === 'crowd') render(); });
  addEventListener('palettechange', () => g && drawHist());
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => g && drawHist(), 120); });
  reset();
})();
