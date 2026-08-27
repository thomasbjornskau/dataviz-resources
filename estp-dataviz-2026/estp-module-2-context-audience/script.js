(() => {
  'use strict';

  const COLORS = { dark:'#274247', green:'#00824d', light:'#f0f8f9', mid:'#c3dcdc', purple:'#7e5ee8', muted:'#52696e', grid:'#dce9eb', white:'#ffffff' };
  const state = { data:null, audience:'general', metric:'annual', showAte:true, exact:false, purpose:'explain', simplify:0 };
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const fmt1 = n => `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}`;
  const pct = n => `${fmt1(n)}%`;
  const monthLabel = key => {
    const [y,m] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1)));
  };
  const shortMonth = key => {
    const [y,m] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1)));
  };

  function svgEl(tag, attrs={}, text='') {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  }
  function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }
  function derivedAnnual() {
    const arr = state.data.cpiIndex;
    return arr.slice(12).map((d,i) => ({ date:d.date, value:(d.value / arr[i].value - 1) * 100, source:'derived' }));
  }
  function indexSeries(){ return state.data.cpiIndex.map(d=>({date:d.date,value:d.value,source:'source index'})); }
  function publishedSeries(metric, ate=false) {
    const key = metric === 'monthly' ? (ate?'cpiAteMonthly':'cpiMonthly') : (ate?'cpiAteAnnual':'cpiAnnual');
    return state.data.publishedRates.map(d=>({date:d.date,value:d[key],source:'published rate'}));
  }
  function latestValue(series){ return series[series.length-1]; }
  function subSeries(series, months){ return months ? series.slice(Math.max(0,series.length-months)) : series; }

  function renderLineChart(svg, seriesDefs, opts={}) {
    clear(svg);
    const W=760, H=350, m={l:54,r:24,t:30,b:44};
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const all = seriesDefs.flatMap(s=>s.values);
    if(!all.length) return;
    const dates=[...new Set(all.map(d=>d.date))].sort();
    const xi=new Map(dates.map((d,i)=>[d,i]));
    const vals=all.map(d=>d.value).filter(Number.isFinite);
    let min=Math.min(...vals), max=Math.max(...vals);
    if(opts.includeZero){ min=Math.min(0,min); max=Math.max(0,max); }
    const spread=Math.max(.1,max-min);
    min-=spread*.12; max+=spread*.15;
    if(opts.yDomain){ [min,max]=opts.yDomain; }
    const x=i=>m.l+(i/Math.max(1,dates.length-1))*(W-m.l-m.r);
    const y=v=>m.t+(max-v)/(max-min)*(H-m.t-m.b);
    const ticks=5;
    for(let i=0;i<=ticks;i++){
      const v=min+(max-min)*i/ticks, yy=y(v);
      svg.appendChild(svgEl('line',{x1:m.l,y1:yy,x2:W-m.r,y2:yy,class:'grid-line'}));
      svg.appendChild(svgEl('text',{x:m.l-9,y:yy+4,'text-anchor':'end',class:'chart-label'}, opts.formatY?opts.formatY(v):v.toFixed(1)));
    }
    const xTickCount = Math.min(6, dates.length);
    for(let i=0;i<xTickCount;i++){
      const idx=Math.round(i*(dates.length-1)/Math.max(1,xTickCount-1));
      svg.appendChild(svgEl('text',{x:x(idx),y:H-16,'text-anchor': idx===0?'start':idx===dates.length-1?'end':'middle',class:'chart-label'}, shortMonth(dates[idx])));
    }
    svg.appendChild(svgEl('line',{x1:m.l,y1:H-m.b,x2:W-m.r,y2:H-m.b,class:'axis-line'}));
    if(min<0 && max>0) svg.appendChild(svgEl('line',{x1:m.l,y1:y(0),x2:W-m.r,y2:y(0),class:'zero-line'}));

    const pathFor=values=>values.map((d,i)=>`${i?'L':'M'}${x(xi.get(d.date)).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
    seriesDefs.forEach((s,si)=>{
      const path=svgEl('path',{d:pathFor(s.values),class:si===0?'chart-series-cpi':'chart-series-ate'});
      svg.appendChild(path);
      const points = opts.showAllPoints ? s.values : [s.values[s.values.length-1]];
      points.forEach(d=>{
        const circle=svgEl('circle',{cx:x(xi.get(d.date)),cy:y(d.value),r:opts.showAllPoints?4:6,class:`${opts.showAllPoints?'chart-point':'chart-latest'} ${si?'chart-point--ate chart-latest--ate':''}`,tabindex:'0',role:'button','aria-label':`${s.label}, ${monthLabel(d.date)}: ${opts.valueLabel?opts.valueLabel(d.value):d.value.toFixed(1)}`});
        const activate=()=>opts.onSelect && opts.onSelect(s,d);
        circle.addEventListener('click',activate);
        circle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
        svg.appendChild(circle);
      });
      const last=s.values[s.values.length-1];
      if(last && opts.endLabels){ svg.appendChild(svgEl('text',{x:x(xi.get(last.date))-6,y:y(last.value)+(si?17:-10),'text-anchor':'end',class:'chart-label chart-label--strong'},`${s.label} ${opts.valueLabel?opts.valueLabel(last.value):last.value.toFixed(1)}`)); }
    });
    if(opts.annotation){
      const d=all.find(v=>v.date===opts.annotation.date) || all[all.length-1];
      if(d){ const xx=x(xi.get(d.date)), yy=y(d.value); svg.appendChild(svgEl('line',{x1:xx,y1:yy,x2:xx-32,y2:yy-42,class:'chart-annotation-line'})); svg.appendChild(svgEl('text',{x:xx-36,y:yy-46,'text-anchor':'end',class:'chart-annotation'},opts.annotation.text)); }
    }
    if(opts.reference != null){ const yy=y(opts.reference); svg.appendChild(svgEl('line',{x1:m.l,y1:yy,x2:W-m.r,y2:yy,class:'chart-reference'})); svg.appendChild(svgEl('text',{x:W-m.r,y:yy-5,'text-anchor':'end',class:'chart-ref-label'},opts.referenceLabel||String(opts.reference))); }
  }

  function categoryMarkup(names){
    const selected=names.map(n=>state.data.categories.find(d=>d.name===n)).filter(Boolean);
    const maxAbs=Math.max(...selected.map(d=>Math.abs(d.annual)),8);
    return `<div class="category-bars">${selected.map(d=>{
      const w=Math.abs(d.annual)/maxAbs*88;
      return `<div class="category-bar"><span>${d.name}</span><span class="category-bar__track"><span class="category-bar__fill ${d.annual<0?'negative':''}" style="left:${d.annual<0?50-w/2:50}%;width:${w/2}%"></span></span><strong>${pct(d.annual)}</strong></div>`;
    }).join('')}</div>`;
  }

  const audienceCfg={
    general:{label:'General reader',purpose:'Explain current price growth',context:'Recent trend only',title:'Consumer prices are 3.0% higher than a year ago',need:'A fast answer to one question, in plain language.',change:'Only the latest rate and a short recent trend are shown. Specialist detail is withheld.',why:'The trend prevents 3.0% from becoming an isolated fact, while keeping the reading task simple.',desc:'A short recent trend gives the latest number enough context without turning the chart into an analytical tool.',changeStrip:'<span>Kept</span> CPI 12-month rate <strong>·</strong> <span>Removed</span> extra series and controls'},
    journalist:{label:'Journalist / communication',purpose:'Identify change and notable contrasts',context:'Five-year trend + selected groups',title:'Inflation is 3.0% — but price changes differ across consumption groups',need:'Enough context to see what changed and identify a defensible angle.',change:'The same CPI line gets a longer time span, comparison points and selected main-group rates.',why:'A journalist needs change over time and contrasts, but not the full StatBank table. Category rates are labelled as rates — not contributions.',desc:'The CPI trend remains central. Selected main-group rates add a second layer for finding contrasts worth investigating.',changeStrip:'<span>Added</span> five-year context + selected group rates <strong>·</strong> <span>Kept</span> CPI as the anchor'},
    analyst:{label:'Statistical analyst',purpose:'Interpret the latest figure statistically',context:'Long series + metric controls + CPI-ATE',title:'CPI in broader statistical context',need:'Definitions, exact values, alternative measures and control over the comparison.',change:'The time series becomes an analytical view: metric controls, exact readouts and CPI-ATE can be added where the extract supports it.',why:'Additional complexity earns its place because the task is interpretation, not rapid communication.',desc:'Controls expose index levels, monthly change and 12-month change. Exact recent CPI-ATE rates come from SSB table 14706.',changeStrip:'<span>Added</span> controls + exact values + CPI-ATE <strong>·</strong> <span>Purpose</span> interpretation rather than headline reading'}
  };

  function setAudience(a){
    state.audience=a;
    $$('.audience-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.audience===a)));
    const cfg=audienceCfg[a];
    $('#chain-audience').textContent=cfg.label; $('#chain-purpose').textContent=cfg.purpose; $('#chain-context').textContent=cfg.context;
    $('#audience-chart-title').textContent=cfg.title; $('#audience-need').textContent=cfg.need; $('#audience-change').textContent=cfg.change; $('#audience-why').textContent=cfg.why; $('#audience-chart-description').textContent=cfg.desc; $('#change-strip').innerHTML=cfg.changeStrip;
    $('#audience-panel').setAttribute('aria-labelledby',`audience-${a}`);
    renderAudience();
  }

  function renderAudienceControls(){
    const box=$('#audience-controls'); box.innerHTML='';
    if(state.audience!=='analyst') return;
    const metric=document.createElement('select'); metric.setAttribute('aria-label','Choose statistical measure');
    [['annual','12-month change'],['monthly','Monthly change'],['index','CPI index']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;o.selected=state.metric===v;metric.appendChild(o);});
    metric.addEventListener('change',()=>{state.metric=metric.value;if(state.metric==='index')state.showAte=false;renderAudience();});
    const ate=document.createElement('button'); ate.type='button'; ate.textContent='CPI-ATE'; ate.setAttribute('aria-pressed',String(state.showAte)); ate.disabled=state.metric==='index'; ate.title=ate.disabled?'CPI-ATE index values are not included in this small teaching extract.':'';
    ate.addEventListener('click',()=>{state.showAte=!state.showAte;renderAudience();});
    const exact=document.createElement('button'); exact.type='button'; exact.textContent='Exact points'; exact.setAttribute('aria-pressed',String(state.exact)); exact.addEventListener('click',()=>{state.exact=!state.exact;renderAudience();});
    box.append(metric,ate,exact);
  }

  function renderAudience(){
    if(!state.data) return;
    renderAudienceControls();
    const svg=$('#audience-chart'), readout=$('#audience-readout'), key=$('#key-stat'), cat=$('#category-context'), eyebrow=$('#audience-eyebrow');
    cat.hidden=true; cat.innerHTML='';
    let defs=[], valueLabel=v=>`${fmt1(v)}%`, opts={valueLabel,endLabels:true,onSelect:(s,d)=>{readout.textContent=`${s.label}, ${monthLabel(d.date)}: ${valueLabel(d.value)}.`;}};
    if(state.audience==='general'){
      const s=subSeries(derivedAnnual(),25); defs=[{label:'CPI',values:s}]; key.hidden=false; key.innerHTML='<strong>3.0%</strong><span>July 2025 → July 2026</span>'; eyebrow.textContent='12-month change · per cent';
      opts.yDomain=[0,8]; opts.endLabels=false; opts.annotation={date:'2026-07',text:'3.0% in July 2026'}; readout.textContent='July 2026: CPI +3.0% over 12 months.';
    } else if(state.audience==='journalist'){
      const s=subSeries(derivedAnnual(),61); defs=[{label:'CPI',values:s}]; key.hidden=false; key.innerHTML='<strong>3.0%</strong><span>July 2026 · June 2026: 2.7% · July 2025: 3.3%</span>'; eyebrow.textContent='CPI · 12-month change · per cent';
      opts.yDomain=[0,8]; opts.annotation={date:'2026-07',text:'Latest: 3.0%'}; readout.textContent='Published comparisons: July 2026 3.0%; June 2026 2.7%; July 2025 3.3%.';
      cat.hidden=false; cat.innerHTML='<h4>Selected main groups — July 2026</h4><p>12-month price change. These rates do not measure contribution to overall CPI.</p>'+categoryMarkup(['Insurance and financial services','Restaurants and accommodation services','Housing, water, electricity, gas and other fuels','Food and non-alcoholic beverages','Furnishings, household equipment and routine household maintenance','Personal care, social protection and miscellaneous goods and services']);
    } else {
      key.hidden=true;
      if(state.metric==='index'){
        defs=[{label:'CPI',values:indexSeries()}]; valueLabel=v=>v.toFixed(1); opts.valueLabel=valueLabel; eyebrow.textContent='CPI · index · 2025=100'; $('#audience-chart-title').textContent='CPI index, 2020–July 2026'; readout.textContent='Index values show the price level relative to the 2025 average (=100), not a rate of change.';
      } else if(state.metric==='monthly'){
        defs=[{label:'CPI',values:publishedSeries('monthly',false)}]; if(state.showAte) defs.push({label:'CPI-ATE',values:publishedSeries('monthly',true)}); eyebrow.textContent='Monthly change · per cent'; $('#audience-chart-title').textContent='Month-to-month price change in the recent published extract'; opts.includeZero=true; readout.textContent='July 2026: CPI +1.0% from June; CPI-ATE +0.8%.';
      } else {
        defs=[{label:'CPI',values:derivedAnnual()}]; if(state.showAte) defs.push({label:'CPI-ATE',values:publishedSeries('annual',true)}); eyebrow.textContent='12-month change · per cent'; $('#audience-chart-title').textContent='CPI over five years, with recent CPI-ATE when selected'; opts.yDomain=[0,8]; readout.textContent='July 2026: CPI +3.0% over 12 months; CPI-ATE +2.7%.';
      }
      opts.valueLabel=valueLabel; opts.showAllPoints=state.exact; opts.endLabels=true;
      if(defs.length>1) cat.hidden=false, cat.innerHTML='<div class="legend-inline"><span>CPI</span><span class="ate">CPI-ATE</span></div><p>CPI-ATE is CPI adjusted for tax changes and excluding energy products. The local teaching extract contains exact published CPI-ATE rates from May 2025 onward.</p>';
    }
    renderLineChart(svg,defs,opts);
  }

  function contextMiniSvg(series, ate=false){
    const id=`ctx-${Math.random().toString(36).slice(2)}`;
    setTimeout(()=>{const svg=document.getElementById(id);if(svg){renderLineChart(svg,[{label:'CPI',values:series},...(ate?[{label:'CPI-ATE',values:publishedSeries('annual',true)}]:[])],{yDomain:[0,8],valueLabel:v=>`${fmt1(v)}%`,endLabels:false});}},0);
    return `<svg id="${id}" class="context-mini-chart" role="img" aria-label="CPI 12-month change over time"></svg>`;
  }
  function renderContext(){
    if(!state.data)return;
    const on=new Set($$('[data-context]:checked').map(i=>i.dataset.context));
    let html='';
    if(on.has('comparison')) html+=`<div class="context-card"><strong>Immediate comparisons</strong><br>June 2026: 2.7% · July 2025: 3.3% · July 2026: 3.0%</div>`;
    if(on.has('trend')) html+=`<div class="context-card"><strong>Five-year trend</strong>${contextMiniSvg(subSeries(derivedAnnual(),61),on.has('ate'))}</div>`;
    if(on.has('groups')) html+=`<div class="context-card"><strong>Selected main groups, July 2026</strong><div class="context-mini-groups"><span>Insurance & financial services <b>+7.9%</b></span><span>Restaurants & accommodation <b>+5.7%</b></span><span>Housing etc. <b>+4.6%</b></span><span>Food & non-alcoholic beverages <b>+1.1%</b></span><span>Household equipment etc. <b>+0.5%</b></span><span>Personal care etc. <b>−2.1%</b></span></div><small>Group rates, not contributions to CPI.</small></div>`;
    if(on.has('ate') && !on.has('trend')) html+=`<div class="context-card"><strong>Alternative measure</strong><br>CPI-ATE: +2.7% over 12 months in July 2026.<br><small>Adjusted for tax changes and excluding energy products.</small></div>`;
    if(on.size===0) html='<p class="muted-copy">No additional context selected.</p>';
    if(on.size>=4) html+=`<div class="context-card context-overload"><strong>Now the context competes with the question.</strong><br>Every layer is defensible, but the combined display is harder to scan. Remove what the audience does not need.</div>`;
    $('#context-visual').innerHTML=html;
    const lesson=on.size===0?'Alone, 3.0% answers “how much?” but gives little help with “is that high, low, rising or falling?”':
      on.size===1?'One comparison can change the interpretation substantially. Context is useful when it answers a likely follow-up question.':
      on.size<=3?'The number has not changed, but its meaning is easier to judge. Each added layer should earn its place.':
      'More context is not automatically better. The next design move is subtraction: keep the context that answers this audience’s question.';
    $('#context-lesson').textContent=lesson;
  }

  const purposeWhy={
    explain:'Explain removes branches: one number, one comparison, one sentence.',
    compare:'Compare aligns two measures on the same scale so the difference is direct.',
    explore:'Explore adds a control because the user’s task is to ask follow-up questions, not receive one fixed answer.',
    monitor:'Monitor foregrounds the latest status and recent movement rather than a long historical story.'
  };
  function renderPurpose(){
    const el=$('#purpose-demo'); if(!state.data)return;
    $$('.purpose-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.purpose===state.purpose)));
    $('#purpose-why').textContent=purposeWhy[state.purpose];
    if(state.purpose==='explain'){
      el.innerHTML='<div class="purpose-key"><strong>3.0%</strong><p>Consumer prices were 3.0% higher in July 2026 than in July 2025.</p></div>';
    } else if(state.purpose==='compare'){
      el.innerHTML='<div class="compare-bars"><div class="compare-row"><b>CPI</b><span class="compare-track"><span class="compare-fill" style="width:60%"></span></span><strong>3.0%</strong></div><div class="compare-row"><b>CPI-ATE</b><span class="compare-track"><span class="compare-fill" style="width:54%"></span></span><strong>2.7%</strong></div></div><p class="chart-description">Same unit and period. CPI-ATE is adjusted for tax changes and excludes energy products.</p>';
    } else if(state.purpose==='explore'){
      const options=state.data.categories.map((d,i)=>`<option value="${i}">${d.name}</option>`).join('');
      el.innerHTML=`<div class="explore-controls"><label for="purpose-category"><strong>Choose a main group:</strong></label> <select id="purpose-category">${options}</select></div><div id="purpose-explore-result"></div>`;
      const sel=$('#purpose-category'); const draw=()=>{const d=state.data.categories[Number(sel.value)]; const width=Math.min(100,Math.abs(d.annual)/8*100); $('#purpose-explore-result').innerHTML=`<div class="explore-result"><strong>${d.name}</strong><span class="explore-track"><span class="explore-fill" style="width:${width}%"></span></span><b>${pct(d.annual)}</b></div><p class="chart-description">July 2026 · 12-month price change. This is the group’s rate, not its contribution to CPI.</p>`;}; sel.addEventListener('change',draw); draw();
    } else {
      const recent=state.data.publishedRates.slice(-3);
      el.innerHTML='<div>'+recent.map((d,i)=>{const prev=i?recent[i-1].cpiAnnual:state.data.publishedRates[state.data.publishedRates.length-4].cpiAnnual; const delta=d.cpiAnnual-prev; return `<div class="monitor-row"><span>${monthLabel(d.date)}</span><strong>${pct(d.cpiAnnual)}</strong><span>${delta===0?'unchanged':`${delta>0?'+':''}${delta.toFixed(1)} percentage points vs previous month’s 12-month rate`}</span></div>`;}).join('')+'</div>';
    }
  }

  function renderSimplify(){
    if(!state.data)return;
    const svg=$('#simplify-chart'); clear(svg);
    const W=820, rowH=34, m={l:310,r:65,t:50,b:45};
    let groups=[...state.data.categories];
    let labelAll=true, gridDense=true, redundantLegend=true;
    if(state.simplify>=1){ groups.sort((a,b)=>b.annual-a.annual); labelAll=false; gridDense=false; redundantLegend=false; }
    if(state.simplify>=2){
      const keep=new Set(['Insurance and financial services','Restaurants and accommodation services','Housing, water, electricity, gas and other fuels','Food and non-alcoholic beverages','Furnishings, household equipment and routine household maintenance','Personal care, social protection and miscellaneous goods and services']); groups=groups.filter(d=>keep.has(d.name)); labelAll=true;
    }
    const H=m.t+m.b+groups.length*rowH; svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.style.minHeight=`${Math.max(340,H)}px`;
    const min=-3,max=9, x=v=>m.l+(v-min)/(max-min)*(W-m.l-m.r);
    const tickVals=gridDense?[-3,-2,-1,0,1,2,3,4,5,6,7,8,9]:[-3,0,3,6,9];
    tickVals.forEach(v=>{svg.appendChild(svgEl('line',{x1:x(v),y1:m.t-12,x2:x(v),y2:H-m.b,class:'grid-line'}));svg.appendChild(svgEl('text',{x:x(v),y:H-18,'text-anchor':'middle',class:'chart-label'},`${v}%`));});
    const refx=x(3);svg.appendChild(svgEl('line',{x1:refx,y1:m.t-12,x2:refx,y2:H-m.b,class:'chart-reference'}));svg.appendChild(svgEl('text',{x:refx+5,y:m.t-20,class:'chart-ref-label'},'Overall CPI 3.0%'));
    groups.forEach((d,i)=>{const y=m.t+i*rowH+rowH/2; const x0=x(0), xv=x(d.annual); svg.appendChild(svgEl('rect',{x:Math.min(x0,xv),y:y-7,width:Math.max(1,Math.abs(xv-x0)),height:14,fill:d.annual>=0?COLORS.green:COLORS.dark})); const name=d.name.length>43?d.name.slice(0,41)+'…':d.name; svg.appendChild(svgEl('text',{x:m.l-10,y:y+4,'text-anchor':'end',class:'chart-label'},name)); if(labelAll||state.simplify===2)svg.appendChild(svgEl('text',{x:xv+(d.annual>=0?7:-7),y:y+4,'text-anchor':d.annual>=0?'start':'end',class:'chart-label chart-label--strong'},pct(d.annual)));});
    if(redundantLegend){svg.appendChild(svgEl('rect',{x:m.l,y:10,width:18,height:10,fill:COLORS.green}));svg.appendChild(svgEl('text',{x:m.l+25,y:20,class:'chart-label'},'12-month price change'));svg.appendChild(svgEl('text',{x:m.l+205,y:20,class:'chart-label'},'All values also labelled'));}
    const removed=[
      'Nothing yet: all 13 main groups, exact values, gridlines and a redundant legend compete for attention.',
      'The redundant legend, dense grid and most value labels. All 13 categories remain, now sorted for comparison.',
      'Seven categories that do not help answer this particular teaching question. Six contrasting groups and the CPI reference remain.'
    ];
    const preserved=[
      'The source values and the overall CPI reference at 3.0%.',
      'All source categories and the 3.0% overall CPI reference; only presentation clutter is removed.',
      'Exact values for the selected groups, their signs and ordering, plus the 3.0% overall CPI reference.'
    ];
    $('#simplify-removed').textContent=removed[state.simplify]; $('#simplify-preserved').textContent=preserved[state.simplify];
    $$('.simplify-controls button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.simplify)===state.simplify)));
  }

  function installTabKeyboard(selector, attr, setter){
    const tabs=$$(selector); tabs.forEach((b,i)=>b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();let n=i;if(e.key==='ArrowRight'||e.key==='ArrowDown')n=(i+1)%tabs.length;if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=(i-1+tabs.length)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;tabs[n].focus();setter(tabs[n].dataset[attr]);}));
  }

  async function init(){
    try{
      const response=await fetch('data/cpi.json',{cache:'no-store'}); if(!response.ok)throw new Error(`HTTP ${response.status}`); state.data=await response.json();
    }catch(err){
      document.querySelector('main').insertAdjacentHTML('afterbegin',`<div class="page-shell data-status error" role="alert">The local CPI data extract could not be loaded. On GitHub Pages it is loaded from <code>data/cpi.json</code>. If testing locally, use a small HTTP server rather than opening the file via <code>file://</code>.</div>`); return;
    }

    $$('.audience-tabs button').forEach(b=>b.addEventListener('click',()=>setAudience(b.dataset.audience)));
    installTabKeyboard('.audience-tabs button','audience',setAudience);
    $$('[data-context]').forEach(i=>i.addEventListener('change',renderContext));
    $('#clear-context').addEventListener('click',()=>{$$('[data-context]').forEach(i=>i.checked=false);renderContext();});
    $$('.purpose-tabs button').forEach(b=>b.addEventListener('click',()=>{state.purpose=b.dataset.purpose;renderPurpose();}));
    installTabKeyboard('.purpose-tabs button','purpose',p=>{state.purpose=p;renderPurpose();});
    $$('.simplify-controls button').forEach(b=>b.addEventListener('click',()=>{state.simplify=Number(b.dataset.simplify);renderSimplify();}));

    setAudience('general'); renderContext(); renderPurpose(); renderSimplify();
    window.addEventListener('resize',()=>{clearTimeout(state.resizeTimer);state.resizeTimer=setTimeout(()=>{renderAudience();renderSimplify();},120);});
  }
  init();
})();
