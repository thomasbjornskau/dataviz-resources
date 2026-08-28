/* ==========================================================================
   Choosing the right chart — ESTP Data Visualisation, Module 1
   Vanilla JavaScript. No framework, no chart library, no build step.

   Data: Statistics Norway, StatBank table 06913,
   "Population 1 January and population changes during the calendar year",
   whole country (region code 0), 1951-2026.

   The page first tries a local extract in data/06913-norway.json (produced by
   data/fetch-data.sh). If that file is absent it calls the PxWebApi v2 endpoint
   directly with a single HTTP GET. See README.md.
   ========================================================================== */

'use strict';

/* ------------------------------------------------------------------ config */

const TABLE = '06913';
const LOCAL_EXTRACT = 'data/06913-norway.json';
const API_URL =
  'https://data.ssb.no/api/pxwebapi/v2/tables/' + TABLE + '/data' +
  '?lang=en' +
  '&valueCodes[Region]=0' +
  '&valueCodes[ContentsCode]=*' +
  '&valueCodes[Tid]=*' +
  '&outputFormat=json-stat2';

const C = {
  dark: '#274247',
  accent: '#00824D',
  light: '#F0F8F9',
  rule: '#C3DCDC',
  green: '#1A9D49',
  blue: '#1D9DE2',
  gold: '#C78800',
  pink: '#C775A7',
  darkGreen: '#075745',
  darkPink: '#A3136C',
  grey: '#909090',
  seq: ['#ECFEED', '#B6E8B8', '#1A9D49', '#075745', '#274247']
};

const NBSP = '\u00A0';

/* --------------------------------------------------------------- utilities */

function fmt(n, decimals) {
  if (n === null || n === undefined || !isFinite(n)) return '..';
  const d = decimals || 0;
  const s = Math.abs(n).toFixed(d);
  const parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (n < 0 ? '\u2212' : '') + parts.join('.');
}

function fmtSigned(n, decimals) {
  if (n === null || n === undefined || !isFinite(n)) return '..';
  return (n > 0 ? '+' : '') + fmt(n, decimals);
}

function el(tag, attrs, kids) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) {
    if (attrs[k] === null || attrs[k] === undefined) continue;
    node.setAttribute(k, String(attrs[k]));
  }
  if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (k) {
    if (k) node.appendChild(k);
  });
  return node;
}

function text(str, attrs) {
  const t = el('text', attrs);
  t.textContent = str;
  return t;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function extent(values) {
  let lo = Infinity, hi = -Infinity;
  values.forEach(function (v) {
    if (v === null || v === undefined || !isFinite(v)) return;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  });
  if (lo === Infinity) return [0, 1];
  return [lo, hi];
}

function niceTicks(lo, hi, count) {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const raw = span / (count || 5);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step;
  if (norm < 1.5) step = 1; else if (norm < 3) step = 2;
  else if (norm < 7) step = 5; else step = 10;
  step *= mag;
  const ticks = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) {
    ticks.push(Math.round(t / step) * step);
  }
  return ticks;
}

function hostWidth(host) {
  const w = host.clientWidth || host.parentNode.clientWidth || 700;
  return Math.max(300, Math.min(900, Math.round(w)));
}

/* ------------------------------------------------------- JSON-stat2 parsing */

function parseJsonStat(js) {
  const dimIds = js.id;
  const sizes = js.size;
  const strides = new Array(dimIds.length);
  let acc = 1;
  for (let i = dimIds.length - 1; i >= 0; i--) { strides[i] = acc; acc *= sizes[i]; }

  const timeDim = (js.role && js.role.time && js.role.time[0]) || 'Tid';
  const metricDim = (js.role && js.role.metric && js.role.metric[0]) || 'ContentsCode';

  const timeObj = js.dimension[timeDim];
  const metricObj = js.dimension[metricDim];
  if (!timeObj || !metricObj) throw new Error('Expected a time dimension and a contents dimension.');

  const timeCodes = Object.keys(timeObj.category.index)
    .sort(function (a, b) { return timeObj.category.index[a] - timeObj.category.index[b]; });
  const metricCodes = Object.keys(metricObj.category.index)
    .sort(function (a, b) { return metricObj.category.index[a] - metricObj.category.index[b]; });

  // Every other dimension is held at its single selected value.
  const fixed = {};
  dimIds.forEach(function (d) {
    if (d === timeDim || d === metricDim) return;
    const cat = js.dimension[d].category.index;
    fixed[d] = Object.keys(cat).sort(function (a, b) { return cat[a] - cat[b]; })[0];
  });

  function flatIndex(metricCode, timeCode) {
    let idx = 0;
    for (let i = 0; i < dimIds.length; i++) {
      const d = dimIds[i];
      let pos;
      if (d === timeDim) pos = timeObj.category.index[timeCode];
      else if (d === metricDim) pos = metricObj.category.index[metricCode];
      else pos = js.dimension[d].category.index[fixed[d]];
      idx += pos * strides[i];
    }
    return idx;
  }

  function readValue(i) {
    if (js.status && js.status[String(i)] != null) return null;   // ".", ".." etc.
    const v = js.value[i];
    return (v === null || v === undefined || !isFinite(v)) ? null : v;
  }

  const byCode = {};
  const labels = {};
  const decimals = {};
  metricCodes.forEach(function (mc) {
    labels[mc] = (metricObj.category.label && metricObj.category.label[mc]) || mc;
    decimals[mc] =
      (metricObj.category.unit && metricObj.category.unit[mc] && metricObj.category.unit[mc].decimals) ||
      (js.extension && js.extension.px && js.extension.px.decimals) || 0;
    byCode[mc] = timeCodes.map(function (tc) { return readValue(flatIndex(mc, tc)); });
  });

  return {
    years: timeCodes.map(function (t) { return parseInt(t, 10); }),
    timeCodes: timeCodes,
    metricCodes: metricCodes,
    byCode: byCode,
    labels: labels,
    decimals: decimals,
    updated: js.updated || null,
    label: js.label || ''
  };
}

/* -------------------------------------------------------- role resolution
   The contents codes of a StatBank table are not part of its published title,
   so the roles below are resolved from the English labels the API returns.
   Whatever is resolved is listed at the bottom of the page, so a mismatch is
   visible rather than silent.                                               */

const ROLE_RULES = [
  ['population', [
    function (l) { return /^population/.test(l) && !/(growth|change|increase|decrease|adjust)/.test(l); },
    function (l) { return /population/.test(l) && !/(growth|change|increase|decrease|adjust)/.test(l); },
    function (l) { return /^persons?$/.test(l); }
  ]],
  ['births', [
    function (l) { return /^(live\s+)?births?/.test(l); },
    function (l) { return /birth/.test(l) && !/(excess|surplus|net|per)/.test(l); },
    function (l) { return /\bborn\b/.test(l); }
  ]],
  ['deaths', [
    function (l) { return /^deaths?\b/.test(l); },
    function (l) { return /\bdeaths?\b/.test(l) && !/(excess|surplus|per|rate)/.test(l); }
  ]],
  ['excessBirths', [
    function (l) { return /(excess of birth|birth surplus|surplus of birth)/.test(l); },
    function (l) { return /natural (increase|change|growth)/.test(l); }
  ]],
  ['immigration', [
    function (l) { return /^immigration/.test(l); },
    function (l) { return /immigration/.test(l) && !/net/.test(l); },
    function (l) { return /^(in-?migration|in-?migrations)/.test(l) && !/net/.test(l); }
  ]],
  ['emigration', [
    function (l) { return /^emigration/.test(l); },
    function (l) { return /emigration/.test(l) && !/net/.test(l); },
    function (l) { return /^(out-?migration|out-?migrations)/.test(l) && !/net/.test(l); }
  ]],
  ['netMigration', [
    function (l) { return /^net\s+(migration|immigration|in-?migration)/.test(l); },
    function (l) { return /net\s+(migration|immigration|in-?migration)/.test(l); }
  ]],
  ['growth', [
    function (l) { return /^population (growth|increase)/.test(l); },
    function (l) { return /(population (growth|increase)|increase in population|growth in population)/.test(l); }
  ]]
];

/* Preferred patterns win over fallbacks; a contents code is claimed once. */
function resolveRoles(parsed) {
  const roles = {};
  const used = {};
  const labels = parsed.metricCodes.map(function (code) {
    return String(parsed.labels[code] || code).toLowerCase().replace(/\s+/g, ' ').trim();
  });
  const maxRank = Math.max.apply(null, ROLE_RULES.map(function (r) { return r[1].length; }));
  for (let rank = 0; rank < maxRank; rank++) {
    ROLE_RULES.forEach(function (rule) {
      const name = rule[0], tests = rule[1];
      if (roles[name] || !tests[rank]) return;
      for (let i = 0; i < parsed.metricCodes.length; i++) {
        const code = parsed.metricCodes[i];
        if (used[code]) continue;
        if (tests[rank](labels[i])) { roles[name] = code; used[code] = true; return; }
      }
    });
  }
  return roles;
}

