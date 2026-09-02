(() => {
  'use strict';

  const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
  const WORLD = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

  const COUNTRIES = [
    ['AT','Austria'],['BE','Belgium'],['BG','Bulgaria'],['HR','Croatia'],['CY','Cyprus'],['CZ','Czechia'],
    ['DK','Denmark'],['EE','Estonia'],['FI','Finland'],['FR','France'],['DE','Germany'],['EL','Greece'],
    ['HU','Hungary'],['IE','Ireland'],['IT','Italy'],['LV','Latvia'],['LT','Lithuania'],['LU','Luxembourg'],
    ['MT','Malta'],['NL','Netherlands'],['PL','Poland'],['PT','Portugal'],['RO','Romania'],['SK','Slovakia'],
    ['SI','Slovenia'],['ES','Spain'],['SE','Sweden'],['IS','Iceland'],['NO','Norway'],['CH','Switzerland']
  ];
  const COUNTRY_NAME = Object.fromEntries(COUNTRIES);
  COUNTRY_NAME.EU27_2020 = 'EU27';

  const MAP_NAME_TO_CODE = {
    Austria:'AT', Belgium:'BE', Bulgaria:'BG', Croatia:'HR', Cyprus:'CY', Czechia:'CZ', 'Czech Republic':'CZ',
    Denmark:'DK', Estonia:'EE', Finland:'FI', France:'FR', Germany:'DE', Greece:'EL', Hungary:'HU', Ireland:'IE',
    Italy:'IT', Latvia:'LV', Lithuania:'LT', Luxembourg:'LU', Malta:'MT', Netherlands:'NL', Poland:'PL', Portugal:'PT',
    Romania:'RO', Slovakia:'SK', Slovenia:'SI', Spain:'ES', Sweden:'SE', Iceland:'IS', Norway:'NO', Switzerland:'CH'
  };

  const VIEW_META = {
    number:      { purpose:'MAGNITUDE', title:'Employment rate', useful:'Showing one important current value quickly.' },
    composition: { purpose:'PART-TO-WHOLE', title:'Labour-market composition', useful:'Showing how a total is divided into parts.' },
    age:         { purpose:'COMPARISON', title:'Employment by age', useful:'Comparing categories and seeing what an overall average hides.' },
    rank:        { purpose:'RANK', title:'Employment rate across Europe', useful:'Making precise comparisons between countries.' },
    deviation:   { purpose:'DEVIATION', title:'Difference from EU27', useful:'Showing how far countries are above or below a benchmark.' },
    annual:      { purpose:'CHANGE OVER TIME', title:'Employment over time', useful:'Seeing long-term change and differences between groups.' },
    quarterly:   { purpose:'CHANGE OVER TIME', title:'Quarterly employment', useful:'Seeing shorter-term movements at a finer time resolution.' },
    map:         { purpose:'SPATIAL', title:'Employment rate across Europe', useful:'Seeing geographical patterns.' },
    flow:        { purpose:'FLOW', title:'Labour-market flows', useful:'Showing movement between states.' }
  };

  const state = {
    country: localStorage.getItem('estp-module0-country') || 'NO',
    view: 'number',
    year: null,
    annualRows: [],
    annualUpdated: null,
    completeYear: null,
    availableYears: [],
    cache: new Map()
  };

  const els = {
    country: document.querySelector('#country-select'),
    viewSelect: document.querySelector('#view-select'),
    buttons: [...document.querySelectorAll('[data-view]')],
    heroValue: document.querySelector('#hero-value'),
    heroPeriod: document.querySelector('#hero-period'),
    heroChange: document.querySelector('#hero-change'),
    purpose: document.querySelector('#chart-purpose'),
    title: document.querySelector('#chart-title'),
    subtitle: document.querySelector('#chart-subtitle'),
    area: document.querySelector('#chart-area'),
    useful: document.querySelector('#useful-for'),
    summary: document.querySelector('#chart-summary'),
    message: document.querySelector('#availability-message'),
    yearControl: document.querySelector('#year-control'),
    yearSelect: document.querySelector('#year-select'),
    sourceMeta: document.querySelector('#source-meta'),
    contrast: document.querySelector('#contrast-note')
  };

  init();

  async function init() {
    buildCountrySelector();
    wireEvents();
    try {
      const annual = await fetchEurostat('lfsi_emp_a', {
        freq:'A', indic_em:'EMP_LFS', age:'Y20-64', unit:'PC_POP', sinceTimePeriod:'2003'
      });
      state.annualRows = jsonStatRows(annual);
      state.annualUpdated = annual.updated || null;
      state.completeYear = findLatestCommonYear(state.annualRows);
      state.availableYears = [...new Set(state.annualRows.filter(r => r.sex === 'T' && r.geo !== 'EU27_2020').map(r => Number(r.time)))].sort((a,b)=>a-b);
      state.year = state.completeYear;
      populateYearSelector();
      updateSourceMeta();
      updateHero();
      await renderView();
    } catch (err) {
      console.error(err);
      showGlobalDataError();
    }
  }

  function buildCountrySelector() {
    els.country.innerHTML = '';
    for (const [code, name] of COUNTRIES) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      if (code === state.country) option.selected = true;
      els.country.append(option);
    }
  }

  function wireEvents() {
    els.country.addEventListener('change', async () => {
      state.country = els.country.value;
      localStorage.setItem('estp-module0-country', state.country);
      updateHero();
      await renderView();
    });

    els.buttons.forEach(button => button.addEventListener('click', async () => setView(button.dataset.view)));
    els.viewSelect.addEventListener('change', async () => setView(els.viewSelect.value));
    els.yearSelect.addEventListener('change', async () => {
      state.year = Number(els.yearSelect.value);
      await renderView();
    });
  }

  async function setView(view) {
    state.view = view;
    els.buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    els.viewSelect.value = view;
    await renderView();
  }

  function populateYearSelector() {
    els.yearSelect.innerHTML = '';
    state.availableYears.filter(y => y <= state.completeYear).slice().reverse().forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === state.year) option.selected = true;
      els.yearSelect.append(option);
    });
  }

  function updateHero() {
    const current = getAnnual(state.country, 'T', state.completeYear);
    const previous = getAnnual(state.country, 'T', state.completeYear - 1);
    if (!current) {
      els.heroValue.textContent = '—';
      els.heroPeriod.textContent = 'Population aged 20–64';
      els.heroChange.textContent = `No ${state.completeYear} value available for ${COUNTRY_NAME[state.country]}.`;
      return;
    }
    els.heroValue.textContent = `${fmt1(current.value)}%`;
    els.heroPeriod.textContent = `Population aged 20–64 · ${state.completeYear}`;
    if (previous) {
      const diff = current.value - previous.value;
      els.heroChange.textContent = `${diff >= 0 ? '↑' : '↓'} ${fmt1(Math.abs(diff))} percentage points since ${state.completeYear - 1}`;
    } else {
      els.heroChange.textContent = `Latest complete annual value: ${state.completeYear}`;
    }
  }

  function getAnnual(geo, sex='T', year=state.year) {
    return state.annualRows.find(r => r.geo === geo && r.sex === sex && Number(r.time) === Number(year));
  }

  function findLatestCommonYear(rows) {
    const required = COUNTRIES.map(d => d[0]);
    const years = [...new Set(rows.filter(r => r.sex === 'T' && required.includes(r.geo)).map(r => Number(r.time)))].sort((a,b)=>b-a);
    for (const y of years) {
      const present = new Set(rows.filter(r => r.sex === 'T' && Number(r.time) === y && r.value != null).map(r => r.geo));
      if (required.every(c => present.has(c))) return y;
    }
    return Math.max(...years);
  }

  function updateSourceMeta() {
    const updated = state.annualUpdated ? ` Annual dataset update: ${formatDate(state.annualUpdated)}.` : '';
    els.sourceMeta.textContent = `Data are requested directly from Eurostat. Metadata verified 2 September 2026.${updated} Latest common complete annual year used on opening: ${state.completeYear}.`;
  }

  async function renderView() {
    const meta = VIEW_META[state.view];
    els.purpose.textContent = meta.purpose;
    els.title.textContent = meta.title;
    els.useful.textContent = meta.useful;
    els.area.innerHTML = '';
    els.subtitle.textContent = '';
    els.summary.textContent = '';
    els.message.hidden = true;
    els.contrast.hidden = !['map','rank'].includes(state.view);
    els.yearControl.hidden = !['map','rank','deviation'].includes(state.view);

    try {
      if (state.view === 'number') renderNumber();
      if (state.view === 'composition') await renderComposition();
      if (state.view === 'age') await renderAge();
      if (state.view === 'annual') renderAnnual();
      if (state.view === 'quarterly') await renderQuarterly();
      if (state.view === 'map') await renderMap();
      if (state.view === 'rank') renderRank();
      if (state.view === 'deviation') renderDeviation();
      if (state.view === 'flow') await renderFlow();
    } catch (err) {
      console.error(err);
      unavailable(`This view could not be loaded for ${COUNTRY_NAME[state.country]}. No substitute data are being shown.`);
    }
  }

  function renderNumber() {
    const r = getAnnual(state.country, 'T', state.completeYear);
    els.title.textContent = `Employment rate in ${COUNTRY_NAME[state.country]}`;
    els.subtitle.textContent = `Population aged 20–64 · ${state.completeYear} · percentage of total population`;
    if (!r) return unavailable(`No ${state.completeYear} employment-rate value is available for ${COUNTRY_NAME[state.country]}.`);
    els.area.innerHTML = `<div class="big-number"><p class="big-number__label">Employment rate</p><p class="big-number__value">${fmt1(r.value)}%</p><p class="big-number__meta">Ages 20–64 · ${state.completeYear}</p></div>`;
    els.summary.textContent = `${COUNTRY_NAME[state.country]}: ${fmt1(r.value)} per cent of people aged 20–64 were employed in ${state.completeYear}.`;
  }

  async function renderComposition() {
    els.title.textContent = `Labour-market status in ${COUNTRY_NAME[state.country]}`;
    els.subtitle.textContent = `Population aged 20–64 · ${state.completeYear} · common denominator: total population`;
    const data = await fetchEurostat('lfsi_emp_a', { freq:'A', sex:'T', age:'Y20-64', unit:'PC_POP', geo:state.country, time:String(state.completeYear) });
    const rows = jsonStatRows(data);
    const emp = rows.find(r => r.indic_em === 'EMP_LFS')?.value;
    const active = rows.find(r => r.indic_em === 'ACT')?.value;
    if (emp == null || active == null) return unavailable(`A complete composition is not available for ${COUNTRY_NAME[state.country]} in ${state.completeYear}.`);
    const unemployed = active - emp;
    const inactive = 100 - active;
    const parts = [
      ['Employed', emp, 'emp'], ['Unemployed', unemployed, 'unemp'], ['Outside the labour force', inactive, 'inactive']
    ];
    els.area.innerHTML = `<div class="composition-wrap"><div class="composition-bar" role="img" aria-label="${parts.map(p=>`${p[0]} ${fmt1(p[1])} per cent`).join(', ')}">${parts.map(p=>`<div class="composition-segment ${p[2]}" style="width:${Math.max(0,p[1])}%"></div>`).join('')}</div><div class="composition-labels">${parts.map(p=>`<div><strong>${fmt1(p[1])}%</strong><span>${p[0]}</span></div>`).join('')}</div></div>`;
    els.summary.textContent = `All three shares use the total population aged 20–64 as denominator. Unemployment here is derived as labour-force share minus employment share, not the standard unemployment rate.`;
  }

  async function renderAge() {
    els.title.textContent = `Employment rates by age in ${COUNTRY_NAME[state.country]}`;
    els.subtitle.textContent = `${state.completeYear} · standard Eurostat age groups · percentage of each age group's population`;
    const data = await fetchEurostat('lfsi_emp_a', { freq:'A', indic_em:'EMP_LFS', sex:'T', unit:'PC_POP', geo:state.country, time:String(state.completeYear) });
    const rows = jsonStatRows(data);
    const groups = [
      ['Y15-24','15–24'],['Y25-54','25–54'],['Y55-64','55–64']
    ].map(([code,label]) => ({label, value:rows.find(r=>r.age===code)?.value})).filter(d=>d.value!=null);
    if (groups.length < 2) return unavailable(`Comparable age-group employment rates are not available for ${COUNTRY_NAME[state.country]} in ${state.completeYear}.`);
    els.area.append(horizontalBars(groups, {max:100, suffix:'%', selected:false}));
    els.summary.textContent = `The youngest standard group is 15–24, so this view deliberately uses a different age grouping from the main 20–64 indicator.`;
  }

  function renderAnnual() {
    els.title.textContent = `Employment over time in ${COUNTRY_NAME[state.country]}`;
    els.subtitle.textContent = `Population aged 20–64 · annual employment rate · total, women and men`;
    const start = Math.max(2005, state.completeYear - 19);
    const rows = state.annualRows.filter(r => r.geo===state.country && Number(r.time)>=start && Number(r.time)<=state.completeYear && ['T','F','M'].includes(r.sex));
    if (!rows.length) return unavailable(`No annual time series is available for ${COUNTRY_NAME[state.country]}.`);
    const svg = lineChart(rows, {xKey:'time', seriesKey:'sex', seriesOrder:['T','F','M'], labels:{T:'Total',F:'Women',M:'Men'}});
    els.area.append(svg.wrap);
    els.area.append(svg.legend);
    els.summary.textContent = `Annual employment rates for ${COUNTRY_NAME[state.country]} from ${start} to ${state.completeYear}, shown separately for total, women and men where observations are available.`;
  }

  async function renderQuarterly() {
    els.title.textContent = `Quarterly employment in ${COUNTRY_NAME[state.country]}`;
    els.subtitle.textContent = `Population aged 20–64 · seasonally adjusted · percentage of total population`;
    const data = await fetchEurostat('lfsi_emp_q', { freq:'Q', indic_em:'EMP_LFS', s_adj:'SA', sex:'T', age:'Y20-64', unit:'PC_POP', geo:state.country, lastTimePeriod:'24' });
    const rows = jsonStatRows(data).filter(r=>r.value!=null);
    if (rows.length < 4) return unavailable(`Eurostat does not provide enough observations for the requested seasonally adjusted quarterly series for ${COUNTRY_NAME[state.country]}.`);
    const svg = lineChart(rows.map(r=>({...r, series:'T'})), {xKey:'time', seriesKey:'series', seriesOrder:['T'], labels:{T:'Employment rate'}, quarterly:true});
    els.area.append(svg.wrap);
    const first = rows[0].time, last = rows[rows.length-1].time;
    els.summary.textContent = `Seasonally adjusted quarterly employment rate from ${first} to ${last}. The page does not switch to unadjusted data when this exact series is unavailable.`;
  }

  function renderRank() {
    const rows = rankRows(state.year);
    els.title.textContent = `Employment-rate ranking · ${state.year}`;
    els.subtitle.textContent = `Population aged 20–64 · percentage of total population`;
    if (!rows.some(r=>r.geo===state.country)) return unavailable(`No ${state.year} employment-rate value is available for ${COUNTRY_NAME[state.country]}.`);
    els.area.append(horizontalBars(rows.map(r=>({label:COUNTRY_NAME[r.geo]||r.geo, value:r.value, code:r.geo})), {max:100, suffix:'%', selectedCode:state.country, euCode:'EU27_2020', tall:true}));
    const rank = rows.findIndex(r=>r.geo===state.country)+1;
    els.summary.textContent = `${COUNTRY_NAME[state.country]} ranks ${rank} of ${rows.filter(r=>r.geo!=='EU27_2020').length} countries shown in ${state.year}. EU27 is included as a benchmark and not counted as a country rank.`;
  }

  function renderDeviation() {
    const eu = getAnnual('EU27_2020','T',state.year);
    if (!eu) return unavailable(`EU27 benchmark data are unavailable for ${state.year}.`);
    const rows = rankRows(state.year).filter(r=>r.geo!=='EU27_2020').map(r=>({label:COUNTRY_NAME[r.geo], value:r.value-eu.value, code:r.geo})).sort((a,b)=>b.value-a.value);
    els.title.textContent = `Difference from EU27 · ${state.year}`;
    els.subtitle.textContent = `Employment rate, ages 20–64 · percentage-point difference from EU27 (${fmt1(eu.value)}%)`;
    if (!rows.some(r=>r.code===state.country)) return unavailable(`No ${state.year} deviation can be calculated for ${COUNTRY_NAME[state.country]}.`);
    els.area.append(divergingBars(rows, state.country));
    const selected = rows.find(r=>r.code===state.country);
    els.summary.textContent = `${COUNTRY_NAME[state.country]} is ${fmtSigned(selected.value)} percentage points ${selected.value>=0?'above':'below'} the EU27 employment rate in ${state.year}.`;
  }

  async function renderMap() {
    els.title.textContent = `Employment rate across Europe · ${state.year}`;
    els.subtitle.textContent = `Population aged 20–64 · percentage of total population`;
    const rows = rankRows(state.year).filter(r=>r.geo!=='EU27_2020');
    if (!rows.some(r=>r.geo===state.country)) return unavailable(`No ${state.year} map value is available for ${COUNTRY_NAME[state.country]}.`);
    if (!window.d3 || !window.topojson) return unavailable('The map geometry library could not be loaded. Other statistical views remain available.');
    const world = await fetchWithCache(WORLD, true);
    const features = topojson.feature(world, world.objects.countries).features;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 900 540');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`Choropleth map of employment rates in Europe for ${state.year}. ${COUNTRY_NAME[state.country]} is outlined.`);
    const projection = d3.geoMercator().center([15,54]).scale(570).translate([450,270]);
    const path = d3.geoPath(projection);
    const byCode = Object.fromEntries(rows.map(r=>[r.geo,r.value]));
    const vals = rows.map(r=>r.value);
    const min = Math.floor(Math.min(...vals)/5)*5, max = Math.ceil(Math.max(...vals)/5)*5;
    const color = d3.scaleLinear().domain([min,max]).range(['#c3dcdc','#00824d']);
    const g = document.createElementNS(svg.namespaceURI,'g');
    for (const f of features) {
      const code = MAP_NAME_TO_CODE[f.properties.name];
      if (!code) continue;
      const p = document.createElementNS(svg.namespaceURI,'path');
      p.setAttribute('d', path(f));
      p.setAttribute('class', `map-country ${code===state.country?'map-selected':''} ${byCode[code]==null?'map-no-data':''}`);
      if (byCode[code]!=null) p.setAttribute('fill', color(byCode[code]));
      const t = document.createElementNS(svg.namespaceURI,'title');
      t.textContent = `${COUNTRY_NAME[code]}: ${byCode[code]==null?'no data':fmt1(byCode[code])+'%'}`;
      p.append(t); g.append(p);
    }
    svg.append(g);
    const legend = makeMapLegend(min,max);
    svg.append(legend);
    els.area.append(svg);
    const selected = rows.find(r=>r.geo===state.country);
    els.summary.textContent = `${COUNTRY_NAME[state.country]} is outlined and has an employment rate of ${fmt1(selected.value)}% in ${state.year}. Exact comparisons are easier in the ranking view.`;
  }

  async function renderFlow() {
    els.title.textContent = `Labour-market flows in ${COUNTRY_NAME[state.country]}`;
    els.subtitle.textContent = `Seasonally adjusted transitions · population aged 15–74 · thousand persons`;
    const data = await fetchEurostat('lfsi_long_q', { freq:'Q', sex:'T', s_adj:'SA', unit:'THS_PER', geo:state.country, lastTimePeriod:'1' });
    const rows = jsonStatRows(data).filter(r=>r.value!=null);
    const needed = ['E_U','E_I','U_E','U_I','I_E','I_U'];
    const values = Object.fromEntries(needed.map(k=>[k, rows.find(r=>r.indic_em===k)?.value]));
    const period = rows[0]?.time;
    if (!period || needed.some(k=>values[k]==null)) return unavailable(`Comparable country-level labour-market flow data are unavailable for ${COUNTRY_NAME[state.country]} in the requested latest period.`);
    const from = previousQuarter(period);
    els.subtitle.textContent = `${from} → ${period} · seasonally adjusted · ages 15–74 · thousand persons`;
    els.area.append(flowChart(values));
    els.summary.textContent = `This view uses Eurostat's labour-market transition statistics for ages 15–74, not the main 20–64 employment-rate population. Staying in the same status is omitted here so the movement between states remains visually simple.`;
  }

  function rankRows(year) {
    const geos = new Set([...COUNTRIES.map(d=>d[0]), 'EU27_2020']);
    return state.annualRows.filter(r=>r.sex==='T' && Number(r.time)===Number(year) && geos.has(r.geo) && r.value!=null).sort((a,b)=>b.value-a.value);
  }

  function lineChart(rows, options) {
    const width=900, height=430, m={t:24,r:28,b:52,l:58};
    const svg = svgEl('svg',{viewBox:`0 0 ${width} ${height}`, role:'img'});
    const xValues=[...new Set(rows.map(r=>r[options.xKey]))];
    const xPos = new Map(xValues.map((x,i)=>[x, m.l + i*(width-m.l-m.r)/Math.max(1,xValues.length-1)]));
    const values=rows.map(r=>r.value).filter(Number.isFinite);
    const ymin=Math.max(0, Math.floor((Math.min(...values)-3)/5)*5);
    const ymax=Math.min(100, Math.ceil((Math.max(...values)+3)/5)*5);
    const y=v=>m.t+(ymax-v)*(height-m.t-m.b)/(ymax-ymin||1);
    for(let tick=ymin; tick<=ymax+0.001; tick+=5){
      svg.append(svgEl('line',{x1:m.l,x2:width-m.r,y1:y(tick),y2:y(tick),class:'chart-grid'}));
      const tx=svgEl('text',{x:m.l-10,y:y(tick)+4,'text-anchor':'end',class:'chart-text--small'}); tx.textContent=`${tick}%`; svg.append(tx);
    }
    svg.append(svgEl('line',{x1:m.l,x2:width-m.r,y1:height-m.b,y2:height-m.b,class:'chart-axis'}));
    const step=options.quarterly?4:Math.max(1,Math.ceil(xValues.length/7));
    xValues.forEach((x,i)=>{ if(i%step===0 || i===xValues.length-1){ const tx=svgEl('text',{x:xPos.get(x),y:height-m.b+24,'text-anchor':'middle',class:'chart-text--small'}); tx.textContent=x; svg.append(tx);} });
    const classes={T:'chart-line',F:'chart-line chart-line--female',M:'chart-line chart-line--male'};
    options.seriesOrder.forEach(series=>{
      const pts=rows.filter(r=>r[options.seriesKey]===series).sort((a,b)=>xValues.indexOf(a[options.xKey])-xValues.indexOf(b[options.xKey]));
      if(!pts.length) return;
      const d=pts.map((p,i)=>`${i?'L':'M'}${xPos.get(p[options.xKey])},${y(p.value)}`).join(' ');
      svg.append(svgEl('path',{d,class:classes[series]||'chart-line'}));
      const last=pts[pts.length-1];
      const label=svgEl('text',{x:xPos.get(last[options.xKey])+5,y:y(last.value)-7,class:'chart-value'}); label.textContent=`${options.labels[series]} ${fmt1(last.value)}%`; svg.append(label);
    });
    const legend=document.createElement('div'); legend.className='legend-row';
    options.seriesOrder.forEach(s=>{ const item=document.createElement('span'); item.className='legend-key'; item.innerHTML=`<span class="legend-swatch ${s==='F'?'female':s==='M'?'male':''}"></span>${options.labels[s]}`; legend.append(item); });
    return {wrap:svg, legend};
  }

  function horizontalBars(data, options={}) {
    const rowH = options.tall ? 27 : 72;
    const width=900, m={l:180,r:58,t:18,b:25};
    const height=m.t+m.b+data.length*rowH;
    const svg=svgEl('svg',{viewBox:`0 0 ${width} ${height}`,role:'img'});
    const max=options.max || Math.max(...data.map(d=>d.value));
    const x=v=>m.l+v*(width-m.l-m.r)/max;
    data.forEach((d,i)=>{
      const y=m.t+i*rowH;
      const label=svgEl('text',{x:m.l-10,y:y+rowH*.62,'text-anchor':'end',class:'chart-text'}); label.textContent=d.label; svg.append(label);
      const cls=d.code===options.selectedCode?'bar-selected':d.code===options.euCode?'bar-eu':'bar-muted';
      svg.append(svgEl('rect',{x:m.l,y:y+rowH*.18,width:Math.max(1,x(d.value)-m.l),height:rowH*.48,class:cls}));
      const val=svgEl('text',{x:Math.min(width-m.r+3,x(d.value)+7),y:y+rowH*.61,class:'chart-value'}); val.textContent=`${fmt1(d.value)}${options.suffix||''}`; svg.append(val);
    });
    return svg;
  }

  function divergingBars(data, selectedCode) {
    const width=900,rowH=27,m={l:180,r:60,t:18,b:24};
    const height=m.t+m.b+data.length*rowH;
    const svg=svgEl('svg',{viewBox:`0 0 ${width} ${height}`,role:'img'});
    const abs=Math.max(2, Math.ceil(Math.max(...data.map(d=>Math.abs(d.value)))/2)*2);
    const x=v=>m.l+(v+abs)*(width-m.l-m.r)/(2*abs);
    const zero=x(0);
    svg.append(svgEl('line',{x1:zero,x2:zero,y1:m.t-3,y2:height-m.b+3,class:'zero-line'}));
    data.forEach((d,i)=>{
      const y=m.t+i*rowH;
      const label=svgEl('text',{x:m.l-10,y:y+rowH*.62,'text-anchor':'end',class:'chart-text'}); label.textContent=d.label; svg.append(label);
      const left=Math.min(zero,x(d.value)), right=Math.max(zero,x(d.value));
      svg.append(svgEl('rect',{x:left,y:y+rowH*.18,width:Math.max(1,right-left),height:rowH*.48,class:d.code===selectedCode?'bar-selected':'bar-muted'}));
      const val=svgEl('text',{x:d.value>=0?right+6:left-6,y:y+rowH*.61,'text-anchor':d.value>=0?'start':'end',class:'chart-value'}); val.textContent=fmtSigned(d.value); svg.append(val);
    });
    return svg;
  }

  function flowChart(values) {
    const width=900,height=430;
    const svg=svgEl('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Flow diagram showing movements between employment, unemployment and outside the labour force.'});
    const left={E:[110,70],U:[110,190],I:[110,310]}, right={E:[790,70],U:[790,190],I:[790,310]};
    const labels={E:'Employment',U:'Unemployment',I:'Outside labour force'};
    const total=Math.max(...Object.values(values));
    const sw=v=>Math.max(2, 30*v/total);
    const pairs=[['E','U','E_U'],['E','I','E_I'],['U','E','U_E'],['U','I','U_I'],['I','E','I_E'],['I','U','I_U']];
    pairs.forEach(([a,b,k],i)=>{
      const [x1,y1]=left[a],[x2,y2]=right[b];
      const c1=x1+220,c2=x2-220;
      const p=svgEl('path',{d:`M${x1+80},${y1} C${c1},${y1} ${c2},${y2} ${x2-80},${y2}`,class:`flow-ribbon ${a==='E'?'employment':a==='U'?'unemployment':''}`,'stroke-width':sw(values[k])});
      const t=svgEl('title'); t.textContent=`${labels[a]} to ${labels[b]}: ${fmt1(values[k])} thousand`; p.append(t); svg.append(p);
    });
    Object.entries(left).forEach(([k,[x,y]])=>drawNode(svg,x,y,labels[k]));
    Object.entries(right).forEach(([k,[x,y]])=>drawNode(svg,x,y,labels[k]));
    const l=svgEl('text',{x:110,y:25,'text-anchor':'middle',class:'chart-text--small'}); l.textContent='INITIAL STATUS'; svg.append(l);
    const r=svgEl('text',{x:790,y:25,'text-anchor':'middle',class:'chart-text--small'}); r.textContent='NEW STATUS'; svg.append(r);
    return svg;
  }

  function drawNode(svg,x,y,label){
    svg.append(svgEl('rect',{x:x-80,y:y-27,width:160,height:54,class:'flow-node'}));
    const t=svgEl('text',{x,y:y+4,'text-anchor':'middle',class:'chart-text'}); t.textContent=label; svg.append(t);
  }

  function makeMapLegend(min,max){
    const g=svgEl('g',{transform:'translate(610 470)'});
    const steps=5;
    for(let i=0;i<steps;i++){
      const v=min+(max-min)*i/(steps-1);
      const fill=d3.scaleLinear().domain([min,max]).range(['#c3dcdc','#00824d'])(v);
      g.append(svgEl('rect',{x:i*42,y:0,width:42,height:14,fill}));
    }
    const a=svgEl('text',{x:0,y:34,class:'chart-text--small'}); a.textContent=`${min}%`; g.append(a);
    const b=svgEl('text',{x:steps*42,y:34,'text-anchor':'end',class:'chart-text--small'}); b.textContent=`${max}%`; g.append(b);
    return g;
  }

  async function fetchEurostat(dataset, params) {
    const query = new URLSearchParams({ lang:'EN', ...params });
    const url = `${API}${dataset}?${query.toString()}`;
    return fetchWithCache(url, false);
  }

  async function fetchWithCache(url, raw=false) {
    if (state.cache.has(url)) return state.cache.get(url);
    const key=`estp-m0:${url}`;
    try {
      const response=await fetch(url,{headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const json=await response.json();
      state.cache.set(url,json);
      try{localStorage.setItem(key,JSON.stringify(json));}catch{}
      return json;
    } catch(err) {
      const cached=localStorage.getItem(key);
      if(cached){ const json=JSON.parse(cached); state.cache.set(url,json); return json; }
      throw err;
    }
  }

  function jsonStatRows(ds) {
    if (!ds || !Array.isArray(ds.id) || !Array.isArray(ds.size)) return [];
    const dims = ds.id.map(id => {
      const cat = ds.dimension[id]?.category || {};
      const idx = cat.index || {};
      let codes;
      if (Array.isArray(idx)) codes = idx;
      else codes = Object.entries(idx).sort((a,b)=>a[1]-b[1]).map(d=>d[0]);
      return {id,codes};
    });
    const total = ds.size.reduce((a,b)=>a*b,1);
    const rows=[];
    for(let n=0;n<total;n++){
      const value=Array.isArray(ds.value)?ds.value[n]:ds.value?.[String(n)];
      if(value==null) continue;
      let rem=n;
      const row={value:Number(value)};
      for(let d=0; d<dims.length; d++){
        const divisor=ds.size.slice(d+1).reduce((a,b)=>a*b,1);
        const pos=Math.floor(rem/divisor);
        rem%=divisor;
        row[dims[d].id]=dims[d].codes[pos];
      }
      rows.push(row);
    }
    return rows;
  }

  function unavailable(text){
    els.area.innerHTML='';
    els.message.textContent=text;
    els.message.hidden=false;
    els.summary.textContent='';
  }

  function showGlobalDataError(){
    els.heroValue.textContent='—';
    els.heroChange.textContent='Eurostat data could not be loaded.';
    unavailable('Eurostat data could not be loaded and no cached response is available. The page does not use invented fallback values.');
  }

  function svgEl(name, attrs={}){
    const el=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
    return el;
  }
  function fmt1(v){ return Number(v).toFixed(1); }
  function fmtSigned(v){ return `${v>=0?'+':''}${Number(v).toFixed(1)}`; }
  function formatDate(v){ try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(v));}catch{return v;} }
  function previousQuarter(q){ const m=String(q).match(/(\d{4})Q([1-4])/); if(!m)return 'previous quarter'; let y=+m[1],n=+m[2]-1; if(n===0){n=4;y--;} return `${y}Q${n}`; }
})();
