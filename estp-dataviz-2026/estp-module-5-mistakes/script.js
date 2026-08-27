(() => {
  'use strict';

  const S = window.ESTP_M5_SNAPSHOT;
  const C = {
    dark:'#274247', green:'#00824d', light:'#f0f8f9', mid:'#c3dcdc',
    purple:'#7e5ee8', ink:'#1b2e32', muted:'#52696e', grid:'#dce9eb', white:'#ffffff'
  };
  const API08518 = 'https://data.ssb.no/api/pxwebapi/v2/tables/08518/data?lang=en&valueCodes[Kjonn]=0&valueCodes[Alder]=15-74&valueCodes[ContentsCode]=*&valueCodes[Tid]=*&outputFormat=json-stat2';
  const API13760 = 'https://data.ssb.no/api/pxwebapi/v2/tables/13760/data?lang=en&valueCodes[Kjonn]=0&valueCodes[Alder]=15-74&valueCodes[Justering]=*&valueCodes[ContentsCode]=*&valueCodes[Tid]=*&outputFormat=json-stat2';
  const CACHE08518 = 'estp-m5-08518-v1';
  const CACHE13760 = 'estp-m5-13760-v1';

  const state = {
    axis: 'misleading',
    context: 'recent',
    measure: 'rate',
    adjustment: 'T',
    emphasis: 'arbitrary',
    clutter: 0,
    showBreak: false,
    final: 'misleading',
    qLong: null,
    monthly: null,
    qSource: 'local snapshot',
    monthlySource: null
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const svgNS = 'http://www.w3.org/2000/svg';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svgEl(name, attrs={}, text='') {
    const e = document.createElementNS(svgNS, name);
    for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text !== '') e.textContent = text;
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function scale(d0,d1,r0,r1) {
    const span = (d1-d0) || 1;
    return v => r0 + ((v-d0)/span)*(r1-r0);
  }
  function niceDomain(values, includeZero=false, pad=.12) {
    let lo = Math.min(...values), hi = Math.max(...values);
    if (includeZero) lo = Math.min(0,lo);
    const span = Math.max(.001, hi-lo);
    lo -= span*pad; hi += span*pad;
    if (includeZero) lo = Math.min(0,lo);
    return [lo,hi];
  }
  function fmt(v, digits=1) {
    return new Intl.NumberFormat('en-GB',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(v);
  }
  function fmtCount(v) { return `${new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(v)}k`; }
  function pathLine(data, x, y, key='value') {
    return data.map((d,i)=>`${i?'L':'M'} ${x(d,i).toFixed(2)} ${y(d[key],d).toFixed(2)}`).join(' ');
  }
  function periodLabel(code) {
    const s=String(code||'');
    let m=s.match(/(\d{4})[KQ](\d)/i); if(m) return `${m[1]}Q${m[2]}`;
    m=s.match(/(\d{4})M(\d{2})/i); if(m) return `${m[1]}-${m[2]}`;
    return s;
  }
  function periodIndex(code) {
    const s=String(code||'');
    let m=s.match(/(\d{4})[KQ](\d)/i); if(m) return +m[1]*4+(+m[2]-1);
    m=s.match(/(\d{4})M(\d{2})/i); if(m) return +m[1]*12+(+m[2]-1);
    m=s.match(/(\d{4})/); return m?+m[1]:0;
  }

  function drawAxes(svg,{left=64,right=24,top=24,bottom=48,width=900,height=430,yDomain=[0,1],yTicks=5,xLabels=[],dense=false,yFormat=v=>fmt(v,1),unit=''}) {
    const plotL=left, plotR=width-right, plotT=top, plotB=height-bottom;
    const y=scale(yDomain[0],yDomain[1],plotB,plotT);
    for(let i=0;i<=yTicks;i++) {
      const v=yDomain[0]+(yDomain[1]-yDomain[0])*i/yTicks;
      const yy=y(v);
      svg.appendChild(svgEl('line',{x1:plotL,x2:plotR,y1:yy,y2:yy,class:`grid-line${dense?' dense':''}`}));
      svg.appendChild(svgEl('text',{x:plotL-10,y:yy+4,'text-anchor':'end',class:'axis-label'},yFormat(v)));
    }
    svg.appendChild(svgEl('line',{x1:plotL,x2:plotL,y1:plotT,y2:plotB,class:'axis-line'}));
    svg.appendChild(svgEl('line',{x1:plotL,x2:plotR,y1:plotB,y2:plotB,class:'axis-line'}));
    if(unit) svg.appendChild(svgEl('text',{x:plotL,y:13,class:'axis-label'},unit));
    xLabels.forEach(({x,label}) => svg.appendChild(svgEl('text',{x,y:plotB+25,'text-anchor':'middle',class:'axis-label'},label)));
    return {plotL,plotR,plotT,plotB,y};
  }

  function drawSingleLine(svg, data, opts={}) {
    clear(svg);
    const width=opts.width||900,height=opts.height||430;
    const vals=data.map(d=>d.value).filter(Number.isFinite);
    if(!vals.length) return drawUnavailable(svg, opts.unavailable || 'Series unavailable.');
    const yDomain=opts.yDomain||niceDomain(vals,!!opts.includeZero,.12);
    const left=68,right=30,top=28,bottom=52;
    const labels=[];
    const every=Math.max(1,Math.ceil(data.length/(opts.maxXLabels||7)));
    const x=scale(0,Math.max(1,data.length-1),left,width-right);
    data.forEach((d,i)=>{ if(i===0||i===data.length-1||i%every===0) labels.push({x:x(i),label:d.period}); });
    const a=drawAxes(svg,{left,right,top,bottom,width,height,yDomain,yTicks:opts.yTicks||5,xLabels:labels,dense:!!opts.dense,yFormat:opts.yFormat||((v)=>fmt(v,1)),unit:opts.unit||''});
    const line=svgEl('path',{d:pathLine(data,(d,i)=>x(i),v=>a.y(v)),class:'series-line'});
    svg.appendChild(line);
    data.forEach((d,i)=>{
      const cls=opts.accentLast&&i===data.length-1?'point-accent':'point';
      svg.appendChild(svgEl('circle',{cx:x(i),cy:a.y(d.value),r:opts.bigPoints?5:3.8,class:cls}));
      if(opts.valueLabels) svg.appendChild(svgEl('text',{x:x(i),y:a.y(d.value)-10,'text-anchor':'middle',class:'value-label'},opts.valueFormat?opts.valueFormat(d.value):fmt(d.value,1)));
    });
    if(opts.breakIndex != null && opts.breakIndex>=0 && opts.breakIndex<data.length) {
      const bx=x(opts.breakIndex);
      svg.appendChild(svgEl('line',{x1:bx,x2:bx,y1:a.plotT,y2:a.plotB,class:'break-line'}));
      svg.appendChild(svgEl('text',{x:bx+8,y:a.plotT+18,class:'break-label'},opts.breakText||'Series break'));
    }
    return {x,y:a.y,axes:a};
  }

  function drawUnavailable(svg,message) {
    clear(svg);
    svg.appendChild(svgEl('rect',{x:0,y:0,width:900,height:430,fill:C.light}));
    svg.appendChild(svgEl('text',{x:450,y:205,'text-anchor':'middle',class:'break-label'},'No substitute values shown'));
    svg.appendChild(svgEl('text',{x:450,y:235,'text-anchor':'middle',class:'chart-label'},message));
  }

  function recentSeries(measure='rate') {
    return S.table08518.recent.map(d=>({period:d.period,value:d[measure]}));
  }

  function renderHero() {
    drawSingleLine($('#hero-chart'),recentSeries('rate'),{width:500,height:245,yDomain:[3.9,5.1],yTicks:3,maxXLabels:3,unit:'%',valueLabels:false,bigPoints:false});
  }

  function renderAxis(progress) {
    const misleading=[3.9,5.1], fixed=[0,6];
    let d;
    if(typeof progress==='number') d=[misleading[0]+(fixed[0]-misleading[0])*progress, misleading[1]+(fixed[1]-misleading[1])*progress];
    else d=state.axis==='fixed'?fixed:misleading;
    drawSingleLine($('#axis-chart'),recentSeries('rate'),{yDomain:d,yTicks:5,unit:'%',maxXLabels:6,valueLabels:true,valueFormat:v=>`${fmt(v,1)}%`,accentLast:state.axis==='misleading'});
    if(state.axis==='fixed') {
      $('#axis-chart-title').textContent='Quarterly unemployment rate, shown in proportion';
      $('#axis-state-label').textContent='Nothing in the data changed. Only the visual scale changed.';
    }
  }

  function animateAxisFix() {
    state.axis='fixed';
    const start=performance.now(), duration=reducedMotion()?1:480;
    const step=t=>{ const p=Math.min(1,(t-start)/duration); renderAxis(p); if(p<1) requestAnimationFrame(step); else renderAxis(); };
    requestAnimationFrame(step);
  }

  function categoryCodes(category) {
    if(!category||!category.index) return [];
    if(Array.isArray(category.index)) return category.index;
    return Object.entries(category.index).sort((a,b)=>a[1]-b[1]).map(([code])=>code);
  }
  function flattenJsonStat(ds) {
    if(!ds||!Array.isArray(ds.id)||!Array.isArray(ds.size)||!ds.dimension) throw new Error('Unexpected JSON-stat2 response');
    const ids=ds.id, sizes=ds.size;
    const codes=ids.map(id=>categoryCodes(ds.dimension[id]?.category));
    const labels=ids.map((id,i)=>{const lm=ds.dimension[id]?.category?.label||{}; return codes[i].map(c=>lm[c]??c);});
    const n=sizes.reduce((a,b)=>a*b,1);
    let values=Array.isArray(ds.value)?ds.value:new Array(n).fill(null);
    if(ds.value&&!Array.isArray(ds.value)&&typeof ds.value==='object') Object.entries(ds.value).forEach(([k,v])=>values[+k]=v);
    const rows=[];
    for(let flat=0;flat<n;flat++) {
      let rem=flat; const coord=new Array(ids.length);
      for(let i=ids.length-1;i>=0;i--){coord[i]=rem%sizes[i]; rem=Math.floor(rem/sizes[i]);}
      const row={value:values[flat]}; ids.forEach((id,i)=>{row[id]=labels[i][coord[i]];row[`${id}Code`]=codes[i][coord[i]];}); rows.push(row);
    }
    return rows;
  }
  function findId(ids,rxs){return ids.find(id=>rxs.some(rx=>rx.test(id)));}

  function normalise08518(raw) {
    const rows=flattenJsonStat(raw), ids=raw.id;
    const tid=findId(ids,[/^Tid$/i,/time/i,/quarter/i]);
    const cont=findId(ids,[/ContentsCode/i,/contents/i]);
    if(!tid||!cont) throw new Error('Could not identify SSB dimensions');
    const out=[];
    rows.forEach(r=>{
      const code=r[`${tid}Code`]||r[tid], cc=r[`${cont}Code`]||'';
      if(r.value==null) return;
      let measure=null;
      if(/Personer/i.test(cc)||/1 000 persons/i.test(String(r[cont]))) measure='count';
      if(/Prosent/i.test(cc)||/per cent/i.test(String(r[cont]))) measure='rate';
      if(!measure) return;
      out.push({period:periodLabel(code),index:periodIndex(code),measure,value:+r.value});
    });
    const grouped=new Map();
    out.forEach(d=>{if(!grouped.has(d.index))grouped.set(d.index,{period:d.period,index:d.index}); grouped.get(d.index)[d.measure]=d.value;});
    return [...grouped.values()].filter(d=>Number.isFinite(d.rate)||Number.isFinite(d.count)).sort((a,b)=>a.index-b.index);
  }

  function normalise13760(raw) {
    const rows=flattenJsonStat(raw),ids=raw.id;
    const tid=findId(ids,[/^Tid$/i,/time/i,/month/i]);
    const cont=findId(ids,[/ContentsCode/i,/contents/i]);
    const adj=findId(ids,[/Justering/i,/adjust/i]);
    if(!tid||!cont||!adj) throw new Error('Could not identify SSB dimensions');
    const out={T:[], '3MGG':[], S:[], IS:[]};
    rows.forEach(r=>{
      const cc=String(r[`${cont}Code`]||''), ac=String(r[`${adj}Code`]||'');
      if(!out[ac]||r.value==null) return;
      if(!/ArbledProsArbstyrk/i.test(cc) && !/unemployment rate/i.test(String(r[cont]))) return;
      const tc=r[`${tid}Code`]||r[tid];
      out[ac].push({period:periodLabel(tc),index:periodIndex(tc),value:+r.value});
    });
    Object.values(out).forEach(a=>a.sort((x,y)=>x.index-y.index));
    return out;
  }

  async function loadJson(url,cacheKey,normaliser) {
    try {
      const r=await fetch(url,{mode:'cors',headers:{Accept:'application/json'}});
      if(!r.ok) throw new Error(`SSB API ${r.status}`);
      const raw=await r.json();
      const data=normaliser(raw);
      try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:new Date().toISOString(),raw}));}catch(_){}
      return {data,source:'live SSB API'};
    } catch(err) {
      try {
        const c=JSON.parse(localStorage.getItem(cacheKey)||'null');
        if(c?.raw) return {data:normaliser(c.raw),source:`cached SSB API (${String(c.savedAt).slice(0,10)})`};
      } catch(_) {}
      throw err;
    }
  }

  function renderContext() {
    let base;
    if(state.context==='long' && state.qLong?.length) base=state.qLong;
    else base=S.table08518.recent.map((d,i)=>({period:d.period,index:i,rate:d.rate,count:d.count}));
    if(state.context==='recent' && state.qLong?.length) base=state.qLong.slice(-6);
    const data=base.map(d=>({period:d.period,value:d[state.measure]})).filter(d=>Number.isFinite(d.value));
    const isRate=state.measure==='rate';
    const domain=isRate?niceDomain(data.map(d=>d.value),false,.16):niceDomain(data.map(d=>d.value),false,.16);
    drawSingleLine($('#context-chart'),data,{yDomain:domain,yTicks:5,unit:isRate?'%':'1,000 persons',yFormat:isRate?(v=>fmt(v,1)):(v=>fmt(v,0)),valueLabels:data.length<=8,valueFormat:isRate?(v=>`${fmt(v,1)}%`):(v=>`${fmt(v,0)}k`),maxXLabels:state.context==='long'?8:6});
    $('#context-chart-unit').textContent=isRate?'Per cent of the labour force':'1,000 unemployed persons';
    if(state.context==='long'&&!state.qLong?.length) $('#context-status').textContent='Long-term live extract is unavailable. The verified recent snapshot remains on screen; no replacement values are invented.';
  }

  function renderAdjustment() {
    const data=state.monthly?.[state.adjustment]||[];
    const label={T:'Trend','3MGG':'Seasonally adjusted · 3-month moving average',S:'Seasonally adjusted',IS:'Not seasonally adjusted'}[state.adjustment];
    $('#adjust-label').textContent=`${label} · per cent of labour force`;
    if(!data.length) {
      drawUnavailable($('#adjust-chart'),`Latest verified trend: ${S.table13760.currentPeriod}, ${fmt(S.table13760.trendRate,1)}%.`);
      return;
    }
    const recent=data.slice(-48);
    drawSingleLine($('#adjust-chart'),recent,{unit:'%',yDomain:niceDomain(recent.map(d=>d.value),false,.16),yTicks:5,maxXLabels:8,accentLast:true});
  }

  function renderClutter() {
    const svg=$('#clutter-chart'); clear(svg);
    const periods=S.table08518.recent.map(d=>d.period), groups=Object.keys(S.table08518.ageSeries);
    const all=groups.flatMap(g=>S.table08518.ageSeries[g].map(d=>d.rate));
    const width=900,height=470,left=68,right=110,top=35,bottom=55;
    const yDomain=[0,Math.ceil(Math.max(...all)/2)*2+2];
    const x=scale(0,periods.length-1,left,width-right);
    const a=drawAxes(svg,{left,right,top,bottom,width,height,yDomain,yTicks:state.clutter<3?10:5,xLabels:periods.map((p,i)=>({x:x(i),label:p})),dense:state.clutter<3,unit:'%'});
    const styles=[{stroke:C.green,width:3},{stroke:C.dark,width:2.4},{stroke:C.purple,width:2.4}];
    groups.forEach((g,gi)=>{
      const visible=state.clutter<2 || gi===0;
      if(!visible) return;
      const arr=S.table08518.ageSeries[g];
      const path=svgEl('path',{d:pathLine(arr,(d,i)=>x(i),v=>a.y(v),'rate'),fill:'none',stroke:styles[gi].stroke,'stroke-width':styles[gi].width,opacity:state.clutter>=2&&gi!==0?.18:1});
      svg.appendChild(path);
      arr.forEach((d,i)=>{
        svg.appendChild(svgEl('circle',{cx:x(i),cy:a.y(d.rate),r:3.5,fill:styles[gi].stroke,stroke:C.white,'stroke-width':1}));
        if(state.clutter===0) svg.appendChild(svgEl('text',{x:x(i),y:a.y(d.rate)-8,'text-anchor':'middle',class:'value-label'},`${fmt(d.rate,1)}%`));
      });
      const last=arr[arr.length-1];
      svg.appendChild(svgEl('text',{x:width-right+10,y:a.y(last.rate)+4,class:'value-label'},g));
    });
    const notes=[
      'Everything is shown: three age groups, every value label, dense gridlines and equal emphasis.',
      'Removed every point label because the question is about the pattern, not six exact readings per line.',
      'Removed the two comparison series because the analytical question is now explicitly about people aged 15–24.',
      'Reduced gridline density because extra guides no longer help the comparison.'
    ];
    $('#clutter-step-label').textContent=notes[state.clutter];
    $('#removed-note').textContent=state.clutter===0?'No information removed yet.':notes[state.clutter];
    $('#simplify-btn').disabled=state.clutter>=3;
  }

  function renderColour() {
    const svg=$('#colour-chart'); clear(svg);
    const data=S.table08518.age2026Q2, width=900,height=370,left=180,right=60,top=35,bottom=45;
    const x=scale(0,16,left,width-right);
    const rowH=(height-top-bottom)/data.length;
    [0,4,8,12,16].forEach(v=>{
      const xx=x(v); svg.appendChild(svgEl('line',{x1:xx,x2:xx,y1:top,y2:height-bottom,class:'grid-line'}));
      svg.appendChild(svgEl('text',{x:xx,y:height-bottom+24,'text-anchor':'middle',class:'axis-label'},String(v)));
    });
    data.forEach((d,i)=>{
      const y=top+i*rowH+20, h=42;
      const arbitrary=state.emphasis==='arbitrary'&&i===2;
      const analytical=state.emphasis==='analytical'&&i===0;
      const cls=`bar${arbitrary?' emphasis':''}${analytical?' analytical':''}`;
      svg.appendChild(svgEl('text',{x:left-12,y:y+h/2+5,'text-anchor':'end',class:'value-label'},d.age));
      svg.appendChild(svgEl('rect',{x:left,y,width:Math.max(1,x(d.rate)-left),height:h,class:cls}));
      svg.appendChild(svgEl('text',{x:x(d.rate)+10,y:y+h/2+5,class:'value-label'},`${fmt(d.rate,1)}%`));
    });
    if(state.emphasis==='arbitrary') $('#colour-explain').innerHTML='<strong>The accent currently makes 55–74 years look like the story.</strong><span>But the question is: which age group has the highest unemployment rate?</span>';
    else $('#colour-explain').innerHTML='<strong>The accent now supports the analytical question.</strong><span>15–24 years has the highest unemployment rate in 2026Q2: 14.3%.</span>';
  }

  function breakData() {
    if(!state.qLong?.length) return [];
    const start=2020*4, end=2022*4+3;
    return state.qLong.filter(d=>d.index>=start&&d.index<=end&&Number.isFinite(d.rate)).map(d=>({period:d.period,index:d.index,value:d.rate}));
  }
  function renderBreak() {
    const data=breakData();
    if(!data.length) return drawUnavailable($('#break-chart'),'Historical quarterly values require the SSB API; the methodological note remains valid without a fabricated line.');
    const idx=data.findIndex(d=>/^2021Q1$/.test(d.period));
    drawSingleLine($('#break-chart'),data,{unit:'%',yDomain:niceDomain(data.map(d=>d.value),false,.18),maxXLabels:8,breakIndex:state.showBreak?idx:null,breakText:'2021Q1 · LFS redesign'});
  }

  function renderHeadline() {
    const svg=$('#headline-chart'); clear(svg);
    const data=[{period:'June 2026',value:139},{period:'July 2026',value:138}];
    const width=720,height=310,left=100,right=70,top=45,bottom=65;
    const y=scale(0,150,height-bottom,top); const x=[250,500];
    drawAxes(svg,{left,right,top,bottom,width,height,yDomain:[0,150],yTicks:3,xLabels:[{x:x[0],label:data[0].period},{x:x[1],label:data[1].period}],unit:'1,000 persons',yFormat:v=>fmt(v,0)});
    svg.appendChild(svgEl('line',{x1:x[0],x2:x[1],y1:y(139),y2:y(138),class:'series-line'}));
    data.forEach((d,i)=>{
      svg.appendChild(svgEl('circle',{cx:x[i],cy:y(d.value),r:6,class:'point'}));
      svg.appendChild(svgEl('text',{x:x[i],y:y(d.value)-14,'text-anchor':'middle',class:'value-label'},`${d.value}k`));
    });
    svg.appendChild(svgEl('text',{x:500,y:y(138)+30,'text-anchor':'middle',class:'chart-label'},'Rate: 4.5% · unchanged from June'));
  }

  function miniLine(svg,data,opts={}) {
    clear(svg); const w=420,h=210,l=45,r=20,t=25,b=35; const vals=data.map(d=>d.value); const dom=opts.domain||niceDomain(vals,!!opts.zero,.1); const x=scale(0,data.length-1,l,w-r), y=scale(dom[0],dom[1],h-b,t);
    for(let i=0;i<4;i++){const v=dom[0]+(dom[1]-dom[0])*i/3;const yy=y(v);svg.appendChild(svgEl('line',{x1:l,x2:w-r,y1:yy,y2:yy,class:'grid-line'}));}
    svg.appendChild(svgEl('path',{d:pathLine(data,(d,i)=>x(i),v=>y(v)),class:'series-line'}));
    data.forEach((d,i)=>svg.appendChild(svgEl('circle',{cx:x(i),cy:y(d.value),r:3.5,class:i===data.length-1&&opts.accent?'point-accent':'point'})));
  }
  function miniBars(svg,data,emphasis=2) {
    clear(svg);const w=420,h=210,l=80,r=25,t=20,b=30; const max=Math.max(...data.map(d=>d.value)); const x=scale(0,max*1.1,l,w-r), row=(h-t-b)/data.length;
    data.forEach((d,i)=>{const yy=t+i*row+12; svg.appendChild(svgEl('text',{x:l-8,y:yy+19,'text-anchor':'end',class:'axis-label'},d.label));svg.appendChild(svgEl('rect',{x:l,y:yy,width:x(d.value)-l,height:30,fill:i===emphasis?C.purple:C.mid}));svg.appendChild(svgEl('text',{x:x(d.value)+6,y:yy+19,class:'value-label'},optsValue(d.value)));});
    function optsValue(v){return `${fmt(v,1)}%`;}
  }

  const spotItems=[
    {title:'A · Dramatic scale',problem:'Inappropriate axis',why:'The very narrow scale makes a one-percentage-point range dominate the plotting area.',fix:'Widen the scale enough to make the magnitude proportionate while retaining visible variation.',options:['Inappropriate axis','Missing denominator','Too many categories','Unsupported precision'],draw:svg=>miniLine(svg,recentSeries('rate'),{domain:[3.9,5.1]})},
    {title:'B · “Unemployment: 14.3”',problem:'Missing denominator',why:'14.3 is a rate for people aged 15–24, not a share of the whole population. Without the denominator, the number is easy to misread.',fix:'State “14.3% of the labour force aged 15–24” and keep the definition close to the chart.',options:['Arbitrary colour','Missing denominator','Wrong chart type','Too long a time series'],draw:svg=>miniBars(svg,S.table08518.age2026Q2.map(d=>({label:d.age.split(' ')[0],value:d.rate})),-1)},
    {title:'C · Two quarters tell the story',problem:'Missing historical context',why:'A Q4-to-Q1 comparison can make a movement look exceptional and ignores seasonal and sampling considerations.',fix:'Use a time frame and adjustment status that match the claim, and add longer context when it affects interpretation.',options:['Missing context','Too few colours','Axis must start at zero','Wrong font'],draw:svg=>miniLine(svg,recentSeries('rate').slice(3,5),{domain:[4.0,5.0],accent:true})},
    {title:'D · Accent on the quietest group',problem:'Arbitrary colour emphasis',why:'The strongest accent highlights ages 55–74 even though the stated question is which age group has the highest unemployment rate.',fix:'Use accent colour for the category that the explanation is actually about, and reinforce it with a label.',options:['Arbitrary colour emphasis','Missing source','Line instead of bars','Too much context'],draw:svg=>miniBars(svg,S.table08518.age2026Q2.map(d=>({label:d.age.split(' ')[0],value:d.rate})),2)}
  ];

  function renderSpot() {
    const grid=$('#spot-grid'); grid.innerHTML='';
    spotItems.forEach((item,idx)=>{
      const card=document.createElement('article'); card.className='spot-card';
      card.innerHTML=`<p class="small-label">Teaching example ${idx+1}</p><h3>${item.title}</h3><svg viewBox="0 0 420 210" role="img" aria-label="Diagnostic teaching chart ${idx+1}"></svg><div class="spot-options" role="group" aria-label="Choose the main problem"></div><div class="spot-feedback" aria-live="polite">Choose the issue you notice most.</div>`;
      const svg=card.querySelector('svg'); item.draw(svg);
      const opts=card.querySelector('.spot-options'), feedback=card.querySelector('.spot-feedback');
      item.options.forEach(o=>{
        const b=document.createElement('button'); b.type='button'; b.textContent=o;
        b.addEventListener('click',()=>{
          opts.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));
          const correct=o===item.problem || (item.problem==='Missing historical context'&&o==='Missing context');
          feedback.innerHTML=`<strong>${correct?'Yes — this is the main issue.':'A plausible concern, but not the main issue here.'}</strong><br><strong>What is misleading?</strong> ${item.why}<br><strong>The fix:</strong> ${item.fix}`;
        });
        opts.appendChild(b);
      });
      grid.appendChild(card);
    });
  }

  function renderFinal() {
    const liveLong=state.qLong?.length?state.qLong.slice(-30):null;
    if(state.final==='misleading') {
      drawSingleLine($('#final-chart'),recentSeries('rate'),{unit:'%',yDomain:[3.9,5.1],valueLabels:true,valueFormat:v=>`${fmt(v,1)}%`,accentLast:true,maxXLabels:6});
      $('#final-chart-meta').textContent='Teaching example · narrow scale · recent period · strong endpoint emphasis';
      $('#final-changes').innerHTML='<span>Narrow y-axis</span><span>Recent period only</span><span>Strong endpoint emphasis</span><span>Minimal metadata</span>';
    } else {
      const base=liveLong||S.table08518.recent.map(d=>({period:d.period,rate:d.rate}));
      const data=base.map(d=>({period:d.period,value:d.rate}));
      drawSingleLine($('#final-chart'),data,{unit:'% of labour force',yDomain:[0,Math.max(6,Math.ceil(Math.max(...data.map(d=>d.value))+1))],maxXLabels:8,accentLast:false});
      $('#final-chart-meta').textContent=`SSB table 08518 · quarterly · both sexes · age 15–74 · ${liveLong?'longer context':'verified recent snapshot'}`;
      $('#final-changes').innerHTML='<span>Magnitude made proportionate</span><span>Context extended where available</span><span>Accent removed unless analytically needed</span><span>Denominator + source visible</span>';
    }
  }

  function bindControls() {
    $('#reveal-axis').addEventListener('click',()=>{
      $('#axis-explanation').hidden=false; $('#fix-axis').disabled=false;
      $('#axis-state-label').textContent='The scale runs only from 3.9% to 5.1%. The values are correct, but the visual height amplifies their differences.';
    });
    $('#fix-axis').addEventListener('click',animateAxisFix);

    $$('[data-context]').forEach(b=>b.addEventListener('click',()=>{state.context=b.dataset.context; $$('[data-context]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});renderContext();}));
    $$('[data-measure]').forEach(b=>b.addEventListener('click',()=>{state.measure=b.dataset.measure; $$('[data-measure]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});renderContext();}));
    $$('[data-adjustment]').forEach(b=>b.addEventListener('click',()=>{state.adjustment=b.dataset.adjustment; $$('[data-adjustment]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});renderAdjustment();}));
    $('#simplify-btn').addEventListener('click',()=>{state.clutter=Math.min(3,state.clutter+1);renderClutter();});
    $('#reset-clutter').addEventListener('click',()=>{state.clutter=0;renderClutter();});
    $$('[data-emphasis]').forEach(b=>b.addEventListener('click',()=>{state.emphasis=b.dataset.emphasis; $$('[data-emphasis]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});renderColour();}));
    $$('[data-break]').forEach(b=>b.addEventListener('click',()=>{state.showBreak=b.dataset.break==='shown'; $$('[data-break]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});renderBreak();}));
    $$('.headline-choice').forEach(b=>b.addEventListener('click',()=>{
      $$('.headline-choice').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      $('#headline-feedback').innerHTML=b.dataset.headline==='proportionate'?'<strong>Better supported.</strong><span>It reports both the count movement and the unchanged rate, keeping the scale of the change in view.</span>':'<strong>Technically possible, but over-framed.</strong><span>The wording turns a small movement in an estimated trend into the main story while the rate is unchanged.</span>';
    }));
    $$('[data-final]').forEach(b=>b.addEventListener('click',()=>{state.final=b.dataset.final; $$('[data-final]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});renderFinal();}));
  }

  async function loadLongContext() {
    try {
      const loaded=await loadJson(API08518,CACHE08518,normalise08518);
      state.qLong=loaded.data;
      state.qSource=loaded.source;
      $('#context-status').textContent=`Long-term context loaded from ${loaded.source}: SSB table 08518, ${loaded.data[0]?.period}–${loaded.data.at(-1)?.period}.`;
      $('#break-status').textContent=`Historical quarterly series loaded from ${loaded.source}. The break marker documents the 2021 LFS redesign.`;
      renderContext(); renderBreak(); renderFinal();
    } catch(err) {
      $('#context-status').textContent='Live long-term SSB series could not be loaded. The verified local 2025Q1–2026Q2 snapshot is shown; no values were invented.';
      $('#break-status').textContent='Historical values could not be loaded. The page keeps the verified SSB methodological break note but does not draw a substitute time series.';
      renderContext(); renderBreak();
    }
  }

  async function loadMonthly() {
    try {
      const loaded=await loadJson(API13760,CACHE13760,normalise13760);
      state.monthly=loaded.data; state.monthlySource=loaded.source;
      $('#adjust-status').textContent=`Monthly adjustment series loaded from ${loaded.source}. Toggle the adjustment status; the page does not calculate seasonal adjustment itself.`;
      renderAdjustment();
    } catch(err) {
      $('#adjust-status').textContent=`Monthly adjustment series could not be loaded. Latest verified trend remains ${S.table13760.currentPeriod}: ${fmt(S.table13760.trendRate,1)}%. No substitute raw or seasonally adjusted values are fabricated.`;
      renderAdjustment();
    }
  }

  function init() {
    renderHero(); renderAxis(); renderContext(); renderAdjustment(); renderClutter(); renderColour(); renderBreak(); renderHeadline(); renderSpot(); renderFinal(); bindControls();
    loadLongContext(); loadMonthly();
  }
  init();
})();