function buildModel(parsed) {
  const roles = resolveRoles(parsed);
  const years = parsed.years;
  const n = years.length;

  function seriesOf(role) {
    const code = roles[role];
    return code ? parsed.byCode[code].slice() : new Array(n).fill(null);
  }

  const m = {
    years: years,
    labels: {},
    roles: roles,
    parsed: parsed,
    series: {
      population: seriesOf('population'),
      births: seriesOf('births'),
      deaths: seriesOf('deaths'),
      excessBirths: seriesOf('excessBirths'),
      immigration: seriesOf('immigration'),
      emigration: seriesOf('emigration'),
      netMigration: seriesOf('netMigration'),
      growth: seriesOf('growth')
    },
    derived: {}
  };

  // Fill in the two composite flows if the table does not publish them directly.
  for (let i = 0; i < n; i++) {
    if (m.series.excessBirths[i] === null &&
        m.series.births[i] !== null && m.series.deaths[i] !== null) {
      m.series.excessBirths[i] = m.series.births[i] - m.series.deaths[i];
      m.derived.excessBirths = true;
    }
    if (m.series.netMigration[i] === null &&
        m.series.immigration[i] !== null && m.series.emigration[i] !== null) {
      m.series.netMigration[i] = m.series.immigration[i] - m.series.emigration[i];
      m.derived.netMigration = true;
    }
    // Population growth for year t = population 1 Jan (t+1) - population 1 Jan (t).
    if (m.series.growth[i] === null &&
        m.series.population[i] !== null && i + 1 < n && m.series.population[i + 1] !== null) {
      m.series.growth[i] = m.series.population[i + 1] - m.series.population[i];
      m.derived.growth = true;
    }
  }

  // Statistical adjustments: SSB's own definition of the residual.
  m.series.adjustments = years.map(function (y, i) {
    const g = m.series.growth[i], e = m.series.excessBirths[i], nm = m.series.netMigration[i];
    if (g === null || e === null || nm === null) return null;
    return g - (e + nm);
  });

  const L = {
    population: 'Population 1 January',
    births: 'Births',
    deaths: 'Deaths',
    excessBirths: 'Excess of births',
    immigration: 'Immigration',
    emigration: 'Emigration',
    netMigration: 'Net migration',
    growth: 'Population growth',
    adjustments: 'Statistical adjustments'
  };
  Object.keys(L).forEach(function (k) {
    const code = roles[k];
    m.labels[k] = code ? parsed.labels[code] : L[k];
  });
  m.labels.adjustments = L.adjustments;

  m.lastCompleteIndex = (function () {
    for (let i = years.length - 1; i >= 0; i--) {
      if (m.series.births[i] !== null && m.series.growth[i] !== null) return i;
    }
    return years.length - 1;
  })();

  return m;
}

/* ------------------------------------------------------------- chart frame */

/* The y-axis labels decide how much room the left margin needs. Guessing a
   fixed 44px clips "5 000 000" on a phone. */
function leftMarginFor(values) {
  let widest = 0;
  values.forEach(function (v) {
    if (v === null || v === undefined || !isFinite(v)) return;
    widest = Math.max(widest, fmt(v, 0).length);
  });
  return Math.max(34, Math.min(92, Math.round(widest * 6.3) + 14));
}

function makeFrame(host, opts) {
  const W = hostWidth(host);
  const narrow = W < 460;
  const H = opts.height || Math.round(W * (narrow ? 0.78 : 0.52));
  const m = Object.assign(
    { top: 16, right: narrow ? 10 : 18, bottom: 34, left: narrow ? 44 : 62 },
    opts.margin || {}
  );
  const svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H,
    role: 'img',
    'aria-label': opts.ariaLabel || ''
  });
  const inner = { x: m.left, y: m.top, w: W - m.left - m.right, h: H - m.top - m.bottom };
  return { svg: svg, W: W, H: H, m: m, inner: inner, narrow: narrow };
}

function yAxis(f, scale, ticks, decimals, opts) {
  const g = el('g');
  ticks.forEach(function (t) {
    const y = scale(t);
    g.appendChild(el('line', {
      x1: f.inner.x, x2: f.inner.x + f.inner.w, y1: y, y2: y,
      class: (t === 0 && opts && opts.zeroLine) ? 'zero-line' : 'grid-line',
      'data-enc': 'position', 'data-mark': 'stroke'
    }));
    g.appendChild(text(fmt(t, decimals), {
      x: f.inner.x - 8, y: y + 4, 'text-anchor': 'end', class: 'tick-text'
    }));
  });
  return g;
}

function xYearAxis(f, scale, years, everyN) {
  const g = el('g');
  const step = everyN || (f.narrow ? 20 : 10);
  const y = f.inner.y + f.inner.h;
  g.appendChild(el('line', {
    x1: f.inner.x, x2: f.inner.x + f.inner.w, y1: y, y2: y, class: 'axis-line',
    'data-enc': 'position', 'data-mark': 'stroke'
  }));
  let lastLabelX = -1e6;
  years.forEach(function (yr, i) {
    if (yr % step !== 0 && i !== years.length - 1) return;
    const x = scale(i);
    if (x - lastLabelX < 34) return;
    lastLabelX = x;
    g.appendChild(el('line', { x1: x, x2: x, y1: y, y2: y + 4, class: 'axis-line' }));
    g.appendChild(text(String(yr), {
      x: x, y: y + 17, 'text-anchor': 'middle', class: 'tick-text'
    }));
  });
  return g;
}

/* Shared hover / keyboard focus band for year-indexed charts. */
function attachYearFocus(f, host, years, xOf, onFocus, shared) {
  const g = el('g');
  let localIndex = 0;
  const band = el('rect', { class: 'focus-band', x: -99, y: f.inner.y, width: 0, height: f.inner.h });
  g.appendChild(band);
  const step = f.inner.w / Math.max(1, years.length);

  function set(i) {
    if (i < 0 || i >= years.length) return;
    if (shared) state.focusIndex = i;
    localIndex = i;
    band.setAttribute('x', xOf(i) - step / 2);
    band.setAttribute('width', Math.max(2, step));
    onFocus(i);
  }

  const hit = el('rect', {
    class: 'hit-area', x: f.inner.x, y: f.inner.y, width: f.inner.w, height: f.inner.h
  });
  function fromEvent(ev) {
    const rect = f.svg.getBoundingClientRect();
    const px = (ev.clientX - rect.left) / rect.width * f.W;
    const i = Math.round((px - f.inner.x) / f.inner.w * (years.length - 1));
    set(Math.max(0, Math.min(years.length - 1, i)));
  }
  hit.addEventListener('pointermove', fromEvent);
  hit.addEventListener('pointerdown', fromEvent);
  g.appendChild(hit);

  f.svg.setAttribute('tabindex', '0');
  const base = f.svg.getAttribute('aria-label') || '';
  f.svg.setAttribute('aria-label', base +
    ' Interactive: focus this chart and use the left and right arrow keys to read each year.');
  f.svg.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowRight') { set(Math.min(years.length - 1, localIndex + 1)); ev.preventDefault(); }
    if (ev.key === 'ArrowLeft') { set(Math.max(0, localIndex - 1)); ev.preventDefault(); }
    if (ev.key === 'Home') { set(0); ev.preventDefault(); }
    if (ev.key === 'End') { set(years.length - 1); ev.preventDefault(); }
  });

  f.svg.appendChild(g);
  return set;
}

/* -------------------------------------------------------------- renderers */

