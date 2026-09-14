/* Interaksjon og enkel SVG-visning. Ingen nettressurser trengs ved oppstart. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const H = 12, Z = 1.96;
  let data = HOTEL, origin = monthIndex(HOTEL, 2018, 1), requestId = 0, renderTimer;
  const coverageCache = new Map();
  const fmt = n => n.toLocaleString('nb-NO', {maximumFractionDigits: 1});
  function svgEl(svg, tag, attrs, text) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    if (text !== undefined) e.textContent = text;
    svg.append(e); return e;
  }
  function line(svg, points, color, dashed) {
    return svgEl(svg, 'path', {d: points.map((p,i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' '), fill:'none', stroke:color, 'stroke-width':4, ...(dashed ? {'stroke-dasharray':'12 8'} : {})});
  }
  function drawDemo(fc) {
    const svg=$('demo-chart'); svg.replaceChildren();
    const from=Math.max(0,origin-48), end=origin+H;
    const actual=data.v.slice(from,end+1);
    const limits=fc.flatMap(p=>[Math.exp(p.lg-Z*p.se),Math.exp(p.lg+Z*p.se)]);
    const values=actual.concat(limits); let lo=Math.min(...values),hi=Math.max(...values);
    const pad=(hi-lo)*.09 || hi*.05;lo=Math.max(0,lo-pad);hi+=pad;
    const left=190,right=1620,top=24,bottom=258;
    const x=i=>left+(i-from)/(end-from)*(right-left), y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
    svgEl(svg,'title',{},`${data.title}. Beregnet ved ${monthLabel(data,origin)}. 95 prosent prediksjonsintervall og faktisk utfall.`);
    for(let k=0;k<=4;k++) {
      const v=lo+(hi-lo)*k/4;
      svgEl(svg,'line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:'var(--chart-grid)'});
      svgEl(svg,'text',{x:left-14,y:y(v)+9,'text-anchor':'end'},fmt(v));
    }
    const band=[[x(origin),y(data.v[origin])],...fc.map((p,h)=>[x(origin+h+1),y(Math.exp(p.lg+Z*p.se))]),...fc.map((p,h)=>[x(origin+h+1),y(Math.exp(p.lg-Z*p.se))]).reverse()];
    svgEl(svg,'path',{d:band.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')+' Z',fill:'var(--chart-band)'});
    line(svg,data.v.slice(from,origin+1).map((v,i)=>[x(from+i),y(v)]),'var(--chart-history)');
    line(svg,[[x(origin),y(data.v[origin])],...fc.map((p,h)=>[x(origin+h+1),y(p.f)])],'var(--chart-forecast)',true);
    line(svg,data.v.slice(origin,end+1).map((v,i)=>[x(origin+i),y(v)]),'var(--chart-actual)');
    svgEl(svg,'line',{x1:x(origin),x2:x(origin),y1:top,y2:bottom,stroke:'var(--chart-history)','stroke-dasharray':'3 6','stroke-width':2});
    for (const i of [from,from+12,from+24,from+36,origin,end]) svgEl(svg,'text',{x:x(i),y:302,'text-anchor':'middle'},monthLabel(data,i));
  }
  function renderDemo() {
    clearTimeout(renderTimer);
    origin=Number($('origin').value);
    const model=fitAirline(data.v.slice(0,origin+1));
    if(!model) { $('demo-readout').textContent='For kort historikk.'; return; }
    const fc=forecastAirline(model,H), f=fc[H-1];
    let inside=0;
    fc.forEach((p,h)=>{const lg=Math.log(data.v[origin+h+1]);if(lg>=p.lg-Z*p.se&&lg<=p.lg+Z*p.se)inside++;});
    $('origin-label').textContent=monthLabel(data,origin);
    $('demo-readout').replaceChildren();
    for (const text of [
      `ARIMA(0,1,1)(0,1,1)₁₂ på log · θ = ${model.th.toFixed(3)} · Θ = ${model.TH.toFixed(3)} · ${origin+1} måneder`,
      `12 måneder fram: ${fmt(f.f)} · 95 %-intervall: ${fmt(Math.exp(f.lg-Z*f.se))}–${fmt(Math.exp(f.lg+Z*f.se))} · Fasit: ${fmt(data.v[origin+H])}`,
      `Utfall innenfor intervallet: ${inside} av 12 · Fasit ved 12 måneder: ${monthLabel(data,origin+H)}`
    ]) { const row=document.createElement('div');row.textContent=text;$('demo-readout').append(row); }
    drawDemo(fc);
  }
  function useData(next, status) {
    data=next; $('origin').max=data.v.length-1-H;
    origin=Math.max(61,Math.min(origin,Number($('origin').max)));
    $('origin').value=origin;$('data-status').textContent=status;renderDemo();
  }
  function jump(year) {
    origin=monthIndex(data,year,1); $('origin').value=origin; renderDemo();
  }
  $('origin').addEventListener('input',()=>{clearTimeout(renderTimer);renderTimer=setTimeout(renderDemo,35);});
  $('origin').addEventListener('change',renderDemo);
  $('calm').addEventListener('click',()=>jump(2018));
  $('shock').addEventListener('click',()=>jump(2020));
  $('series').addEventListener('change',()=>{
    requestId++;$('live').disabled=false;clearTimeout(renderTimer);
    const year=data.start.y+Math.floor((data.start.m-1+origin)/12), month=(data.start.m-1+origin)%12+1;
    const next=LOCAL_SERIES[$('series').value];origin=monthIndex(next,year,month);useData(next,'Lokale data');
  });
  $('live').addEventListener('click',async()=>{
    const id=$('series').value, mine=++requestId;let timeout;
    $('live').disabled=true;
    try {
      const next=await Promise.race([loadTable(id),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),4000);})]);
      if(mine!==requestId)return;
      // Samme serieidentitet, men live-tabellen kan ha et annet startår.
      const year=data.start.y+Math.floor((data.start.m-1+origin)/12),month=(data.start.m-1+origin)%12+1;
      origin=monthIndex(next,year,month);useData(next,'Live-data');
    } catch (_) {
      if(mine===requestId) {
        const year=data.start.y+Math.floor((data.start.m-1+origin)/12),month=(data.start.m-1+origin)%12+1;
        origin=monthIndex(LOCAL_SERIES[id],year,month);useData(LOCAL_SERIES[id],'Lokale data');
      }
    }
    finally { clearTimeout(timeout);if(mine===requestId)$('live').disabled=false; }
  });
  function renderCoverage() {
    const K=Number($('window').value);
    if(!coverageCache.has(K))coverageCache.set(K,evaluateCoverage(FALLBACK,K));
    const r=coverageCache.get(K),svg=$('coverage-chart');svg.replaceChildren();
    const left=100,right=1580,top=35,bottom=312,w=(right-left)/12,y=v=>bottom-v*(bottom-top);
    svgEl(svg,'title',{},`Dekningsgrad for ${K} startpunkt. Gjennomsnitt ${fmt(r.overall*100)} prosent.`);
    for(const v of [0,.25,.5,.75,1]) {
      svgEl(svg,'line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:'var(--chart-grid)'});
      svgEl(svg,'text',{x:left-16,y:y(v)+9,'text-anchor':'end'},`${v*100} %`);
    }
    r.coverage.forEach((v,h)=>{
      const x=left+h*w+20;
      svgEl(svg,'rect',{x,y:y(v),width:w-40,height:bottom-y(v),fill:'var(--chart-forecast)'});
      svgEl(svg,'text',{x:x+(w-40)/2,y:y(v)-10,'text-anchor':'middle'},`${Math.round(v*100)} %`);
      svgEl(svg,'text',{x:x+(w-40)/2,y:356,'text-anchor':'middle'},`${h+1}`);
    });
    svgEl(svg,'line',{x1:left,x2:right,y1:y(.95),y2:y(.95),stroke:'var(--chart-history)','stroke-width':3,'stroke-dasharray':'10 7'});
    svgEl(svg,'text',{x:right+10,y:y(.95)+10},'95 %');
    $('coverage-readout').replaceChildren();
    for(const text of [
      `${r.origins} startpunkt: ${monthLabel(FALLBACK,r.first)}–${monthLabel(FALLBACK,r.last)} · Horisont 1–12 måneder`,
      `Utfall testet: ${monthLabel(FALLBACK,r.first+1)}–${monthLabel(FALLBACK,r.last+H)} · Gjennomsnittlig dekning: ${fmt(r.overall*100)} %`,
      'Fast datagrunnlag: jan 2005–jul 2026 · 95 % nominelt intervall · lagret historikk'
    ]){const row=document.createElement('div');row.textContent=text;$('coverage-readout').append(row);}
  }
  $('window').addEventListener('change',renderCoverage);
  useData(HOTEL,'Lokale data');renderCoverage();
})();
