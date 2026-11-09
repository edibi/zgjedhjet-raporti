'use strict';
/* Zgjedhjet në Shqipëri · Raporti: kopje web e raportit Power BI.
   Faqet, pozicionet, titujt dhe tekstet vijnë nga PBIP (data/report.json, nga build/build_data.py).
   Masat (DAX) janë rishkruar më poshtë te "Masat". DOM ndërtohet vetëm me textContent. */
(function () {
  const DATA_URL = 'data/report.json?v=2';
  const NS = 'http://www.w3.org/2000/svg';
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

  /* ------------------------------------------------------------ ndihmës */
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    setProps(e, props);
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  }
  function sv(tag, props, ...kids) {
    const e = document.createElementNS(NS, tag);
    setProps(e, props);
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
    return e;
  }
  function setProps(e, props) {
    if (!props) return;
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.setAttribute('class', v);
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  const $ = s => document.querySelector(s);
  const ok = v => v != null && Number.isFinite(v);
  const div = (a, b) => (b ? a / b : null);
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fInt = v => (ok(v) ? nf0.format(Math.round(v)) : '');
  const fPct = (v, d = 1) => (ok(v) ? (v * 100).toFixed(d) + '%' : '');
  const fDec = v => (ok(v) ? nf1.format(v) : '');
  const fSigned = v => (ok(v) ? (v > 0 ? '+' : v < 0 ? '-' : '') + nf0.format(Math.abs(Math.round(v))) : '');
  const fPP = v => (ok(v) ? (v > 0 ? '+' : v < 0 ? '-' : '') + nf1.format(Math.abs(v)) : '');
  function fShort(v) {
    if (!ok(v)) return '';
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e5) return Math.round(v / 1e3) + 'K';
    if (a >= 1e4) return (v / 1e3).toFixed(1) + 'K';
    return nf0.format(Math.round(v));
  }
  const coll = new Intl.Collator('sq');
  const pc = x => (x * 100).toFixed(4) + '%';

  const mctx = document.createElement('canvas').getContext('2d');
  function tw(t, size = 11, weight = 400) { mctx.font = `${weight} ${size}px ${FONT}`; return mctx.measureText(String(t)).width; }
  function fit(t, w, size = 11) {
    t = String(t);
    if (w <= 8) return '';
    if (tw(t, size) <= w) return t;
    while (t.length > 1 && tw(t + '…', size) > w) t = t.slice(0, -1);
    return t + '…';
  }
  function hexRgb(c) {
    c = c.trim().replace('#', '');
    if (c.startsWith('rgb')) return c.match(/\d+/g).slice(0, 3).map(Number);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
  }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const A = hexRgb(a), B = hexRgb(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
  }
  const light = c => { const [r, g, b] = hexRgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62; };
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ------------------------------------------------------------ tooltip */
  const tipEl = el('div', { class: 'tip', role: 'tooltip' });
  let tipTouch = false;
  function tipNode(title, rows, sub) {
    const n = el('div');
    if (title) n.append(el('b', { class: 'tt', text: title }));
    if (sub) n.append(el('div', { class: 'sub', text: sub }));
    if (rows && rows.length) {
      n.append(el('table', null, el('tbody', null, rows.filter(r => r && r[1] !== '' && r[1] != null).map(r =>
        el('tr', null, el('td', null, r[2] ? el('i', { class: 'sw', style: `background:${r[2]}` }) : null, r[0]), el('td', { text: r[1] }))))));
    }
    return n;
  }
  function moveTip(ev) {
    const r = tipEl.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    tipEl.style.left = Math.max(8, x) + 'px';
    tipEl.style.top = Math.max(8, y) + 'px';
  }
  function showTip(ev, node) { if (!node) return; tipEl.replaceChildren(node); tipEl.style.display = 'block'; moveTip(ev); }
  function hideTip() { tipEl.style.display = 'none'; }
  function hover(node, make) {
    node.addEventListener('pointerenter', e => { tipTouch = e.pointerType === 'touch'; showTip(e, make()); });
    node.addEventListener('pointermove', e => { if (tipEl.style.display === 'block') moveTip(e); });
    node.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
  }
  document.addEventListener('pointerdown', e => { if (tipTouch && e.pointerType !== 'touch') hideTip(); }, true);
  addEventListener('scroll', () => { if (!tipTouch) hideTip(); }, { passive: true });

  /* ------------------------------------------------------------ të dhënat */
  let D, NP, NQ, Q, VOTES, qvN, qvB, qvQ, VOT, HASG, GG, ALL, PG, LEVN, KRN;
  const CITY = {};
  const LV = [
    { name: 'Qarku', of: i => qvQ[i], label: k => D.qarqe[k] },
    { name: 'Bashkia', of: i => qvB[i], label: k => D.bashki[k][0] },
    { name: 'Nj.Ad.', of: i => qvN[i], label: k => D.njesi[k][0] },
    { name: 'QV', of: i => i, label: k => Q.kodi[k] },
  ];
  const ORD = {
    det: ['PS', 'PD', 'PSD', 'MUNDESIA', 'NISMA-SHB', 'L. BASHKE', 'Te tjeret'],
    grupi: ['PS + PSD', 'PD', 'MUNDESIA', 'NISMA-SHB', 'L. BASHKE', 'Te tjeret'],
    skenar: ['Grupimi SHESHIT', 'PS + PSD', 'PD', 'Te tjeret'],
    tooltip: ['PS + PSD', 'PS', 'PSD', 'PD', 'MUNDESIA', 'NISMA-SHB', 'L. BASHKE', 'Te tjeret'],
  };
  const PC = {
    'PS + PSD': '#5E3894', PS: '#5E3894', PD: '#00529C', PSD: '#0C5D34', MUNDESIA: '#FFC04D', 'NISMA-SHB': '#F48221',
    'L. BASHKE': '#E82D36', BASHKE: '#E82D36', 'Te tjeret': '#9E9E9E', 'Grupimi SHESHIT': '#D6336C',
  };
  const pcol = g => PC[g] || '#9E9E9E';
  const C_GREY = '#9E9E9E', C_BLUE = '#4A9FD8', C_VOTE = '#8A8886';
  const MODE_LABEL = { grupi: 'PS + PSD bashkë', det: 'PS, PSD të ndara' };
  const RES = 'Rezidentë (INSTAT)', KQZ = 'Lista e KQZ';

  function prep(d) {
    D = d; NP = d.parties.length; Q = d.qv; NQ = Q.kodi.length; VOTES = d.votes;
    qvN = Q.nja; qvB = new Int32Array(NQ); qvQ = new Int32Array(NQ); VOT = new Float64Array(NQ);
    HASG = new Uint8Array(NQ); GG = new Array(NQ);
    for (let i = 0; i < NQ; i++) {
      const b = d.njesi[qvN[i]][1];
      qvB[i] = b; qvQ[i] = d.bashki[b][1]; VOT[i] = Q.valid[i] + Q.invalid[i];
      const h = Q.vot[i] > 0 && Q.votW[i] > 0 && !Q.dia[i];
      HASG[i] = h ? 1 : 0;
      if (h) {
        const s = Q.votW[i] / Q.vot[i];
        GG[i] = s < 0.45 ? '1. nën 45%' : s < 0.48 ? '2. 45–48%' : s < 0.51 ? '3. 48–51%' : s < 0.54 ? '4. 51–54%' : '5. mbi 54%';
      } else GG[i] = 'Pa të dhëna';
    }
    ALL = Array.from({ length: NQ }, (_, i) => i);
    PG = { det: d.parties.map(p => p.det), grupi: d.parties.map(p => p.grupi), skenar: d.parties.map(p => p.skenar) };
    for (const c of ['Tiranë', 'Vlorë']) CITY[c] = ALL.filter(i => d.bashki[qvB[i]][0] === c);
    LEVN = new Map();
    for (const [y, n, g, v] of d.lev.rows) {
      let a = LEVN.get(n);
      if (!a) LEVN.set(n, (a = new Float64Array(21)));
      a[(y === 2021 ? 0 : y === 2023 ? 1 : 2) * 7 + g] += v;
    }
    KRN = new Map();
    for (const [y, n, g, det, v] of d.krah) {
      let k = KRN.get(n);
      if (!k) KRN.set(n, (k = {}));
      const o = k[y] || (k[y] = { grupi: {}, det: {}, t: 0 });
      o.grupi[g] = (o.grupi[g] || 0) + v; o.det[det] = (o.det[det] || 0) + v; o.t += v;
    }
  }

  /* ------------------------------------------------------------ masat */
  function filt(rows, f) { const out = []; for (const i of rows) if (f(i)) out.push(i); return out; }
  function sumc(rows, arr) { let s = 0; for (const i of rows) s += arr[i]; return s; }
  function groupBy(rows, key) {
    const m = new Map();
    for (const i of rows) { const k = key(i); let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(i); }
    return m;
  }
  function pvotes(rows) {
    const t = new Float64Array(NP);
    for (const i of rows) { const o = i * NP; for (let p = 0; p < NP; p++) t[p] += VOTES[o + p]; }
    return t;
  }
  function tot(pv, pm) { let s = 0; for (let p = 0; p < NP; p++) if (!pm || pm[p]) s += pv[p]; return s; }
  function gsum(pv, mode, pm) {
    const m = new Map();
    for (let p = 0; p < NP; p++) { if (pm && !pm[p]) continue; const g = PG[mode][p]; m.set(g, (m.get(g) || 0) + pv[p]); }
    return m;
  }
  function seatsBy(rows) {
    const qs = new Set();
    for (const i of rows) qs.add(qvQ[i]);
    const t = new Float64Array(NP);
    for (const q of qs) for (let p = 0; p < NP; p++) t[p] += D.seats[q][p];
    return t;
  }
  const M = {
    zgjLista: r => sumc(r, Q.lista),
    zgjRes: r => sumc(r, Q.res),
    zgjBaza: (r, b) => (b === KQZ ? M.zgjLista(r) : M.zgjRes(r)),
    votAll: r => sumc(r, VOT),
    votShq: r => { let s = 0; for (const i of r) if (!Q.dia[i]) s += VOT[i]; return s; },
    votBaza: (r, b) => (b === KQZ ? M.votAll(r) : M.votShq(r)),
    pjes: (r, b) => div(M.votBaza(r, b), M.zgjBaza(r, b)),
    listaShq: r => { let s = 0; for (const i of r) if (!Q.dia[i]) s += Q.lista[i]; return s; },
    nukLista: r => M.listaShq(r) - M.votShq(r),
    nukRes: r => M.zgjRes(r) - M.votShq(r),
    emigr: r => M.listaShq(r) - M.zgjRes(r),
    pjesRes: r => div(M.votShq(r), M.zgjRes(r)),
    pjesLista: r => div(M.votShq(r), M.listaShq(r)),
    gender(r, b) {
      let gv = 0, vv = 0, zz = 0, zg = 0, cov = 0, all = 0, lw = 0;
      for (const i of r) {
        if (Q.dia[i]) continue;
        all += Q.lista[i]; lw += Q.listaW[i];
        if (!HASG[i]) continue;
        gv += Q.votW[i]; vv += Q.vot[i]; cov += Q.lista[i];
        if (b === KQZ) { zz += Q.lista[i]; zg += Q.listaW[i]; } else { zz += Q.res[i]; zg += Q.resW[i]; }
      }
      const g = div(gv, zg), m = div(vv - gv, zz - zg);
      return { gra: g, burra: m, hendek: ok(g) && ok(m) ? (m - g) * 100 : null, graVot: div(gv, vv), graZgj: div(lw, all), mbulimi: div(cov, all) };
    },
  };
  const OTHERS = ['PS + PSD', 'PD', 'Te tjeret'];
  function scen(r, x, y) {
    const pv = pvotes(r), g = gsum(pv, 'skenar'), T = tot(pv);
    const sh = g.get('Grupimi SHESHIT') || 0, ps = g.get('PS + PSD') || 0, pd = g.get('PD') || 0, tj = g.get('Te tjeret') || 0;
    const v = { 'Grupimi SHESHIT': sh + x * ps + y * pd, 'PS + PSD': ps * (1 - x), PD: pd * (1 - y), 'Te tjeret': tj };
    const base = { 'Grupimi SHESHIT': sh, 'PS + PSD': ps, PD: pd, 'Te tjeret': tj };
    let rival = OTHERS[0];
    for (const k of OTHERS) if (v[k] > v[rival]) rival = k;
    const diff = v['Grupimi SHESHIT'] - v[rival];
    const rank = 1 + OTHERS.filter(k => v[k] >= v['Grupimi SHESHIT']).length;
    return {
      v, base, T, diff, rival, rank, winner: diff > 0 ? 'Grupimi SHESHIT' : rival,
      pct: k => div(v[k], T), pct25: k => div(base[k], T), sh25: div(sh, T), transfer: x * ps + y * pd,
      verdict: diff > 0
        ? `PO: Grupimi SHESHIT del i pari, ${fInt(diff)} vota mbi ${rival}`
        : `JO: Grupimi SHESHIT del i ${rank}-ti, ${fInt(-diff)} vota pas ${rival}`,
    };
  }
  function njaSet(r) { const s = new Set(); for (const i of r) s.add(qvN[i]); return s; }
  function levAgg(ns) {
    const a = new Float64Array(21);
    for (const n of ns) { const x = LEVN.get(n); if (x) for (let k = 0; k < 21; k++) a[k] += x[k]; }
    return a;
  }
  function ped(a, ya, yb) {
    let ta = 0, tb = 0;
    for (let g = 0; g < 7; g++) { ta += a[ya * 7 + g]; tb += a[yb * 7 + g]; }
    if (!(ta > 0 && tb > 0)) return { t: null, n: null };
    let t = 0, n = 0;
    for (let g = 0; g < 7; g++) {
      const A = a[ya * 7 + g], B = a[yb * 7 + g];
      t += Math.abs(B / tb - A / ta);
      if (A === 0) n += B / tb;
    }
    return { t: 50 * t, n: 50 * n };
  }
  function pedRows(r) {
    const a = levAgg(njaSet(r));
    const p1 = ped(a, 0, 2), p2 = ped(a, 1, 2);
    return { t2125: p1.t, n2125: p1.n, t2325: p2.t, n2325: p2.n };
  }
  function krahAgg(units, years) {
    const o = { grupi: {}, det: {}, t: 0 };
    for (const n of units) {
      const k = KRN.get(n);
      if (!k) continue;
      for (const y of years) {
        const x = k[y];
        if (!x) continue;
        for (const [g, v] of Object.entries(x.grupi)) o.grupi[g] = (o.grupi[g] || 0) + v;
        for (const [g, v] of Object.entries(x.det)) o.det[g] = (o.det[g] || 0) + v;
        o.t += x.t;
      }
    }
    return o;
  }
  const cityUnits = c => D.njesi.map((n, i) => i).filter(i => D.bashki[D.njesi[i][1]][0] === c);

  /* ------------------------------------------------------------ gjendja */
  const DEF_SYNC = () => ({ grupimi: 'det', baza: KQZ, vendi: null, geo: null, viti: [2025], grupiHarta: ['MUNDESIA', 'NISMA-SHB', 'L. BASHKE'], grupiKrah: 'L. BASHKE' });
  const st = { sync: DEF_SYNC(), page: {}, vis: {} };
  const ps = id => st.page[id] || (st.page[id] = { geo: null, sel: null });
  const vs = id => st.vis[id] || (st.vis[id] = {});
  const maskRows = (rows, m) => (m ? filt(rows, i => m[i]) : rows);
  function vendiRows(rows) {
    const v = st.sync.vendi;
    if (!v || v.length !== 1) return rows;
    const dia = v[0] === 'Diaspora';
    return filt(rows, i => !!Q.dia[i] === dia);
  }
  function applySel(rows, pid, vid, opt = {}) {
    const sel = ps(pid).sel;
    let pm = null;
    if (sel && sel.src !== vid && !opt.ignore) {
      if (sel.geo) rows = filt(rows, i => LV[sel.geo.lv].of(i) === sel.geo.key);
      if (sel.nja != null) rows = filt(rows, i => qvN[i] === sel.nja);
      if (sel.gg) rows = filt(rows, i => GG[i] === sel.gg);
      if (sel.party && !opt.noParty) pm = PG[sel.mode].map(g => g === sel.party);
    }
    return { rows, pm, own: sel && sel.src === vid ? sel : null };
  }
  function select(pid, sel) {
    const cur = ps(pid).sel;
    const key = s => JSON.stringify(s);
    ps(pid).sel = cur && key(cur) === key(sel) ? null : sel;
    refresh();
  }
  function selText(s) {
    const p = [];
    if (s.geo) p.push(LV[s.geo.lv].label(s.geo.key));
    if (s.nja != null) p.push(D.njesi[s.nja][0]);
    if (s.party) p.push(s.party);
    if (s.gg) p.push('Gra votuese ' + s.gg.slice(3));
    if (s.kgroup) p.push(s.kgroup);
    return p.join(' · ');
  }

  /* ------------------------------------------------------------ grafikët */
  function empty(t = 'Nuk ka të dhëna për këtë përzgjedhje') { return el('div', { class: 'empty', text: t }); }
  function size(host) { return [Math.max(120, host.clientWidth - 16), Math.max(60, host.clientHeight - 12)]; }
  function legendEl(items) {
    return el('div', { class: 'legend' }, items.map(([c, l]) => el('span', null, el('i', { style: `background:${c}` }), l)));
  }
  function ticks(lo, hi, n = 4) {
    const span = hi - lo || 1, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), e = raw / mag;
    const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
    const t = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-6; v += step) t.push(+v.toFixed(10));
    return t;
  }
  const colorAt = (s, ci) => (typeof s.color === 'function' ? s.color(ci) : s.color);
  function labelText(svgE, x, y, txt, opt = {}) {
    svgE.append(sv('text', { x, y, class: 'lbl' + (opt.in ? (opt.dark ? ' dark' : ' in') : ''), 'text-anchor': opt.anchor || 'middle', 'dominant-baseline': opt.base || 'central', 'font-size': opt.size || null, text: txt }));
  }

  /* barChart: shtylla/vija horizontale; mode = clustered | stacked | percent */
  function barChart(host, o) {
    let [W, H] = size(host);
    const cats = o.cats, ser = o.series, nC = cats.length, nS = ser.length;
    if (!nC || !nS) { host.append(empty()); return; }
    if (o.legend) { const lg = legendEl(ser.map(s => [s.color, s.label])); host.append(lg); H -= lg.offsetHeight + 2; }
    const mode = o.mode || 'clustered', horiz = o.orient === 'h', lf = o.labelFmt, fs = 10.5;
    const raw = cats.map((_, ci) => ser.map((_, si) => o.val(ci, si)));
    const vals = mode === 'percent'
      ? raw.map(r => { const t = r.reduce((a, b) => a + (b > 0 ? b : 0), 0); return r.map(v => (t && ok(v) ? v / t : null)); })
      : raw;
    let lo = 0, hi = 0;
    for (const r of vals) {
      if (mode === 'clustered') { for (const v of r) if (ok(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
      else { let p = 0, n = 0; for (const v of r) if (ok(v)) (v >= 0 ? (p += v) : (n += v)); hi = Math.max(hi, p); lo = Math.min(lo, n); }
    }
    if (mode === 'percent') { lo = 0; hi = 1; }
    if (hi === lo) hi = lo + 1;
    let tk = ticks(lo, hi, horiz ? 4 : 4);
    if (o.axis && mode !== 'percent') { hi = Math.max(hi, tk[tk.length - 1]); lo = Math.min(lo, tk[0]); tk = tk.filter(t => t >= lo - 1e-9 && t <= hi + 1e-9); }
    const plot = el('div', { class: 'plot' });
    host.append(plot);
    const act = o.active || {};
    const dim = (ci, si) => (act.ci != null && act.ci !== ci) || (act.si != null && si != null && act.si !== si);
    const axFmt = o.axisFmt || (mode === 'percent' ? v => fPct(v, 0) : fShort);
    const mark = (svgE, x, y, w, h, ci, si) => {
      const s = ser[si], c = colorAt(s, ci);
      const r = sv('rect', { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, width: Math.max(0, w), height: Math.max(0, h), fill: c, class: 'mk' + (dim(ci, si) ? ' dim' : ''), rx: 1 });
      if (o.tip) hover(r, () => o.tip(ci, si));
      if (o.click) r.addEventListener('click', e => { e.stopPropagation(); o.click(ci, si); });
      svgE.append(r);
      return c;
    };
    const catLabel = (svgE, attrs, txt, ci) => {
      const t = sv('text', Object.assign({ text: txt, class: o.click ? 'mk' : null }, attrs));
      if (o.click) t.addEventListener('click', e => { e.stopPropagation(); o.click(ci, null); });
      t.append(sv('title', { text: cats[ci].label }));
      svgE.append(t);
    };
    const lblW = mode === 'clustered' && lf
      ? Math.min(90, Math.max(0, ...cats.flatMap((_, ci) => ser.map((_, si) => tw((lf(vals[ci][si], ci, si) || '') + (o.detail && horiz ? ' · ' + (o.detail(ci, si) || '') : ''), fs)))) + 8)
      : 6;
    if (horiz) {
      const labW = Math.min(W * 0.36, Math.max(24, ...cats.map(c => tw(c.label, 11))) + 10);
      const axisH = o.axis ? 18 : 2;
      const per = mode === 'clustered' ? nS : 1;
      const minBand = Math.max(18, per * 13 + 6);
      let band = (H - axisH) / nC, ch = H, scroll = false;
      if (band < minBand) { band = minBand; ch = band * nC + axisH; scroll = true; plot.style.cssText = `height:${H}px;overflow-y:auto;overflow-x:hidden`; }
      const w = W - (scroll ? 14 : 0);
      const x0 = labW + 4 + (lo < 0 ? lblW : 0), x1 = w - lblW;
      const sx = v => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
      const svgE = sv('svg', { width: w, height: ch, class: 'cht' });
      if (o.axis) {
        for (const t of tk) {
          const x = sx(t);
          svgE.append(sv('line', { x1: x, x2: x, y1: 0, y2: ch - axisH, class: 'grid' }));
          svgE.append(sv('text', { x, y: ch - 5, 'text-anchor': 'middle', 'font-size': 10, text: axFmt(t) }));
        }
      }
      if (lo < 0) svgE.append(sv('line', { x1: sx(0), x2: sx(0), y1: 0, y2: ch - axisH, class: 'zero' }));
      cats.forEach((c, ci) => {
        const y0 = ci * band;
        catLabel(svgE, { x: labW, y: y0 + band / 2, 'text-anchor': 'end', 'dominant-baseline': 'central' }, fit(c.label, labW - 6, 11), ci);
        if (mode === 'clustered') {
          const bh = Math.min(26, (band * 0.76) / nS), start = y0 + (band - bh * nS) / 2;
          ser.forEach((s, si) => {
            const v = vals[ci][si];
            if (!ok(v)) return;
            const a = sx(Math.min(0, v)), b = sx(Math.max(0, v));
            mark(svgE, a, start + si * bh, b - a, bh - 1, ci, si);
            if (lf && bh >= 9) {
              const t = lf(v, ci, si) + (o.detail ? ' · ' + o.detail(ci, si) : '');
              labelText(svgE, v >= 0 ? b + 4 : a - 4, start + si * bh + bh / 2, t, { anchor: v >= 0 ? 'start' : 'end', size: bh < 12 ? 9.5 : null });
            }
          });
        } else {
          let p = 0, n = 0;
          const bh = Math.min(band * 0.74, 44), yy = y0 + (band - bh) / 2;
          ser.forEach((s, si) => {
            const v = vals[ci][si];
            if (!ok(v) || v === 0) return;
            let a, b;
            if (v >= 0) { a = p; p += v; b = p; } else { a = n; n += v; b = n; }
            const xa = sx(Math.min(a, b)), xb = sx(Math.max(a, b));
            const col = mark(svgE, xa, yy, xb - xa - 0.6, bh, ci, si);
            if (lf) {
              const t = lf(raw[ci][si], ci, si, v);
              if (t && xb - xa > tw(t, fs) + 6 && bh >= 12) labelText(svgE, (xa + xb) / 2, yy + bh / 2, t, { in: true, dark: light(col) });
            }
          });
          if (o.totalFmt) labelText(svgE, sx(p) + 4, yy + bh / 2, o.totalFmt(ci), { anchor: 'start' });
        }
      });
      plot.append(svgE);
    } else {
      const axisW = o.axis ? Math.max(...tk.map(t => tw(axFmt(t), 10))) + 8 : 2;
      const per = mode === 'clustered' ? nS : 1;
      const minBand = Math.max(22, per * 15 + 6);
      let band = (W - axisW) / nC, cw = W, scroll = false;
      if (band < minBand) { band = minBand; cw = axisW + band * nC; scroll = true; plot.style.cssText = `width:${W}px;overflow-x:auto;overflow-y:hidden`; }
      const h = H - (scroll ? 14 : 0);
      const maxLab = Math.max(...cats.map(c => tw(c.label, 11)));
      const rot = maxLab > band - 4;
      const botH = rot ? Math.min(96, maxLab * 0.72 + 14) : 18;
      const topPad = lf && mode === 'clustered' ? (o.detail ? 28 : 16) : 8;
      const y0 = topPad, y1 = h - botH;
      const sy = v => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
      const svgE = sv('svg', { width: cw, height: h, class: 'cht' });
      if (o.axis) {
        for (const t of tk) {
          const y = sy(t);
          svgE.append(sv('line', { x1: axisW, x2: cw, y1: y, y2: y, class: 'grid' }));
          svgE.append(sv('text', { x: axisW - 5, y, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 10, text: axFmt(t) }));
        }
      }
      if (lo < 0) svgE.append(sv('line', { x1: axisW, x2: cw, y1: sy(0), y2: sy(0), class: 'zero' }));
      cats.forEach((c, ci) => {
        const x0 = axisW + ci * band, cx = x0 + band / 2;
        if (rot) catLabel(svgE, { x: cx + 3, y: y1 + 8, 'text-anchor': 'end', transform: `rotate(-45 ${cx + 3} ${y1 + 8})`, 'dominant-baseline': 'central' }, fit(c.label, (botH - 12) / 0.72, 11), ci);
        else catLabel(svgE, { x: cx, y: y1 + 12, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, fit(c.label, band - 2, 11), ci);
        if (mode === 'clustered') {
          const bw = Math.min(60, (band * 0.78) / nS), start = x0 + (band - bw * nS) / 2;
          ser.forEach((s, si) => {
            const v = vals[ci][si];
            if (!ok(v)) return;
            const a = sy(Math.max(0, v)), b = sy(Math.min(0, v));
            mark(svgE, start + si * bw, a, bw - 1.5, b - a, ci, si);
            if (lf) {
              const t = lf(v, ci, si), fz = tw(t, fs) > bw + 8 ? 9 : null;
              if (tw(t, fz || fs) <= bw + 12) {
                const yy = v >= 0 ? a - (o.detail ? 15 : 6) : b + 8;
                labelText(svgE, start + si * bw + bw / 2, yy, t, { size: fz });
                if (o.detail && tw(o.detail(ci, si), 9) <= bw + 2) labelText(svgE, start + si * bw + bw / 2, yy + 11, o.detail(ci, si), { size: 9 });
              }
            }
          });
        } else {
          let p = 0, n = 0;
          const bw = Math.min(band * 0.74, 70), xx = x0 + (band - bw) / 2;
          ser.forEach((s, si) => {
            const v = vals[ci][si];
            if (!ok(v) || v === 0) return;
            let a, b;
            if (v >= 0) { a = p; p += v; b = p; } else { a = n; n += v; b = n; }
            const ya = sy(Math.max(a, b)), yb = sy(Math.min(a, b));
            const col = mark(svgE, xx, ya, bw, yb - ya - 0.6, ci, si);
            if (lf) {
              const t = lf(raw[ci][si], ci, si, v);
              if (t && yb - ya >= 13 && tw(t, fs) + 4 <= bw) labelText(svgE, xx + bw / 2, (ya + yb) / 2, t, { in: true, dark: light(col) });
            }
          });
          if (o.totalFmt) labelText(svgE, xx + bw / 2, sy(p) - 7, o.totalFmt(ci));
        }
      });
      plot.append(svgE);
    }
  }

  function lineChart(host, o) {
    let [W, H] = size(host);
    if (!o.series.length) { host.append(empty()); return; }
    const lg = legendEl(o.series.map(s => [s.color, s.label]));
    host.append(lg); H -= lg.offsetHeight + 2;
    let hi = 0;
    for (const s of o.series) for (const v of s.values) if (ok(v)) hi = Math.max(hi, v);
    hi = hi * 1.1 || 1;
    const tk = ticks(0, hi, 4); hi = Math.max(hi, tk[tk.length - 1]);
    const axisW = Math.max(...tk.map(t => tw(o.fmtAxis(t), 10))) + 8;
    const x0 = axisW + 30, x1 = W - 34, y0 = 10, y1 = H - 20;
    const sx = i => x0 + (o.cats.length > 1 ? (i / (o.cats.length - 1)) * (x1 - x0) : (x1 - x0) / 2);
    const sy = v => y1 - (v / hi) * (y1 - y0);
    const svgE = sv('svg', { width: W, height: H, class: 'cht' });
    for (const t of tk) {
      svgE.append(sv('line', { x1: axisW, x2: W, y1: sy(t), y2: sy(t), class: 'grid' }));
      svgE.append(sv('text', { x: axisW - 5, y: sy(t), 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 10, text: o.fmtAxis(t) }));
    }
    o.cats.forEach((c, i) => svgE.append(sv('text', { x: sx(i), y: H - 5, 'text-anchor': 'middle', text: c })));
    const used = o.cats.map(() => []);
    o.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => (ok(v) ? [sx(i), sy(v), i, v] : null)).filter(Boolean);
      if (pts.length > 1) svgE.append(sv('path', { d: 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'), fill: 'none', stroke: s.color, 'stroke-width': 2.2 }));
      for (const [x, y, i, v] of pts) {
        const c = sv('circle', { cx: x, cy: y, r: 4, fill: s.color, class: 'mk', stroke: 'var(--surface)', 'stroke-width': 1.2 });
        if (o.tip) hover(c, () => o.tip(si, i));
        svgE.append(c);
        if (!used[i].some(u => Math.abs(u - y) < 11)) {
          used[i].push(y);
          const anchor = i === 0 ? 'end' : i === o.cats.length - 1 ? 'start' : 'middle';
          labelText(svgE, x + (anchor === 'end' ? -7 : anchor === 'start' ? 7 : 0), anchor === 'middle' ? y - 10 : y, o.fmt(v), { anchor, size: 9.5 });
        }
      }
    });
    host.append(svgE);
  }

  function squarify(vals, x, y, w, h) {
    const total = vals.reduce((a, b) => a + b, 0);
    if (!total) return [];
    const area = vals.map(v => (v / total) * w * h), rects = [];
    let i = 0;
    while (i < area.length) {
      const sh = Math.min(w, h);
      const worst = r => { const s = r.reduce((a, b) => a + b, 0); return Math.max((sh * sh * Math.max(...r)) / (s * s), (s * s) / (sh * sh * Math.min(...r))); };
      const row = [area[i]];
      let j = i + 1;
      while (j < area.length && worst([...row, area[j]]) <= worst(row)) row.push(area[j++]);
      const s = row.reduce((a, b) => a + b, 0);
      if (w >= h) { const rw = s / h; let yy = y; for (const a of row) { rects.push([x, yy, rw, a / rw]); yy += a / rw; } x += rw; w -= rw; }
      else { const rh = s / w; let xx = x; for (const a of row) { rects.push([xx, y, a / rh, rh]); xx += a / rh; } y += rh; h -= rh; }
      i = j;
    }
    return rects;
  }
  function treemap(host, o) {
    const [W, H] = size(host);
    const items = o.items.filter(it => it.value > 0).sort((a, b) => b.value - a.value);
    if (!items.length) { host.append(empty()); return; }
    const rects = squarify(items.map(i => i.value), 0, 0, W, H);
    const svgE = sv('svg', { width: W, height: H, class: 'cht' });
    items.forEach((it, i) => {
      const [x, y, w, h] = rects[i];
      const r = sv('rect', { x: x + 1, y: y + 1, width: Math.max(0, w - 2), height: Math.max(0, h - 2), fill: it.color, class: 'mk' + (o.active != null && o.active !== it.key ? ' dim' : '') });
      hover(r, () => o.tip(it));
      if (o.click) r.addEventListener('click', () => o.click(it));
      svgE.append(r);
      const big = Math.min(17, Math.max(10, Math.sqrt(w * h) / 9));
      if (w > 34 && h > 22) {
        const dark = light(it.color);
        labelText(svgE, x + 8, y + 8 + big / 2, fit(it.label, w - 14, big), { in: true, dark, anchor: 'start', size: big });
        if (h > big * 2 + 14) labelText(svgE, x + 8, y + 14 + big * 1.6, fit(o.fmt(it.value), w - 14, big), { in: true, dark, anchor: 'start', size: big });
      }
    });
    host.append(svgE);
  }

  function funnel(host, o) {
    const [W, H] = size(host);
    const max = Math.max(...o.steps.map(s => s[1] || 0));
    if (!max) { host.append(empty()); return; }
    const labW = Math.max(...o.steps.map(s => tw(s[0], 13))) + 16;
    const band = H / o.steps.length, bw = W - labW - 8;
    const svgE = sv('svg', { width: W, height: H, class: 'cht' });
    o.steps.forEach(([lab, v], i) => {
      const w = Math.max(2, ((v || 0) / max) * bw), x = labW + (bw - w) / 2, y = i * band + band * 0.12, h = band * 0.76;
      svgE.append(sv('text', { x: labW - 10, y: y + h / 2, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 13, text: lab }));
      const r = sv('rect', { x, y, width: w, height: h, fill: o.color, rx: 2, class: 'mk' });
      const prev = i ? o.steps[i - 1][1] : null;
      const share = i ? div(v, prev) : null;
      hover(r, () => tipNode(lab, [[lab, fInt(v)], i ? ['% e të mëparshmit', fPct(share)] : null]));
      svgE.append(r);
      const big = Math.max(11, Math.min(18, h * 0.32, W / 28));
      const inside = t => tw(t, big) < w - 8;
      const a = fInt(v), b = i ? fPct(share) + ' e të mëparshmit' : '';
      labelText(svgE, labW + bw / 2, y + h / 2 - (i ? big * 0.55 : 0), a, inside(a) ? { size: big, in: true, dark: light(o.color) } : { size: big });
      if (i) labelText(svgE, labW + bw / 2, y + h / 2 + big * 0.65, b, inside(b) ? { size: Math.max(10, big * 0.7), in: true, dark: light(o.color) } : { size: Math.max(10, big * 0.7) });
    });
    host.append(svgE);
  }

  function gradScale(kind, lo, hi) {
    if (kind === 'div') {
      const a = cssVar('--div-min'), m = cssVar('--div-mid'), b = cssVar('--div-max');
      return { f: v => (v < 0 ? mix(m, a, lo < 0 ? v / lo : 0) : mix(m, b, hi > 0 ? v / hi : 0)), css: `linear-gradient(90deg,${a},${m},${b})` };
    }
    const a = cssVar(`--${kind}-min`), b = cssVar(`--${kind}-max`);
    return { f: v => mix(a, b, hi > lo ? (v - lo) / (hi - lo) : 1), css: `linear-gradient(90deg,${a},${b})` };
  }
  function choropleth(host, o) {
    let [W, H] = size(host);
    const m = o.map, names = Object.keys(m.paths);
    const vals = names.map(n => (o.has(n) ? (ok(o.value(n)) ? o.value(n) : 0) : null));
    const present = vals.filter(v => v != null);
    if (!present.length) { host.append(empty()); return; }
    let lo = Math.min(...present), hi = Math.max(...present);
    if (o.kind !== 'div' && lo === hi) lo = Math.min(0, lo);
    const sc = gradScale(o.kind, lo, hi);
    const leg = el('div', { class: 'grad' }, el('span', { text: o.fmt(lo) }), el('i', { style: `background:${sc.css}` }), el('span', { text: o.fmt(hi) }));
    const svgE = sv('svg', { viewBox: `-6 -6 ${m.w + 12} ${m.h + 12}`, width: W, height: H - 20, class: 'map', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': o.label || 'Harta' });
    names.forEach((n, i) => {
      const v = vals[i];
      const p = sv('path', { d: m.paths[n], fill: v == null ? 'var(--nodata)' : sc.f(v), class: o.active != null && o.active !== n ? 'dim' : null });
      hover(p, () => o.tip(n));
      if (o.click) p.addEventListener('click', () => o.click(n));
      svgE.append(p);
    });
    host.append(svgE, leg);
  }

  function scatter(host, o) {
    const [W, H] = size(host);
    const pts = o.pts.filter(p => ok(p.x) && ok(p.y));
    if (!pts.length) { host.append(empty()); return; }
    const pad = (a, b) => { const d = (b - a) * 0.08 || Math.abs(a) * 0.1 || 0.01; return [a - d, b + d]; };
    let [xl, xh] = pad(Math.min(...pts.map(p => p.x)), Math.max(...pts.map(p => p.x)));
    let [yl, yh] = pad(Math.min(...pts.map(p => p.y)), Math.max(...pts.map(p => p.y)));
    const xt = ticks(xl, xh, 5), yt = ticks(yl, yh, 5);
    const smax = Math.max(...pts.map(p => p.s || 0)) || 1;
    const axisW = Math.max(...yt.map(t => tw(o.yFmt(t), 10))) + 22;
    const x0 = axisW, x1 = W - 12, y0 = 10, y1 = H - 34;
    const sx = v => x0 + ((v - xl) / (xh - xl)) * (x1 - x0), sy = v => y1 - ((v - yl) / (yh - yl)) * (y1 - y0);
    const svgE = sv('svg', { width: W, height: H, class: 'cht' });
    for (const t of xt) if (t >= xl && t <= xh) { svgE.append(sv('line', { x1: sx(t), x2: sx(t), y1: y0, y2: y1, class: 'grid' })); svgE.append(sv('text', { x: sx(t), y: y1 + 14, 'text-anchor': 'middle', 'font-size': 10, text: o.xFmt(t) })); }
    for (const t of yt) if (t >= yl && t <= yh) { svgE.append(sv('line', { x1: x0, x2: x1, y1: sy(t), y2: sy(t), class: 'grid' })); svgE.append(sv('text', { x: x0 - 5, y: sy(t), 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 10, text: o.yFmt(t) })); }
    svgE.append(sv('text', { x: (x0 + x1) / 2, y: H - 4, 'text-anchor': 'middle', text: o.xLabel }));
    svgE.append(sv('text', { x: 10, y: (y0 + y1) / 2, 'text-anchor': 'middle', transform: `rotate(-90 10 ${(y0 + y1) / 2})`, text: o.yLabel }));
    const rmax = Math.min(26, Math.max(10, Math.min(W, H) / 14));
    [...pts].sort((a, b) => (b.s || 0) - (a.s || 0)).forEach(p => {
      const r = 3 + (rmax - 3) * Math.sqrt(Math.max(0, p.s || 0) / smax);
      const c = sv('circle', { cx: sx(p.x), cy: sy(p.y), r, fill: o.color, 'fill-opacity': 0.72, stroke: o.color, class: 'mk' + (o.active != null && o.active !== p.key ? ' dim' : '') });
      hover(c, () => o.tip(p));
      if (o.click) c.addEventListener('click', () => o.click(p));
      svgE.append(c);
      svgE.append(sv('text', { x: sx(p.x) + r + 3, y: sy(p.y), 'dominant-baseline': 'central', 'font-size': 9.5, text: p.label }));
    });
    host.append(svgE);
  }

  function table(host, o, state) {
    const s = state.sort || o.sort || null;
    let rows = o.rows.slice();
    if (s) {
      rows.sort((a, b) => {
        const x = a.cells[s.c], y = b.cells[s.c];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        const r = typeof x === 'number' ? x - y : coll.compare(String(x), String(y));
        return s.d === 'asc' ? r : -r;
      });
    }
    const thead = el('tr', null, o.cols.map((c, ci) => {
      const on = s && s.c === ci;
      return el('th', { class: c.num ? 'n' : null, 'aria-sort': on ? (s.d === 'asc' ? 'ascending' : 'descending') : null },
        el('button', { type: 'button', onclick: () => { state.sort = { c: ci, d: on && s.d === 'desc' ? 'asc' : on ? 'desc' : c.num ? 'desc' : 'asc' }; redrawVisual(host); } },
          c.label, on ? (s.d === 'asc' ? ' ▲' : ' ▼') : ''));
    }));
    const cell = (c, v, row) => {
      const txt = c.fmt ? c.fmt(v, row) : v == null ? '' : String(v);
      const td = el('td', { class: [c.num ? 'n' : '', c.cls ? c.cls(v) : ''].join(' ').trim() || null });
      if (c.swatch && row && row.color) td.append(el('i', { class: 'sw', style: `background:${row.color}` }));
      td.append(txt);
      return td;
    };
    const tb = el('tbody', null, rows.map(r => {
      const tr = el('tr', { class: o.active != null ? (o.active === r.key ? 'on' : 'dim') : null }, o.cols.map((c, ci) => cell(c, r.cells[ci], r)));
      if (o.click) { tr.addEventListener('click', () => o.click(r)); }
      if (o.tip) hover(tr, () => o.tip(r));
      return tr;
    }));
    const t = el('table', { class: 'tbl' }, el('thead', null, thead), tb);
    if (o.total) t.append(el('tfoot', null, el('tr', null, o.cols.map((c, ci) => cell(c, o.total[ci], null)))));
    if (!rows.length) host.append(empty());
    else host.append(t);
  }

  function matrix(host, o, state) {
    const open = state.open || (state.open = new Set());
    const flat = [];
    const sortNodes = ns => ns.slice().sort((a, b) => {
      if (o.sortCol == null) return coll.compare(a.label, b.label);
      const x = a.vals[o.sortCol], y = b.vals[o.sortCol];
      if (!ok(x) && !ok(y)) return 0;
      if (!ok(x)) return 1;
      if (!ok(y)) return -1;
      return y - x;
    });
    const walk = (ns, depth) => {
      for (const n of sortNodes(ns.filter(n => n.vals.some(ok)))) {
        flat.push([n, depth]);
        if (n.kids && open.has(n.key)) walk(n.kids(), depth + 1);
      }
    };
    walk(o.roots, 0);
    const head = el('tr', null, el('th', { text: o.rowLabel }), o.cols.map(c => el('th', { class: 'n', text: c.label })));
    const tb = el('tbody', null, flat.map(([n, depth]) => {
      const isOpen = open.has(n.key);
      const first = el('td', null, el('span', { class: 'ind', style: `width:${depth * 16}px` }),
        n.kids ? el('button', { class: 'tg', type: 'button', 'aria-expanded': String(isOpen), 'aria-label': (isOpen ? 'Mbyll ' : 'Hap ') + n.label,
          onclick: e => { e.stopPropagation(); isOpen ? open.delete(n.key) : open.add(n.key); redrawVisual(host); }, text: isOpen ? '−' : '+' }) : el('span', { class: 'ind', style: 'width:21px' }),
        n.label);
      const tr = el('tr', { class: o.active != null ? (o.active === n.key ? 'on' : 'dim') : null }, first,
        o.cols.map((c, ci) => el('td', { class: 'n', text: c.fmt(n.vals[ci]) })));
      if (o.click) tr.addEventListener('click', () => o.click(n));
      return tr;
    }));
    const t = el('table', { class: 'tbl' }, el('thead', null, head), tb);
    if (o.total) t.append(el('tfoot', null, el('tr', null, el('td', { text: 'Gjithsej' }), o.cols.map((c, ci) => el('td', { class: 'n', text: c.fmt(o.total[ci]) })))));
    host.append(flat.length ? t : empty());
  }

  function card(host, value, label, opt = {}) {
    host.append(el('div', { class: 'cardv' },
      el('b', { text: value === '' || value == null ? '(Bosh)' : value, class: opt.small ? 'small' : null, style: opt.color ? `color:${opt.color}` : null }),
      el('span', { text: label })));
  }

  /* ------------------------------------------------------------ filtrat (slicers) */
  let openPop = null;
  function closePop() {
    if (!openPop) return;
    openPop.remove();
    if (openPop._btn) openPop._btn.setAttribute('aria-expanded', 'false');
    openPop = null;
  }
  document.addEventListener('pointerdown', e => {
    if (openPop && !openPop.contains(e.target) && !(e.target.closest && e.target.closest('.dd'))) closePop();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePop(); hideTip(); } });
  addEventListener('resize', closePop);
  function popup(btn, build) {
    const was = openPop && openPop._key === btn.dataset.key;
    closePop();
    if (was) return;
    const p = el('div', { class: 'pop', role: 'dialog', 'aria-label': btn.dataset.label || 'Filtri' });
    p._key = btn.dataset.key; p._btn = btn;
    document.body.append(p);
    build(p);
    const r = btn.getBoundingClientRect();
    p.style.minWidth = Math.max(220, r.width) + 'px';
    let top = r.bottom + 4;
    if (top + p.offsetHeight > innerHeight - 8 && r.top - p.offsetHeight - 4 > 8) top = r.top - p.offsetHeight - 4;
    p.style.top = top + 'px';
    p.style.left = Math.max(8, Math.min(r.left, innerWidth - 8 - p.offsetWidth)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    openPop = p;
    const f = p.querySelector('input'); if (f) f.focus();
  }
  function ddButton(v, label, summary, build) {
    const btn = el('button', { class: 'dd', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': String(!!(openPop && openPop._key === v.id)), 'data-key': v.id, 'data-label': label },
      el('span', { text: summary }));
    btn.addEventListener('click', () => popup(btn, build));
    if (openPop && openPop._key === v.id) openPop._btn = btn;
    return el('div', { class: 'slic' }, el('span', { class: 'lab', text: label }), btn);
  }
  function hList(o) {
    return {
      cls: 'slicer',
      render(body, v) {
        const cur = o.get();
        const lab = o.title != null ? o.title : v.title;
        const summary = !cur || !cur.length ? 'Të gjitha' : cur.length === 1 ? (o.options.find(x => x[0] === cur[0]) || [0, cur[0]])[1] : 'Disa zgjedhje';
        const fill = p => {
          p.replaceChildren();
          const now = o.get();
          if (!o.single && o.selectAll) {
            const inp = el('input', { type: 'checkbox' });
            inp.checked = !now || now.length === o.options.length;
            inp.addEventListener('change', () => { o.set(inp.checked ? o.options.map(x => x[0]) : null); refresh(); fill(p); });
            p.append(el('label', { class: 'opt' }, inp, el('i', { text: 'Zgjidh të gjitha' })));
          }
          for (const [val, label] of o.options) {
            const inp = el('input', { type: o.single ? 'radio' : 'checkbox', name: o.single ? 'r-' + v.id : null });
            inp.checked = now ? now.includes(val) : false;
            inp.addEventListener('change', () => {
              let next;
              if (o.single) next = [val];
              else {
                const s = new Set(now || []);
                inp.checked ? s.add(val) : s.delete(val);
                next = s.size ? o.options.map(x => x[0]).filter(x => s.has(x)) : null;
              }
              o.set(next);
              refresh();
              if (o.single) closePop(); else fill(p);
            });
            p.append(el('label', { class: 'opt' }, inp, label));
          }
        };
        body.append(ddButton(v, lab, summary, fill));
      },
    };
  }
  function hTree(o) {
    return {
      cls: 'slicer',
      render(body, v) {
        const levels = o.levels, dom = o.domain();
        const lab = o.title != null ? o.title : v.title;
        const exp = vs(v.id).open || (vs(v.id).open = new Set());
        const mask = o.get();
        const selCount = rows => { let s = 0; for (const i of rows) if (mask && mask[i]) s++; return s; };
        const summary = () => {
          if (!mask) return 'Të gjitha';
          let rows = filt(dom, i => mask[i]);
          if (!rows.length) return 'Të gjitha';
          for (const lv of levels) {
            const keys = new Set(rows.map(i => LV[lv].of(i)));
            if (keys.size !== 1) return 'Disa zgjedhje';
            const k = [...keys][0];
            const full = filt(dom, i => LV[lv].of(i) === k);
            if (full.length === rows.length) return LV[lv].label(k);
          }
          return 'Disa zgjedhje';
        };
        const toggle = rows => {
          const m = mask ? Uint8Array.from(mask) : new Uint8Array(NQ);
          const all = rows.every(i => m[i]);
          for (const i of rows) m[i] = all ? 0 : 1;
          o.set(dom.some(i => m[i]) ? m : null);
          refresh();
        };
        const fill = p => {
          p.replaceChildren();
          const m = o.get();
          const q = el('input', { type: 'search', placeholder: 'Kërko…', 'aria-label': 'Kërko në ' + lab });
          const list = el('div');
          const clear = el('button', { type: 'button', class: 'reset', style: 'margin-bottom:4px', text: 'Pastro përzgjedhjen', onclick: () => { o.set(null); refresh(); fill(p); } });
          p.append(q, clear, list);
          const nodeRow = (lv, key, rows, depth, path) => {
            const n = rows.filter(i => m && m[i]).length;
            const inp = el('input', { type: 'checkbox', 'aria-label': LV[lv].label(key) });
            inp.checked = n > 0 && n === rows.length;
            inp.indeterminate = n > 0 && n < rows.length;
            inp.addEventListener('change', () => { toggle(rows); fill(p); });
            const k = lv + ':' + key;
            const canOpen = levels.indexOf(lv) < levels.length - 1;
            const isOpen = exp.has(k);
            const tog = canOpen ? el('button', { class: 'tree-tog', type: 'button', 'aria-expanded': String(isOpen), 'aria-label': (isOpen ? 'Mbyll ' : 'Hap ') + LV[lv].label(key), text: isOpen ? '▾' : '▸', onclick: e => { e.preventDefault(); isOpen ? exp.delete(k) : exp.add(k); fill(p); } }) : el('span', { class: 'tree-sp' });
            return el('label', { class: 'opt', style: `padding-left:${6 + depth * 16}px` }, tog, inp, path || LV[lv].label(key));
          };
          const draw = () => {
            list.replaceChildren();
            const term = q.value.trim().toLowerCase();
            if (term) {
              let shown = 0;
              for (const lv of levels) {
                const g = groupBy(dom, i => LV[lv].of(i));
                for (const [key, rows] of g) {
                  if (!LV[lv].label(key).toLowerCase().includes(term)) continue;
                  if (++shown > 150) break;
                  const i0 = rows[0];
                  const path = levels.slice(0, levels.indexOf(lv) + 1).map(l => LV[l].label(LV[l].of(i0))).join(' › ');
                  list.append(nodeRow(lv, key, rows, 0, path));
                }
              }
              if (!shown) list.append(el('div', { class: 'more', text: 'Asnjë rezultat' }));
              else if (shown > 150) list.append(el('div', { class: 'more', text: 'Shfaqen 150 të parat; ngushtoni kërkimin.' }));
              return;
            }
            const rec = (rows, li, depth) => {
              const lv = levels[li];
              const g = [...groupBy(rows, i => LV[lv].of(i))].sort((a, b) => coll.compare(LV[lv].label(a[0]), LV[lv].label(b[0])));
              for (const [key, rs] of g) {
                list.append(nodeRow(lv, key, rs, depth));
                if (li < levels.length - 1 && exp.has(lv + ':' + key)) rec(rs, li + 1, depth + 1);
              }
            };
            rec(dom, 0, 0);
          };
          q.addEventListener('input', draw);
          draw();
        };
        void selCount;
        body.append(ddButton(v, lab, summary(), fill));
      },
    };
  }
  function hSlider(o) {
    return {
      cls: 'slicer slider',
      keep: true,
      render(body, v) {
        const val = Math.round(o.get() * 100);
        const id = 'sl-' + v.id;
        const range = el('input', { type: 'range', min: 0, max: 100, step: 1, value: val, id, 'aria-label': v.title });
        const num = el('input', { type: 'number', min: 0, max: 100, step: 1, value: val, 'aria-label': v.title + ' (%)' });
        let raf = 0;
        const set = x => { x = Math.max(0, Math.min(100, Math.round(+x || 0))); range.value = x; num.value = x; o.set(x / 100); clearTimeout(raf); raf = setTimeout(refresh, 30); };
        range.addEventListener('input', () => set(range.value));
        num.addEventListener('change', () => set(num.value));
        body.append(el('div', { class: 'slic sld' }, el('label', { class: 'lab', for: id, text: v.title }), range, el('span', null, num, ' %')));
      },
    };
  }
  function hText() {
    return {
      cls: 'textbox',
      render(body, v) {
        const paras = (v.text || []).filter(p => p.some(r => r.t.trim()));
        const long = paras.length > 6;
        const box = el('div', { class: 'tb' + (long ? ' long' : '') });
        for (const p of paras) {
          const first = p.find(r => r.t.trim()) || p[0];
          const cls = first.b && first.s >= 16 ? 'big' : first.b && p.length === 1 ? 'mid' : null;
          box.append(el('p', { class: cls }, p.map(r => (r.b && !cls ? el('b', { text: r.t }) : r.t))));
        }
        body.append(box);
      },
    };
  }

  /* ------------------------------------------------------------ vizualet e përbashkëta */
  const chart = (render, extra = {}) => Object.assign({ cls: 'chart', render }, extra);
  const cardH = (fn, opt = {}) => ({ cls: 'card', render(body, v) { const r = fn(v); card(body, r.value, v.title, Object.assign({}, opt, r)); } });

  const SL = {
    grupimi: () => hList({ options: [['grupi', MODE_LABEL.grupi], ['det', MODE_LABEL.det]], single: true, get: () => [st.sync.grupimi], set: a => { st.sync.grupimi = a[0]; for (const p of Object.values(st.page)) if (p.sel && p.sel.party) p.sel = null; } }),
    baza: () => hList({ options: [[RES, RES], [KQZ, KQZ]], single: true, get: () => [st.sync.baza], set: a => { st.sync.baza = a[0]; } }),
    vendi: () => hList({ options: [['Diaspora', 'Diaspora'], ['Në Shqipëri', 'Në Shqipëri']], get: () => st.sync.vendi, set: a => { st.sync.vendi = a; } }),
    geo: () => hTree({ levels: [0, 1, 2, 3], domain: () => ALL, get: () => st.sync.geo, set: m => { st.sync.geo = m; } }),
    geoCity: (pid, city) => hTree({ title: 'Nj.Ad. › QV', levels: [2, 3], domain: () => CITY[city], get: () => ps(pid).geo, set: m => { ps(pid).geo = m; } }),
    viti: () => hList({ options: [[2023, '2023'], [2025, '2025']], get: () => st.sync.viti, set: a => { st.sync.viti = a; } }),
    grupiHarta: () => hList({ options: ['L. BASHKE', 'MUNDESIA', 'NISMA-SHB', 'PD', 'PS + PSD', 'Te tjeret'].map(g => [g, g]), selectAll: true, get: () => st.sync.grupiHarta, set: a => { st.sync.grupiHarta = a; } }),
    grupiKrah: () => hList({ options: ['L. BASHKE', 'MUNDESIA', 'NISMA-SHB', 'PD', 'PS + PSD', 'Te tjeret'].map(g => [g, g]), single: true, get: () => [st.sync.grupiKrah], set: a => { st.sync.grupiKrah = a[0]; } }),
  };

  function drillState(id) { const s = vs(id); return s.drill || (s.drill = { path: [], on: false }); }
  function drillTools(v) {
    const d = drillState(v.id);
    return el('div', { class: 'vtools' },
      el('button', { type: 'button', title: 'Ngjitu një nivel', 'aria-label': 'Ngjitu një nivel', disabled: !d.path.length, text: '↑', onclick: () => { d.path.pop(); refresh(); } }),
      el('button', { type: 'button', title: 'Zbërthe: klikoni një kategori për të zbritur një nivel', 'aria-label': 'Zbërthe me klikim', 'aria-pressed': String(!!d.on), text: '↓', onclick: () => { d.on = !d.on; refresh(); } }));
  }
  function drillCrumb(v, levels) {
    const d = drillState(v.id);
    const lv = levels[d.path.length];
    return [LV[lv].name, ...d.path.map(p => LV[p.lv].label(p.key))].join(' · ');
  }
  function drillRows(rows, v, levels) {
    const d = drillState(v.id);
    for (const p of d.path) rows = filt(rows, i => LV[p.lv].of(i) === p.key);
    return { rows, lv: levels[d.path.length], d, canDrill: d.path.length < levels.length - 1 };
  }
  function geoCats(rows, lv, sortFn) {
    const g = [...groupBy(rows, i => LV[lv].of(i))].map(([key, rs]) => ({ key, label: LV[lv].label(key), rows: rs }));
    return sortFn ? g.sort(sortFn) : g.sort((a, b) => coll.compare(a.label, b.label));
  }

  /* ------------------------------------------------------------ faqet */
  function natCtx(pid, vid, opt = {}) {
    let r = ALL;
    if (opt.geo !== false) r = maskRows(r, st.sync.geo);
    if (opt.vendi !== false) r = vendiRows(r);
    return applySel(r, pid, vid, opt);
  }
  function groupStats(rows, pm, mode) {
    const pv = pvotes(rows), seats = seatsBy(rows), dia = pvotes(filt(rows, i => Q.dia[i]));
    const gv = gsum(pv, mode, pm), gs = gsum(seats, mode, pm), gd = gsum(dia, mode, pm);
    const T = tot(pv), S = tot(seats);
    return ORD[mode].filter(g => (gv.get(g) || 0) > 0 || (gs.get(g) || 0) > 0).map(g => ({
      g, votes: gv.get(g) || 0, pv: div(gv.get(g) || 0, T), seats: gs.get(g) || 0, ps: div(gs.get(g) || 0, S), dia: gd.get(g) || 0, pd: div(gd.get(g) || 0, gv.get(g) || 0),
    }));
  }

  function pNational(page) {
    const pid = page.id;
    return {
      resolve(v) {
        const mode = () => st.sync.grupimi;
        switch (v.id) {
          case '4ce3dc04895b9d07066d': return SL.grupimi();
          case 'addd332ba074e013cdd0': return SL.geo();
          case 'cfe51b2447187e84435e': return SL.baza();
          case '660763440e87a9c6ac03': return SL.vendi();
          case '1bd6148f70aa50465c22': return chart(body => {
            const { rows, pm } = natCtx(pid, v.id), b = st.sync.baza;
            funnel(body, { steps: [['Zgjedhës', M.zgjBaza(rows, b)], ['Votues', M.votBaza(rows, b)], ['Vota të vlefshme', tot(pvotes(rows), pm)]], color: cssVar('--funnel') || '#7FB0DA' });
          });
          case '9e5bb539e4a6eca969c4': return chart(body => {
            const { rows, pm, own } = natCtx(pid, v.id);
            const gs = groupStats(rows, pm, mode());
            treemap(body, {
              items: gs.map(s => ({ key: s.g, label: s.g, value: s.seats, color: pcol(s.g), s })), fmt: fInt, active: own ? own.party : null,
              tip: it => tipNode(it.label, [['Mandate', fInt(it.s.seats)], ['% e mandateve', fPct(it.s.ps)]]),
              click: it => select(pid, { src: v.id, party: it.key, mode: mode() }),
            });
          });
          case 'f3a59713d5daea5f78d7': return chart(body => {
            const { rows, pm, own } = natCtx(pid, v.id);
            const gs = groupStats(rows, pm, mode()).sort((a, b) => b.pv - a.pv);
            barChart(body, {
              cats: gs.map(s => ({ key: s.g, label: s.g })), series: [{ label: '% e votave', color: C_VOTE }, { label: '% e mandateve', color: C_BLUE }],
              val: (ci, si) => (si ? gs[ci].ps : gs[ci].pv), legend: true, axis: true, labelFmt: v => fPct(v, 0), axisFmt: v => fPct(v, 0),
              active: own ? { ci: gs.findIndex(s => s.g === own.party) } : null,
              tip: ci => tipNode(gs[ci].g, [['% e votave', fPct(gs[ci].pv)], ['% e mandateve', fPct(gs[ci].ps)], ['Vota të vlefshme', fInt(gs[ci].votes)], ['Mandate', fInt(gs[ci].seats)]]),
              click: ci => select(pid, { src: v.id, party: gs[ci].g, mode: mode() }),
            });
          });
          case '7c2ef72342407062389e': return chart((body) => {
            const { rows, pm, own } = natCtx(pid, v.id);
            const gs = groupStats(rows, pm, mode());
            const T = gs.reduce((a, s) => a + s.votes, 0), S = gs.reduce((a, s) => a + s.seats, 0), DI = gs.reduce((a, s) => a + s.dia, 0);
            const allT = tot(pvotes(rows)), allS = tot(seatsBy(rows));
            table(body, {
              cols: [{ label: MODE_LABEL[mode()], swatch: true }, { label: 'Vota të vlefshme', num: true, fmt: fInt }, { label: '% e votave', num: true, fmt: v => fPct(v) },
                { label: 'Mandate', num: true, fmt: fInt }, { label: '% e mandateve', num: true, fmt: v => fPct(v) }, { label: 'Vota nga diaspora', num: true, fmt: fInt }, { label: '% nga diaspora', num: true, fmt: v => fPct(v) }],
              rows: gs.map(s => ({ key: s.g, color: pcol(s.g), cells: [s.g, s.votes, s.pv, s.seats, s.ps, s.dia, s.pd] })),
              total: ['Gjithsej', T, div(T, allT), S, div(S, allS), DI, div(DI, T)], active: own ? own.party : null,
              click: r => select(pid, { src: v.id, party: r.key, mode: mode() }),
            }, vs(v.id));
          }, { scroll: true });
        }
        return null;
      },
    };
  }

  function pTerritory(page) {
    const pid = page.id, L4 = [0, 1, 2, 3];
    return {
      resolve(v) {
        const mode = () => st.sync.grupimi;
        switch (v.id) {
          case '3a21cc985a073bcd945e': return SL.grupimi();
          case '4ca863868d320203b888': return SL.geo();
          case '8454f9ad4c9a9110a038': return SL.baza();
          case '6e4e0dc1671b397930b2': return SL.vendi();
          case 'aadeee50aa8394ad9730': return chart(body => {
            const c = natCtx(pid, v.id), dr = drillRows(c.rows, v, L4);
            const cats = geoCats(dr.rows, dr.lv, (a, b) => sumc(b.rows, Q.valid) - sumc(a.rows, Q.valid));
            const groups = ORD[mode()];
            const gv = cats.map(cc => gsum(pvotes(cc.rows), mode(), c.pm));
            const present = groups.filter(g => gv.some(m => (m.get(g) || 0) > 0));
            const own = c.own;
            barChart(body, {
              orient: 'h', mode: 'percent', cats, series: present.map(g => ({ key: g, label: g, color: pcol(g) })), legend: true,
              val: (ci, si) => gv[ci].get(present[si]) || 0, labelFmt: (raw, ci, si, share) => fPct(share),
              active: own ? { ci: own.geo ? cats.findIndex(x => x.key === own.geo.key && own.geo.lv === dr.lv) : null, si: own.party ? present.indexOf(own.party) : null } : null,
              tip: (ci, si) => {
                const m = gv[ci], T = [...m.values()].reduce((a, b) => a + b, 0);
                if (si == null) return tipNode(cats[ci].label, present.map(g => [g, fPct(div(m.get(g) || 0, T)), pcol(g)]));
                const g = present[si];
                return tipNode(cats[ci].label, [[g, '', pcol(g)], ['Vota të vlefshme', fInt(m.get(g) || 0)], ['% e votave', fPct(div(m.get(g) || 0, T))]]);
              },
              click: (ci, si) => {
                if (si == null && dr.d.on && dr.canDrill) { dr.d.path.push({ lv: dr.lv, key: cats[ci].key }); refresh(); return; }
                const sel = { src: v.id, geo: { lv: dr.lv, key: cats[ci].key } };
                if (si != null) Object.assign(sel, { party: present[si], mode: mode() });
                select(pid, sel);
              },
            });
          }, { tools: drillTools, crumb: v => drillCrumb(v, L4) });
          case '39fa365b392945b99055': return chart(body => {
            const c = natCtx(pid, v.id);
            const cats = geoCats(c.rows, 0).map(cc => Object.assign(cc, { seats: gsum(seatsBy(cc.rows), mode(), c.pm) }));
            cats.sort((a, b) => tot2(b.seats) - tot2(a.seats));
            const present = ORD[mode()].filter(g => cats.some(cc => (cc.seats.get(g) || 0) > 0));
            const own = c.own;
            barChart(body, {
              mode: 'stacked', cats, series: present.map(g => ({ label: g, color: pcol(g) })), legend: true, axis: true, axisFmt: fInt,
              val: (ci, si) => cats[ci].seats.get(present[si]) || 0, labelFmt: raw => fInt(raw),
              totalFmt: ci => fInt(tot2(cats[ci].seats)),
              active: own ? { ci: own.geo && own.geo.lv === 0 ? cats.findIndex(x => x.key === own.geo.key) : null, si: own.party ? present.indexOf(own.party) : null } : null,
              tip: (ci, si) => si == null ? tipNode(cats[ci].label, [['Mandate', fInt(tot2(cats[ci].seats))]]) : tipNode(cats[ci].label, [[present[si], fInt(cats[ci].seats.get(present[si]) || 0), pcol(present[si])], ['Gjithsej mandate', fInt(tot2(cats[ci].seats))]]),
              click: (ci, si) => { const sel = { src: v.id, geo: { lv: 0, key: cats[ci].key } }; if (si != null) Object.assign(sel, { party: present[si], mode: mode() }); select(pid, sel); },
            });
          });
          case '36433ba3e5d148d6185f': return chart(body => {
            const { rows, pm, own } = natCtx(pid, v.id);
            const gs = groupStats(rows, pm, mode()).filter(s => s.votes > 0);
            barChart(body, {
              orient: 'h', cats: gs.map(s => ({ key: s.g, label: s.g })), series: [{ label: '% nga diaspora', color: ci => pcol(gs[ci].g) }],
              val: ci => gs[ci].pd, labelFmt: v => fPct(v), active: own ? { ci: gs.findIndex(s => s.g === own.party) } : null,
              tip: ci => tipNode(gs[ci].g, [['% nga diaspora', fPct(gs[ci].pd)], ['Vota nga diaspora', fInt(gs[ci].dia)], ['Vota të vlefshme', fInt(gs[ci].votes)]]),
              click: ci => select(pid, { src: v.id, party: gs[ci].g, mode: mode() }),
            });
          });
          case '020e7e69c2f317aef2cb': return chart(body => {
            const c = natCtx(pid, v.id, { noParty: true }), dr = drillRows(c.rows, v, L4), b = st.sync.baza;
            const cats = geoCats(dr.rows, dr.lv).map(cc => Object.assign(cc, { p: M.pjes(cc.rows, b) }));
            const own = c.own;
            barChart(body, {
              cats, series: [{ label: 'Pjesëmarrja në votime', color: C_BLUE }], val: ci => cats[ci].p, labelFmt: v => fPct(v), axis: true, axisFmt: v => fPct(v, 0),
              active: own && own.geo ? { ci: cats.findIndex(x => x.key === own.geo.key && own.geo.lv === dr.lv) } : null,
              tip: ci => tipNode(cats[ci].label, [['Pjesëmarrja në votime', fPct(cats[ci].p)], ['Votues', fInt(M.votBaza(cats[ci].rows, b))], ['Zgjedhës', fInt(M.zgjBaza(cats[ci].rows, b))]]),
              click: ci => {
                if (dr.d.on && dr.canDrill) { dr.d.path.push({ lv: dr.lv, key: cats[ci].key }); refresh(); return; }
                select(pid, { src: v.id, geo: { lv: dr.lv, key: cats[ci].key } });
              },
            });
          }, { tools: drillTools, crumb: v => drillCrumb(v, L4) });
        }
        return null;
      },
    };
  }
  const tot2 = m => [...m.values()].reduce((a, b) => a + b, 0);

  const LEV_COL = ['#5E3894', '#0C5D34', '#00529C', '#F48221', '#FFC04D', '#E82D36', '#9E9E9E'];
  function pVolatility(page) {
    const pid = page.id;
    const ctx = vid => applySel(maskRows(ALL, st.sync.geo), pid, vid);
    const pcard = (key) => cardH(v => ({ value: fDec(pedRows(ctx(v.id).rows)[key]) }));
    return {
      resolve(v) {
        switch (v.id) {
          case 'levslicer0000000001': return SL.geo();
          case 'levcard0000000001': return pcard('t2125');
          case 'levcard0000000002': return pcard('n2125');
          case 'levcard0000000003': return pcard('t2325');
          case 'levcard0000000004': return pcard('n2325');
          case 'levslope0000000001': return chart(body => {
            const a = levAgg(njaSet(ctx(v.id).rows));
            const tots = [0, 1, 2].map(y => a.slice(y * 7, y * 7 + 7).reduce((x, z) => x + z, 0));
            const series = D.lev.groups.map((g, gi) => ({ label: g, color: LEV_COL[gi], values: [0, 1, 2].map(y => div(a[y * 7 + gi], tots[y])) }));
            lineChart(body, {
              cats: ['2021', '2023', '2025'], series: series.filter(s => s.values.some(x => ok(x) && x > 0)), fmt: x => fPct(x), fmtAxis: x => fPct(x, 0),
              tip: (si, i) => { const s = series.filter(x => x.values.some(y => ok(y) && y > 0))[si]; return tipNode(s.label + ' · ' + ['2021', '2023', '2025'][i], [['% e votave', fPct(s.values[i])], ['Vota', fInt(a[i * 7 + D.lev.groups.indexOf(s.label)])]]); },
            });
          });
          case 'levizshmeria0matrix1': return chart(body => {
            const c = ctx(v.id);
            const node = (lv, key, rows, levels) => {
              const p = pedRows(rows);
              return {
                key: lv + ':' + key, lv, k: key, label: LV[lv].label(key), vals: [p.t2125, p.n2125, p.t2325, p.n2325],
                kids: levels.length ? () => geoCats(rows, levels[0]).map(cc => node(levels[0], cc.key, cc.rows, levels.slice(1))) : null,
              };
            };
            const tp = pedRows(c.rows);
            matrix(body, {
              rowLabel: 'Qarku', cols: ['21→25', 'të rinjtë 21→25', '23→25', 'të rinjtë 23→25'].map(l => ({ label: l, fmt: fDec })), sortCol: 0,
              roots: geoCats(c.rows, 0).map(cc => node(0, cc.key, cc.rows, [1, 2])), total: [tp.t2125, tp.n2125, tp.t2325, tp.n2325],
              active: c.own ? c.own.geo.lv + ':' + c.own.geo.key : null,
              click: n => select(pid, { src: v.id, geo: { lv: n.lv, key: n.k } }),
            }, vs(v.id));
          }, { scroll: true });
          case 'levtop10000000001': return chart(body => {
            const c = ctx(v.id);
            const cats = geoCats(c.rows, 1).map(cc => Object.assign(cc, pedRows(cc.rows))).filter(cc => ok(cc.t2125))
              .sort((a, b) => b.t2125 - a.t2125).slice(0, 10);
            barChart(body, {
              orient: 'h', mode: 'stacked', cats, legend: true, series: [{ label: 'Mes partive të vjetra', color: '#7A8BA0' }, { label: 'Te partitë e reja', color: '#FFC04D' }],
              val: (ci, si) => (si ? cats[ci].n2125 : cats[ci].t2125 - cats[ci].n2125), labelFmt: raw => fDec(raw), totalFmt: ci => fDec(cats[ci].t2125),
              active: c.own ? { ci: cats.findIndex(x => c.own.geo.lv === 1 && x.key === c.own.geo.key) } : null,
              tip: ci => tipNode(cats[ci].label, [['Indeksi 2021→2025', fDec(cats[ci].t2125)], ['Mes partive të vjetra', fDec(cats[ci].t2125 - cats[ci].n2125), '#7A8BA0'], ['Te partitë e reja', fDec(cats[ci].n2125), '#FFC04D']]),
              click: ci => select(pid, { src: v.id, geo: { lv: 1, key: cats[ci].key } }),
            });
          });
        }
        return null;
      },
    };
  }

  function pGender(page) {
    const pid = page.id, LG = [0, 1, 3];
    const ctx = (vid, opt) => natCtx(pid, vid, opt);
    const gcard = key => cardH(v => { const g = M.gender(ctx(v.id).rows, st.sync.baza); return { value: key === 'hendek' ? fDec(g[key]) : fPct(g[key]) }; });
    return {
      resolve(v) {
        const mode = () => st.sync.grupimi;
        switch (v.id) {
          case 'e273aa5459954a267746': return SL.geo();
          case 'd744379899cd60edc470': return SL.vendi();
          case 'cc7626d7328047863abc': return SL.baza();
          case '594d21e59e380a98d928': return SL.grupimi();
          case '86b3ab39827ccc1798e8': return gcard('gra');
          case 'b71c6dcf1898f4254c10': return gcard('burra');
          case 'f7d117de5bb3198e5dbf': return gcard('hendek');
          case 'f3081ddfb43d7f93a5ee': return gcard('graVot');
          case 'eeef082250f73736da56': return gcard('mbulimi');
          case '385b08bb20c49c3f0671': return chart(body => {
            const c = ctx(v.id, { noParty: true }), dr = drillRows(c.rows, v, LG), b = st.sync.baza;
            const cats = geoCats(dr.rows, dr.lv).map(cc => Object.assign(cc, M.gender(cc.rows, b))).filter(cc => ok(cc.gra) || ok(cc.burra));
            const own = c.own;
            barChart(body, {
              cats, legend: true, axis: true, axisFmt: x => fPct(x, 0), series: [{ label: 'Pjesëmarrja e grave', color: '#D16BA5' }, { label: 'Pjesëmarrja e burrave', color: C_BLUE }],
              val: (ci, si) => (si ? cats[ci].burra : cats[ci].gra), labelFmt: x => fPct(x),
              active: own && own.geo ? { ci: cats.findIndex(x => x.key === own.geo.key && own.geo.lv === dr.lv) } : null,
              tip: ci => tipNode(cats[ci].label, [['Pjesëmarrja e grave', fPct(cats[ci].gra), '#D16BA5'], ['Pjesëmarrja e burrave', fPct(cats[ci].burra), C_BLUE], ['Hendeku gjinor (p.p.)', fDec(cats[ci].hendek)]]),
              click: ci => {
                if (dr.d.on && dr.canDrill) { dr.d.path.push({ lv: dr.lv, key: cats[ci].key }); refresh(); return; }
                select(pid, { src: v.id, geo: { lv: dr.lv, key: cats[ci].key } });
              },
            });
          }, { tools: drillTools, crumb: v => drillCrumb(v, LG) });
          case '79fb22be70f73597ecf7': return chart(body => {
            const c = ctx(v.id);
            const buckets = ['1. nën 45%', '2. 45–48%', '3. 48–51%', '4. 51–54%', '5. mbi 54%'];
            const g = groupBy(filt(c.rows, i => HASG[i]), i => GG[i]);
            const cats = buckets.filter(k => g.has(k)).map(k => ({ key: k, label: k, m: gsum(pvotes(g.get(k)), mode(), c.pm) }));
            const present = ORD[mode()].filter(x => cats.some(cc => (cc.m.get(x) || 0) > 0));
            const own = c.own;
            barChart(body, {
              mode: 'percent', cats, legend: true, series: present.map(x => ({ label: x, color: pcol(x) })),
              val: (ci, si) => cats[ci].m.get(present[si]) || 0, labelFmt: (raw, ci, si, sh) => fPct(sh, 0),
              active: own ? { ci: own.gg ? cats.findIndex(x => x.key === own.gg) : null, si: own.party ? present.indexOf(own.party) : null } : null,
              tip: (ci, si) => { const T = tot2(cats[ci].m); if (si == null) return tipNode('Gra votuese ' + cats[ci].label.slice(3), present.map(x => [x, fPct(div(cats[ci].m.get(x) || 0, T)), pcol(x)])); const x = present[si]; return tipNode('Gra votuese ' + cats[ci].label.slice(3), [[x, '', pcol(x)], ['Vota të vlefshme', fInt(cats[ci].m.get(x) || 0)], ['% e votave', fPct(div(cats[ci].m.get(x) || 0, T))]]); },
              click: (ci, si) => { const sel = { src: v.id, gg: cats[ci].key }; if (si != null) Object.assign(sel, { party: present[si], mode: mode() }); select(pid, sel); },
            });
          });
          case '73ff3aca92f69b0847a1': return chart(body => {
            const c = ctx(v.id, { noParty: true }), b = st.sync.baza;
            const vals = rows => { const g = M.gender(rows, b); return [g.graZgj, g.gra, g.burra, g.hendek, g.graVot, g.mbulimi]; };
            const node = (lv, key, rows, levels) => ({ key: lv + ':' + key, lv, k: key, label: LV[lv].label(key), vals: vals(rows), kids: levels.length ? () => geoCats(rows, levels[0]).map(cc => node(levels[0], cc.key, cc.rows, levels.slice(1))) : null });
            const fmts = [x => fPct(x), x => fPct(x), x => fPct(x), fDec, x => fPct(x), x => fPct(x)];
            matrix(body, {
              rowLabel: 'Qarku', cols: ['Gra në listë (%)', 'Pjesëmarrja e grave', 'Pjesëmarrja e burrave', 'Hendeku gjinor (p.p.)', 'Gra ndër votues (%)', 'Mbulimi i të dhënave gjinore'].map((l, i) => ({ label: l, fmt: fmts[i] })),
              roots: geoCats(c.rows, 0).map(cc => node(0, cc.key, cc.rows, [1, 3])), total: vals(c.rows),
              active: c.own && c.own.geo ? c.own.geo.lv + ':' + c.own.geo.key : null,
              click: n => select(pid, { src: v.id, geo: { lv: n.lv, key: n.k } }),
            }, vs(v.id));
          }, { scroll: true });
        }
        return null;
      },
    };
  }

  /* Faqja e fshehur "Tooltip: Rezultatet sipas njësisë" si tooltip i hartës */
  function unitTooltip(nja) {
    const k = KRN.get(nja) || {};
    const mode = st.sync.grupimi, key = mode === 'det' ? 'det' : 'grupi';
    const groups = ORD.tooltip.filter(g => (mode === 'det' ? g !== 'PS + PSD' : g !== 'PS' && g !== 'PSD'));
    const share = (y, g) => (k[y] && k[y][key][g] ? div(k[y][key][g], k[y].t) : null);
    const rows = groups.map(g => ({ g, a: share(2023, g), b: share(2025, g) }))
      .filter(r => (r.a || 0) > 0 || (r.b || 0) > 0).sort((x, y) => (y.b || 0) - (x.b || 0));
    const r25 = filt(ALL, i => qvN[i] === nja);
    const n = el('div');
    n.append(el('b', { class: 'tt', text: `${D.njesi[nja][0]} · ${fInt(tot(pvotes(r25)))} vota të vlefshme (2025)` }));
    n.append(el('div', { class: 'sub', text: `Pjesëmarrja në votime 2025: ${fPct(M.pjes(r25, RES))} (rezidentë)` }));
    n.append(legendEl([[C_GREY, '2023'], [C_BLUE, '2025']]));
    const W = 290, labW = 78, bh = 9, H = rows.length * (bh * 2 + 8);
    const max = Math.max(0.01, ...rows.flatMap(r => [r.a || 0, r.b || 0]));
    const s = sv('svg', { width: W, height: H, class: 'cht' });
    rows.forEach((r, i) => {
      const y = i * (bh * 2 + 8);
      s.append(sv('text', { x: labW - 6, y: y + bh, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 10, text: r.g }));
      [[r.a, C_GREY], [r.b, C_BLUE]].forEach(([v, c], j) => {
        if (!ok(v)) return;
        const w = (v / max) * (W - labW - 44);
        s.append(sv('rect', { x: labW, y: y + j * bh, width: Math.max(1, w), height: bh - 1, fill: c }));
        s.append(sv('text', { x: labW + w + 4, y: y + j * bh + bh / 2, 'dominant-baseline': 'central', 'font-size': 9, class: 'lbl', text: fPct(v) }));
      });
    });
    n.append(s);
    return n;
  }

  function cityName(page) { return /Vlor/.test(page.name) ? 'Vlorë' : 'Tiranë'; }
  const unitIdx = (city) => { const m = new Map(); for (const i of cityUnits(city)) m.set(D.njesi[i][0], i); return m; };

  function pMap(page) {
    const pid = page.id, city = cityName(page), U = unitIdx(city), mapD = D.maps[city];
    const ctx = vid => applySel(maskRows(CITY[city], ps(pid).geo), pid, vid);
    const partyMask = () => { const s = st.sync.grupiHarta; if (!s || !s.length) return null; const set = new Set(s); return PG.grupi.map(g => set.has(g)); };
    return {
      resolve(v) {
        if (v.type === 'listSlicer') {
          if (!v.title) return SL.geoCity(pid, city);
          if (v.title === 'Viti') return SL.viti();
          if (v.title.startsWith('Grupimi')) return SL.grupimi();
          if (v.title === 'Subjekti zgjedhor') return SL.grupiHarta();
        }
        if (v.type === 'shapeMap' && v.title.startsWith('Përqindja')) return chart(body => {
          const c = ctx(v.id), pm = partyMask(), g = groupBy(c.rows, i => qvN[i]);
          const val = n => { const rs = g.get(U.get(n)); if (!rs) return null; const pv = pvotes(rs); return div(tot(pv, pm), tot(pv)); };
          choropleth(body, {
            map: mapD, kind: 'blue', has: n => g.has(U.get(n)), value: val, fmt: x => fPct(x), label: v.title,
            active: c.own ? D.njesi[c.own.nja][0] : null,
            tip: n => (g.has(U.get(n)) ? unitTooltip(U.get(n)) : tipNode(n, [['% e votave', '']])),
            click: n => select(pid, { src: v.id, nja: U.get(n) }),
          });
        });
        if (v.type === 'shapeMap') return chart(body => {
          const c = ctx(v.id), g = groupBy(c.rows, i => qvN[i]);
          choropleth(body, {
            map: mapD, kind: 'green', has: n => g.has(U.get(n)), value: n => M.pjes(g.get(U.get(n)), RES), fmt: x => fPct(x), label: v.title,
            active: c.own ? D.njesi[c.own.nja][0] : null,
            tip: n => { const rs = g.get(U.get(n)); return tipNode(n, rs ? [['Pjesëmarrja në votime', fPct(M.pjes(rs, RES))], ['Votues', fInt(M.votAll(rs))]] : []); },
            click: n => select(pid, { src: v.id, nja: U.get(n) }),
          });
        });
        if (v.type === 'barChart') return chart(body => {
          const c = ctx(v.id), mode = st.sync.grupimi, key = mode === 'det' ? 'det' : 'grupi';
          const sel = st.sync.grupiHarta && st.sync.grupiHarta.length ? new Set(st.sync.grupiHarta) : null;
          const allowed = new Set(D.parties.filter(p => !sel || sel.has(p.grupi)).map(p => p[key]));
          const groups = ORD.tooltip.filter(g => (mode === 'det' ? g !== 'PS + PSD' : g !== 'PS' && g !== 'PSD') && allowed.has(g));
          const years = st.sync.viti && st.sync.viti.length ? st.sync.viti : [2023, 2025];
          const cats = [...njaSet(c.rows)].map(n => ({ key: n, label: D.njesi[n][0], k: krahAgg([n], years) })).sort((a, b) => coll.compare(a.label, b.label));
          const present = groups.filter(g => cats.some(cc => (cc.k[key][g] || 0) > 0));
          barChart(body, {
            orient: 'h', mode: 'stacked', cats, legend: true, series: present.map(g => ({ label: g, color: pcol(g) })),
            val: (ci, si) => div(cats[ci].k[key][present[si]] || 0, cats[ci].k.t), labelFmt: raw => fPct(raw),
            active: c.own ? { ci: cats.findIndex(x => x.key === c.own.nja) } : null,
            tip: (ci, si) => si == null ? tipNode(cats[ci].label, present.map(g => [g, fPct(div(cats[ci].k[key][g] || 0, cats[ci].k.t)), pcol(g)])) : tipNode(cats[ci].label, [[present[si], fPct(div(cats[ci].k[key][present[si]] || 0, cats[ci].k.t)), pcol(present[si])], ['Vota', fInt(cats[ci].k[key][present[si]] || 0)], ['Viti', years.join(', ')]]),
            click: ci => select(pid, { src: v.id, nja: cats[ci].key }),
          });
        });
        return null;
      },
    };
  }

  function pCompare(page) {
    const pid = page.id, city = cityName(page), U = unitIdx(city), units = [...U.values()], mapD = D.maps[city];
    const GR = ['L. BASHKE', 'MUNDESIA', 'NISMA-SHB', 'PD', 'PS + PSD', 'Te tjeret'];
    const stats = (us, g) => {
      const a = krahAgg(us, [2023]), b = krahAgg(us, [2025]);
      const v23 = a.grupi[g] || 0, v25 = b.grupi[g] || 0, p23 = div(v23, a.t), p25 = div(v25, b.t);
      return { v23, v25, p23, p25, ndr: a.t > 0 && b.t > 0 ? (p25 - p23) * 100 : null };
    };
    const ctxUnits = vid => { const s = ps(pid).sel; return s && s.src !== vid && s.nja != null ? [s.nja] : units; };
    const own = vid => { const s = ps(pid).sel; return s && s.src === vid ? s : null; };
    const selGroup = () => { const s = ps(pid).sel; return s && s.kgroup ? s.kgroup : null; };
    const groupsIn = us => GR.filter(g => { const s = stats(us, g); return s.v23 > 0 || s.v25 > 0; });
    return {
      resolve(v) {
        if (v.type === 'listSlicer') return SL.grupiKrah();
        if (v.type === 'shapeMap') return chart(body => {
          const g = selGroup() || st.sync.grupiKrah, o = own(v.id);
          choropleth(body, {
            map: mapD, kind: 'div', has: () => true, value: n => stats([U.get(n)], g).ndr, fmt: fPP, label: v.title,
            active: o && o.nja != null ? D.njesi[o.nja][0] : null,
            tip: n => { const s = stats([U.get(n)], g); return tipNode(n, [['Subjekti', g], ['2023', fPct(s.p23)], ['2025', fPct(s.p25)], ['Ndryshimi (p.p.)', fPP(s.ndr)]]); },
            click: n => select(pid, { src: v.id, nja: U.get(n) }),
          });
        });
        if (v.type === 'clusteredColumnChart') return chart(body => {
          const us = ctxUnits(v.id), gs = groupsIn(us).map(g => Object.assign({ g }, stats(us, g))).sort((a, b) => (b.p25 || 0) - (a.p25 || 0));
          const sg = selGroup();
          barChart(body, {
            cats: gs.map(s => ({ key: s.g, label: s.g })), legend: true, series: [{ label: '2023', color: C_GREY }, { label: '2025', color: C_BLUE }],
            val: (ci, si) => (si ? gs[ci].p25 : gs[ci].p23), labelFmt: x => fPct(x), detail: (ci, si) => fShort(si ? gs[ci].v25 : gs[ci].v23),
            active: sg ? { ci: gs.findIndex(s => s.g === sg) } : null,
            tip: (ci, si) => tipNode(gs[ci].g, [['Viti', si == null ? '' : si ? '2025' : '2023'], ['% e votave 2023', fPct(gs[ci].p23)], ['% e votave 2025', fPct(gs[ci].p25)], ['Vota 2023', fInt(gs[ci].v23)], ['Vota 2025', fInt(gs[ci].v25)]]),
            click: ci => select(pid, { src: v.id, kgroup: gs[ci].g }),
          });
        });
        if (v.type === 'clusteredBarChart') return chart(body => {
          const us = ctxUnits(v.id), gs = groupsIn(us).map(g => Object.assign({ g }, stats(us, g))).filter(s => ok(s.ndr)).sort((a, b) => b.ndr - a.ndr);
          const sg = selGroup();
          barChart(body, {
            orient: 'h', cats: gs.map(s => ({ key: s.g, label: s.g })), series: [{ label: 'Ndryshimi (p.p.)', color: ci => pcol(gs[ci].g) }],
            val: ci => gs[ci].ndr, labelFmt: x => fDec(x), active: sg ? { ci: gs.findIndex(s => s.g === sg) } : null,
            tip: ci => tipNode(gs[ci].g, [['Ndryshimi (p.p.)', fPP(gs[ci].ndr)], ['2023', fPct(gs[ci].p23)], ['2025', fPct(gs[ci].p25)]]),
            click: ci => select(pid, { src: v.id, kgroup: gs[ci].g }),
          });
        });
        if (v.type === 'tableEx') return chart(body => {
          const us = ctxUnits(v.id), sg = selGroup();
          const best = (g, dir) => {
            let r = null;
            for (const n of us) { const s = stats([n], g); if (!ok(s.ndr)) continue; if (!r || (dir > 0 ? s.ndr > r[1] : s.ndr < r[1])) r = [n, s.ndr]; }
            return r ? `${D.njesi[r[0]][0]} (${fPP(r[1])})` : null;
          };
          const rows = groupsIn(us).map(g => {
            const s = stats(us, g);
            const up = us.filter(n => (stats([n], g).ndr || 0) > 0).length;
            return { key: g, color: pcol(g), cells: [g, s.v23, s.v25, s.v25 - s.v23, s.p23, s.p25, s.ndr, up, best(g, 1), best(g, -1)] };
          });
          const a = krahAgg(us, [2023]), b = krahAgg(us, [2025]);
          table(body, {
            cols: [{ label: 'Subjekti zgjedhor', swatch: true }, { label: 'Vota 2023', num: true, fmt: fInt }, { label: 'Vota 2025', num: true, fmt: fInt },
              { label: 'Ndryshimi i votave', num: true, fmt: fInt }, { label: '% 2023', num: true, fmt: x => fPct(x) }, { label: '% 2025', num: true, fmt: x => fPct(x) },
              { label: 'Ndryshimi (p.p.)', num: true, fmt: fDec, cls: x => (x > 0 ? 'pos' : x < 0 ? 'neg' : '') }, { label: `Nj.Ad. në rritje (nga ${units.length})`, num: true, fmt: fInt },
              { label: 'Rritja më e madhe' }, { label: 'Rënia më e madhe' }],
            rows, sort: { c: 5, d: 'desc' }, active: sg,
            total: ['Gjithsej', a.t, b.t, b.t - a.t, a.t ? 1 : null, b.t ? 1 : null, null, null, null, null],
            click: r => select(pid, { src: v.id, kgroup: r.key }),
          }, vs(v.id));
        }, { scroll: true });
        return null;
      },
    };
  }

  function pAbsent(page) {
    const pid = page.id, city = cityName(page), U = unitIdx(city), mapD = D.maps[city];
    const cityCtx = vid => applySel(CITY[city], pid, vid);
    const unitsOf = rows => groupBy(rows, i => qvN[i]);
    return {
      resolve(v) {
        const t = v.title;
        if (v.type === 'card') {
          const isCity = t.includes(city) || t.startsWith('Hendeku');
          const rows = vid => (isCity ? cityCtx(vid).rows : ALL);
          if (t.startsWith('Zgjedhës në listë')) return cardH(() => ({ value: fInt(M.listaShq(ALL)) }));
          if (t.startsWith('Emigrantë')) return cardH(() => ({ value: fInt(M.emigr(ALL)) }));
          if (t.startsWith('Pjesëmarrja e rezidentëve')) return cardH(x => ({ value: fPct(M.pjesRes(rows(x.id)), isCity ? 1 : 2) }));
          if (t.startsWith('Rezidentë që nuk votuan')) return cardH(x => ({ value: fInt(M.nukRes(rows(x.id))) }));
          if (t.startsWith('Nuk votuan sipas listës')) return cardH(x => ({ value: fInt(M.nukLista(rows(x.id))) }));
          if (t.startsWith('Hendeku')) return cardH(x => ({ value: fSigned(scen(rows(x.id), 0, 0).diff) }));
        }
        if (v.type === 'clusteredBarChart') return chart(body => {
          const cats = geoCats(filt(ALL, i => !Q.dia[i]), 0).map(c => Object.assign(c, { p: M.pjesRes(c.rows) })).sort((a, b) => a.p - b.p);
          barChart(body, {
            orient: 'h', cats, series: [{ label: 'Pjesëmarrja e rezidentëve', color: C_BLUE }], val: ci => cats[ci].p, labelFmt: x => fPct(x),
            tip: ci => tipNode(cats[ci].label, [['Pjesëmarrja e rezidentëve', fPct(cats[ci].p)], ['Votues brenda vendit', fInt(M.votShq(cats[ci].rows))], ['Rezidentë 18+ (vlerësim)', fInt(M.zgjRes(cats[ci].rows))]]),
          });
        });
        if (v.type === 'scatterChart') return chart(body => {
          const c = cityCtx(v.id), g = unitsOf(CITY[city]);
          const pts = [...g].map(([n, rs]) => ({ key: n, label: D.njesi[n][0], x: M.pjesLista(rs), y: scen(rs, 0, 0).sh25, s: M.nukRes(rs) }));
          scatter(body, {
            pts, color: '#D6336C', xFmt: x => fPct(x, 0), yFmt: x => fPct(x, 0), xLabel: 'Pjesëmarrja (lista e KQZ)', yLabel: 'SHESHI 2025',
            active: c.own ? c.own.nja : (ps(pid).sel && ps(pid).sel.nja != null ? ps(pid).sel.nja : null),
            tip: p => tipNode(p.label, [['Pjesëmarrja (lista e KQZ)', fPct(p.x)], ['SHESHI 2025', fPct(p.y)], ['Rezidentë që nuk votuan', fInt(p.s)]]),
            click: p => select(pid, { src: v.id, nja: p.key }),
          });
        });
        if (v.type === 'shapeMap') return chart(body => {
          const c = cityCtx(v.id), g = unitsOf(CITY[city]);
          const s = ps(pid).sel;
          choropleth(body, {
            map: mapD, kind: 'blue', has: n => g.has(U.get(n)), value: n => M.nukRes(g.get(U.get(n))), fmt: fInt, label: t,
            active: s && s.nja != null ? D.njesi[s.nja][0] : null,
            tip: n => { const rs = g.get(U.get(n)); return tipNode(n, rs ? [['Rezidentë që nuk votuan', fInt(M.nukRes(rs))], ['Pjesëmarrja (lista e KQZ)', fPct(M.pjesLista(rs))], ['SHESHI 2025', fPct(scen(rs, 0, 0).sh25)], ['Nuk votuan sipas listës', fInt(M.nukLista(rs))]] : []); },
            click: n => select(pid, { src: v.id, nja: U.get(n) }),
          });
          void c;
        });
        if (v.type === 'tableEx') return chart(body => {
          const c = cityCtx(v.id), avg = scen(c.rows, 0, 0).sh25;
          const rows = c.rows.map(i => {
            const r = [i], sh = scen(r, 0, 0).sh25, nl = M.nukLista(r);
            return { key: i, cells: [Q.kodi[i], D.njesi[qvN[i]][0], M.pjesLista(r), nl, sh, nl * (div(sh, avg) || 0)] };
          });
          table(body, {
            cols: [{ label: 'QV' }, { label: 'Nj.Ad.' }, { label: 'Pjesëmarrja', num: true, fmt: x => fPct(x) }, { label: 'Nuk votuan', num: true, fmt: fInt }, { label: 'SHESHI', num: true, fmt: x => fPct(x) }, { label: 'Përparësia', num: true, fmt: fInt }],
            rows, sort: { c: 5, d: 'desc' }, total: ['Gjithsej', '', M.pjesLista(c.rows), M.nukLista(c.rows), avg, M.nukLista(c.rows)],
          }, vs(v.id));
        }, { scroll: true });
        return null;
      },
    };
  }

  const SHESHI_NOTE = 'Në votat e 2025 numërohen NISMA-SHB (nga 2027 thjesht Shqipëria Bëhet), MUNDESIA dhe L. BASHKE; Aktivistat e Sheshit nuk kishin listë.';
  const SCEN_DEF ={ 'Tiranë': [0.32, 0.32], 'Vlorë': [0.30, 0.45] };
  function pScenario(page) {
    const pid = page.id, city = cityName(page), U = unitIdx(city), mapD = D.maps[city];
    const P = ps(pid);
    if (P.x == null) [P.x, P.y] = SCEN_DEF[city];
    const ctx = vid => applySel(CITY[city], pid, vid);
    const unitStats = rows => groupBy(rows, i => qvN[i]);
    return {
      resolve(v) {
        const t = v.title;
        if (v.type === 'slicer') return t.startsWith('X') ? hSlider({ get: () => P.x, set: x => { P.x = x; } }) : hSlider({ get: () => P.y, set: y => { P.y = y; } });
        if (v.type === 'card') {
          if (t.startsWith('A del')) return cardH(x => { const s = scen(ctx(x.id).rows, P.x, P.y); return { value: s.verdict, color: s.diff > 0 ? 'var(--pos)' : 'var(--neg)', small: true }; });
          if (t.startsWith('Votat')) return cardH(x => ({ value: fInt(scen(ctx(x.id).rows, P.x, P.y).v['Grupimi SHESHIT']) }));
          if (t.startsWith('%')) return cardH(x => ({ value: fPct(scen(ctx(x.id).rows, P.x, P.y).pct('Grupimi SHESHIT')) }));
          if (t.startsWith('Diferenca')) return cardH(x => ({ value: fSigned(scen(ctx(x.id).rows, P.x, P.y).diff) }));
        }
        if (v.type === 'shapeMap') return chart(body => {
          const g = unitStats(CITY[city]), c = ctx(v.id);
          const S = n => scen(g.get(U.get(n)), P.x, P.y);
          choropleth(body, {
            map: mapD, kind: 'blue', has: n => g.has(U.get(n)), value: n => S(n).diff, fmt: fSigned, label: t,
            active: c.own ? D.njesi[c.own.nja][0] : null,
            tip: n => { const s = S(n); return tipNode(n, [['% SHESHI 2025', fPct(s.sh25)], ['% SHESHI skenar', fPct(s.pct('Grupimi SHESHIT'))], ['% PS PSD skenar', fPct(s.pct('PS + PSD'))], ['% PD skenar', fPct(s.pct('PD'))], ['Fituesi skenar', s.winner], ['Diferenca e SHESHIT', fSigned(s.diff)]]); },
            click: n => select(pid, { src: v.id, nja: U.get(n) }),
          });
        });
        if (v.type === 'clusteredBarChart') return chart(body => {
          const s = scen(ctx(v.id).rows, P.x, P.y);
          const ks = ORD.skenar.filter(k => s.base[k] > 0 || s.v[k] > 0).sort((a, b) => (s.pct(b) || 0) - (s.pct(a) || 0));
          barChart(body, {
            orient: 'h', cats: ks.map(k => ({ key: k, label: k })), legend: true, series: [{ label: 'Rezultati 2025', color: C_GREY }, { label: 'Skenari', color: C_BLUE }],
            val: (ci, si) => (si ? s.pct(ks[ci]) : s.pct25(ks[ci])), labelFmt: x => fPct(x), detail: (ci, si) => fShort(si ? s.v[ks[ci]] : s.base[ks[ci]]),
            tip: ci => tipNode(ks[ci], [['Rezultati 2025', fPct(s.pct25(ks[ci]))], ['Vota 2025', fInt(s.base[ks[ci]])], ['Skenari', fPct(s.pct(ks[ci]))], ['Vota në skenar', fInt(s.v[ks[ci]])]], ks[ci] === 'Grupimi SHESHIT' ? SHESHI_NOTE : null),
          });
        });
        if (v.type === 'tableEx') return chart(body => {
          const c = ctx(v.id), g = unitStats(c.rows);
          const tot = scen(c.rows, P.x, P.y);
          const list = [...g].map(([n, rs]) => { const s = scen(rs, P.x, P.y), p = pedRows(rs), nr = M.nukRes(rs); return { n, rs, s, p, nr, ab: nr * (s.sh25 || 0) }; });
          const shAvg = tot.sh25, poolAvg = list.length ? list.reduce((a, x) => a + x.nr, 0) / list.length : 0;
          const focus = x => (x.s.sh25 >= shAvg && x.nr >= poolAvg ? 'Mobilizo: bazë e fortë, rezervë e madhe' : x.s.sh25 < shAvg && x.nr >= poolAvg ? 'Bind dhe mobilizo: rezervë e madhe' : x.s.sh25 >= shAvg ? 'Mbaj bazën: rezervë e vogël' : 'Përparësi e ulët');
          const tp = pedRows(c.rows), tnr = M.nukRes(c.rows);
          table(body, {
            cols: [{ label: 'Nj.Ad.' }, { label: 'SHESHI 2025', num: true, fmt: x => fPct(x) }, { label: 'Pedersen 21→25', num: true, fmt: fDec }, { label: 'Pedersen 23→25', num: true, fmt: fDec },
              { label: 'Nga kalimi', num: true, fmt: fInt }, { label: 'Nga abstenuesit', num: true, fmt: fInt }, { label: 'Potenciali', num: true, fmt: fInt }, { label: 'I pari' }, { label: 'Fokusi' }],
            rows: list.map(x => ({ key: x.n, cells: [D.njesi[x.n][0], x.s.sh25, x.p.t2125, x.p.t2325, x.s.transfer, x.ab, x.s.transfer + x.ab, x.s.winner, list.length > 1 || !ps(pid).sel ? focus(x) : null] })),
            sort: { c: 6, d: 'desc' }, active: c.own ? c.own.nja : null,
            total: ['Gjithsej', tot.sh25, tp.t2125, tp.t2325, tot.transfer, tnr * (tot.sh25 || 0), tot.transfer + tnr * (tot.sh25 || 0), tot.winner, null],
            click: r => select(pid, { src: v.id, nja: r.key }),
          }, vs(v.id));
        }, { scroll: true });
        return null;
      },
    };
  }

  const SPEC = {
    'a3f1873a865ce3927fc0': pNational, 'd3982c39f88a31ce6b92': pTerritory, 'e7c41a9d2b65f03a8d11': pVolatility, '3538e75c7b0ebc9b84e4': pGender,
    '7b4e2d91c6a35f08e1d4': pMap, '8a3c6e15d7f2094b1c5e': pCompare, '4e8b2c71d9a3f60a5b14': pAbsent, '5c1e9a7d3b60f2e48a17': pScenario,
    '9a1e4c7b2d58f03e6a21': pMap, '9a1e4c7b2d58f03e6a22': pCompare, '9a1e4c7b2d58f03e6a23': pAbsent, '9a1e4c7b2d58f03e6a24': pScenario,
  };

  /* ------------------------------------------------------------ vizatimi i faqes */
  let cur = null, flowMode = null;
  const canvasEl = $('#canvas'), pagebar = $('#pagebar'), tabs = $('#tabs');
  const isFlow = () => canvasEl.clientWidth < 1000;
  function flowH(v, h) {
    if (v.type === 'shapeMap') return 400;
    if (v.type === 'tableEx' || v.type === 'pivotTable') return Math.round(Math.min(520, Math.max(320, v.h * 0.6)));
    if (v.type === 'funnel' || v.type === 'treemap') return 300;
    void h;
    return Math.round(Math.min(480, Math.max(280, v.h * 0.55)));
  }
  function renderPage(page) {
    cur = page; hideTip(); closePop();
    const spec = SPEC[page.id](page);
    flowMode = isFlow();
    canvasEl.className = 'canvas ' + (flowMode ? 'flow' : 'fixed');
    canvasEl.style.aspectRatio = flowMode ? '' : `${page.w} / ${page.h}`;
    canvasEl.replaceChildren();
    page._boxes = [];
    const order = flowMode
      ? page.visuals.slice().sort((a, b) => Math.round(a.y / 40) - Math.round(b.y / 40) || a.x - b.x)
      : page.visuals;
    for (const v of order) {
      const h = v.type === 'textbox' ? hText() : spec.resolve(v);
      if (!h) continue;
      const cls = h.cls || 'chart';
      const box = el('section', { class: 'vis ' + cls + (cls === 'textbox' ? '' : ' boxed'), 'aria-label': v.title || null });
      if (!flowMode) Object.assign(box.style, { left: pc(v.x / page.w), top: pc(v.y / page.h), width: pc(v.w / page.w), height: pc(v.h / page.h) });
      else box.style.setProperty('--fh', flowH(v, h) + 'px');
      canvasEl.append(box);
      page._boxes.push({ v, h, box });
    }
    drawAll(true);
    renderBar();
    for (const a of tabs.querySelectorAll('a')) {
      if (a.dataset.id === page.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const act = tabs.querySelector('[aria-current="page"]');
    if (act) tabs.scrollTo({ left: act.offsetLeft - tabs.clientWidth / 2 + act.offsetWidth / 2, behavior: 'smooth' });
    document.title = page.name + ' · Zgjedhjet në Shqipëri';
  }
  function drawBox(b) {
    const { v, h, box } = b;
    box.replaceChildren();
    if (h.cls === 'chart' || !h.cls) {
      const title = (h.title || v.title || '').trim();
      const head = el('div', { class: 'vhead' }, el('h2', { class: 'vtitle', text: title, title }));
      if (h.tools) head.append(h.tools(v));
      box.append(head);
      if (h.crumb) box.append(el('div', { class: 'crumb', text: h.crumb(v) }));
    }
    const body = el('div', { class: 'vbody' + (h.scroll ? ' scroll' : '') });
    box.append(body);
    b.body = body;
    try { h.render(body, v, b); } catch (e) { console.error(e); body.replaceChildren(empty('Vizuali nuk u vizatua')); }
  }
  function drawAll(all) { for (const b of cur._boxes) if (all || !b.h.keep) drawBox(b); }
  function redrawVisual(node) { const b = cur._boxes.find(x => x.box.contains(node)); if (b) { const sc = b.body.scrollTop; drawBox(b); b.body.scrollTop = sc; } }
  function refresh() { hideTip(); drawAll(false); renderBar(); }
  function renderBar() {
    const s = ps(cur.id).sel;
    pagebar.replaceChildren(el('h1', { text: cur.name }));
    if (s) pagebar.append(el('span', { class: 'chip' }, 'Përzgjedhur: ' + selText(s), el('button', { type: 'button', 'aria-label': 'Hiq përzgjedhjen', text: '✕', onclick: () => { ps(cur.id).sel = null; refresh(); } })));
    pagebar.append(el('button', { class: 'reset', type: 'button', text: 'Rikthe filtrat', title: 'Kthen të gjithë filtrat në gjendjen fillestare', onclick: () => { st.sync = DEF_SYNC(); st.page = {}; st.vis = {}; renderPage(cur); } }));
  }

  /* ------------------------------------------------------------ navigimi, pamja, nisja */
  function route() {
    const pages = D.pages.filter(p => !p.hidden);
    const slug = decodeURIComponent(location.hash.slice(1));
    const page = pages.find(p => p.slug === slug) || pages[0];
    renderPage(page);
    count(page);
  }
  /* GoatCounter: faqet ndërrohen me #, ndaj çdo faqe numërohet veç. Nëse skripti s'është ngarkuar ende, numërohet kur ngarkohet. */
  let pendingCount = null;
  function count(page) {
    const c = { path: location.pathname + '#' + page.slug, title: page.name };
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(c);
    else pendingCount = c;
  }
  const gcScript = document.getElementById('gc');
  if (gcScript) gcScript.addEventListener('load', () => { if (pendingCount && window.goatcounter && window.goatcounter.count) { window.goatcounter.count(pendingCount); pendingCount = null; } });
  const THEMES = [['auto', 'Pamja: automatike'], ['light', 'Pamja: e çelët'], ['dark', 'Pamja: e errët']];
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    $('#theme').textContent = THEMES.find(x => x[0] === t)[1];
  }
  let theme = 'auto';
  try { theme = localStorage.getItem('tema') || 'auto'; } catch (e) { /* pa ruajtje */ }
  if (!THEMES.some(x => x[0] === theme)) theme = 'auto';
  applyTheme(theme);
  $('#theme').addEventListener('click', () => {
    theme = THEMES[(THEMES.findIndex(x => x[0] === theme) + 1) % THEMES.length][0];
    applyTheme(theme);
    try { localStorage.setItem('tema', theme); } catch (e) { /* pa ruajtje */ }
    if (cur) drawAll(true);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (cur) drawAll(true); });

  document.body.append(tipEl);
  fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
    prep(d);
    tabs.replaceChildren(...d.pages.filter(p => !p.hidden).map(p => el('a', { href: '#' + p.slug, 'data-id': p.id, text: p.name })));
    addEventListener('hashchange', route);
    route();
    let t = 0, lastW = canvasEl.clientWidth;
    new ResizeObserver(() => {
      const w = canvasEl.clientWidth;
      if (Math.abs(w - lastW) < 2) return;
      lastW = w;
      clearTimeout(t);
      t = setTimeout(() => { if (!cur) return; if (isFlow() !== flowMode) renderPage(cur); else drawAll(true); }, 120);
    }).observe(canvasEl);
  }).catch(e => {
    console.error(e);
    canvasEl.replaceChildren(el('p', { class: 'loading', text: 'Të dhënat nuk u ngarkuan. Provoni të rifreskoni faqen.' }));
  });
})();