function linePath(points) {
  let d = '', pen = false;
  points.forEach(function (p) {
    if (p === null) { pen = false; return; }
    d += (pen ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ';
    pen = true;
  });
  return d.trim();
}

/* Multi-series line chart over years. */
function renderLines(host, cfg) {
  clear(host);
  const years = cfg.years;
  const all = [];
  cfg.series.forEach(function (s) { s.values.forEach(function (v) { all.push(v); }); });
  let [lo, hi] = extent(all);
  if (cfg.zeroBaseline !== false) lo = Math.min(0, lo);
  if (lo === hi) hi = lo + 1;
  const pad = (hi - lo) * 0.06;
  const yLo = cfg.zeroBaseline !== false ? lo : lo - pad;
  const yHi = hi + pad;
  const f = makeFrame(host, {
    height: cfg.height, ariaLabel: cfg.ariaLabel,
    margin: { left: leftMarginFor([yLo, yHi]) }
  });

  const xOf = function (i) {
    return f.inner.x + (years.length === 1 ? f.inner.w / 2 : i / (years.length - 1) * f.inner.w);
  };
  const yOf = function (v) { return f.inner.y + f.inner.h - (v - yLo) / (yHi - yLo) * f.inner.h; };

  f.svg.appendChild(yAxis(f, yOf, niceTicks(yLo, yHi, f.narrow ? 4 : 6), 0, { zeroLine: yLo <= 0 }));
  f.svg.appendChild(xYearAxis(f, xOf, years));

  const dots = el('g');
  cfg.series.forEach(function (s) {
    const pts = s.values.map(function (v, i) { return v === null ? null : [xOf(i), yOf(v)]; });
    f.svg.appendChild(el('path', {
      d: linePath(pts), fill: 'none', stroke: s.color,
      'stroke-width': s.width || 2,
      'stroke-dasharray': s.dash || null,
      'data-enc': 'connection position', 'data-mark': 'stroke'
    }));
    if (years.length <= 14) {
      pts.forEach(function (p) {
        if (p) dots.appendChild(el('circle', {
          cx: p[0], cy: p[1], r: 3, fill: s.color,
          'data-enc': 'position', 'data-mark': 'fill'
        }));
      });
    }
  });
  f.svg.appendChild(dots);

  if (cfg.legendInto && cfg.series.length > 1) htmlLegend(cfg.legendInto, cfg.series, 'line');

  const markers = el('g');
  f.svg.appendChild(markers);
  host.appendChild(f.svg);

  const setFocus = attachYearFocus(f, host, years, xOf, function (i) {
    clear(markers);
    cfg.series.forEach(function (s) {
      const v = s.values[i];
      if (v === null) return;
      markers.appendChild(el('circle', {
        cx: xOf(i), cy: yOf(v), r: 4.5, fill: '#fff', stroke: s.color, 'stroke-width': 2.5
      }));
    });
    if (cfg.onFocus) cfg.onFocus(i);
  }, !!cfg.onFocus);
  setFocus(cfg.onFocus ? Math.min(state.focusIndex, years.length - 1) : years.length - 1);
  return f;
}

/* Legends live in HTML, above the chart, so they wrap on narrow screens
   instead of being scaled down to an unreadable size. */
function htmlLegend(host, series, kind) {
  series.forEach(function (sr) {
    if (!sr.label) return;
    const span = document.createElement('span');
    const key = document.createElement('i');
    if (kind === 'area') {
      key.className = 'swatch';
      key.style.background = sr.color;
    } else {
      key.style.borderTopColor = sr.color;
      key.style.borderTopWidth = (sr.width || 2) + 'px';
      if (sr.dash) key.style.borderTopStyle = 'dashed';
    }
    span.appendChild(key);
    span.appendChild(document.createTextNode(sr.label));
    host.appendChild(span);
  });
}

/* Column chart over years, zero baseline, sign shown by position and colour. */
function renderColumns(host, cfg) {
  clear(host);
  const years = cfg.years, values = cfg.values;
  let [lo, hi] = extent(values);
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  const pad = (hi - lo) * 0.06;
  const yLo = lo - (lo < 0 ? pad : 0), yHi = hi + pad;
  const f = makeFrame(host, {
    height: cfg.height, ariaLabel: cfg.ariaLabel,
    margin: { left: leftMarginFor([yLo, yHi]) }
  });
  const step = f.inner.w / years.length;
  const bw = Math.max(1, step * 0.72);
  const xOf = function (i) { return f.inner.x + step * (i + 0.5); };
  const yOf = function (v) { return f.inner.y + f.inner.h - (v - yLo) / (yHi - yLo) * f.inner.h; };
  const zero = yOf(0);

  f.svg.appendChild(yAxis(f, yOf, niceTicks(yLo, yHi, f.narrow ? 4 : 6), 0, { zeroLine: true }));

  const bars = el('g');
  values.forEach(function (v, i) {
    if (v === null) return;
    const y = Math.min(zero, yOf(v));
    const h = Math.abs(yOf(v) - zero);
    bars.appendChild(el('rect', {
      x: xOf(i) - bw / 2, y: y, width: bw, height: Math.max(0.6, h),
      fill: v < 0 ? C.darkPink : C.green,
      'data-enc': 'length position', 'data-mark': 'fill'
    }));
  });
  f.svg.appendChild(bars);
  f.svg.appendChild(xYearAxis(f, xOf, years));
  f.svg.appendChild(el('line', {
    x1: f.inner.x, x2: f.inner.x + f.inner.w, y1: zero, y2: zero, class: 'zero-line'
  }));

  const markers = el('g');
  f.svg.appendChild(markers);
  host.appendChild(f.svg);

  const setFocus = attachYearFocus(f, host, years, xOf, function (i) {
    clear(markers);
    const v = values[i];
    if (v !== null) {
      markers.appendChild(el('rect', {
        x: xOf(i) - bw / 2 - 1, y: Math.min(zero, yOf(v)) - 1,
        width: bw + 2, height: Math.abs(yOf(v) - zero) + 2,
        fill: 'none', stroke: C.dark, 'stroke-width': 1.6
      }));
    }
    if (cfg.onFocus) cfg.onFocus(i);
  }, !!cfg.onFocus);
  setFocus(cfg.onFocus ? Math.min(state.focusIndex, years.length - 1) : years.length - 1);
  return f;
}

/* Horizontal dot plot: position only, one row per year. */
function renderDotPlot(host, cfg) {
  clear(host);
  const years = cfg.years, values = cfg.values;
  const W = hostWidth(host);
  const rowH = 18;
  const H = years.length * rowH + 56;
  const f = makeFrame(host, {
    height: H, ariaLabel: cfg.ariaLabel,
    margin: { top: 14, right: 54, bottom: 34, left: 44 }
  });
  let [lo, hi] = extent(values);
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  const pad = (hi - lo) * 0.08;
  const xLo = lo - pad, xHi = hi + pad;
  const xOf = function (v) { return f.inner.x + (v - xLo) / (xHi - xLo) * f.inner.w; };
  const yOf = function (i) { return f.inner.y + rowH * (i + 0.5); };

  niceTicks(xLo, xHi, f.narrow ? 3 : 5).forEach(function (t) {
    f.svg.appendChild(el('line', {
      x1: xOf(t), x2: xOf(t), y1: f.inner.y, y2: f.inner.y + years.length * rowH,
      class: t === 0 ? 'zero-line' : 'grid-line',
      'data-enc': 'position', 'data-mark': 'stroke'
    }));
    f.svg.appendChild(text(fmt(t, 0), {
      x: xOf(t), y: f.inner.y + years.length * rowH + 17, 'text-anchor': 'middle', class: 'tick-text'
    }));
  });

  const g = el('g');
  values.forEach(function (v, i) {
    g.appendChild(text(String(years[i]), {
      x: f.inner.x - 8, y: yOf(i) + 4, 'text-anchor': 'end', class: 'tick-text'
    }));
    if (v === null) return;
    g.appendChild(el('line', {
      x1: xOf(0), x2: xOf(v), y1: yOf(i), y2: yOf(i), stroke: C.rule, 'stroke-width': 1
    }));
    g.appendChild(el('circle', {
      cx: xOf(v), cy: yOf(i), r: 4.5, fill: v < 0 ? C.darkPink : C.green,
      'data-enc': 'position', 'data-mark': 'fill'
    }));
    g.appendChild(text(fmtSigned(v, 0), {
      x: xOf(v) + (v < 0 ? -10 : 10), y: yOf(i) + 4,
      'text-anchor': v < 0 ? 'end' : 'start', class: 'value-label'
    }));
  });
  f.svg.appendChild(g);
  host.appendChild(f.svg);
  return f;
}

/* Stacked area — rendered on purpose to show how it fails with negatives. */
function renderStackedArea(host, cfg) {
  clear(host);
  const years = cfg.years;
  const cum0 = years.map(function (_, i) {
    const a = cfg.series[0].values[i], b = cfg.series[1].values[i];
    return (a === null || b === null) ? null : a + b;
  });
  const f = makeFrame(host, {
    height: cfg.height, ariaLabel: cfg.ariaLabel,
    margin: { left: leftMarginFor(cum0.concat(cfg.series[0].values)) }
  });
  const cum = years.map(function (_, i) {
    let a = cfg.series[0].values[i], b = cfg.series[1].values[i];
    if (a === null || b === null) return [null, null];
    return [a, a + b];
  });
  const flat = [];
  cum.forEach(function (c) { flat.push(c[0], c[1]); });
  let [lo, hi] = extent(flat);
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  const pad = (hi - lo) * 0.06;
  const yLo = lo - pad, yHi = hi + pad;
  const xOf = function (i) { return f.inner.x + i / (years.length - 1) * f.inner.w; };
  const yOf = function (v) { return f.inner.y + f.inner.h - (v - yLo) / (yHi - yLo) * f.inner.h; };

  f.svg.appendChild(yAxis(f, yOf, niceTicks(yLo, yHi, f.narrow ? 4 : 6), 0, { zeroLine: true }));

  function areaPath(lower, upper) {
    let d = '', started = false;
    const top = [], bottom = [];
    years.forEach(function (_, i) {
      const u = upper(i), l = lower(i);
      if (u === null || l === null) return;
      top.push([xOf(i), yOf(u)]);
      bottom.push([xOf(i), yOf(l)]);
    });
    if (!top.length) return '';
    top.forEach(function (p) { d += (started ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' '; started = true; });
    for (let i = bottom.length - 1; i >= 0; i--) d += 'L' + bottom[i][0].toFixed(1) + ' ' + bottom[i][1].toFixed(1) + ' ';
    return d + 'Z';
  }

  f.svg.appendChild(el('path', {
    d: areaPath(function () { return 0; }, function (i) { return cum[i][0]; }),
    fill: C.green, opacity: 0.75, 'data-enc': 'length position', 'data-mark': 'fill'
  }));
  f.svg.appendChild(el('path', {
    d: areaPath(function (i) { return cum[i][0]; }, function (i) { return cum[i][1]; }),
    fill: C.blue, opacity: 0.75, 'data-enc': 'length position', 'data-mark': 'fill'
  }));

  f.svg.appendChild(xYearAxis(f, xOf, years));
  if (cfg.legendInto) htmlLegend(cfg.legendInto, cfg.series, 'area');
  host.appendChild(f.svg);
  return f;
}

/* Heatmap: series x year, colour scaled within each row. */
function renderHeatmap(host, cfg) {
  clear(host);
  const years = cfg.years, rows = cfg.rows;
  const W = hostWidth(host);
  const narrow = W < 460;
  const labelW = narrow ? 78 : 132;
  const rowH = narrow ? 26 : 32;
  const H = rows.length * rowH + 74;
  const f = makeFrame(host, {
    height: H, ariaLabel: cfg.ariaLabel,
    margin: { top: 10, right: 6, bottom: 64, left: labelW }
  });
  const cw = f.inner.w / years.length;

  rows.forEach(function (row, r) {
    const vals = row.values.filter(function (v) { return v !== null; });
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    row._lo = lo; row._hi = hi;
    f.svg.appendChild(text(row.label, {
      x: labelW - 10, y: f.inner.y + rowH * r + rowH / 2 + 4,
      'text-anchor': 'end', class: narrow ? 'tick-text' : 'node-label'
    }));
    row.values.forEach(function (v, i) {
      const x = f.inner.x + cw * i;
      const y = f.inner.y + rowH * r;
      if (v === null) {
        f.svg.appendChild(el('rect', {
          x: x, y: y, width: Math.max(1, cw - 0.5), height: rowH - 2,
          fill: '#fff', stroke: C.rule, 'stroke-dasharray': '1 1'
        }));
        return;
      }
      const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
      f.svg.appendChild(el('rect', {
        x: x, y: y, width: Math.max(1, cw - 0.5), height: rowH - 2,
        fill: rampColor(t),
        'data-enc': 'colour position', 'data-mark': 'fill'
      }));
    });
  });

  // Year axis
  const baseY = f.inner.y + rows.length * rowH;
  years.forEach(function (yr, i) {
    if (yr % (narrow ? 20 : 10) !== 0) return;
    const x = f.inner.x + cw * (i + 0.5);
    f.svg.appendChild(el('line', { x1: x, x2: x, y1: baseY, y2: baseY + 4, class: 'axis-line' }));
    f.svg.appendChild(text(String(yr), { x: x, y: baseY + 17, 'text-anchor': 'middle', class: 'tick-text' }));
  });

  // Legend
  const lg = el('g', { transform: 'translate(' + f.inner.x + ',' + (baseY + 30) + ')' });
  const lw = Math.min(180, f.inner.w * 0.6);
  for (let i = 0; i < 40; i++) {
    lg.appendChild(el('rect', {
      x: lw / 40 * i, y: 0, width: lw / 40 + 0.5, height: 9, fill: rampColor(i / 39)
    }));
  }
  lg.appendChild(text('lowest in that row', { x: 0, y: 22, class: 'tick-text' }));
  lg.appendChild(text('highest', { x: lw, y: 22, 'text-anchor': 'end', class: 'tick-text' }));
  f.svg.appendChild(lg);

  const markers = el('g');
  f.svg.appendChild(markers);
  host.appendChild(f.svg);

  const setFocus = attachYearFocus(
    { svg: f.svg, W: f.W, inner: { x: f.inner.x, y: f.inner.y, w: f.inner.w, h: rows.length * rowH }, narrow: narrow },
    host, years,
    function (i) { return f.inner.x + cw * (i + 0.5); },
    function (i) {
      clear(markers);
      markers.appendChild(el('rect', {
        x: f.inner.x + cw * i - 0.5, y: f.inner.y - 1,
        width: cw + 1, height: rows.length * rowH,
        fill: 'none', stroke: C.dark, 'stroke-width': 1.6
      }));
      if (cfg.onFocus) cfg.onFocus(i);
    },
    !!cfg.onFocus
  );
  setFocus(cfg.onFocus ? Math.min(state.focusIndex, years.length - 1) : years.length - 1);
  return f;
}

function rampColor(t) {
  const stops = C.seq;
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const frac = x - i;
  const a = hexToRgb(stops[i]), b = hexToRgb(stops[i + 1]);
  return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * frac) + ',' +
                  Math.round(a[1] + (b[1] - a[1]) * frac) + ',' +
                  Math.round(a[2] + (b[2] - a[2]) * frac) + ')';
}
function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/* Scatter plot: position x position, one mark per year. */
function renderScatter(host, cfg) {
  clear(host);
  const xs = cfg.points.map(function (p) { return p.x; });
  const ys = cfg.points.map(function (p) { return p.y; });
  const f = makeFrame(host, {
    height: cfg.height, ariaLabel: cfg.ariaLabel,
    margin: { top: 16, right: 16, bottom: 52, left: leftMarginFor(xs.concat(ys)) + 18 }
  });
  let [xlo, xhi] = extent(xs), [ylo, yhi] = extent(ys);
  const lo = Math.min(xlo, ylo), hi = Math.max(xhi, yhi);
  const pad = (hi - lo) * 0.08;
  const domLo = lo - pad, domHi = hi + pad;
  const xOf = function (v) { return f.inner.x + (v - domLo) / (domHi - domLo) * f.inner.w; };
  const yOf = function (v) { return f.inner.y + f.inner.h - (v - domLo) / (domHi - domLo) * f.inner.h; };

  const ticks = niceTicks(domLo, domHi, f.narrow ? 4 : 6);
  ticks.forEach(function (t) {
    f.svg.appendChild(el('line', {
      x1: f.inner.x, x2: f.inner.x + f.inner.w, y1: yOf(t), y2: yOf(t),
      class: 'grid-line', 'data-enc': 'position', 'data-mark': 'stroke'
    }));
    f.svg.appendChild(text(fmt(t, 0), { x: f.inner.x - 8, y: yOf(t) + 4, 'text-anchor': 'end', class: 'tick-text' }));
    f.svg.appendChild(el('line', {
      x1: xOf(t), x2: xOf(t), y1: f.inner.y, y2: f.inner.y + f.inner.h,
      class: 'grid-line', 'data-enc': 'position', 'data-mark': 'stroke'
    }));
    f.svg.appendChild(text(fmt(t, 0), {
      x: xOf(t), y: f.inner.y + f.inner.h + 17, 'text-anchor': 'middle', class: 'tick-text'
    }));
  });

  // 45-degree reference: equal immigration and emigration.
  f.svg.appendChild(el('line', {
    x1: xOf(domLo), y1: yOf(domLo), x2: xOf(domHi), y2: yOf(domHi), class: 'ref-line'
  }));
  f.svg.appendChild(text('equal in and out', {
    x: xOf(domHi) - 6, y: yOf(domHi) + 14, 'text-anchor': 'end', class: 'chart-annotation'
  }));

  f.svg.appendChild(text(cfg.xLabel, {
    x: f.inner.x + f.inner.w / 2, y: f.inner.y + f.inner.h + 40, 'text-anchor': 'middle', class: 'axis-title'
  }));
  f.svg.appendChild(text(cfg.yLabel, {
    x: -(f.inner.y + f.inner.h / 2), y: 12, transform: 'rotate(-90)', 'text-anchor': 'middle', class: 'axis-title'
  }));

  const pts = el('g');
  cfg.points.forEach(function (p) {
    pts.appendChild(el('circle', {
      cx: xOf(p.x), cy: yOf(p.y), r: 4,
      fill: 'none', stroke: C.darkGreen, 'stroke-width': 1.4,
      'data-enc': 'position', 'data-mark': 'stroke'
    }));
  });
  f.svg.appendChild(pts);

  // Label a few years so the cloud is readable without hovering.
  cfg.labelYears.forEach(function (yr) {
    const p = cfg.points.filter(function (q) { return q.year === yr; })[0];
    if (!p) return;
    f.svg.appendChild(el('circle', { cx: xOf(p.x), cy: yOf(p.y), r: 4, fill: C.darkGreen }));
    f.svg.appendChild(text(String(yr), {
      x: xOf(p.x) + 8, y: yOf(p.y) - 6, class: 'value-label'
    }));
  });

  const marker = el('g');
  f.svg.appendChild(marker);
  host.appendChild(f.svg);

  if (cfg.onFocus) {
    const byYear = {};
    cfg.points.forEach(function (p) { byYear[p.year] = p; });
    f.svg.setAttribute('tabindex', '0');
    const hit = el('rect', {
      class: 'hit-area', x: f.inner.x, y: f.inner.y, width: f.inner.w, height: f.inner.h
    });
    hit.addEventListener('pointermove', function (ev) {
      const rect = f.svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width * f.W;
      const py = (ev.clientY - rect.top) / rect.height * f.H;
      let best = null, bd = Infinity;
      cfg.points.forEach(function (p) {
        const d = Math.pow(xOf(p.x) - px, 2) + Math.pow(yOf(p.y) - py, 2);
        if (d < bd) { bd = d; best = p; }
      });
      if (best) {
        clear(marker);
        marker.appendChild(el('circle', {
          cx: xOf(best.x), cy: yOf(best.y), r: 7, fill: 'none', stroke: C.dark, 'stroke-width': 2
        }));
        cfg.onFocus(best.index);
      }
    });
    f.svg.appendChild(hit);
  }
  return f;
}

function haloText(parent, str, attrs) {
  const under = text(str, attrs);
  under.setAttribute('stroke', '#ffffff');
  under.setAttribute('stroke-width', '3.5');
  under.setAttribute('stroke-linejoin', 'round');
  parent.appendChild(under);
  parent.appendChild(text(str, attrs));
}

/* Flow diagram for one year's demographic accounting. */
function renderFlow(host, cfg) {
  clear(host);
  const W = hostWidth(host);
  const narrow = W < 520;
  const inflow = cfg.inflow.filter(function (d) { return d.value > 0; });
  const outflow = cfg.outflow.filter(function (d) { return d.value > 0; });
  const total = inflow.reduce(function (a, d) { return a + d.value; }, 0);
  const gap = 10;
  const bandH = narrow ? 200 : 240;
  const H = bandH + 78;
  const scale = (bandH - gap * (Math.max(inflow.length, outflow.length) - 1)) / total;

  const leftX = narrow ? 4 : 10;
  const nodeW = narrow ? 8 : 12;
  const rightX = W - (narrow ? 12 : 22);
  const midLeft = leftX + nodeW;
  const midRight = rightX - nodeW;
  const top = 46;

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.ariaLabel });

  svg.appendChild(text('Into the population', { x: leftX, y: 18, class: 'node-label-strong' }));
  svg.appendChild(text('Out, and what remains', { x: rightX, y: 18, 'text-anchor': 'end', class: 'node-label-strong' }));
  svg.appendChild(text(fmt(total, 0) + ' persons', { x: leftX, y: 34, class: 'tick-text' }));
  svg.appendChild(text(fmt(total, 0) + ' persons', { x: rightX, y: 34, 'text-anchor': 'end', class: 'tick-text' }));

  let ly = top, ry = top;
  const lpos = inflow.map(function (d) { const h = d.value * scale; const o = { d: d, y: ly, h: h }; ly += h + gap; return o; });
  const rpos = outflow.map(function (d) { const h = d.value * scale; const o = { d: d, y: ry, h: h }; ry += h + gap; return o; });

  // Ribbons: every inflow is distributed across the outflows in proportion,
  // which is the only assumption a stock-flow account allows without
  // person-level data. Stated in the note under the chart.
  const ribbons = el('g');
  let lOff = lpos.map(function () { return 0; });
  let rOff = rpos.map(function () { return 0; });
  lpos.forEach(function (L, li) {
    rpos.forEach(function (R, ri) {
      const share = R.d.value / total;
      const hh = L.h * share;
      const y0 = L.y + lOff[li];
      const y1 = R.y + rOff[ri];
      lOff[li] += hh; rOff[ri] += hh;
      const cx = (midLeft + midRight) / 2;
      const d = 'M' + midLeft + ' ' + y0 +
                ' C' + cx + ' ' + y0 + ' ' + cx + ' ' + y1 + ' ' + midRight + ' ' + y1 +
                ' L' + midRight + ' ' + (y1 + hh) +
                ' C' + cx + ' ' + (y1 + hh) + ' ' + cx + ' ' + (y0 + hh) + ' ' + midLeft + ' ' + (y0 + hh) + ' Z';
      ribbons.appendChild(el('path', {
        d: d, fill: L.d.color, opacity: 0.42,
        'data-enc': 'connection direction length', 'data-mark': 'fill'
      }));
    });
  });
  svg.appendChild(ribbons);

  function nodes(list, x, anchor, isLeft) {
    const g = el('g');
    list.forEach(function (p) {
      g.appendChild(el('rect', {
        x: x, y: p.y, width: nodeW, height: Math.max(1, p.h), fill: p.d.color,
        'data-enc': 'length position', 'data-mark': 'fill'
      }));
      const tx = isLeft ? x + nodeW + 8 : x - 8;
      // Drawn twice: a white outline underneath so the label reads over a ribbon,
      // then the label itself. Duplicating beats paint-order, which older
      // renderers ignore and then paint the halo over the glyphs.
      haloText(g, p.d.label, { x: tx, y: p.y + p.h / 2 - 1, 'text-anchor': anchor, class: 'node-label' });
      haloText(g, fmt(p.d.value, 0), { x: tx, y: p.y + p.h / 2 + 13, 'text-anchor': anchor, class: 'value-label' });
    });
    return g;
  }
  svg.appendChild(nodes(lpos, leftX, 'start', true));
  svg.appendChild(nodes(rpos, midRight, 'end', false));

  host.appendChild(svg);
  return { svg: svg, W: W, H: H };
}

