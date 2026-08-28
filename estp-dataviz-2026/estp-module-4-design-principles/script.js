(() => {
  'use strict';

  const DATA = window.ESTP_POPULATION_DATA;
  if (!DATA) return;

  const C = {
    dark:'#274247', green:'#00824d', light:'#f0f8f9', mid:'#c3dcdc', purple:'#7e5ee8',
    ink:'#1b2e32', muted:'#52696e', border:'#b8cbce', grid:'#dce9eb', white:'#ffffff',
    neutral:'#8ea5a9', mutedFill:'#d5e1e3'
  };
  const ages = DATA.ages;
  const fmt = n => new Intl.NumberFormat('en-GB').format(Math.round(n));
  const pct = n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  const svgNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs={}, text='') {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k, String(v)));
    if (text !== '') node.textContent = text;
    return node;
  }
  function clear(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
  function line(svg,x1,y1,x2,y2,cls='grid-line',attrs={}){ svg.appendChild(el('line',{x1,y1,x2,y2,class:cls,...attrs})); }
  function text(svg,x,y,txt,cls='',anchor='start',attrs={}){ svg.appendChild(el('text',{x,y,class:cls,'text-anchor':anchor,...attrs},txt)); }
  function scale(d0,d1,r0,r1){ return v => r0 + ((v-d0)/(d1-d0))*(r1-r0); }
  function value(year, sex, age){ const r=DATA.workingAge.find(d=>d.year===year && d.sex===sex && d.age_group===age); return r ? r.population : 0; }
  function selectedValue(year, sex, age){ return sex==='All' ? value(year,'Women',age)+value(year,'Men',age) : value(year,sex,age); }
  function series(year,sex){ return ages.map(age=>({age,value:selectedValue(year,sex,age)})); }

  function renderHero(){
    const svg=document.getElementById('hero-chart'); clear(svg);
    const W=520,H=290,m={l:72,r:18,t:18,b:30};
    const x=scale(0,410000,0,W-m.l-m.r), row=(H-m.t-m.b)/ages.length;
    [0,200000,400000].forEach(v=>{
      const xx=m.l+x(v); line(svg,xx,m.t,xx,H-m.b); text(svg,xx,H-7,`${v/1000}k`,'', 'middle');
    });
    ages.forEach((age,i)=>{
      const cy=m.t+i*row+row*.5;
      text(svg,m.l-9,cy+4,age,'','end');
      const a=selectedValue(2021,'All',age), b=selectedValue(2023,'All',age);
      svg.appendChild(el('rect',{x:m.l,y:cy-8,width:x(a),height:6,fill:C.mid}));
      svg.appendChild(el('rect',{x:m.l,y:cy+2,width:x(b),height:6,fill:C.dark}));
    });
    text(svg,m.l,m.t-6,'2021','value-label');
    text(svg,m.l+44,m.t-6,'2023','direct-label');
  }

  const state={step:1,hierarchy:'flat',emphasis:'equal',comparison:'separate',sex:'All',highlight:'30–34',structure:'structured',final:'before',support:'competition'};

  const stepCopy={
    1:{k:'Step 1 · Create hierarchy',t:'Where should the reader start?',m:'The title, chart, controls and source should not compete for equal attention.',learn:['Create hierarchy before adding decoration.','Position, spacing, typography and visual weight create a reading order even when colour is restrained.']},
    2:{k:'Step 2 · Use emphasis selectively',t:'What deserves attention?',m:'The 30–34 group is relevant because its total population is about 3.5% higher in 2023 than in 2021.',learn:['Highlighting works because other elements recede.','The other age groups remain visible as context, but they no longer claim equal attention.']},
    3:{k:'Step 3 · Design for comparison',t:'Can the difference be seen without reconstructing it?',m:'The same scale, the same age order and aligned panels turn a memory task into a visual comparison.',learn:['Comparison is partly a layout problem.','Using the same scale makes the difference between the two years easier to judge.']},
    4:{k:'Step 4 · Let interaction reveal detail',t:'Which detail should enter now?',m:'Sex selection and exact-value readout answer real questions. The default view already communicates the pattern.',learn:['Interaction should reveal, not distract.','A control earns its place when it solves an information problem. Important information is not available only on hover.']},
    5:{k:'Step 5 · Structure complexity',t:'Which dimensions need to be visible at the same time?',m:'Age is shown, population is encoded by length, year is compared, sex is selected and exact values are revealed on demand.',learn:['Not every dimension needs its own colour, shape or axis.','A multidimensional dataset becomes easier to use when design decides what to show, compare, select, fix and reveal.']}
  };

  function setButtonGroup(container, activeValue, attr){
    container.querySelectorAll(`[${attr}]`).forEach(b=>{
      const active=b.getAttribute(attr)===activeValue;
      b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));
    });
  }

  function controlButtons(items, attr, current){
    const wrap=document.createElement('div'); wrap.className='toggle-row'; wrap.setAttribute('role','group');
    items.forEach(([val,label])=>{
      const b=document.createElement('button'); b.type='button'; b.className='toggle-btn'; b.textContent=label; b.setAttribute(attr,val);
      const active=val===current; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); wrap.appendChild(b);
    });
    return wrap;
  }

  function renderStepControls(){
    const host=document.getElementById('step-controls'); host.innerHTML='';
    if(state.step===1){
      const g=controlButtons([['flat','Flat hierarchy'],['clear','Clear hierarchy']],'data-hierarchy',state.hierarchy);
      g.setAttribute('aria-label','Hierarchy comparison'); host.appendChild(g);
      g.addEventListener('click',e=>{const b=e.target.closest('[data-hierarchy]');if(!b)return;state.hierarchy=b.dataset.hierarchy;renderCentral();});
    } else if(state.step===2){
      const g=controlButtons([['equal','Equal emphasis'],['selective','Selective emphasis']],'data-emphasis',state.emphasis);
      g.setAttribute('aria-label','Emphasis comparison'); host.appendChild(g);
      g.addEventListener('click',e=>{const b=e.target.closest('[data-emphasis]');if(!b)return;state.emphasis=b.dataset.emphasis;renderCentral();});
    } else if(state.step===3){
      const g=controlButtons([['separate','Separate scales'],['aligned','Common scale + alignment']],'data-comparison',state.comparison);
      g.setAttribute('aria-label','Comparison layout'); host.appendChild(g);
      g.addEventListener('click',e=>{const b=e.target.closest('[data-comparison]');if(!b)return;state.comparison=b.dataset.comparison;renderCentral();});
    } else if(state.step===4){
      const p=document.createElement('p');p.className='prompt';p.textContent='Select a sex, then click or focus an age row for exact values.';host.appendChild(p);
    } else {
      const g=controlButtons([['all','Everything encoded at once'],['structured','Show · compare · select · reveal']],'data-structure',state.structure);
      g.setAttribute('aria-label','Complexity structure comparison'); host.appendChild(g);
      g.addEventListener('click',e=>{const b=e.target.closest('[data-structure]');if(!b)return;state.structure=b.dataset.structure;renderCentral();});
    }
  }

  function renderDenseBars(svg, emphasisMode='equal'){
    clear(svg); const W=960,H=510,m={l:78,r:30,t:56,b:62},max=210000;
    const y=scale(0,max,H-m.b,m.t), band=(W-m.l-m.r)/ages.length;
    [0,50000,100000,150000,200000].forEach(v=>{const yy=y(v);line(svg,m.l,yy,W-m.r,yy);text(svg,m.l-10,yy+4,`${v/1000}k`,'','end');});
    const four=[{year:2021,sex:'Women'},{year:2021,sex:'Men'},{year:2023,sex:'Women'},{year:2023,sex:'Men'}];
    ages.forEach((age,i)=>{
      const x0=m.l+i*band+band*.08, gap=3, bw=(band*.84-gap*3)/4;
      text(svg,m.l+i*band+band*.5,H-m.b+24,age,'','middle');
      four.forEach((s,j)=>{
        const v=value(s.year,s.sex,age), yy=y(v), focus=age===state.highlight;
        let fill, opacity=1;
        if(emphasisMode==='hierarchy'){
          fill=[C.mid,C.neutral,C.border,C.dark][j]; opacity=[.85,.9,.7,.92][j];
        } else if(emphasisMode==='equal'){
          fill=j%2?C.dark:C.neutral; opacity=j<2?.58:.9;
        } else {
          if(!focus){ fill=C.mutedFill; opacity=.72; }
          else { fill=j<2?C.dark:C.green; opacity=j%2?1:.58; }
        }
        svg.appendChild(el('rect',{x:x0+j*(bw+gap),y:yy,width:bw,height:H-m.b-yy,fill,opacity}));
      });
    });
    text(svg,m.l,m.t-22,'2021 women · 2021 men · 2023 women · 2023 men','value-label');
    if(emphasisMode==='selective'){
      const t21=selectedValue(2021,'All',state.highlight),t23=selectedValue(2023,'All',state.highlight),change=(t23/t21-1)*100;
      text(svg,W-m.r,m.t-22,`${state.highlight}: ${fmt(t21)} → ${fmt(t23)} · ${pct(change)}`,'direct-label','end');
    }
  }

  function renderSeparateComparison(svg){
    clear(svg); const W=960,H=510,m={l:70,r:28,t:72,b:64}; const gap=55,pw=(W-m.l-m.r-gap)/2;
    const configs=[{year:2021,max:390000,ticks:[0,100000,200000,300000],reverse:false},{year:2023,max:450000,ticks:[0,150000,300000,450000],reverse:true}];
    configs.forEach((cfg,p)=>{
      const left=m.l+p*(pw+gap), y=scale(0,cfg.max,H-m.b,m.t), arr=cfg.reverse?[...ages].reverse():ages;
      text(svg,left,m.t-34,String(cfg.year),'direct-label');
      cfg.ticks.forEach(v=>{const yy=y(v);line(svg,left,yy,left+pw,yy);text(svg,left-6,yy+4,`${v/1000}k`,'','end');});
      const b=pw/arr.length;
      arr.forEach((age,i)=>{const v=selectedValue(cfg.year,'All',age),xx=left+i*b+b*.18,ww=b*.64,yy=y(v);svg.appendChild(el('rect',{x:xx,y:yy,width:ww,height:H-m.b-yy,fill:C.dark,opacity:.78}));text(svg,xx+ww/2,H-m.b+22,age,'','middle');});
    });
    text(svg,W-m.r,m.t-34,'Different scales · different order','value-label','end');
  }

  function renderAligned(svg, interactive=false, structured=true){
    clear(svg); const W=960,H=510,m={l:92,r:35,t:70,b:58},max=410000;
    const gap=62,pw=(W-m.l-m.r-gap)/2,x=scale(0,max,0,pw-42),row=(H-m.t-m.b)/ages.length;
    [2021,2023].forEach((year,p)=>{
      const left=m.l+p*(pw+gap); text(svg,left,m.t-34,String(year),'direct-label');
      [0,200000,400000].forEach(v=>{const xx=left+x(v);line(svg,xx,m.t,xx,H-m.b);text(svg,xx,H-m.b+24,`${v/1000}k`,'','middle');});
      ages.forEach((age,i)=>{
        const cy=m.t+i*row+row*.5, v=selectedValue(year,state.sex,age), focus=age===state.highlight;
        if(p===0) text(svg,m.l-12,cy+4,age,'','end');
        const fill=focus?C.green:(structured?C.dark:C.neutral), opacity=focus?1:.58;
        svg.appendChild(el('rect',{x:left,y:cy-8,width:x(v),height:16,fill,opacity}));
        if(interactive){
          const hit=el('rect',{x:left,y:cy-row*.48,width:pw,height:row*.96,class:'hit-target',tabindex:'0',role:'button','aria-label':`${age}, ${year}, ${state.sex==='All'?'women and men':state.sex}: ${fmt(v)} persons`});
          const choose=()=>{state.highlight=age;updateReadout();renderCentral(false);};
          hit.addEventListener('click',choose);hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});svg.appendChild(hit);
        }
      });
    });
    ages.forEach((age,i)=>{
      const a=selectedValue(2021,state.sex,age),b=selectedValue(2023,state.sex,age),ch=(b/a-1)*100;
      if(age===state.highlight || Math.abs(ch)>=3){ text(svg,m.l+pw+gap/2,m.t+i*row+row*.5+4,pct(ch),'delta-label','middle'); }
    });
    text(svg,W-m.r,m.t-34,state.sex==='All'?'Women + men':state.sex,'value-label','end');
  }

  function renderEverything(svg){
    clear(svg); const W=960,H=510,m={l:78,r:35,t:72,b:62}, max=210000, y=scale(0,max,H-m.b,m.t), band=(W-m.l-m.r)/ages.length;
    [0,25000,50000,75000,100000,125000,150000,175000,200000].forEach(v=>{const yy=y(v);line(svg,m.l,yy,W-m.r,yy,'grid-line',{stroke:C.border});});
    const marks=[
      {year:2021,sex:'Women',fill:C.green,shape:'bar'},{year:2021,sex:'Men',fill:C.purple,shape:'bar'},
      {year:2023,sex:'Women',fill:C.dark,shape:'dot'},{year:2023,sex:'Men',fill:C.neutral,shape:'dot'}
    ];
    ages.forEach((age,i)=>{
      const cx=m.l+i*band+band*.5;text(svg,cx,H-m.b+24,age,'','middle');
      marks.forEach((s,j)=>{
        const v=value(s.year,s.sex,age),yy=y(v),dx=(j-1.5)*14;
        if(s.shape==='bar') svg.appendChild(el('rect',{x:cx+dx-5,y:yy,width:10,height:H-m.b-yy,fill:s.fill,opacity:.78}));
        else svg.appendChild(el('circle',{cx:cx+dx,cy:yy,r:6,fill:s.fill}));
      });
    });
    text(svg,m.l,m.t-35,'Age → x · value → y/length · sex → colour · year → shape','direct-label');
    text(svg,W-m.r,m.t-35,'More encodings → more decoding','value-label','end');
  }

  function updateReadout(){
    const a=selectedValue(2021,state.sex,state.highlight),b=selectedValue(2023,state.sex,state.highlight),ch=(b/a-1)*100;
    document.getElementById('chart-readout').innerHTML=`<strong>${state.highlight}</strong> · ${state.sex==='All'?'Women + men':state.sex}: ${fmt(a)} people in 2021 and ${fmt(b)} in 2023 (${pct(ch)}).`;
  }

  function renderCentral(rebuildControls=true){
    const c=stepCopy[state.step], card=document.getElementById('design-card'), svg=document.getElementById('design-chart');
    document.getElementById('step-kicker').textContent=c.k;document.getElementById('step-title').textContent=c.t;document.getElementById('step-message').textContent=c.m;
    document.getElementById('step-learning').innerHTML=`<strong>${c.learn[0]}</strong><p>${c.learn[1]}</p>`;
    document.querySelectorAll('[data-step]').forEach(b=>{if(Number(b.dataset.step)===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    document.getElementById('prev-step').disabled=state.step===1;document.getElementById('next-step').textContent=state.step===5?'Back to first step ↺':'Next step →';
    document.getElementById('step-status').textContent=`Step ${state.step} of 5`;
    if(rebuildControls) renderStepControls();

    card.className='design-demo-card';
    document.getElementById('sex-controls').hidden=state.step<4 || (state.step===5 && state.structure==='all');
    document.getElementById('dimension-map').hidden=!(state.step===5 && state.structure==='structured');
    const readout=document.getElementById('chart-readout');

    if(state.step===1){
      card.classList.add(`hierarchy-${state.hierarchy}`); renderDenseBars(svg,'hierarchy');
      readout.textContent=state.hierarchy==='flat'?'Everything is visible, but headline, chart and source have nearly the same visual weight.':'The headline leads, the chart follows and metadata becomes supporting information. The data did not change.';
    } else if(state.step===2){
      card.classList.add('hierarchy-clear'); renderDenseBars(svg,state.emphasis); 
      readout.textContent=state.emphasis==='equal'?'Every age group asks for the same attention.':'30–34 is prominent; the other groups remain visible as context.';
    } else if(state.step===3){
      card.classList.add('hierarchy-clear'); state.comparison==='aligned'?renderAligned(svg,false):renderSeparateComparison(svg);
      readout.textContent=state.comparison==='aligned'?'Common scales and identical age ordering make change visible without mental reconstruction.':'Both panels are statistically correct, but different scales and ordering make comparison needlessly expensive.';
    } else if(state.step===4){
      card.classList.add('hierarchy-clear');renderAligned(svg,true);updateReadout();
    } else {
      card.classList.add('hierarchy-clear');
      if(state.structure==='structured'){renderAligned(svg,true,true);updateReadout();}
      else {renderEverything(svg);readout.textContent='All dimensions are encoded simultaneously. The reader must decode colour, shape and position before reaching the pattern.';}
    }
    document.querySelectorAll('[data-sex]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sex===state.sex)));
  }

  // Main navigation and sex controls.
  document.querySelectorAll('[data-step]').forEach((b,i)=>{
    b.addEventListener('click',()=>{state.step=Number(b.dataset.step);renderCentral();});
    b.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
      let n=i;if(e.key==='ArrowRight')n=(i+1)%5;if(e.key==='ArrowLeft')n=(i+4)%5;if(e.key==='Home')n=0;if(e.key==='End')n=4;
      const buttons=[...document.querySelectorAll('[data-step]')];buttons[n].click();buttons[n].focus();
    });
  });
  document.getElementById('prev-step').addEventListener('click',()=>{state.step=Math.max(1,state.step-1);renderCentral();});
  document.getElementById('next-step').addEventListener('click',()=>{state.step=state.step===5?1:state.step+1;renderCentral();});
  document.querySelectorAll('[data-sex]').forEach(b=>b.addEventListener('click',()=>{state.sex=b.dataset.sex;renderCentral(false);}));

  function renderSupport(){
    const svg=document.getElementById('support-chart'); clear(svg); const noisy=state.support==='competition';
    const W=720,H=360,m={l:64,r:18,t:25,b:54},max=410000,y=scale(0,max,H-m.b,m.t),band=(W-m.l-m.r)/ages.length;
    const ticks=noisy?[0,50000,100000,150000,200000,250000,300000,350000,400000]:[0,200000,400000];
    ticks.forEach(v=>{const yy=y(v);line(svg,m.l,yy,W-m.r,yy,'grid-line',{stroke:noisy?C.dark:C.grid,'stroke-width':noisy?2:1});text(svg,m.l-7,yy+4,`${v/1000}k`,'','end');});
    if(noisy) svg.appendChild(el('rect',{x:m.l,y:m.t,width:W-m.l-m.r,height:H-m.t-m.b,fill:'none',stroke:C.dark,'stroke-width':2}));
    ages.forEach((age,i)=>{
      const v=selectedValue(2023,'All',age),xx=m.l+i*band+band*.18,ww=band*.64,yy=y(v);
      const palette=[C.green,C.purple,C.dark,C.green,C.purple,C.dark,C.green];
      svg.appendChild(el('rect',{x:xx,y:yy,width:ww,height:H-m.b-yy,fill:noisy?palette[i]:(age==='30–34'?C.green:C.dark),opacity:noisy?1:(age==='30–34'?1:.62)}));
      text(svg,xx+ww/2,H-m.b+21,age,'','middle');
      if(noisy || age==='30–34') text(svg,xx+ww/2,yy-7,fmt(v),'value-label','middle');
    });
    const panel=document.querySelector('.support-comparison');panel.classList.toggle('competition',noisy);panel.classList.toggle('supporting',!noisy);
    document.getElementById('support-eyebrow').textContent=noisy?'EVERY ELEMENT IS LOUD':'Population structure';
    document.getElementById('support-copy').textContent=noisy?'Heavy gridlines, repeated labels and equal typographic weight make the reader process the furniture before the pattern.':'Lighter gridlines, fewer labels and restrained colour keep the data prominent while supporting exact reading where it helps.';
    document.getElementById('support-note').innerHTML=noisy?'<strong>Nothing statistical is wrong.</strong> The problem is competition for attention.':'<strong>Supporting elements still do useful work.</strong> They are simply quieter than the data and the main message.';
  }
  document.querySelectorAll('[data-support]').forEach(b=>b.addEventListener('click',()=>{
    state.support=b.dataset.support;document.querySelectorAll('[data-support]').forEach(x=>{const a=x===b;x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});renderSupport();
  }));

  function renderFinal(){
    const svg=document.getElementById('final-chart');
    if(state.final==='before'){
      renderDenseBars(svg,'equal');document.getElementById('final-eyebrow').textContent='Four series · equal weight';document.getElementById('final-headline').textContent='Population aged 20–54 by sex and year';document.getElementById('final-copy').textContent='The reader can decode the data, but the intended comparison has not been organised for them.';
    } else {
      const sex=state.sex,highlight=state.highlight;state.sex='All';state.highlight='30–34';renderAligned(svg,false,true);state.sex=sex;state.highlight=highlight;
      document.getElementById('final-eyebrow').textContent='Common scale · aligned years · selective emphasis';document.getElementById('final-headline').textContent='Population structure shifted within ages 20–54 between 2021 and 2023';document.getElementById('final-copy').textContent='The same values are organised so that change can be seen directly, while context remains visible.';
    }
  }
  document.querySelectorAll('[data-final]').forEach(b=>b.addEventListener('click',()=>{
    state.final=b.dataset.final;document.querySelectorAll('[data-final]').forEach(x=>{const a=x===b;x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});renderFinal();
  }));

  renderHero(); renderCentral(); renderSupport(); renderFinal();
})();
