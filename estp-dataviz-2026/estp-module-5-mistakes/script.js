(() => {
  'use strict';
  const DATA = window.ESTP_M5_DATA;
  if (!DATA) return;
  const NS = 'http://www.w3.org/2000/svg';
  const C = {dark:'#274247', green:'#00824d', light:'#f0f8f9', mid:'#c3dcdc', purple:'#7e5ee8', ink:'#1b2e32', muted:'#52696e', border:'#b8cbce'};

  function el(name, attrs={}) { const n=document.createElementNS(NS,name); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,String(v)); return n; }
  function clear(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
  function txt(svg,x,y,s,cls='',anchor='start'){ const t=el('text',{x,y,'text-anchor':anchor,class:cls}); t.textContent=s; svg.appendChild(t); return t; }
  function linePath(points){ return points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2)).join(' '); }
  function xScale(i,n,left,right){ return n===1 ? (left+right)/2 : left + i*(right-left)/(n-1); }
  function yScale(v,min,max,top,bottom){ return bottom - (v-min)*(bottom-top)/(max-min); }
  function niceTicks(min,max,count=4){ const out=[]; for(let i=0;i<=count;i++) out.push(min+(max-min)*i/count); return out; }
  function setPressed(buttons, active, attr){ buttons.forEach(b=>{ const on=b.dataset[attr]===active; b.classList.toggle('active',on); b.setAttribute('aria-pressed',String(on)); }); }

  function drawLineChart(svg, config){
    clear(svg);
    const W=820,H=config.height||400,m={l:66,r:28,t:26,b:55}, left=m.l,right=W-m.r,top=m.t,bottom=H-m.b;
    const periods=config.periods, series=config.series, ymin=config.ymin, ymax=config.ymax;
    niceTicks(ymin,ymax,config.tickCount||4).forEach(v=>{
      const y=yScale(v,ymin,ymax,top,bottom);
      svg.appendChild(el('line',{x1:left,x2:right,y1:y,y2:y,class:'m5-grid'}));
      txt(svg,left-10,y+4,config.tickFormat?config.tickFormat(v):v.toFixed(1),'m5-axis-label','end');
    });
    svg.appendChild(el('line',{x1:left,x2:left,y1:top,y2:bottom,class:'m5-axis'}));
    svg.appendChild(el('line',{x1:left,x2:right,y1:bottom,y2:bottom,class:'m5-axis'}));
    periods.forEach((p,i)=>txt(svg,xScale(i,periods.length,left,right),bottom+25,p,'m5-axis-label','middle'));
    if(config.unitLabel) txt(svg,left,14,config.unitLabel,'m5-small','start');
    series.forEach((s,si)=>{
      const pts=s.values.map((v,i)=>[xScale(i,periods.length,left,right),yScale(v,ymin,ymax,top,bottom)]);
      svg.appendChild(el('path',{d:linePath(pts),class:s.className||'m5-line'}));
      pts.forEach((p,i)=>{
        svg.appendChild(el('circle',{cx:p[0],cy:p[1],r:s.pointRadius||4,class:s.pointClass||'m5-point'}));
        const showAll=s.labelAll;
        const showIndices=s.labelIndices && s.labelIndices.includes(i);
        if(showAll||showIndices){
          const dy=(i%2===0?-11:18);
          txt(svg,p[0],p[1]+dy,(s.values[i]).toFixed(1)+(config.labelSuffix||''),'m5-label','middle');
        }
      });
      if(s.directLabel){
        const p=pts[pts.length-1];
        txt(svg,Math.min(right-2,p[0]+10),p[1]-10,s.directLabel,'m5-label',p[0]>right-100?'end':'start');
      }
    });
    if(config.focusY!==undefined){
      const y=yScale(config.focusY,ymin,ymax,top,bottom);
      svg.appendChild(el('line',{x1:left,x2:right,y1:y,y2:y,class:'m5-focus-rule'}));
      txt(svg,right,y-7,config.focusText||'', 'm5-focus-text','end');
    }
    if(config.annotation){
      const a=config.annotation;
      const x=xScale(a.index,periods.length,left,right), y=yScale(a.value,ymin,ymax,top,bottom);
      svg.appendChild(el('line',{x1:x,x2:x,y1:top,y2:bottom,class:'m5-focus-rule'}));
      txt(svg,Math.min(right-5,x+8),top+16,a.text,'m5-focus-text',x>right-180?'end':'start');
    }
  }

  function totalSeries(){ return DATA.series.total.rates; }
  function renderHero(){
    const svg=document.getElementById('hero-chart'); if(!svg)return;
    drawLineChart(svg,{periods:DATA.periods,series:[{values:totalSeries(),labelAll:false}],ymin:4.05,ymax:5.05,height:270,unitLabel:'%',labelSuffix:'%'});
  }

  let scaleState='problem';
  function renderScale(){
    const fixed=scaleState==='fixed', revealed=scaleState==='revealed';
    drawLineChart(document.getElementById('scale-chart'),{
      periods:DATA.periods, series:[{values:totalSeries(),labelIndices:fixed?[0,1,5]:[0,1,3,5]}],
      ymin:fixed?3.5:4.05, ymax:fixed?5.5:5.05, unitLabel:'Per cent of labour force', labelSuffix:'%'
    });
    const msg=document.getElementById('scale-state-message'), title=document.getElementById('scale-chart-title'), reveal=document.getElementById('scale-reveal');
    if(fixed){ title.textContent='Unemployment rate fluctuated between 4.1% and 5.0%'; msg.textContent='A wider scale gives the same variation more visual context. The axis still does not start at zero.'; reveal.hidden=false; }
    else if(revealed){ title.textContent='Unemployment rate appears to swing dramatically'; msg.textContent='The one-percentage-point plotting range makes a 0.9 percentage-point spread nearly fill the chart.'; reveal.hidden=false; }
    else { title.textContent='Unemployment rate appears to swing dramatically'; msg.textContent='Inspect the chart before revealing the design problem.'; reveal.hidden=true; }
    document.getElementById('reveal-scale').setAttribute('aria-pressed',String(revealed));
    document.getElementById('fix-scale').setAttribute('aria-pressed',String(fixed));
  }

  let clutterState='problem';
  function renderClutter(){
    const svg=document.getElementById('clutter-chart');
    const problem=clutterState==='problem';
    const all=[
      {values:DATA.series.total.rates,className:'m5-line-dark',pointClass:'m5-point-dark',labelAll:problem,directLabel:problem?'Total':null},
      {values:DATA.series.age15_24.rates,className:'m5-line-purple',pointClass:'m5-point-dark',labelAll:problem,directLabel:problem?'15–24':null},
      {values:DATA.series.age25_54.rates,className:'m5-line-mid',pointClass:'m5-point-dark',labelAll:problem,directLabel:problem?'25–54':null},
      {values:DATA.series.age55_74.rates,className:'m5-line-light',pointClass:'m5-point-dark',labelAll:problem,directLabel:problem?'55–74':null}
    ];
    const focus=[{values:DATA.series.total.rates,className:'m5-line',labelIndices:[0,1,5],directLabel:'Total'}];
    drawLineChart(svg,{periods:DATA.periods,series:problem?all:focus,ymin:0,ymax:16.5,height:430,unitLabel:'Per cent of each age group labour force',labelSuffix:'%'});
    document.getElementById('clutter-message').textContent=problem?'Four legitimate series, equal emphasis and 24 value labels compete for attention.':'Only the series needed for the stated question remains prominent; three strategic labels retain useful exact values.';
    document.getElementById('clutter-note').innerHTML=problem?'<strong>Nothing false is shown.</strong> The problem is that the chart makes the reader solve several questions that are not needed for the stated task.':'<strong>The fix is editorial, not cosmetic.</strong> The age series are removed because the question is about the total, not because fewer lines are always better.';
  }

  let contextState='short';
  function renderContext(){
    const long=contextState==='long';
    const periods=long?DATA.periods:DATA.periods.slice(3);
    const values=long?totalSeries():totalSeries().slice(3);
    drawLineChart(document.getElementById('context-chart'),{periods,series:[{values,labelIndices:long?[0,1,3,5]:[0,1,2]}],ymin:3.5,ymax:5.5,height:390,unitLabel:'Per cent of labour force',labelSuffix:'%'});
    document.getElementById('context-headline').textContent=long?'Recent rise sits inside a wider six-quarter pattern':'Unemployment is higher than in late 2025';
    document.getElementById('context-message').textContent=long?'The earlier 5.0% observation is now visible. The latest 4.8% level is not unique within this period.':'Only the last three quarters are visible: 4.2%, 4.8%, 4.8%.';
  }

  let emphasisState='arbitrary';
  function renderEmphasis(){
    const svg=document.getElementById('emphasis-chart'); clear(svg);
    const W=820,H=330,m={l:120,r:80,t:28,b:35}, left=m.l,right=W-m.r,top=m.t,bottom=H-m.b;
    const cats=['15–24','25–54','55–74'], vals=[14.3,3.5,2.0], max=16, row=(bottom-top)/3;
    [0,4,8,12,16].forEach(v=>{ const x=left+v/max*(right-left); svg.appendChild(el('line',{x1:x,x2:x,y1:top,y2:bottom,class:'m5-grid'})); txt(svg,x,bottom+24,String(v),'m5-axis-label','middle'); });
    txt(svg,left,14,'Per cent of each age group labour force','m5-small');
    vals.forEach((v,i)=>{
      const y=top+i*row+row*.22, w=v/max*(right-left), meaningful=emphasisState==='meaningful';
      let cls='m5-bar';
      if(meaningful && i===0) cls='m5-bar-green';
      if(!meaningful && i===2) cls='m5-bar-purple';
      txt(svg,left-12,y+row*.29,cats[i],'m5-label','end');
      svg.appendChild(el('rect',{x:left,y,width:w,height:row*.45,class:cls}));
      txt(svg,left+w+10,y+row*.29,v.toFixed(1)+'%','m5-label');
      if((meaningful&&i===0)||(!meaningful&&i===2)) txt(svg,right,y+row*.29,'FOCUS','m5-small','end');
    });
    document.getElementById('emphasis-message').textContent=emphasisState==='meaningful'?'The strongest emphasis now answers the stated question: the 15–24 group has the highest rate.':'Purple emphasis makes the smallest rate look like the intended focus.';
  }

  let uncertaintyState='plain';
  function renderUncertainty(){
    const withContext=uncertaintyState==='context';
    drawLineChart(document.getElementById('uncertainty-chart'),{periods:DATA.periods,series:[{values:totalSeries(),labelIndices:withContext?[5]:[0,1,2,3,4,5],directLabel:withContext?'2026Q2 estimate':null}],ymin:3.5,ymax:5.5,height:390,unitLabel:'Per cent of labour force',labelSuffix:'%'});
    document.getElementById('uncertainty-context').hidden=!withContext;
    document.getElementById('uncertainty-message').textContent=withContext?'The point estimate stays visible, but the reader is also told what kind of evidence it is.':'The chart looks exact because only point estimates are visible.';
  }

  let finalState='misleading';
  function renderFinal(){
    const defensible=finalState==='defensible';
    drawLineChart(document.getElementById('final-chart-m5'),{periods:DATA.periods,series:[{values:totalSeries(),labelAll:!defensible,labelIndices:defensible?[0,1,5]:null,directLabel:defensible?'Latest: 4.8%':null}],ymin:defensible?3.5:4.05,ymax:defensible?5.5:5.05,height:410,unitLabel:'Per cent of labour force',labelSuffix:'%'});
    document.getElementById('final-eyebrow').textContent=defensible?'SSB table 08518 · same six observations':'Course example · narrow scale · every point labelled';
    document.getElementById('final-headline').textContent=defensible?'Unemployment rate fluctuated between 4.1% and 5.0% over six quarters':'Unemployment swings sharply';
    document.getElementById('final-message').textContent=defensible?'The scale, labels and wording now support a more proportionate reading without weakening the evidence.':'The chart encourages a stronger interpretation than the six values alone justify.';
    document.getElementById('final-integrity').innerHTML=defensible?'<span>same data</span><span>wider scale</span><span>strategic labels</span><span>neutral wording</span><span>unit + denominator explicit</span>':'<span>same data</span><span>narrow scale</span><span>label competition</span><span>loaded wording</span>';
  }

  function bindToggle(selector, attr, setter){
    const buttons=[...document.querySelectorAll(selector)];
    buttons.forEach(b=>b.addEventListener('click',()=>{ setter(b.dataset[attr]); setPressed(buttons,b.dataset[attr],attr); }));
  }

  document.getElementById('reveal-scale').addEventListener('click',()=>{scaleState='revealed';renderScale();});
  document.getElementById('fix-scale').addEventListener('click',()=>{scaleState='fixed';renderScale();});
  bindToggle('[data-clutter]','clutter',v=>{clutterState=v;renderClutter();});
  bindToggle('[data-context]','context',v=>{contextState=v;renderContext();});
  bindToggle('[data-emphasis]','emphasis',v=>{emphasisState=v;renderEmphasis();});
  bindToggle('[data-uncertainty]','uncertainty',v=>{uncertaintyState=v;renderUncertainty();});
  bindToggle('[data-final]','final',v=>{finalState=v;renderFinal();});

  renderHero(); renderScale(); renderClutter(); renderContext(); renderEmphasis(); renderUncertainty(); renderFinal();
})();