/* Grouped bars for one year — the plain alternative to the flow view. */
function renderComponentBars(host, cfg) {
  clear(host);
  const items = cfg.items;
  const W = hostWidth(host);
  const rowH = 34;
  const H = items.length * rowH + 46;
  const f = makeFrame(host, {
    height: H, ariaLabel: cfg.ariaLabel,
    margin: { top: 10, right: 70, bottom: 30, left: W < 460 ? 100 : 150 }
  });
  const vals = items.map(function (d) { return d.value; });
  let [lo, hi] = extent(vals);
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  const xOf = function (v) { return f.inner.x + (v - lo) / (hi - lo) * f.inner.w; };

  niceTicks(lo, hi, W < 460 ? 3 : 5).forEach(function (t) {
    f.svg.appendChild(el('line', {
      x1: xOf(t), x2: xOf(t), y1: f.inner.y, y2: f.inner.y + items.length * rowH,
      class: t === 0 ? 'zero-line' : 'grid-line', 'data-enc': 'position', 'data-mark': 'stroke'
    }));
    f.svg.appendChild(text(fmt(t, 0), {
      x: xOf(t), y: f.inner.y + items.length * rowH + 18, 'text-anchor': 'middle', class: 'tick-text'
    }));
  });

  items.forEach(function (d, i) {
    const y = f.inner.y + rowH * i + 5;
    const h = rowH - 14;
    f.svg.appendChild(text(d.label, {
      x: f.inner.x - 10, y: y + h / 2 + 4, 'text-anchor': 'end', class: 'node-label'
    }));
    f.svg.appendChild(el('rect', {
      x: Math.min(xOf(0), xOf(d.value)), y: y,
      width: Math.max(1, Math.abs(xOf(d.value) - xOf(0))), height: h,
      fill: d.color, 'data-enc': 'length position', 'data-mark': 'fill'
    }));
    f.svg.appendChild(text(fmt(d.value, 0), {
      x: Math.max(xOf(0), xOf(d.value)) + 8, y: y + h / 2 + 4, class: 'value-label'
    }));
  });

  host.appendChild(f.svg);
  return f;
}

