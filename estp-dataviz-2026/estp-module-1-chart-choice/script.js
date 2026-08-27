(() => {
  'use strict';

  const API_BASE = 'https://data.ssb.no/api/pxwebapi/v2/tables/06913/data';
  const API_QUERIES = [
    `${API_BASE}?lang=en&valueCodes[Tid]=*&valueCodes[ContentsCode]=*&outputFormat=json-stat2`,
    `${API_BASE}?lang=en&valueCodes[Region]=0&valueCodes[Tid]=*&valueCodes[ContentsCode]=*&outputFormat=json-stat2`
  ];
  const CACHE_KEY = 'estp-module1-ssb06913-v2';

  const COLORS = {
    dark: '#274247',
    green: '#00824d',
    light: '#f0f8f9',
    mid: '#c3dcdc',
    purple: '#7e5ee8',
    white: '#ffffff',
    grid: '#dce9eb',
    muted: '#52696e'
  };

  const state = {
    data: null,
    question: 'population',
    growthMode: 'bar',
    selectedYear: null,
    selectedEncoding: null,
    activeHeatCell: null,
    resizeTimer: null
  };

  const questionConfig = {
    population: {
      chainQuestion: 'change over time',
      encoding: 'position + connection',
      chart: 'line chart',
      eyebrow: 'Population 1 January · persons',
      title: "Norway's population, 1951–2026",
      description: 'Population is a stock measured on 1 January. The line connects annual observations so change and continuity are easy to follow.',
      why: 'Position on a common vertical scale gives accurate values; connection makes the temporal sequence explicit.',
      whyNot: 'A bar chart is valid, but 76 bars place more visual emphasis on individual annual magnitudes than on the long-run trajectory.'
    },
    growth: {
      chainQuestion: 'compare annual magnitudes',
      encoding: 'position + length',
      chart: 'bar chart / dot plot',
      eyebrow: 'Population increase · persons per calendar year',
      title: 'Annual population growth',
      description: 'Each year is treated as a separate magnitude. Bars emphasise length from a zero baseline; dots make the same ranking more compact using position.',
      why: 'A zero baseline and a common scale make the magnitude of population growth directly comparable from year to year.',
      whyNot: 'A connected line would also show the series, but it shifts attention toward continuity and trend rather than the size of individual annual changes.'
    },
    components: {
      chainQuestion: 'compare contributions within a year',
      encoding: 'position + length + direction',
      chart: 'diverging component bars',
      eyebrow: 'Births, deaths, immigration and emigration · persons',
      title: 'Components of population change',
      description: 'Births and immigration are plotted as additions; deaths and emigration are plotted on the opposite side of zero. Negative signs are a display transformation only.',
      why: 'A shared zero line makes inflows and outflows comparable while direction distinguishes additions from removals.',
      whyNot: 'A conventional stacked bar would make some components harder to compare and could imply that all parts accumulate in the same direction.'
    },
    patterns: {
      chainQuestion: 'scan for high and low periods across several series',
      encoding: 'position + colour + length',
      chart: 'heatmap',
      eyebrow: 'Within-series percentile · exact counts on selection',
      title: 'When were demographic flows high or low?',
      description: 'Each row is ranked within itself. Colour and the small in-cell bar show the percentile of each year within that series; exact SSB counts remain available in the readout.',
      why: 'Two-dimensional position lets you scan years and variables together. Normalised colour makes unusual periods visible even though the series have different absolute ranges.',
      whyNot: 'Four line charts preserve the exact shape of each series, but make simultaneous scanning across variables more demanding.'
    }
  };

  const seriesMatchers = {
    population: [/population 1 january/i, /^population$/i],
    births: [/live births/i, /livebirths?, total/i],
    deaths: [/^deaths$/i, /death, total/i],
    immigration: [/^in-migration$/i, /^immigration$/i],
    emigration: [/^emigration$/i],
    growth: [/population increase/i],
    excessBirths: [/excess of births/i],
    netMigration: [/net migration/i]
  };

  const els = {
    status: document.getElementById('data-status'),
    tabs: [...document.querySelectorAll('[data-question]')],
    chart: document.getElementById('main-chart'),
    wrap: document.getElementById('chart-wrap'),
    controls: document.getElementById('chart-controls'),
    chartEyebrow: document.getElementById('chart-eyebrow'),
    chartTitle: document.getElementById('chart-title'),
    chartDescription: document.getElementById('chart-description'),
    readout: document.getElementById('chart-readout'),
    why: document.getElementById('why-this'),
    whyNot: document.getElementById('why-not'),
    chainQuestion: document.getElementById('chain-question'),
    chainEncoding: document.getElementById('chain-encoding'),
    chainChart: document.getElementById('chain-chart'),
    tooltip: document.getElementById('chart-tooltip'),
    encodingButtons: [...document.querySelectorAll('[data-encoding-control]')],
    encodingReset: document.getElementById('encoding-reset'),
    encodingTitle: document.getElementById('encoding-detail-title'),
    encodingText: document.getElementById('encoding-detail-text')
  };

  function setStatus(text, kind = '') {
    els.status.textContent = text;
    els.status.className = `data-status${kind ? ` ${kind}` : ''}`;
  }

  function categoryCodes(category) {
    if (!category || !category.index) return [];
    if (Array.isArray(category.index)) return category.index;
    return Object.entries(category.index).sort((a, b) => a[1] - b[1]).map(([code]) => code);
  }

  function flattenJsonStat(dataset) {
    if (!dataset || !Array.isArray(dataset.id) || !Array.isArray(dataset.size) || !dataset.dimension) {
      throw new Error('Unexpected JSON-stat2 response.');
    }
    const ids = dataset.id;
    const sizes = dataset.size;
    const codeLists = ids.map(id => categoryCodes(dataset.dimension[id]?.category));
    const labels = ids.map((id, dim) => {
      const labelMap = dataset.dimension[id]?.category?.label || {};
      return codeLists[dim].map(code => labelMap[code] ?? code);
    });
    const cellCount = sizes.reduce((a, b) => a * b, 1);
    let values;
    if (Array.isArray(dataset.value)) {
      values = dataset.value;
    } else if (dataset.value && typeof dataset.value === 'object') {
      // JSON-stat2 may encode sparse values as an object keyed by flat cell index.
      values = new Array(cellCount).fill(null);
      Object.entries(dataset.value).forEach(([index, value]) => {
        const i = Number(index);
        if (Number.isInteger(i) && i >= 0 && i < cellCount) values[i] = value;
      });
    } else {
      values = new Array(cellCount).fill(null);
    }
    const rows = [];

    for (let flat = 0; flat < cellCount; flat++) {
      let remainder = flat;
      const coords = new Array(ids.length);
      for (let i = ids.length - 1; i >= 0; i--) {
        coords[i] = remainder % sizes[i];
        remainder = Math.floor(remainder / sizes[i]);
      }
      const row = { value: values[flat] };
      ids.forEach((id, i) => {
        row[`${id}Code`] = codeLists[i][coords[i]];
        row[id] = labels[i][coords[i]];
      });
      rows.push(row);
    }
    return rows;
  }

  function detectDimension(ids, candidates) {
    return ids.find(id => candidates.some(rx => rx.test(id))) || null;
  }

  function normaliseDataset(raw) {
    const rows = flattenJsonStat(raw);
    const ids = raw.id;
    const timeId = detectDimension(ids, [/^tid$/i, /time/i, /year/i]);
    const contentId = detectDimension(ids, [/contentscode/i, /contents/i, /content/i]);
    if (!timeId || !contentId) throw new Error('Could not identify time and contents dimensions.');

    const byLabel = new Map();
    rows.forEach(row => {
      const year = Number.parseInt(String(row[timeId]).match(/\d{4}/)?.[0] || '', 10);
      const label = String(row[contentId] ?? '').trim();
      if (!Number.isFinite(year) || !label) return;
      if (!byLabel.has(label)) byLabel.set(label, []);
      byLabel.get(label).push({ year, value: row.value == null ? null : Number(row.value), label });
    });

    const findSeries = matcherList => {
      for (const [label, values] of byLabel) {
        if (matcherList.some(rx => rx.test(label))) {
          return values.filter(d => Number.isFinite(d.value)).sort((a, b) => a.year - b.year);
        }
      }
      return [];
    };

    const result = {};
    Object.entries(seriesMatchers).forEach(([key, matchers]) => { result[key] = findSeries(matchers); });

    if (!result.population.length || !result.births.length || !result.deaths.length || !result.immigration.length || !result.emigration.length) {
      const labelsFound = [...byLabel.keys()].join(' | ');
      throw new Error(`Required series were not found. Available contents: ${labelsFound}`);
    }

    result.meta = {
      label: raw.label || 'SSB table 06913',
      latestYear: Math.max(...result.population.map(d => d.year)),
      latestCompleteFlowYear: Math.min(
        Math.max(...result.births.map(d => d.year)),
        Math.max(...result.deaths.map(d => d.year)),
        Math.max(...result.immigration.map(d => d.year)),
        Math.max(...result.emigration.map(d => d.year))
      )
    };
    return result;
  }

  async function fetchSsbData() {
    let lastError;
    for (const url of API_QUERIES) {
      try {
        const response = await fetch(url, { mode: 'cors', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`SSB API returned ${response.status}`);
        const raw = await response.json();
        const normalised = normaliseDataset(raw);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), raw }));
        } catch (_) { /* storage may be unavailable */ }
        return { data: normalised, source: 'live' };
      } catch (error) {
        lastError = error;
      }
    }

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.raw) return { data: normaliseDataset(cached.raw), source: 'cache', savedAt: cached.savedAt };
    } catch (_) { /* ignore invalid cache */ }
    throw lastError || new Error('Unable to load SSB data.');
  }

  function fmt(n) {
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
  }

  function seriesValue(series, year) {
    return series.find(d => d.year === year)?.value ?? null;
  }

  function svgEl(name, attrs = {}, text = '') {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  }

  function dimensions() {
    const rect = els.wrap.getBoundingClientRect();
    const width = Math.max(620, Math.floor(rect.width));
    const height = window.innerWidth <= 620 ? 390 : 430;
    return { width, height, margin: { top: 24, right: 24, bottom: 44, left: 62 } };
  }

  function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
    const span = domainMax - domainMin || 1;
    return value => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
  }

  function extent(values, includeZero = false) {
    const finite = values.filter(Number.isFinite);
    let min = Math.min(...finite), max = Math.max(...finite);
    if (includeZero) { min = Math.min(0, min); max = Math.max(0, max); }
    if (min === max) { min -= 1; max += 1; }
    return [min, max];
  }

  function niceMax(max) {
    const power = Math.pow(10, Math.floor(Math.log10(Math.abs(max || 1))));
    return Math.ceil(max / power) * power;
  }

  function tickValues(min, max, count = 5) {
    const out = [];
    for (let i = 0; i <= count; i++) out.push(min + (max - min) * (i / count));
    return out;
  }

  function drawAxes(svg, xTicks, yTicks, xScale, yScale, dims, opts = {}) {
    const { width, height, margin } = dims;
    const plotBottom = height - margin.bottom;
    const plotRight = width - margin.right;
    const xAxis = svgEl('g', { class: 'axis' });
    const yAxis = svgEl('g', { class: 'axis' });

    xAxis.appendChild(svgEl('line', { x1: margin.left, y1: plotBottom, x2: plotRight, y2: plotBottom }));
    xTicks.forEach(t => {
      const x = xScale(t.value ?? t);
      xAxis.appendChild(svgEl('line', { x1: x, y1: plotBottom, x2: x, y2: plotBottom + 5 }));
      const label = svgEl('text', { x, y: plotBottom + 20, 'text-anchor': 'middle' }, t.label ?? String(t));
      xAxis.appendChild(label);
    });

    yTicks.forEach(t => {
      const y = yScale(t.value ?? t);
      svg.appendChild(svgEl('line', { class: t === 0 ? 'zero-line' : 'grid-line', x1: margin.left, y1: y, x2: plotRight, y2: y }));
      const label = svgEl('text', { x: margin.left - 10, y: y + 4, 'text-anchor': 'end' }, opts.yFormatter ? opts.yFormatter(t) : fmt(t));
      yAxis.appendChild(label);
    });
    yAxis.appendChild(svgEl('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: plotBottom }));
    svg.appendChild(xAxis);
    svg.appendChild(yAxis);
  }

  function attachPointInteraction(el, html, readoutText, x, y) {
    el.classList.add('interactive');
    el.setAttribute('tabindex', '0');
    const show = () => {
      els.tooltip.hidden = false;
      els.tooltip.innerHTML = html;
      els.tooltip.style.left = `${x}px`;
      els.tooltip.style.top = `${y}px`;
      els.readout.textContent = readoutText;
    };
    const hide = () => { els.tooltip.hidden = true; };
    el.addEventListener('mouseenter', show);
    el.addEventListener('focus', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('blur', hide);
    el.addEventListener('click', show);
  }

  function resetSvg(dims) {
    els.chart.innerHTML = '';
    els.chart.setAttribute('viewBox', `0 0 ${dims.width} ${dims.height}`);
    els.tooltip.hidden = true;
  }

  function setControls(html = '') {
    els.controls.innerHTML = html;
  }

  function renderPopulation() {
    const data = state.data.population;
    const dims = dimensions();
    resetSvg(dims);
    setControls('');
    const { width, height, margin } = dims;
    const x = linearScale(data[0].year, data[data.length - 1].year, margin.left, width - margin.right);
    const [, rawMax] = extent(data.map(d => d.value));
    const max = niceMax(rawMax);
    const y = linearScale(0, max, height - margin.bottom, margin.top);
    const years = [1951, 1970, 1990, 2010, data[data.length - 1].year].filter((v, i, a) => v >= data[0].year && v <= data[data.length - 1].year && a.indexOf(v) === i);
    drawAxes(els.chart, years, tickValues(0, max, 5), x, y, dims, { yFormatter: v => `${(v / 1e6).toFixed(v === 0 ? 0 : 1)}m` });

    const path = data.map((d, i) => `${i ? 'L' : 'M'} ${x(d.year)} ${y(d.value)}`).join(' ');
    els.chart.appendChild(svgEl('path', { d: path, class: 'chart-mark line-series', 'data-encoding': 'position connection' }));

    data.forEach((d, i) => {
      if (i % 5 !== 0 && i !== data.length - 1) return;
      const c = svgEl('circle', { cx: x(d.year), cy: y(d.value), r: 4.2, class: 'chart-mark line-point', 'data-encoding': 'position area colour' });
      attachPointInteraction(c, `<strong>${d.year}</strong><br>${fmt(d.value)} persons`, `${d.year}: ${fmt(d.value)} persons`, x(d.year), y(d.value));
      els.chart.appendChild(c);
    });

    const last = data[data.length - 1];
    const annotation = svgEl('g');
    annotation.appendChild(svgEl('line', { x1: x(last.year), y1: y(last.value), x2: x(last.year) - 72, y2: y(last.value) - 34, class: 'annotation-line' }));
    annotation.appendChild(svgEl('text', { x: x(last.year) - 78, y: y(last.value) - 38, 'text-anchor': 'end', class: 'annotation-text' }, `${last.year}: ${fmt(last.value)}`));
    els.chart.appendChild(annotation);
    els.readout.textContent = `Latest observation: ${last.year}, ${fmt(last.value)} persons on 1 January.`;
  }

  function renderGrowth() {
    const data = state.data.growth.length ? state.data.growth : deriveGrowthFromPopulation(state.data.population);
    const dims = dimensions();
    resetSvg(dims);
    setControls(`<button type="button" data-growth-mode="bar" aria-pressed="${state.growthMode === 'bar'}">Bars</button><button type="button" data-growth-mode="dot" aria-pressed="${state.growthMode === 'dot'}">Dots</button>`);
    els.controls.querySelectorAll('[data-growth-mode]').forEach(btn => btn.addEventListener('click', () => {
      state.growthMode = btn.dataset.growthMode;
      render();
    }));

    const { width, height, margin } = dims;
    const minYear = data[0].year, maxYear = data[data.length - 1].year;
    const x = linearScale(minYear - .5, maxYear + .5, margin.left, width - margin.right);
    const [rawMin, rawMax] = extent(data.map(d => d.value), true);
    const maxAbs = niceMax(Math.max(Math.abs(rawMin), Math.abs(rawMax)));
    const y = linearScale(-maxAbs, maxAbs, height - margin.bottom, margin.top);
    const years = [minYear, 1970, 1990, 2010, maxYear].filter((v, i, a) => v >= minYear && v <= maxYear && a.indexOf(v) === i);
    const yTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs];
    drawAxes(els.chart, years, yTicks, x, y, dims, { yFormatter: v => v === 0 ? '0' : `${Math.round(v / 1000)}k` });

    const step = (width - margin.left - margin.right) / Math.max(1, data.length);
    data.forEach(d => {
      if (state.growthMode === 'bar') {
        const x0 = x(d.year) - Math.max(2, step * .33);
        const y0 = y(Math.max(0, d.value));
        const y1 = y(Math.min(0, d.value));
        const rect = svgEl('rect', { x: x0, y: y0, width: Math.max(3, step * .66), height: Math.max(1, y1 - y0), class: 'chart-mark bar-growth', 'data-encoding': 'position length colour' });
        attachPointInteraction(rect, `<strong>${d.year}</strong><br>${fmt(d.value)} persons`, `${d.year}: population increase ${fmt(d.value)} persons`, x(d.year), y(d.value));
        els.chart.appendChild(rect);
      } else {
        const dot = svgEl('circle', { cx: x(d.year), cy: y(d.value), r: 4.1, class: 'chart-mark dot-growth', 'data-encoding': 'position area colour' });
        attachPointInteraction(dot, `<strong>${d.year}</strong><br>${fmt(d.value)} persons`, `${d.year}: population increase ${fmt(d.value)} persons`, x(d.year), y(d.value));
        els.chart.appendChild(dot);
      }
    });

    const maxD = data.reduce((a, b) => b.value > a.value ? b : a);
    els.readout.textContent = `Largest annual population increase in the displayed series: ${maxD.year}, ${fmt(maxD.value)} persons. Switch between bars and dots to see how length and position change the comparison.`;
  }

  function deriveGrowthFromPopulation(pop) {
    const out = [];
    for (let i = 0; i < pop.length - 1; i++) out.push({ year: pop[i].year, value: pop[i + 1].value - pop[i].value, label: 'Derived population change' });
    return out;
  }

  function completeYears() {
    const sets = ['births', 'deaths', 'immigration', 'emigration'].map(k => new Set(state.data[k].map(d => d.year)));
    return [...sets[0]].filter(y => sets.every(s => s.has(y))).sort((a, b) => a - b);
  }

  function renderComponents() {
    const years = completeYears();
    if (!state.selectedYear || !years.includes(state.selectedYear)) state.selectedYear = years[years.length - 1];
    const year = state.selectedYear;
    const dims = dimensions();
    resetSvg(dims);
    setControls(`<label for="year-select" class="sr-only">Year</label><select id="year-select">${years.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select>`);
    document.getElementById('year-select').addEventListener('change', e => { state.selectedYear = Number(e.target.value); render(); });

    const raw = [
      { key: 'Births', value: seriesValue(state.data.births, year), signed: seriesValue(state.data.births, year), cls: 'component-in', direction: 'addition' },
      { key: 'Immigration', value: seriesValue(state.data.immigration, year), signed: seriesValue(state.data.immigration, year), cls: 'component-in', direction: 'addition' },
      { key: 'Deaths', value: seriesValue(state.data.deaths, year), signed: -seriesValue(state.data.deaths, year), cls: 'component-out', direction: 'removal' },
      { key: 'Emigration', value: seriesValue(state.data.emigration, year), signed: -seriesValue(state.data.emigration, year), cls: 'component-out', direction: 'removal' }
    ];

    const { width, height, margin } = dims;
    const leftLabel = margin.left + 84;
    const plotLeft = leftLabel + 20;
    const plotRight = width - margin.right;
    const maxAbs = niceMax(Math.max(...raw.map(d => Math.abs(d.signed))));
    const x = linearScale(-maxAbs, maxAbs, plotLeft, plotRight);
    const zeroX = x(0);
    const rowGap = 78;
    const top = 70;

    tickValues(-maxAbs, maxAbs, 4).forEach(t => {
      const xx = x(t);
      els.chart.appendChild(svgEl('line', { x1: xx, y1: margin.top + 10, x2: xx, y2: height - margin.bottom, class: t === 0 ? 'zero-line' : 'grid-line' }));
      els.chart.appendChild(svgEl('text', { x: xx, y: height - 16, 'text-anchor': 'middle', class: 'component-value' }, t === 0 ? '0' : `${Math.abs(Math.round(t / 1000))}k`));
    });

    raw.forEach((d, i) => {
      const y = top + i * rowGap;
      const barX = Math.min(zeroX, x(d.signed));
      const barW = Math.abs(x(d.signed) - zeroX);
      els.chart.appendChild(svgEl('text', { x: leftLabel, y: y + 5, 'text-anchor': 'end', class: 'component-label' }, d.key));
      const rect = svgEl('rect', { x: barX, y: y - 18, width: Math.max(1, barW), height: 34, class: `chart-mark ${d.cls}`, 'data-encoding': 'position length direction colour' });
      attachPointInteraction(rect, `<strong>${d.key}, ${year}</strong><br>${fmt(d.value)} persons`, `${year} ${d.key.toLowerCase()}: ${fmt(d.value)} persons. Plotted as a ${d.direction}.`, zeroX + (x(d.signed) - zeroX) / 2, y);
      els.chart.appendChild(rect);
      els.chart.appendChild(svgEl('text', { x: d.signed >= 0 ? x(d.signed) + 7 : x(d.signed) - 7, y: y + 5, 'text-anchor': d.signed >= 0 ? 'start' : 'end', class: 'component-value' }, fmt(d.value)));
    });

    const observed = seriesValue(state.data.growth, year) ?? deriveGrowthFromPopulation(state.data.population).find(d => d.year === year)?.value ?? null;
    if (Number.isFinite(observed)) {
      const markerX = x(Math.max(-maxAbs, Math.min(maxAbs, observed)));
      els.chart.appendChild(svgEl('line', { x1: markerX, y1: margin.top, x2: markerX, y2: height - margin.bottom - 12, class: 'chart-mark population-marker', 'data-encoding': 'position' }));
      els.chart.appendChild(svgEl('text', { x: markerX, y: margin.top - 5, 'text-anchor': 'middle', class: 'annotation-text' }, `Observed population increase: ${fmt(observed)}`));
    }

    els.readout.textContent = `${year}: births ${fmt(raw[0].value)}, deaths ${fmt(raw[2].value)}, immigration ${fmt(raw[1].value)}, emigration ${fmt(raw[3].value)}. Outflows are shown on the negative side only to communicate direction; source counts are not negative.`;
  }

  function percentileMap(series) {
    const sorted = [...series].filter(d => Number.isFinite(d.value)).sort((a, b) => a.value - b.value);
    const map = new Map();
    sorted.forEach((d, i) => map.set(d.year, sorted.length <= 1 ? .5 : i / (sorted.length - 1)));
    return map;
  }

  function mixHex(a, b, t) {
    const pa = a.replace('#','').match(/../g).map(x => parseInt(x,16));
    const pb = b.replace('#','').match(/../g).map(x => parseInt(x,16));
    const c = pa.map((v,i) => Math.round(v + (pb[i]-v)*t));
    return `#${c.map(v => v.toString(16).padStart(2,'0')).join('')}`;
  }

  function renderPatterns() {
    const keys = [
      ['Births', state.data.births],
      ['Deaths', state.data.deaths],
      ['Immigration', state.data.immigration],
      ['Emigration', state.data.emigration]
    ];
    const years = completeYears();
    const dims = dimensions();
    resetSvg(dims);
    setControls('');
    const { width, height, margin } = dims;
    const labelW = 90;
    const plotLeft = margin.left + labelW;
    const plotRight = width - margin.right;
    const plotTop = 48;
    const plotBottom = height - margin.bottom;
    const cellW = (plotRight - plotLeft) / years.length;
    const rowH = (plotBottom - plotTop) / keys.length;

    const percentileMaps = keys.map(([, series]) => percentileMap(series));
    keys.forEach(([name, series], row) => {
      const y = plotTop + row * rowH;
      els.chart.appendChild(svgEl('text', { x: plotLeft - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'heat-row-label' }, name));
      years.forEach((year, col) => {
        const value = seriesValue(series, year);
        if (!Number.isFinite(value)) return;
        const pct = percentileMaps[row].get(year) ?? 0;
        const x = plotLeft + col * cellW;
        const fill = mixHex('#edf5f6', COLORS.green, 0.12 + pct * 0.88);
        const cell = svgEl('rect', { x, y: y + 4, width: Math.max(1, cellW), height: rowH - 8, fill, class: 'chart-mark heat-cell', 'data-encoding': 'position colour' });
        cell.setAttribute('aria-label', `${name}, ${year}: ${fmt(value)} persons, ${Math.round(pct * 100)}th percentile within the series`);
        attachPointInteraction(cell, `<strong>${name}, ${year}</strong><br>${fmt(value)} persons<br>${Math.round(pct * 100)}th percentile`, `${name}, ${year}: ${fmt(value)} persons; about the ${Math.round(pct * 100)}th percentile within this series.`, x + cellW/2, y + rowH/2);
        els.chart.appendChild(cell);
        const tickH = Math.max(2, (rowH - 18) * pct);
        els.chart.appendChild(svgEl('rect', { x: x + Math.max(1, cellW * .34), y: y + rowH - 8 - tickH, width: Math.max(1, cellW * .32), height: tickH, class: 'chart-mark heat-tick', 'data-encoding': 'length position' }));
      });
    });

    const labelYears = years.filter(y => y === years[0] || y === years[years.length - 1] || y % 10 === 0);
    labelYears.forEach(year => {
      const col = years.indexOf(year);
      const x = plotLeft + (col + .5) * cellW;
      els.chart.appendChild(svgEl('text', { x, y: plotBottom + 18, 'text-anchor': 'middle', class: 'heat-year-label' }, String(year)));
    });
    els.readout.textContent = 'Select any cell for the exact SSB count. The heatmap scale is relative within each row, so dark cells mean “high for this series”, not “the largest absolute count on the chart”.';
  }

  function updateText() {
    const cfg = questionConfig[state.question];
    els.chainQuestion.textContent = cfg.chainQuestion;
    els.chainEncoding.textContent = cfg.encoding;
    els.chainChart.textContent = cfg.chart;
    els.chartEyebrow.textContent = cfg.eyebrow;
    els.chartTitle.textContent = cfg.title;
    els.chartDescription.textContent = cfg.description;
    els.why.textContent = cfg.why;
    els.whyNot.textContent = cfg.whyNot;
    els.chart.parentElement.setAttribute('aria-labelledby', `chart-title chart-description`);
    const tab = els.tabs.find(b => b.dataset.question === state.question);
    document.getElementById('chart-panel').setAttribute('aria-labelledby', tab.id);
  }

  function render() {
    if (!state.data) return;
    updateText();
    if (state.question === 'population') renderPopulation();
    if (state.question === 'growth') renderGrowth();
    if (state.question === 'components') renderComponents();
    if (state.question === 'patterns') renderPatterns();
    applyEncodingHighlight();
  }

  const encodingCopy = {
    position: ['Position', 'Position on a common scale is usually the most precise quantitative encoding. It drives line charts, dot plots, scatter plots and the placement of heatmap cells.'],
    length: ['Length', 'Length makes magnitude visible from a baseline. Bars are effective because the reader can compare aligned lengths with little decoding effort.'],
    area: ['Area', 'Area can carry magnitude, but people judge area less precisely than position or length. Treemaps use area because hierarchy and part-to-whole structure justify the trade-off.'],
    colour: ['Colour', 'Colour is good for grouping, emphasis and ordered intensity. It is weaker for exact magnitude, so the heatmap pairs colour with position, a small length cue and exact-value readouts.'],
    connection: ['Connection', 'Connecting marks says that sequence or relationship matters. A line chart connects time-ordered observations; network and Sankey forms connect entities or flows.'],
    direction: ['Direction', 'Direction distinguishes movement or sign: into versus out of a system, positive versus negative, source versus destination. It should correspond to a real structure in the data.']
  };

  function applyEncodingHighlight() {
    const target = state.selectedEncoding;
    document.querySelectorAll('[data-encoding]').forEach(el => {
      el.classList.remove('encoding-focus', 'encoding-dim');
      if (!target) return;
      const encs = el.getAttribute('data-encoding').split(/\s+/);
      el.classList.add(encs.includes(target) ? 'encoding-focus' : 'encoding-dim');
    });
    els.encodingButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.encodingControl === target)));
    if (!target) {
      els.encodingTitle.textContent = 'Select a building block';
      els.encodingText.textContent = 'A chart form is a convention for combining encodings. The useful question is not merely what the chart is called, but which perceptual channel carries the comparison.';
    } else {
      const [title, text] = encodingCopy[target];
      els.encodingTitle.textContent = title;
      els.encodingText.textContent = text;
    }
  }

  els.tabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      state.question = button.dataset.question;
      els.tabs.forEach(b => b.setAttribute('aria-selected', String(b === button)));
      render();
    });
    button.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      e.preventDefault();
      let next = index;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % els.tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + els.tabs.length) % els.tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = els.tabs.length - 1;
      els.tabs[next].click();
      els.tabs[next].focus();
    });
  });

  els.encodingButtons.forEach(button => button.addEventListener('click', () => {
    const enc = button.dataset.encodingControl;
    state.selectedEncoding = state.selectedEncoding === enc ? null : enc;
    applyEncodingHighlight();
    document.getElementById('encodings-title').scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  els.encodingReset.addEventListener('click', () => { state.selectedEncoding = null; applyEncodingHighlight(); });

  window.addEventListener('resize', () => {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(render, 120);
  });

  async function init() {
    try {
      const loaded = await fetchSsbData();
      state.data = loaded.data;
      state.selectedYear = loaded.data.meta.latestCompleteFlowYear;
      if (loaded.source === 'live') {
        setStatus(`Live SSB data loaded. Table 06913; population through ${loaded.data.meta.latestYear}, complete annual flow data through ${loaded.data.meta.latestCompleteFlowYear}. Source unit: persons.`);
      } else {
        const saved = loaded.savedAt ? new Date(loaded.savedAt).toLocaleString('en-GB') : 'an earlier visit';
        setStatus(`SSB API is temporarily unavailable. Showing browser-cached table 06913 data saved ${saved}.`, 'cached');
      }
      render();
    } catch (error) {
      console.error(error);
      setStatus('The teaching page loaded, but current SSB data could not be retrieved. Check your network connection or the SSB StatBank API and reload the page. No substitute values are fabricated.', 'error');
      els.chartDescription.textContent = 'No chart is shown because the source data could not be retrieved. The page deliberately does not replace official statistics with invented fallback values.';
      els.readout.textContent = 'Source: Statistics Norway, table 06913.';
    }
  }

  init();
})();
