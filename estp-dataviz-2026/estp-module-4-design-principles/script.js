(() => {
  'use strict';
  const DATA = window.ESTP_POPULATION_DATA;
  if (!DATA) return;

  const COLORS = {
    dark:'#274247', green:'#00824d', light:'#f0f8f9', mid:'#c3dcdc', purple:'#7e5ee8',
    ink:'#1b2e32', muted:'#52696e', border:'#b8cbce', grid:'#dce9eb', white:'#ffffff', neutral:'#8ea5a9', mutedFill:'#d5e1e3'
  };
  const ages = ['20–24','25–29','30–34','35–39','40–44','45–49','50–54'];
  const fmt = n => new Intl.NumberFormat('en-GB').format(Math.round(n));
  const pct = n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;

  function svgEl(tag, attrs={}, text='') {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,String(v)));
    if (text !== '') el.textContent = text;
    return el;
  }
  function clear(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
  function scaleLinear(d0,d1,r0,r1){ return v => r0 + (v-d0)/(d1-d0)*(r1-r0); }
  function addText(svg,x,y,text,cls='',anchor='start'){ svg.appendChild(svgEl('text',{x,y,class:cls,'text-anchor':anchor},text)); }
  function addLine(svg,x1,y1,x2,y2,cls='grid-line'){ svg.appendChild(svgEl('line',{x1,y1,x2,y2,class:cls})); }
  function rows(year, sex){ return DATA.workingAge.filter(d=>d.year===year && d.sex===sex); }
  function getValue(year,sex,age){ const r=DATA.workingAge.find(d=>d.year===year&&d.sex===sex&&d.age_group===age); return r ? r.population : 0; }
  function totalValue(year,age){ return getValue(year,'Women',age)+getValue(year,'Men',age); }
  function selectedValue(year,sex,age){ return sex==='All' ? totalValue(year,age) : getValue(year,sex,age); }
  function totalSeries(year){ return ages.map(age=>({age,value:totalValue(year,age)})); }

  // Hero — current 2026 overview, broad age groups as published by SSB.
  function renderHero(){
    const svg=document.getElementById('hero-chart'); if(!svg) return; clear(svg);
    const W=520,H=280,m={l:68,r:16,t:10,b:26}, max=Math.max(...DATA.age2026.map(d=>d.population));
    const x=scaleLinear(0,max,0,W-m.l-m.r); const row=(H-m.t-m.b)/DATA.age2026.length;
    DATA.age2026.forEach((d,i)=>{
      const y=m.t+i*row+3;
      addText(svg,m.l-8,y+row*.55,d.age,'', 'end');
      svg.appendChild(svgEl('rect',{x:m.l,y,width:x(d.population),height:Math.max(7,row-7),fill:i===5?COLORS.green:COLORS.dark,opacity:i===5?1:.72}));
    });
    addText(svg,m.l,H-5,'Age group','', 'start');
    addText(svg,W-m.r,H-5,'persons','', 'end');
  }

  const central = {
    step:1, sex:'All', highlight:'35–39', structured:false,
    copy:{
      1:{k:'Step 1 · Structure the information',t:'Where do you look first?',m:'Four legitimate series share one space. Grouping, spacing and a common age order establish relationships, but no one element should yet dominate.',learn:['Structure comes before emphasis.','Grouping, alignment and white space tell the reader what belongs together before colour tells them what matters most. White space is relational information, not unused space.']},
      2:{k:'Step 2 · Create hierarchy',t:'What should be read first?',m:'The primary message, chart and supporting metadata now have distinct roles. Position, type size and density create reading order before strong colour is introduced.',learn:['Hierarchy is an information decision.','The title, chart, controls, metadata and source do not deserve equal visual weight. A clear hierarchy tells the reader where to start and what can wait.']},
      3:{k:'Step 3 · Use emphasis selectively',t:'Which group answers the analytical question?',m:'The 35–39 group is highlighted because it increased between 2021 and 2023. Supporting groups remain visible as context.',learn:['Highlighting works because most things are not highlighted.','Colour is used here to answer a question, not to make the improved state more decorative. Supporting data is muted rather than deleted.']},
      4:{k:'Step 4 · Design for comparison',t:'Can the difference be seen without mental calculation?',m:'The two years use identical age ordering, common scales and aligned baselines. Small delta labels quantify only the comparisons that need help.',learn:['Comparison is partly a layout problem.','Alignment and common scales reduce memory and calculation. The reader can perceive change directly instead of reconstructing it from separate views.']},
      5:{k:'Step 5 · Add interaction',t:'Which detail should enter attention now?',m:'Sex and age selection answer real questions. Exact counts appear on demand; region stays fixed because exposing it would not improve this teaching comparison.',learn:['Interaction should reveal, not distract.','The default view already communicates the pattern. Interaction adds detail, subset selection and exact values only when the reader asks for them.']}
    }
  };

  function drawAxes(svg, opts){
    const {left,right,top,bottom,max,ticks=4,width=960}=opts;
    const x=scaleLinear(0,max,left,right);
    for(let i=0;i<=ticks;i++){
      const v=max*i/ticks, xx=x(v); addLine(svg,xx,top,xx,bottom,'grid-line');
      addText(svg,xx,bottom+20,`${Math.round(v/1000)}k`,'', 'middle');
    }
    return x;
  }

  function renderDense(svg){
    clear(svg); const W=960,H=500,m={l:74,r:36,t:34,b:60}, max=210000, xBand=(W-m.l-m.r)/ages.length, y=scaleLinear(0,max,H-m.b,m.t);
    [0,50000,100000,150000,200000].forEach(v=>{ const yy=y(v); addLine(svg,m.l,yy,W-m.r,yy); addText(svg,m.l-10,yy+4,`${v/1000}k`,'','end'); });
    const series=[{year:2021,sex:'Women'},{year:2021,sex:'Men'},{year:2023,sex:'Women'},{year:2023,sex:'Men'}];
    ages.forEach((age,i)=> addText(svg,m.l+xBand*(i+.5),H-m.b+25,age,'','middle'));
    series.forEach((s,si)=>{
      const pts=[];
      ages.forEach((age,i)=>{
        const v=getValue(s.year,s.sex,age), x=m.l+xBand*(i+.5)+(si-1.5)*6, yy=y(v); pts.push([x,yy]);
        svg.appendChild(svgEl('circle',{cx:x,cy:yy,r:4,fill:COLORS.white,stroke:si%2?COLORS.dark:COLORS.neutral,'stroke-width':2}));
        addText(svg,x+5,yy-6,fmt(v),'value-label');
      });
      svg.appendChild(svgEl('polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:si%2?COLORS.dark:COLORS.neutral,'stroke-width':2,'stroke-dasharray':si<2?'0':'6 4'}));
      addText(svg,W-m.r-4,m.t+18+si*18,`${s.year} · ${s.sex}`,'value-label','end');
    });
  }


  function renderStructureOnly(svg){
    clear(svg); const W=960,H=500,m={l:74,r:36,t:44,b:62},max=210000,y=scaleLinear(0,max,H-m.b,m.t),band=(W-m.l-m.r)/ages.length;
    [0,50000,100000,150000,200000].forEach(v=>{const yy=y(v);addLine(svg,m.l,yy,W-m.r,yy);addText(svg,m.l-10,yy+4,`${v/1000}k`,'','end');});
    ages.forEach((age,i)=>{
      const cx=m.l+band*(i+.5); addText(svg,cx,H-m.b+24,age,'','middle');
      const vals=[getValue(2021,'Women',age),getValue(2021,'Men',age),getValue(2023,'Women',age),getValue(2023,'Men',age)];
      const offsets=[-22,-10,6,18];
      vals.forEach((v,j)=>{const yy=y(v);svg.appendChild(svgEl('rect',{x:cx+offsets[j],y:yy,width:9,height:H-m.b-yy,fill:j%2?COLORS.dark:COLORS.neutral,opacity:j<2?.48:.82}));});
    });
    addText(svg,m.l,m.t-18,'2021 = lighter opacity · 2023 = darker opacity','value-label');
    addText(svg,W-m.r,m.t-18,'Women = lighter tone · Men = darker tone','value-label','end');
  }
  function renderGrouped(svg, step){
    clear(svg); const W=960,H=500,m={l:78,r:34,t:52,b:58}, max=210000; const plotW=W-m.l-m.r; const panelGap=46, panelW=(plotW-panelGap)/2;
    const y=scaleLinear(0,max,H-m.b,m.t); [0,50000,100000,150000,200000].forEach(v=>{const yy=y(v); addLine(svg,m.l,yy,W-m.r,yy); addText(svg,m.l-10,yy+4,`${v/1000}k`,'','end');});
    [2021,2023].forEach((year,pi)=>{
      const pLeft=m.l+pi*(panelW+panelGap); addText(svg,pLeft,m.t-22,String(year),'direct-label');
      const band=panelW/ages.length;
      ages.forEach((age,i)=>{
        const cx=pLeft+band*(i+.5); const values=[['Women',getValue(year,'Women',age)],['Men',getValue(year,'Men',age)]];
        values.forEach(([sex,v],si)=>{
          const w=Math.min(13,band*.28), xx=cx+(si?4:-w-4), yy=y(v), h=H-m.b-yy;
          let fill=si?COLORS.dark:COLORS.neutral, opacity=.8;
          if(step>=3){ fill=age===central.highlight?COLORS.purple:COLORS.mutedFill; opacity=age===central.highlight?1:.9; }
          svg.appendChild(svgEl('rect',{x:xx,y:yy,width:w,height:h,fill,opacity}));
        });
        addText(svg,cx,H-m.b+22,age,'', 'middle');
      });
    });
    if(step===2){
      addText(svg,W-m.r,m.t-22,'Women = lighter · Men = darker','value-label','end');
    }
    if(step===3){
      const a=central.highlight; const v21=totalValue(2021,a),v23=totalValue(2023,a),change=(v23/v21-1)*100;
      addText(svg,W-m.r,m.t-22,`${a}: ${pct(change)} total population`,'direct-label','end');
    }
  }

  function renderComparisonMain(svg, interactive=false){
    clear(svg); const W=960,H=500,m={l:90,r:44,t:66,b:60}; const max=410000; const plotW=W-m.l-m.r,panelGap=55,panelW=(plotW-panelGap)/2; const x0=[m.l,m.l+panelW+panelGap];
    const yBand=(H-m.t-m.b)/ages.length; const x=scaleLinear(0,max,0,panelW-50);
    [2021,2023].forEach((year,pi)=>{
      const left=x0[pi]; addText(svg,left,m.t-30,String(year),'direct-label');
      [0,200000,400000].forEach(v=>{const xx=left+x(v); addLine(svg,xx,m.t,xx,H-m.b); addText(svg,xx,H-m.b+24,`${v/1000}k`,'','middle');});
      ages.forEach((age,i)=>{
        const cy=m.t+i*yBand+yBand*.5; if(pi===0) addText(svg,m.l-12,cy+4,age,'','end');
        const v=selectedValue(year,central.sex,age); const isFocus=age===central.highlight;
        svg.appendChild(svgEl('rect',{x:left,y:cy-8,width:x(v),height:16,fill:isFocus?COLORS.purple:COLORS.mutedFill}));
        if(isFocus || (interactive && central.sex!=='All')) addText(svg,left+x(v)+7,cy+4,fmt(v),isFocus?'direct-label':'value-label');
        if(interactive){
          const hit=svgEl('rect',{x:left,y:cy-yBand*.45,width:panelW-20,height:yBand*.9,class:'hit-target',tabindex:'0','aria-label':`${age}, ${year}, ${central.sex}: ${fmt(v)} persons`});
          const choose=()=>setDetail(age); hit.addEventListener('click',choose); hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}}); svg.appendChild(hit);
        }
      });
    });
    ages.forEach((age,i)=>{
      const v21=selectedValue(2021,central.sex,age),v23=selectedValue(2023,central.sex,age),c=(v23/v21-1)*100;
      if(age===central.highlight || Math.abs(c)>=3){ addText(svg,m.l+panelW+panelGap/2,m.t+i*yBand+yBand*.5+4,pct(c),'delta-label','middle'); }
    });
    addText(svg,W-m.r,m.t-30,central.sex==='All'?'Women + men':central.sex,'value-label','end');
  }

  function setDetail(age){
    central.highlight=age; const f21=getValue(2021,'Women',age),m21=getValue(2021,'Men',age),f23=getValue(2023,'Women',age),m23=getValue(2023,'Men',age); const t21=f21+m21,t23=f23+m23;
    document.getElementById('age-highlight').value=age;
    document.getElementById('detail-copy').innerHTML=`<strong>${age}</strong>: ${fmt(t21)} people in 2021 and ${fmt(t23)} in 2023 (${pct((t23/t21-1)*100)}). Women: ${fmt(f23)} in 2023; men: ${fmt(m23)}.`;
    renderCentral();
  }

  function renderCentral(){
    const svg=document.getElementById('design-chart'); const c=central.copy[central.step];
    document.getElementById('design-step-kicker').textContent=c.k; document.getElementById('design-step-title').textContent=c.t; document.getElementById('design-step-message').textContent=c.m;
    const card=document.getElementById('main-demo-card'); card.className=`design-demo-card design-state-${central.step}`;
    const controls=document.getElementById('main-controls'); controls.hidden=central.step!==5;
    const structureChoice=document.getElementById('structure-choice'); structureChoice.hidden=central.step!==1;
    document.getElementById('step-learning').innerHTML=central.step===1 && central.structured ? '<strong>Structure before emphasis.</strong><p>The same four series now use grouping, spacing, consistent age ordering and a common scale. Nothing has been highlighted yet; the relationships are simply easier to parse.</p>' : `<strong>${c.learn[0]}</strong><p>${c.learn[1]}</p>`;
    document.querySelectorAll('[data-design-step]').forEach(b=>{ if(Number(b.dataset.designStep)===central.step) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current'); });
    document.querySelectorAll('[data-design-tool]').forEach(tool=>{ const order={grouping:1,spacing:1,hierarchy:2,emphasis:3,comparison:4,interaction:5}; tool.classList.toggle('active',central.step>=order[tool.dataset.designTool]); });
    document.getElementById('prev-design-step').disabled=central.step===1; document.getElementById('next-design-step').textContent=central.step===5?'Start again ↺':'Next step →'; document.getElementById('design-step-status').textContent=`Step ${central.step} of 5`;
    if(central.step===1) (central.structured ? renderStructureOnly(svg) : renderDense(svg)); else if(central.step<=3) renderGrouped(svg,central.step); else renderComparisonMain(svg,central.step===5);
  }

  // Hierarchy demo.
  function renderHierarchyChart(){
    const svg=document.getElementById('hierarchy-chart'); clear(svg); const W=900,H=280,m={l:70,r:20,t:15,b:45}, max=410000, xBand=(W-m.l-m.r)/ages.length,y=scaleLinear(0,max,H-m.b,m.t);
    ages.forEach((age,i)=>{const v=totalValue(2023,age),xx=m.l+xBand*(i+.18),w=xBand*.64,yy=y(v);svg.appendChild(svgEl('rect',{x:xx,y:yy,width:w,height:H-m.b-yy,fill:age==='30–34'?COLORS.green:COLORS.dark,opacity:age==='30–34'?1:.68}));addText(svg,xx+w/2,H-m.b+21,age,'','middle');});
  }

  let comparisonAligned=false;
  function renderComparisonChart(svg,year,aligned){
    clear(svg); const W=520,H=330,m={l:68,r:18,t:18,b:54}; let series=totalSeries(year);
    const reverse=!aligned && year===2023; if(reverse) series=[...series].reverse();
    const localMax=aligned?410000:(year===2021?390000:450000); const y=scaleLinear(0,localMax,H-m.b,m.t), band=(W-m.l-m.r)/series.length;
    const ticks=aligned?[0,200000,400000]:year===2021?[0,100000,200000,300000]:[0,150000,300000,450000];
    ticks.forEach(v=>{const yy=y(v);addLine(svg,m.l,yy,W-m.r,yy);addText(svg,m.l-7,yy+4,`${Math.round(v/1000)}k`,'','end');});
    series.forEach((d,i)=>{const xx=m.l+band*(i+.18),ww=band*.64,yy=y(d.value);svg.appendChild(svgEl('rect',{x:xx,y:yy,width:ww,height:H-m.b-yy,fill:aligned&&['30–34','45–49'].includes(d.age)?COLORS.green:COLORS.dark,opacity:aligned&& !['30–34','45–49'].includes(d.age)?.55:.8}));addText(svg,xx+ww/2,H-m.b+20,d.age,'','middle');});
  }
  function updateComparison(){ renderComparisonChart(document.getElementById('compare-2021'),2021,comparisonAligned);renderComparisonChart(document.getElementById('compare-2023'),2023,comparisonAligned); const stage=document.getElementById('comparison-stage');stage.className=`comparison-stage ${comparisonAligned?'aligned':'separate'}`;document.getElementById('comparison-note').innerHTML=comparisonAligned?'<strong>Aligned scales reduce memory work.</strong> 30–34 is clearly higher in 2023, while 45–49 is lower. The same ordering and baseline expose these differences immediately.':'<strong>Same values, harder comparison.</strong> Separate scale ranges and reversed ordering force the reader to reconstruct the relationship.'; }

  let gridMode='heavy';
  function renderGridDemo(){
    const svg=document.getElementById('grid-demo-chart');clear(svg);const W=520,H=300,m={l:54,r:16,t:16,b:44},vals=totalSeries(2023).slice(0,5),max=410000,y=scaleLinear(0,max,H-m.b,m.t),band=(W-m.l-m.r)/vals.length;
    const ticks=gridMode==='heavy'?[0,50000,100000,150000,200000,250000,300000,350000,400000]:[0,200000,400000];
    ticks.forEach(v=>{const yy=y(v);svg.appendChild(svgEl('line',{x1:m.l,y1:yy,x2:W-m.r,y2:yy,stroke:gridMode==='heavy'?COLORS.dark:COLORS.grid,'stroke-width':gridMode==='heavy'?2:1}));addText(svg,m.l-7,yy+4,`${v/1000}k`,'','end');});
    if(gridMode==='heavy') svg.appendChild(svgEl('rect',{x:m.l,y:m.t,width:W-m.l-m.r,height:H-m.t-m.b,fill:'none',stroke:COLORS.dark,'stroke-width':2}));
    vals.forEach((d,i)=>{const xx=m.l+band*(i+.2),ww=band*.6,yy=y(d.value);svg.appendChild(svgEl('rect',{x:xx,y:yy,width:ww,height:H-m.b-yy,fill:COLORS.green}));addText(svg,xx+ww/2,H-m.b+20,d.age,'','middle');});
  }

  let labelMode='all';
  function renderLabelDemo(){
    const svg=document.getElementById('label-demo-chart');clear(svg);const W=520,H=300,m={l:45,r:15,t:15,b:44},vals=totalSeries(2023).slice(0,5),max=410000,y=scaleLinear(0,max,H-m.b,m.t),band=(W-m.l-m.r)/vals.length;
    [0,200000,400000].forEach(v=>{const yy=y(v);addLine(svg,m.l,yy,W-m.r,yy);});
    vals.forEach((d,i)=>{const xx=m.l+band*(i+.2),ww=band*.6,yy=y(d.value),highlight=d.age==='30–34';svg.appendChild(svgEl('rect',{x:xx,y:yy,width:ww,height:H-m.b-yy,fill:highlight?COLORS.green:COLORS.dark,opacity:highlight?1:.65}));addText(svg,xx+ww/2,H-m.b+20,d.age,'','middle');if(labelMode==='all'||(labelMode==='strategic'&&(highlight||i===vals.length-1)))addText(svg,xx+ww/2,yy-7,fmt(d.value),highlight?'direct-label':'value-label','middle');});
    const notes={all:'Every value is available, but every value also competes for attention.',none:'The bars carry the pattern, but the reader must estimate every value from the scale.',strategic:'Exact labels are reserved for the focal group and a useful endpoint. Other values remain readable from the scale.'}; document.getElementById('label-note').textContent=notes[labelMode];
  }

  let dimensionMode='all';
  function updateDimension(){ const stage=document.getElementById('dimension-stage');stage.className=`dimension-stage ${dimensionMode==='structured'?'structured':'all'}`;document.getElementById('dimension-note').innerHTML=dimensionMode==='structured'?'<strong>Interaction is partly a timing decision.</strong> Some dimensions are visible immediately; others enter only when they help answer a question.':'<strong>More encoding is not the same as more information.</strong> Simultaneous dimensions create decoding tasks before the reader can reach the statistical pattern.'; }

  let finalMode='unstructured';
  function renderFinal(){ const svg=document.getElementById('final-design-chart'); if(finalMode==='unstructured'){renderDense(svg);document.getElementById('final-design-headline').textContent='Population aged 20–54 by sex and year';document.getElementById('final-design-copy').textContent='Four equally weighted series and many labels expose the data, but not the intended comparison.';} else {const savedStep=central.step,savedSex=central.sex,savedAge=central.highlight; central.step=4;central.sex='All';central.highlight='35–39';renderComparisonMain(svg,false);central.step=savedStep;central.sex=savedSex;central.highlight=savedAge;document.getElementById('final-design-headline').textContent='Age structure shifted within the 20–54 population between 2021 and 2023';document.getElementById('final-design-copy').textContent='Aligned years, common scales and selective emphasis make the comparison visible while the full set of age groups remains available.';} }

  // Controls and teaching toggles.
  document.querySelectorAll('[data-design-step]').forEach((b,i)=>{b.addEventListener('click',()=>{central.step=Number(b.dataset.designStep);renderCentral();});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let n=i;if(e.key==='ArrowRight')n=(i+1)%5;if(e.key==='ArrowLeft')n=(i+4)%5;if(e.key==='Home')n=0;if(e.key==='End')n=4;document.querySelectorAll('[data-design-step]')[n].click();document.querySelectorAll('[data-design-step]')[n].focus();});});
  document.getElementById('prev-design-step').addEventListener('click',()=>{central.step=Math.max(1,central.step-1);renderCentral();});
  document.getElementById('next-design-step').addEventListener('click',()=>{central.step=central.step===5?1:central.step+1;renderCentral();});
  document.querySelectorAll('[data-sex]').forEach(b=>b.addEventListener('click',()=>{central.sex=b.dataset.sex;document.querySelectorAll('[data-sex]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));setDetail(central.highlight);}));
  document.getElementById('age-highlight').addEventListener('change',e=>setDetail(e.target.value));

  document.querySelectorAll('[data-structure-view]').forEach(b=>b.addEventListener('click',()=>{central.structured=b.dataset.structureView==='structured';document.querySelectorAll('[data-structure-view]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderCentral();}));

  document.querySelectorAll('[data-hierarchy]').forEach(b=>b.addEventListener('click',()=>{const clearMode=b.dataset.hierarchy==='clear';const comp=document.getElementById('hierarchy-composition');comp.className=`stat-composition ${clearMode?'clear':'flat'}`;document.querySelectorAll('[data-hierarchy]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));
  document.querySelectorAll('[data-compare-layout]').forEach(b=>b.addEventListener('click',()=>{comparisonAligned=b.dataset.compareLayout==='aligned';document.querySelectorAll('[data-compare-layout]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});updateComparison();}));
  document.querySelectorAll('[data-type-mode]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('type-sample').className=`type-sample ${b.dataset.typeMode}`;document.querySelectorAll('[data-type-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));
  document.querySelectorAll('[data-grid-mode]').forEach(b=>b.addEventListener('click',()=>{gridMode=b.dataset.gridMode;document.querySelectorAll('[data-grid-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderGridDemo();}));
  document.querySelectorAll('[data-label-mode]').forEach(b=>b.addEventListener('click',()=>{labelMode=b.dataset.labelMode;document.querySelectorAll('[data-label-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLabelDemo();}));
  document.querySelectorAll('[data-dimension-mode]').forEach(b=>b.addEventListener('click',()=>{dimensionMode=b.dataset.dimensionMode;document.querySelectorAll('[data-dimension-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});updateDimension();}));
  document.getElementById('decorative-control').addEventListener('click',e=>{e.currentTarget.closest('article').classList.toggle('decorative-alt');e.currentTarget.textContent=e.currentTarget.closest('article').classList.contains('decorative-alt')?'Change it back':'Change decorative colour';});
  document.querySelectorAll('[data-final-mode]').forEach(b=>b.addEventListener('click',()=>{finalMode=b.dataset.finalMode;document.querySelectorAll('[data-final-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderFinal();}));

  renderHero(); renderCentral(); renderHierarchyChart(); updateComparison(); renderGridDemo(); renderLabelDemo(); updateDimension(); renderFinal();
})();