/* ------------------------------------------------------------------ state */

const state = {
  model: null,
  questionIndex: 0,
  viewIndex: 0,
  focusIndex: 0,
  flowYear: null,
  lens: {}
};

/* -------------------------------------------------------------- questions */

function buildQuestions(m) {
  const yrs = m.years;
  const idxLast = m.lastCompleteIndex;            // last year with complete flow data
  const flowYears = yrs.slice(0, idxLast + 1);
  const stockYears = yrs;

  function sliceFlow(arr) { return arr.slice(0, idxLast + 1); }

  return [
    {
      task: 'Change',
      question: 'How has Norway’s population changed since 1951?',
      dataLine: 'Population 1 January, ' + yrs[0] + '–' + yrs[yrs.length - 1] + ', persons. A stock.',
      views: [
        {
          label: 'Line chart', verdict: 'recommended',
          encoding: 'Position along a common scale, plus connection',
          chartName: 'Line chart',
          title: 'Population of Norway, 1 January ' + yrs[0] + '–' + yrs[yrs.length - 1],
          subtitle: 'Persons. Vertical scale starts at zero, so the proportional size of the change is not exaggerated.',
          units: 'Persons, registered residents on 1 January.',
          why: 'Position carries the level and connection tells the reader that the marks are one continuous series in a fixed order. Slope becomes readable directly: you can see the growth rate change without doing any arithmetic.',
          render: function (host, onFocus) {
            return renderLines(host, {
              legendInto: state.legendHost,
              years: stockYears,
              series: [{ key: 'population', label: m.labels.population, color: C.darkGreen, values: m.series.population }],
              ariaLabel: 'Line chart of the population of Norway on 1 January from ' + yrs[0] + ' to ' + yrs[yrs.length - 1] + ', rising from about 3.3 million to about 5.6 million.',
              onFocus: onFocus
            });
          },
          readout: ['population']
        },
        {
          label: 'Column chart', verdict: 'weaker',
          encoding: 'Position and length from zero — length nobody needs',
          chartName: 'Column chart of levels',
          title: 'The same population figures drawn as columns',
          subtitle: 'Persons. Technically correct, and much harder to read.',
          units: 'Persons, registered residents on 1 January.',
          why: 'Every column is nearly as tall as the next, because the interesting variation is a few per cent of a five-million baseline. Length from zero spends most of the ink on the part that never changes, and the white gaps break the continuity that the question is actually about.',
          negative: true,
          render: function (host, onFocus) {
            return renderColumns(host, {
              years: stockYears, values: m.series.population,
              ariaLabel: 'Column chart of the same population figures, in which all columns look almost identical.',
              onFocus: onFocus
            });
          },
          readout: ['population']
        }
      ]
    },

    {
      task: 'Compare',
      question: 'How large was population growth in each single year?',
      dataLine: 'Population growth, ' + flowYears[0] + '–' + flowYears[flowYears.length - 1] + ', persons per year. A flow.',
      views: [
        {
          label: 'Column chart', verdict: 'recommended',
          encoding: 'Position along a common scale, plus length from zero',
          chartName: 'Column chart',
          title: 'Annual population growth, ' + flowYears[0] + '–' + flowYears[flowYears.length - 1],
          subtitle: 'Persons per year. A year with a falling population would be drawn below the axis as well as in another colour, so sign is never carried by colour alone.',
          units: 'Persons. Growth is the change between two consecutive 1 January populations.',
          why: 'Now the quantity varies several-fold between years, and length from a zero baseline is what keeps those ratios honest: a bar twice as tall really is twice as much. Cut the axis at 20 000 and the same figures would tell a completely different story about the 1980s.',
          render: function (host, onFocus) {
            return renderColumns(host, {
              years: flowYears, values: sliceFlow(m.series.growth),
              ariaLabel: 'Column chart of annual population growth in Norway for every year in the series, with columns varying several-fold in height between periods.',
              onFocus: onFocus
            });
          },
          readout: ['growth', 'excessBirths', 'netMigration']
        },
        {
          label: 'Dot plot', verdict: 'alternative',
          encoding: 'Position only',
          chartName: 'Dot plot',
          title: 'Annual population growth, last 22 years',
          subtitle: 'Persons per year. Every year labelled, values printed.',
          units: 'Persons per year.',
          why: 'A dot plot drops length and keeps position. It reads almost as accurately, uses far less ink, and leaves room to label and print every value — which matters when the reader needs the number, not only the pattern. It is the better choice when the baseline is not meaningful or when many categories have to fit.',
          render: function (host) {
            const start = Math.max(0, idxLast - 21);
            return renderDotPlot(host, {
              years: yrs.slice(start, idxLast + 1),
              values: m.series.growth.slice(start, idxLast + 1),
              ariaLabel: 'Dot plot of annual population growth for the most recent 22 years, with values printed beside each dot.'
            });
          },
          readout: null,
          tableKeys: ['growth']
        }
      ]
    },

    {
      task: 'Composition',
      question: 'What did the change consist of — natural increase or migration?',
      dataLine: 'Excess of births and net migration, ' + flowYears[0] + '–' + flowYears[flowYears.length - 1] + ', persons per year.',
      views: [
        {
          label: 'Two lines', verdict: 'recommended',
          encoding: 'Position on a shared scale, plus connection',
          chartName: 'Multi-series line chart',
          title: 'The two components of population change',
          subtitle: 'Persons per year. Both components use the same unit and the same scale, so their heights are directly comparable.',
          units: 'Persons per year. Excess of births = births − deaths. Net migration = immigration − emigration.',
          why: 'Both components share one scale, so the comparison the question asks for — which one is larger — becomes a single vertical comparison of positions. The years where the two lines cross, and the long stretch where migration sits above natural increase, need no annotation to be seen.',
          render: function (host, onFocus) {
            return renderLines(host, {
              legendInto: state.legendHost,
              years: flowYears,
              zeroBaseline: false,
              series: [
                { key: 'excessBirths', label: m.labels.excessBirths, color: C.green, values: sliceFlow(m.series.excessBirths) },
                { key: 'netMigration', label: m.labels.netMigration, color: C.blue, values: sliceFlow(m.series.netMigration) },
                { key: 'growth', label: m.labels.growth, color: C.dark, values: sliceFlow(m.series.growth), width: 1.2, dash: '4 3' }
              ],
              ariaLabel: 'Line chart comparing excess of births and net migration each year, with total population growth as a dashed reference line.',
              onFocus: onFocus
            });
          },
          readout: ['excessBirths', 'netMigration', 'growth', 'adjustments']
        },
        {
          label: 'Stacked area', verdict: 'weaker',
          encoding: 'Length stacked on length',
          chartName: 'Stacked area chart',
          title: 'The same two components, stacked',
          subtitle: 'Persons per year. Stacking is only valid when parts are non-negative and sum to the whole. Neither holds here.',
          units: 'Persons per year.',
          why: 'Stacking assumes the parts never go below zero and that they add up to the whole. Neither holds. Net migration was negative in several years early in the series, so the band folds back over itself, and the two components do not quite sum to population growth because of statistical adjustments. Both problems vanish from view, which is what makes this chart dangerous rather than merely ugly.',
          negative: true,
          render: function (host) {
            return renderStackedArea(host, {
              legendInto: state.legendHost,
              years: flowYears,
              series: [
                { key: 'excessBirths', label: m.labels.excessBirths, color: C.green, values: sliceFlow(m.series.excessBirths) },
                { key: 'netMigration', label: m.labels.netMigration, color: C.blue, values: sliceFlow(m.series.netMigration) }
              ],
              ariaLabel: 'Stacked area chart of the same two components, in which negative values make the stacking misleading.'
            });
          },
          readout: null,
          tableKeys: ['excessBirths', 'netMigration', 'growth']
        }
      ]
    },

    {
      task: 'Distribution',
      question: 'When were births, deaths, immigration and emigration unusually high or low?',
      dataLine: 'Four flow series, ' + flowYears[0] + '–' + flowYears[flowYears.length - 1] + ', persons per year.',
      views: [
        {
          label: 'Heatmap', verdict: 'recommended',
          encoding: 'Position × position, plus colour for value',
          chartName: 'Heatmap',
          title: 'Each series against its own history',
          subtitle: 'Colour runs from the lowest to the highest value in that row. Rows are scaled separately, so colours are not comparable between rows.',
          units: 'Persons per year, scaled row by row to each series’ own minimum and maximum.',
          why: 'The question is about relative extremes — high for that series — so each value has to be judged against its own row rather than against the other series. Two positional dimensions place every cell and colour carries its standing within the row. The result is that the post-war birth cohorts, the steep rise in immigration from the mid-2000s and the slow climb in deaths all read at a glance, in one chart, without four separate scales.',
          render: function (host, onFocus) {
            return renderHeatmap(host, {
              years: flowYears,
              rows: [
                { label: m.labels.births, values: sliceFlow(m.series.births) },
                { label: m.labels.deaths, values: sliceFlow(m.series.deaths) },
                { label: m.labels.immigration, values: sliceFlow(m.series.immigration) },
                { label: m.labels.emigration, values: sliceFlow(m.series.emigration) }
              ],
              ariaLabel: 'Heatmap with one row per series and one column per year, colour showing where each year sits within that series own range.',
              onFocus: onFocus
            });
          },
          readout: ['births', 'deaths', 'immigration', 'emigration']
        },
        {
          label: 'Four lines', verdict: 'alternative',
          encoding: 'Position on a shared scale, plus connection',
          chartName: 'Multi-series line chart',
          title: 'The same four series on one scale',
          subtitle: 'Persons per year, absolute levels.',
          units: 'Persons per year.',
          why: 'This chart is not wrong — it is better than the heatmap if the question is about levels, because you can read how many. It is worse for the question asked here: to judge whether a year was unusual for immigration you have to compare that line against its own past while three other lines cross it. The heatmap does that comparison for you; this one asks the reader to do it.',
          render: function (host, onFocus) {
            return renderLines(host, {
              legendInto: state.legendHost,
              years: flowYears,
              series: [
                { key: 'births', label: m.labels.births, color: C.green, values: sliceFlow(m.series.births) },
                { key: 'deaths', label: m.labels.deaths, color: C.dark, values: sliceFlow(m.series.deaths) },
                { key: 'immigration', label: m.labels.immigration, color: C.blue, values: sliceFlow(m.series.immigration) },
                { key: 'emigration', label: m.labels.emigration, color: C.gold, values: sliceFlow(m.series.emigration) }
              ],
              ariaLabel: 'Line chart of births, deaths, immigration and emigration on one shared scale.',
              onFocus: onFocus
            });
          },
          readout: ['births', 'deaths', 'immigration', 'emigration']
        }
      ]
    },

    {
      task: 'Relationship',
      question: 'Do years with high immigration also have high emigration?',
      dataLine: 'Immigration and emigration, ' + flowYears[0] + '–' + flowYears[flowYears.length - 1] + ', persons per year.',
      views: [
        {
          label: 'Scatter plot', verdict: 'recommended',
          encoding: 'Position × position',
          chartName: 'Scatter plot',
          title: 'Immigration against emigration, one mark per year',
          subtitle: 'Persons per year. Both axes share one scale, so the diagonal marks the years where immigration and emigration were equal.',
          units: 'Persons per year. Axes share one scale; no length is encoded, so the axes need not start at zero.',
          why: 'Dropping time is the point. Each year becomes one mark and the question turns into a shape: the cloud rises to the right, so high-immigration years do tend to be high-emigration years. The diagonal then does a second job for free — marks below it are years of net inward migration, marks on or above it are the years when more people left than arrived.',
          render: function (host, onFocus) {
            const pts = [];
            flowYears.forEach(function (yr, i) {
              const a = m.series.immigration[i], b = m.series.emigration[i];
              if (a === null || b === null) return;
              pts.push({ x: a, y: b, year: yr, index: i });
            });
            return renderScatter(host, {
              points: pts,
              labelYears: [flowYears[0], 1988, 2007, 2022, flowYears[flowYears.length - 1]],
              xLabel: m.labels.immigration + ' (persons)',
              yLabel: m.labels.emigration + ' (persons)',
              ariaLabel: 'Scatter plot of immigration against emigration for every year, forming a cloud that rises to the right, with a few early years on or above the diagonal.',
              onFocus: onFocus
            });
          },
          readout: ['immigration', 'emigration', 'netMigration']
        },
        {
          label: 'Two lines over time', verdict: 'alternative',
          encoding: 'Position and connection, with time on the x axis',
          chartName: 'Multi-series line chart',
          title: 'Immigration and emigration over time',
          subtitle: 'Persons per year.',
          units: 'Persons per year.',
          why: 'Legitimate, and the better chart if you also need to know when. For the relationship itself it is weaker: you have to compare two paths against each other, mentally, year by year. The scatter plot turns that comparison into one glance because it spends both positional channels on the two quantities instead of one on time.',
          render: function (host, onFocus) {
            return renderLines(host, {
              legendInto: state.legendHost,
              years: flowYears,
              series: [
                { key: 'immigration', label: m.labels.immigration, color: C.blue, values: sliceFlow(m.series.immigration) },
                { key: 'emigration', label: m.labels.emigration, color: C.gold, values: sliceFlow(m.series.emigration) }
              ],
              ariaLabel: 'Line chart of immigration and emigration over time.',
              onFocus: onFocus
            });
          },
          readout: ['immigration', 'emigration', 'netMigration']
        }
      ]
    },

    {
      task: 'Flow',
      question: 'How did one year’s population change balance out?',
      dataLine: 'Components of population change for a single year, persons.',
      needsYear: true,
      views: [
        {
          label: 'Flow diagram', verdict: 'recommended',
          encoding: 'Connection, width and direction',
          chartName: 'Sankey-style flow diagram',
          title: null,
          subtitle: 'Persons. The population stock is deliberately left out: it is roughly a hundred times larger than these flows and would compress everything else to nothing. Ribbons split each inflow across the outflows in proportion — an illustration of the balance, not an observed matching of individuals.',
          units: 'Persons during the calendar year.',
          why: 'This is the one question on the page where a specialised chart earns its complexity. Demographic accounting is a conservation statement: everything entering the population must leave it or remain in it. Width encodes size, direction encodes in and out, and the two sides being equal is the point — which is also why statistical adjustments have to be shown rather than quietly dropped.',
          render: function (host) {
            const i = state.flowYear;
            const births = m.series.births[i], imm = m.series.immigration[i];
            const deaths = m.series.deaths[i], emi = m.series.emigration[i];
            const growth = m.series.growth[i], adj = m.series.adjustments[i];
            const inflow = [
              { label: m.labels.births, value: births, color: C.green },
              { label: m.labels.immigration, value: imm, color: C.blue }
            ];
            const outflow = [
              { label: m.labels.deaths, value: deaths, color: C.dark },
              { label: m.labels.emigration, value: emi, color: C.gold },
              { label: 'Remained: ' + m.labels.growth.toLowerCase(), value: growth, color: C.darkGreen }
            ];
            if (adj !== null && adj > 0) inflow.push({ label: m.labels.adjustments, value: adj, color: C.grey });
            if (adj !== null && adj < 0) outflow.push({ label: m.labels.adjustments, value: -adj, color: C.grey });
            return renderFlow(host, {
              inflow: inflow, outflow: outflow,
              ariaLabel: 'Flow diagram of the components of population change for ' + m.years[i] + '.'
            });
          },
          readout: ['births', 'immigration', 'deaths', 'emigration', 'growth', 'adjustments']
        },
        {
          label: 'Bar chart', verdict: 'alternative',
          encoding: 'Position and length from zero',
          chartName: 'Horizontal bar chart',
          title: null,
          subtitle: 'Persons. Easier to read exact magnitudes, but the balance is no longer visible.',
          units: 'Persons during the calendar year.',
          why: 'Bars give more accurate magnitudes with less effort, and for most purposes that is the right trade. What is lost is the single thing the flow view exists for: that the two sides are equal, so the reader can see the accounting close rather than take it on trust.',
          render: function (host) {
            const i = state.flowYear;
            return renderComponentBars(host, {
              items: [
                { label: m.labels.births, value: m.series.births[i], color: C.green },
                { label: m.labels.immigration, value: m.series.immigration[i], color: C.blue },
                { label: m.labels.deaths, value: m.series.deaths[i], color: C.dark },
                { label: m.labels.emigration, value: m.series.emigration[i], color: C.gold },
                { label: m.labels.growth, value: m.series.growth[i], color: C.darkGreen }
              ],
              ariaLabel: 'Horizontal bar chart of the components of population change for ' + m.years[i] + '.'
            });
          },
          readout: ['births', 'immigration', 'deaths', 'emigration', 'growth', 'adjustments']
        }
      ]
    }
  ];
}

/* ------------------------------------------------------------- explorer UI */

let QUESTIONS = [];

function buildQuestionList() {
  const list = document.getElementById('question-list');
  clear(list);
  QUESTIONS.forEach(function (q, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'question-btn';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === state.questionIndex));
    b.innerHTML = '<span class="q-task">' + q.task + '</span>';
    b.appendChild(document.createTextNode(q.question));
    b.addEventListener('click', function () {
      state.questionIndex = i;
      state.viewIndex = 0;
      renderExplorer();
    });
    b.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
        state.questionIndex = (i + 1) % QUESTIONS.length; state.viewIndex = 0; renderExplorer(); focusQuestion();
        ev.preventDefault();
      }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
        state.questionIndex = (i - 1 + QUESTIONS.length) % QUESTIONS.length; state.viewIndex = 0; renderExplorer(); focusQuestion();
        ev.preventDefault();
      }
    });
    list.appendChild(b);
  });
}

function focusQuestion() {
  const btns = document.querySelectorAll('.question-btn');
  if (btns[state.questionIndex]) btns[state.questionIndex].focus();
}

function renderExplorer() {
  const m = state.model;
  const q = QUESTIONS[state.questionIndex];
  const v = q.views[state.viewIndex];

  document.querySelectorAll('.question-btn').forEach(function (b, i) {
    b.setAttribute('aria-selected', String(i === state.questionIndex));
  });

  /* view switch */
  const sw = document.getElementById('view-switch');
  clear(sw);
  q.views.forEach(function (view, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'view-btn';
    b.dataset.verdict = view.verdict;
    b.setAttribute('aria-pressed', String(i === state.viewIndex));
    b.textContent = view.label;
    const tag = document.createElement('span');
    tag.className = 'verdict';
    tag.textContent = view.verdict === 'recommended' ? ' fits' :
                      view.verdict === 'alternative' ? ' also valid' : ' poor fit';
    b.appendChild(tag);
    b.addEventListener('click', function () { state.viewIndex = i; renderExplorer(); });
    sw.appendChild(b);
  });

  if (q.needsYear) {
    const wrapEl = document.createElement('span');
    wrapEl.style.marginLeft = 'auto';
    const lab = document.createElement('label');
    lab.setAttribute('for', 'flow-year');
    lab.textContent = 'Year ';
    lab.style.fontSize = '.88rem';
    const sel = document.createElement('select');
    sel.id = 'flow-year';
    sel.style.font = 'inherit';
    sel.style.fontSize = '.88rem';
    sel.style.padding = '.35rem .5rem';
    sel.style.border = '1px solid ' + C.dark;
    sel.style.background = '#fff';
    m.years.forEach(function (yr, i) {
      if (m.series.births[i] === null || m.series.growth[i] === null) return;
      const o = document.createElement('option');
      o.value = String(i); o.textContent = String(yr);
      if (i === state.flowYear) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      state.flowYear = parseInt(sel.value, 10);
      renderExplorer();
    });
    wrapEl.appendChild(lab); wrapEl.appendChild(sel);
    sw.appendChild(wrapEl);
  }

  /* titles */
  const yearWord = q.needsYear ? m.years[state.flowYear] : null;
  document.getElementById('chart-title').textContent =
    v.title || ('Components of population change, ' + yearWord);
  document.getElementById('chart-subtitle').textContent = v.subtitle;
  document.getElementById('chart-units').textContent = v.units;

  /* chart */
  const host = document.getElementById('main-chart');
  const readout = document.getElementById('readout');
  const legendHost = document.getElementById('chart-legend');
  clear(readout);
  clear(legendHost);
  state.legendHost = legendHost;

  const onFocus = v.readout ? function (i) { paintReadout(readout, v.readout, i); } : null;
  v.render(host, onFocus);
  if (!v.readout) {
    readout.innerHTML = '<span class="ro-hint">Values are printed on the chart itself.</span>';
  } else if (q.needsYear) {
    paintReadout(readout, v.readout, state.flowYear);
  }

  /* rationale */
  const r = document.getElementById('rationale');
  clear(r);
  const block = document.createElement('div');
  block.className = 'rationale-block' + (v.negative ? ' negative' : '');
  const h = document.createElement('h4');
  h.textContent = v.verdict === 'recommended' ? 'Why this chart' :
                  v.verdict === 'alternative' ? 'Why this also works' : 'Why not this chart';
  const p = document.createElement('p');
  p.textContent = v.why;
  block.appendChild(h); block.appendChild(p);
  r.appendChild(block);

  /* chain */
  document.getElementById('chain-data').textContent = q.dataLine;
  document.getElementById('chain-question').textContent = q.question;
  document.getElementById('chain-encoding').textContent = v.encoding;
  document.getElementById('chain-chart').textContent = v.chartName;

  buildDataTable(q, v);
  applyLens();
}

function paintReadout(node, keys, i) {
  const m = state.model;
  clear(node);
  const y = document.createElement('span');
  y.className = 'ro-year';
  y.textContent = String(m.years[i]);
  node.appendChild(y);
  keys.forEach(function (k) {
    const v = m.series[k][i];
    const s = document.createElement('span');
    s.className = 'ro-item';
    s.innerHTML = m.labels[k] + ': <span class="ro-value">' +
      (k === 'growth' || k === 'excessBirths' || k === 'netMigration' || k === 'adjustments'
        ? fmtSigned(v, 0) : fmt(v, 0)) + '</span>';
    node.appendChild(s);
  });
  const hint = document.createElement('span');
  hint.className = 'ro-hint';
  hint.textContent = 'Hover, tap or use the arrow keys on the chart.';
  node.appendChild(hint);
}

function buildDataTable(q, v) {
  const m = state.model;
  const host = document.getElementById('data-table');
  clear(host);
  const keys = v.tableKeys || v.readout || ['growth'];
  const t = document.createElement('table');
  t.className = 'data';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  hr.appendChild(th('Year'));
  keys.forEach(function (k) { hr.appendChild(th(m.labels[k])); });
  thead.appendChild(hr); t.appendChild(thead);
  const tb = document.createElement('tbody');
  m.years.forEach(function (yr, i) {
    const anyValue = keys.some(function (k) { return m.series[k][i] !== null; });
    if (!anyValue) return;
    const tr = document.createElement('tr');
    const td0 = document.createElement('td'); td0.textContent = String(yr); tr.appendChild(td0);
    keys.forEach(function (k) {
      const td = document.createElement('td');
      td.textContent = fmt(m.series[k][i], 0);
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  host.appendChild(t);

  function th(label) { const e = document.createElement('th'); e.scope = 'col'; e.textContent = label; return e; }
}

/* ---------------------------------------------------------- encoding lens */

const ENCODINGS = [
  {
    key: 'position', name: 'Position',
    desc: 'Where a mark sits on a scale. Read most accurately of all the encodings, which is why the comparison that matters should use it.',
    glyph: function () {
      const s = el('svg', { viewBox: '0 0 120 34' });
      s.appendChild(el('line', { x1: 4, x2: 116, y1: 30, y2: 30, stroke: C.rule }));
      [8, 14, 6, 24, 18].forEach(function (v, i) {
        s.appendChild(el('circle', { cx: 14 + i * 23, cy: 30 - v, r: 3.5, fill: C.accent }));
      });
      return s;
    },
    where: 'every chart on this page'
  },
  {
    key: 'length', name: 'Length',
    desc: 'How far a mark extends from a shared baseline. Only meaningful when that baseline is zero.',
    glyph: function () {
      const s = el('svg', { viewBox: '0 0 120 34' });
      [10, 22, 16, 30, 13].forEach(function (v, i) {
        s.appendChild(el('rect', { x: 8 + i * 22, y: 32 - v, width: 12, height: v, fill: C.accent }));
      });
      s.appendChild(el('line', { x1: 4, x2: 116, y1: 32, y2: 32, stroke: C.dark }));
      return s;
    },
    where: 'the column charts, the dot plot rules, the bar chart and the ribbon widths in the flow view'
  },
  {
    key: 'area', name: 'Area',
    desc: 'How much space a mark takes up. Compact when there are many categories, but read far less accurately than length.',
    glyph: function () {
      const s = el('svg', { viewBox: '0 0 120 34' });
      s.appendChild(el('rect', { x: 6, y: 4, width: 46, height: 26, fill: C.accent, opacity: .8 }));
      s.appendChild(el('rect', { x: 54, y: 4, width: 30, height: 15, fill: C.accent, opacity: .55 }));
      s.appendChild(el('rect', { x: 54, y: 21, width: 30, height: 9, fill: C.accent, opacity: .35 }));
      s.appendChild(el('rect', { x: 86, y: 4, width: 28, height: 26, fill: C.accent, opacity: .2 }));
      return s;
    },
    where: 'nothing on this page — deliberately. See the note on treemaps below.'
  },
  {
    key: 'colour', name: 'Colour',
    desc: 'Hue separates categories; lightness carries quantity. Never the only carrier of meaning, because of colour vision deficiency and greyscale printing.',
    glyph: function () {
      const s = el('svg', { viewBox: '0 0 120 34' });
      for (let i = 0; i < 5; i++) {
        s.appendChild(el('rect', { x: 6 + i * 22, y: 8, width: 20, height: 20, fill: rampColor(i / 4) }));
      }
      return s;
    },
    where: 'the heatmap cells, and the sign of the columns — where position already says the same thing'
  },
  {
    key: 'connection', name: 'Connection',
    desc: 'Lines and links that say “these marks belong together, in this order”. This is what makes a line chart a line chart.',
    glyph: function () {
      const s = el('svg', { viewBox: '0 0 120 34' });
      s.appendChild(el('path', { d: 'M8 26 L36 14 L64 20 L92 6 L112 12', fill: 'none', stroke: C.accent, 'stroke-width': 2.5 }));
      return s;
    },
    where: 'the line charts and the ribbons in the flow view'
  },
  {
    key: 'direction', name: 'Direction',
    desc: 'Where a mark points, or which way the eye is asked to travel. Carries sequence and causality more than magnitude.',
    glyph: function () {
      const s = el('svg', { viewBox: '0 0 120 34' });
      s.appendChild(el('path', { d: 'M8 17 L100 17', stroke: C.accent, 'stroke-width': 2.5 }));
      s.appendChild(el('path', { d: 'M96 10 L110 17 L96 24 Z', fill: C.accent }));
      return s;
    },
    where: 'the flow view only — left is into the population, right is out of it'
  }
];

function buildEncodingUI() {
  const grid = document.getElementById('encoding-grid');
  clear(grid);
  ENCODINGS.forEach(function (e) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'enc-btn';
    b.setAttribute('aria-pressed', 'false');
    b.dataset.key = e.key;
    const n = document.createElement('span'); n.className = 'enc-name'; n.textContent = e.name;
    const d = document.createElement('span'); d.className = 'enc-desc'; d.textContent = e.desc;
    const g = document.createElement('span'); g.className = 'enc-glyph'; g.appendChild(e.glyph());
    b.appendChild(n); b.appendChild(d); b.appendChild(g);
    b.addEventListener('click', function () {
      state.lens[e.key] = !state.lens[e.key];
      applyLens();
    });
    grid.appendChild(b);
  });

  document.getElementById('encoding-clear').addEventListener('click', function () {
    state.lens = {};
    applyLens();
  });
}

function applyLens() {
  const on = Object.keys(state.lens).filter(function (k) { return state.lens[k]; });
  document.body.classList.toggle('lens-on', on.length > 0);

  document.querySelectorAll('.enc-btn').forEach(function (b) {
    b.setAttribute('aria-pressed', String(!!state.lens[b.dataset.key]));
  });
  document.getElementById('encoding-clear').disabled = on.length === 0;

  document.querySelectorAll('[data-enc]').forEach(function (node) {
    const list = (node.getAttribute('data-enc') || '').split(/\s+/);
    const hit = on.some(function (k) { return list.indexOf(k) !== -1; });
    node.classList.toggle('enc-hit', hit);
  });

  const status = document.getElementById('lens-status');
  if (!on.length) {
    status.textContent = 'No encoding selected. All marks shown normally.';
  } else {
    const names = on.map(function (k) {
      const e = ENCODINGS.filter(function (x) { return x.key === k; })[0];
      return e.name.toLowerCase() + ' — ' + e.where;
    });
    status.textContent = 'Highlighted: ' + names.join('; ') + '.';
  }
}

/* ------------------------------------------------ small supporting charts */

function renderTeasers() {
  const m = state.model;
  const flowN = m.lastCompleteIndex + 1;
  renderLines(document.getElementById('teaser-line'), {
    years: m.years,
    height: 190,
    series: [{ key: 'population', label: '', color: C.darkGreen, values: m.series.population }],
    ariaLabel: 'Small line chart of Norway’s population from 1951, rising steadily.'
  });
  renderColumns(document.getElementById('teaser-bars'), {
    years: m.years.slice(0, flowN),
    values: m.series.growth.slice(0, flowN),
    height: 190,
    ariaLabel: 'Small column chart of annual population growth, varying between negative and about 65 000 persons.'
  });
}

function renderMinis() {
  const m = state.model;
  const end = m.lastCompleteIndex;
  const start = Math.max(0, end - 9);
  const years = m.years.slice(start, end + 1);
  const vals = m.series.growth.slice(start, end + 1);

  renderColumns(document.getElementById('mini-bar'), {
    years: years, values: vals, height: 150,
    ariaLabel: 'Bar chart of population growth for the ten most recent complete years.'
  });
  renderLines(document.getElementById('mini-line'), {
    years: years, height: 150,
    series: [{ key: 'growth', label: '', color: C.darkGreen, values: vals }],
    ariaLabel: 'Line chart of the same ten values.'
  });
  renderHeatmap(document.getElementById('mini-heat'), {
    years: years,
    rows: [{ label: 'Growth', values: vals }],
    ariaLabel: 'Single-row heatmap of the same ten values.'
  });
}

/* ------------------------------------------------------------ source panel */

function fillSourcePanel(source) {
  document.getElementById('api-url').textContent = API_URL;
  const status = document.getElementById('fetch-status');
  const m = state.model;
  const updated = m.parsed.updated
    ? new Date(m.parsed.updated).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
    : 'not reported by the API';
  status.className = 'fetch-status ok';
  status.textContent = (source === 'local'
    ? 'Loaded from the local extract in data/06913-norway.json. '
    : 'Loaded live from the API in this browser session. ') +
    'Table last updated by Statistics Norway: ' + updated + '.';

  const holder = document.getElementById('series-list');
  clear(holder);
  const t = document.createElement('table');
  const head = document.createElement('tr');
  ['Contents code', 'Label returned by the API', 'Used on this page as'].forEach(function (h) {
    const e = document.createElement('th'); e.textContent = h; head.appendChild(e);
  });
  t.appendChild(head);
  const inverse = {};
  Object.keys(m.roles).forEach(function (role) { inverse[m.roles[role]] = role; });
  m.parsed.metricCodes.forEach(function (code) {
    const tr = document.createElement('tr');
    const c1 = document.createElement('td');
    const codeEl = document.createElement('code'); codeEl.textContent = code; c1.appendChild(codeEl);
    const c2 = document.createElement('td'); c2.textContent = m.parsed.labels[code];
    const c3 = document.createElement('td'); c3.textContent = inverse[code] || 'not used';
    tr.appendChild(c1); tr.appendChild(c2); tr.appendChild(c3);
    t.appendChild(tr);
  });
  holder.appendChild(t);

  const derived = [];
  if (m.derived.excessBirths) derived.push('excess of births (births − deaths)');
  if (m.derived.netMigration) derived.push('net migration (immigration − emigration)');
  if (m.derived.growth) derived.push('population growth (difference between consecutive 1 January populations)');
  const note = document.createElement('p');
  note.style.fontSize = '.88rem';
  note.style.marginTop = '.8rem';
  note.textContent = derived.length
    ? 'Computed rather than read from the table: ' + derived.join('; ') + '. Statistical adjustments are always computed.'
    : 'All series except statistical adjustments were read directly from the table.';
  holder.appendChild(note);
}

/* ------------------------------------------------------------------- load */

function showDataProblem(message) {
  ['teaser-line', 'teaser-bars', 'mini-bar', 'mini-line', 'mini-heat'].forEach(function (id) {
    const n = document.getElementById(id);
    if (n) n.innerHTML = '<p class="loading">Chart unavailable — no data loaded.</p>';
  });
  const host = document.getElementById('main-chart');
  host.innerHTML =
    '<div class="data-notice"><h3>The figures did not load</h3>' +
    '<p>' + message + '</p>' +
    '<p>Two ways to fix it: make sure the browser can reach data.ssb.no, or produce a local extract by running ' +
    '<strong>bash data/fetch-data.sh</strong> in the repository, which writes <strong>data/06913-norway.json</strong>. ' +
    'The page uses that file automatically when it exists.</p>' +
    '<code>' + API_URL + '</code></div>';
  document.getElementById('chart-title').textContent = 'No data';
  document.getElementById('chart-subtitle').textContent = '';
  const st = document.getElementById('fetch-status');
  st.className = 'fetch-status warn';
  st.textContent = message;
  document.getElementById('api-url').textContent = API_URL;
}

let loadStarted = false;
async function load() {
  if (loadStarted) return;
  loadStarted = true;
  let js = null, source = null;
  try {
    const r = await fetch(LOCAL_EXTRACT, { cache: 'no-cache' });
    if (r.ok) {
      const ct = r.headers.get('content-type') || '';
      if (ct.indexOf('json') !== -1 || ct === '') { js = await r.json(); source = 'local'; }
    }
  } catch (e) { /* no local extract — fall through to the API */ }

  if (!js) {
    try {
      const r = await fetch(API_URL, { method: 'GET' });
      if (!r.ok) throw new Error('The API answered with HTTP ' + r.status + '.');
      js = await r.json();
      source = 'api';
    } catch (e) {
      showDataProblem('Statistics Norway’s API could not be reached: ' + e.message);
      return;
    }
  }

  let model;
  try {
    model = buildModel(parseJsonStat(js));
  } catch (e) {
    showDataProblem('The response was received but could not be read as JSON-stat 2: ' + e.message);
    return;
  }

  const missing = ['population', 'births', 'deaths', 'immigration', 'emigration']
    .filter(function (k) { return !model.roles[k]; });
  if (missing.length) {
    showDataProblem('The table did not contain the expected series (' + missing.join(', ') +
      '). Check the contents codes listed under “Data, definitions and transformations”.');
    return;
  }

  state.model = model;
  state.focusIndex = model.lastCompleteIndex;
  state.flowYear = model.lastCompleteIndex;

  QUESTIONS = buildQuestions(model);
  buildQuestionList();
  buildEncodingUI();
  renderExplorer();
  renderTeasers();
  renderMinis();
  fillSourcePanel(source);
  applyLens();

  let t = null;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      renderExplorer();
      renderTeasers();
      renderMinis();
    }, 200);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('main-chart').innerHTML =
    '<p class="loading">Loading figures from Statistics Norway…</p>';
  buildEncodingUI();
  load();
});
