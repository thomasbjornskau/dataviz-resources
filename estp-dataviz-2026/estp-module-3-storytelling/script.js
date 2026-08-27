(() => {
  'use strict';

  const DATA = window.ESTP_DATA;
  if (!DATA) return;

  const fertility = DATA.fertility;
  const age = DATA.firstBirthAgeMother.filter(d => d.year >= 1968);
  const NS = 'http://www.w3.org/2000/svg';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const svgEl = (name, attrs = {}, text = null) => {
    const el = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text !== null) el.textContent = text;
    return el;
  };
  const valueAt = (arr, year) => arr.find(d => d.year === year)?.value;
  const fmt = v => Number(v).toFixed(2);

  function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
    const span = domainMax - domainMin;
    return v => rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin);
  }

  function linePath(data, x, y) {
    return data.map((d, i) => `${i ? 'L' : 'M'}${x(d.year).toFixed(2)},${y(d.value).toFixed(2)}`).join(' ');
  }

  function addAxes(svg, cfg) {
    const {x, y, xTicks, yTicks, left, right, top, bottom, xLabel, yLabel, quiet = false} = cfg;
    yTicks.forEach(t => {
      const yy = y(t);
      svg.appendChild(svgEl('line', {x1:left, x2:right, y1:yy, y2:yy, class:'grid-line', opacity: quiet ? .45 : 1}));
      const label = svgEl('text', {x:left - 12, y:yy + 4, 'text-anchor':'end'}, yLabel(t));
      svg.appendChild(label);
    });
    xTicks.forEach(t => {
      const xx = x(t);
      const label = svgEl('text', {x:xx, y:bottom + 28, 'text-anchor':'middle'}, xLabel(t));
      svg.appendChild(label);
    });
    svg.appendChild(svgEl('line', {x1:left, x2:right, y1:bottom, y2:bottom, class:'axis-line'}));
    svg.appendChild(svgEl('line', {x1:left, x2:left, y1:top, y2:bottom, class:'axis-line'}));
  }

  function drawFertilityChart(svg, options = {}) {
    const {
      mode = 'neutral',
      range = [1968, 2025],
      showAnnotations = false,
      showLatest = true,
      showPeriodBands = false,
      guided = false,
      overstory = false,
      finalStory = false
    } = options;

    svg.replaceChildren();
    const vb = svg.viewBox.baseVal;
    const W = vb.width || 900;
    const H = vb.height || 440;
    const m = {top: 28, right: 52, bottom: 52, left: 58};
    const left = m.left, right = W - m.right, top = m.top, bottom = H - m.bottom;
    const data = fertility.filter(d => d.year >= range[0] && d.year <= range[1]);
    const x = linearScale(range[0], range[1], left, right);

    let yMin = 1.2, yMax = 3.0, yTicks = [1.5, 2.0, 2.5, 3.0];
    if (overstory) {
      yMin = 1.35; yMax = 1.55; yTicks = [1.40, 1.45, 1.50, 1.55];
    }
    const y = linearScale(yMin, yMax, bottom, top);
    const spanYears = range[1] - range[0];
    let xTicks;
    if (spanYears <= 5) xTicks = data.map(d => d.year);
    else xTicks = [1970, 1980, 1990, 2000, 2010, 2020].filter(v => v >= range[0] && v <= range[1]);
    if (!xTicks.includes(range[1])) xTicks.push(range[1]);

    if (showPeriodBands || finalStory) {
      const bands = [
        [1968, 1984, '1970s fall'],
        [1984, 2009, 'partial recovery'],
        [2009, 2023, 'post-2009 decline'],
        [2023, 2025, 'recent rise']
      ];
      bands.forEach((b, i) => {
        if (b[1] < range[0] || b[0] > range[1]) return;
        const x1 = x(Math.max(b[0], range[0]));
        const x2 = x(Math.min(b[1], range[1]));
        if (i % 2 === 0) svg.appendChild(svgEl('rect', {x:x1, y:top, width:Math.max(0,x2-x1), height:bottom-top, class:'period-band'}));
      });
    }

    addAxes(svg, {
      x, y, xTicks, yTicks, left, right, top, bottom,
      xLabel: v => String(v),
      yLabel: v => overstory ? Number(v).toFixed(2) : Number(v).toFixed(1),
      quiet: mode !== 'neutral' || guided || finalStory
    });

    if (guided) {
      data.forEach(d => {
        const show = d.year % 5 === 0 || d.year === 2023 || d.year === 2025;
        svg.appendChild(svgEl('circle', {cx:x(d.year), cy:y(d.value), r:show ? 2.5 : 1.7, class:'guide-dot', opacity: show ? .7 : .16}));
      });
    } else if (mode === 'unguided') {
      data.forEach(d => svg.appendChild(svgEl('circle', {cx:x(d.year), cy:y(d.value), r:2.2, class:'guide-dot', opacity:.65})));
      data.filter(d => d.year % 5 === 0 || d.year === 2025).forEach(d => {
        svg.appendChild(svgEl('text', {x:x(d.year), y:y(d.value)-9, 'text-anchor':'middle'}, fmt(d.value)));
      });
    }

    const baseClass = (mode === 'pattern' || showAnnotations || showPeriodBands || finalStory || guided) ? 'series-line series-muted' : 'series-line';
    const path = svgEl('path', {d:linePath(data, x, y), class: overstory ? 'danger-line' : baseClass});
    svg.appendChild(path);

    if ((mode === 'pattern' || showAnnotations || showPeriodBands || finalStory || guided) && !overstory) {
      const focusData = data.filter(d => d.year >= 2009);
      if (focusData.length > 1) svg.appendChild(svgEl('path', {d:linePath(focusData, x, y), class:'focus-line'}));
    }

    const annotations = [
      {year:1968, title:'2.75', sub:'high starting point', dx:18, dy:34, anchor:'start'},
      {year:1984, title:'1.66', sub:'low after the 1970s fall', dx:12, dy:-34, anchor:'start'},
      {year:2009, title:'1.98', sub:'local high before long decline', dx:-12, dy:-42, anchor:'end'},
      {year:2023, title:'1.40', sub:'record low in this series', dx:-14, dy:42, anchor:'end'}
    ];

    if (showAnnotations || finalStory) {
      annotations.filter(a => a.year >= range[0] && a.year <= range[1]).forEach(a => {
        const val = valueAt(fertility, a.year);
        const px = x(a.year), py = y(val);
        const tx = px + a.dx, ty = py + a.dy;
        svg.appendChild(svgEl('circle', {cx:px, cy:py, r:5, class:'point'}));
        svg.appendChild(svgEl('line', {x1:px, y1:py, x2:tx, y2:ty - (a.dy > 0 ? 9 : -9), class:'annotation-line'}));
        const t = svgEl('text', {x:tx, y:ty, 'text-anchor':a.anchor, class:'annotation-label'});
        t.appendChild(svgEl('tspan', {x:tx, dy:0}, `${a.year} · ${a.title}`));
        t.appendChild(svgEl('tspan', {x:tx, dy:16, class:'annotation-sub'}, a.sub));
        svg.appendChild(t);
      });
    }

    if (guided && range[0] <= 2023 && range[1] >= 2023) {
      const px = x(2023), py = y(valueAt(fertility, 2023));
      svg.appendChild(svgEl('circle', {cx:px, cy:py, r:5, class:'point'}));
      const t = svgEl('text', {x:px - 12, y:py + 34, 'text-anchor':'end', class:'annotation-label'});
      t.appendChild(svgEl('tspan', {x:px-12}, '2023 · 1.40'));
      t.appendChild(svgEl('tspan', {x:px-12, dy:16, class:'annotation-sub'}, 'lowest point in the series'));
      svg.appendChild(t);
    }

    if (showLatest && range[1] >= 2025 && range[0] <= 2025 && !overstory) {
      const val = valueAt(fertility, 2025);
      svg.appendChild(svgEl('circle', {cx:x(2025), cy:y(val), r:4.5, class:'point'}));
      svg.appendChild(svgEl('text', {x:x(2025)-9, y:y(val)-11, 'text-anchor':'end', class:'latest-label'}, '2025 · 1.48'));
    }

    if (overstory) {
      const a = data[0], b = data[data.length - 1];
      [a,b].forEach(d => {
        svg.appendChild(svgEl('circle', {cx:x(d.year), cy:y(d.value), r:6, fill:'white', stroke:'#8d3c32', 'stroke-width':3}));
        svg.appendChild(svgEl('text', {x:x(d.year), y:y(d.value)-13, 'text-anchor':'middle', class:'annotation-label'}, `${d.year} · ${fmt(d.value)}`));
      });
      const midX = (x(a.year)+x(b.year))/2;
      svg.appendChild(svgEl('text', {x:midX, y:top + 22, 'text-anchor':'middle', class:'annotation-label'}, 'Only the recent rise is visible'));
    }
  }

  function drawAgeChart(svg) {
    svg.replaceChildren();
    const vb = svg.viewBox.baseVal;
    const W = vb.width || 900, H = vb.height || 250;
    const m = {top:20,right:42,bottom:45,left:58};
    const left=m.left,right=W-m.right,top=m.top,bottom=H-m.bottom;
    const x=linearScale(1968,2025,left,right);
    const y=linearScale(22,32,bottom,top);
    addAxes(svg,{x,y,xTicks:[1970,1980,1990,2000,2010,2020,2025],yTicks:[24,26,28,30,32],left,right,top,bottom,xLabel:String,yLabel:v=>String(v),quiet:true});
    svg.appendChild(svgEl('path',{d:linePath(age,x,y),class:'context-line'}));
    [1968,2025].forEach(year=>{
      const val=valueAt(age,year);
      svg.appendChild(svgEl('circle',{cx:x(year),cy:y(val),r:4.5,class:'context-dot'}));
      svg.appendChild(svgEl('text',{x:x(year)+(year===1968?8:-8),y:y(val)-10,'text-anchor':year===1968?'start':'end',class:'annotation-label'},`${year} · ${val.toFixed(1)}`));
    });
  }

  const stepContent = {
    1: {kicker:'Step 1 · Show the data', title:'What do you see?', message:'The complete time series is visible, but the story is not yet explicit.'},
    2: {kicker:'Step 2 · Establish the main pattern', title:'Make the broad pattern easier to see', message:'Fertility fell steeply through the 1970s, recovered partly, then declined again after 2009. Visual competition is reduced; the data is unchanged.'},
    3: {kicker:'Step 3 · Identify turning points', title:'Point to the changes that structure the reading', message:'A few anchored annotations show where the direction or level meaningfully changes. Not every interesting year needs a label.'},
    4: {kicker:'Step 4 · Add comparison', title:'Turn the line into distinct phases', message:'Comparisons show the scale and direction of change: decline, partial recovery, another decline, then a modest recent rise.'},
    5: {kicker:'Step 5 · Add context', title:'Add evidence that helps interpretation', message:'The timing of first births changed markedly over the same broad period. It is relevant context, but the two series alone do not establish causality.'},
    6: {kicker:'Step 6 · State the story', title:'Sequence the evidence into one defensible message', message:'The reader now knows what to look at, which changes matter, what comparison to make, and where the limits of the evidence are.'}
  };

  let currentStep = 1;
  const mainChart = $('#main-chart');
  const stepperButtons = $$('.stepper button');
  const comparisonPanel = $('#comparison-panel');
  const contextPanel = $('#context-panel');
  const storyConclusion = $('#story-conclusion');

  function updateStep(step, focusButton = false) {
    currentStep = Math.max(1, Math.min(6, step));
    const c = stepContent[currentStep];
    $('#step-kicker').textContent = c.kicker;
    $('#step-title').textContent = c.title;
    $('#step-message').textContent = c.message;
    $('#step-status').textContent = `Step ${currentStep} of 6: ${c.title}`;

    stepperButtons.forEach(btn => {
      const isCurrent = Number(btn.dataset.step) === currentStep;
      if (isCurrent) btn.setAttribute('aria-current','step'); else btn.removeAttribute('aria-current');
    });

    const toolThresholds = {data:1, focus:2, hierarchy:2, annotation:3, comparison:4, context:5, sequence:6};
    $$('.story-tools .tool').forEach(el => el.classList.toggle('active', currentStep >= toolThresholds[el.dataset.tool]));

    drawFertilityChart(mainChart, {
      mode: currentStep === 1 ? 'neutral' : 'pattern',
      showAnnotations: currentStep >= 3,
      showPeriodBands: currentStep >= 4,
      finalStory: currentStep >= 6
    });

    comparisonPanel.classList.toggle('visible', currentStep >= 4);
    comparisonPanel.setAttribute('aria-hidden', currentStep >= 4 ? 'false':'true');
    contextPanel.classList.toggle('visible', currentStep >= 5);
    contextPanel.setAttribute('aria-hidden', currentStep >= 5 ? 'false':'true');
    storyConclusion.classList.toggle('visible', currentStep >= 6);
    storyConclusion.setAttribute('aria-hidden', currentStep >= 6 ? 'false':'true');
    $('#prev-step').disabled = currentStep === 1;
    $('#next-step').disabled = currentStep === 6;
    $('#next-step').textContent = currentStep === 6 ? 'Story complete' : 'Next step →';

    if (focusButton) stepperButtons.find(b => Number(b.dataset.step) === currentStep)?.focus();
  }

  stepperButtons.forEach(btn => {
    btn.addEventListener('click', () => updateStep(Number(btn.dataset.step)));
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); updateStep(Math.min(6, currentStep + 1), true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); updateStep(Math.max(1, currentStep - 1), true); }
    });
  });
  $('#prev-step').addEventListener('click', () => updateStep(currentStep - 1));
  $('#next-step').addEventListener('click', () => updateStep(currentStep + 1));

  drawAgeChart($('#context-chart'));
  updateStep(1);

  // Guide attention demo
  let guideMode = 'unguided';
  const guideChart = $('#guide-chart');
  function updateGuide(mode) {
    guideMode = mode;
    $$('[data-guide]').forEach(btn => {
      const active = btn.dataset.guide === guideMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    $('#guide-note').innerHTML = guideMode === 'guided'
      ? '<strong>One reading path becomes dominant.</strong> Supporting detail is quieter; the post-2009 period is stronger; one annotation explains the low point.'
      : '<strong>Everything competes.</strong> Gridlines, labels and points all ask for attention.';
    drawFertilityChart(guideChart, {mode: guideMode === 'unguided' ? 'unguided' : 'pattern', guided: guideMode === 'guided', showLatest: guideMode === 'guided'});
  }
  $$('[data-guide]').forEach(btn => btn.addEventListener('click', () => updateGuide(btn.dataset.guide)));
  updateGuide('unguided');

  // Editorial exercise
  $$('.editor-card').forEach(card => {
    const suggested = card.dataset.suggested;
    $$('.choice-row button', card).forEach(btn => btn.addEventListener('click', () => {
      $$('.choice-row button', card).forEach(b => b.classList.toggle('selected', b === btn));
      const choice = btn.dataset.choice;
      const feedback = $('.feedback', card);
      const match = choice === suggested;
      if (suggested === 'keep') {
        feedback.textContent = match
          ? 'A defensible choice: this adds a different kind of evidence or a sharper comparison.'
          : 'Also defensible if the point is already clear elsewhere. Removing repetition is part of editing.';
      } else {
        feedback.textContent = match
          ? 'A defensible edit: useful information can still be unnecessary in this explanatory sequence.'
          : 'You can keep it, but give it a distinct job. If it merely repeats the point, it weakens the sequence.';
      }
    }));
  });

  // Overstory demo
  const overstoryChart = $('#overstory-chart');
  function updateOverstory(mode) {
    const isOver = mode === 'overstory';
    const root = $('.overstory-demo');
    root.classList.toggle('overstory-mode', isOver);
    $$('[data-overstory]').forEach(btn => {
      const active = btn.dataset.overstory === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true':'false');
    });
    if (isOver) {
      $('#overstory-headline').textContent = 'Norway’s fertility crisis is over';
      $('#overstory-subhead').textContent = 'A narrow window and selective annotation make the 2023–2025 rise dominate the interpretation.';
      $('#causal-statement').innerHTML = '<strong>Overstory:</strong> Later parenthood caused the fertility decline. <em>This causal claim is not established by the two time series.</em>';
      drawFertilityChart(overstoryChart, {range:[2023,2025], overstory:true, showLatest:false});
    } else {
      $('#overstory-headline').textContent = 'Fertility rose in 2024 and 2025 after the 2023 low';
      $('#overstory-subhead').textContent = 'The longer series still shows a much lower level than in 2009 or the late 1960s.';
      $('#causal-statement').innerHTML = '<strong>Evidence:</strong> Mean age at first birth increased while fertility declined over much of the period after 2010. The two series alone do not establish why.';
      drawFertilityChart(overstoryChart, {mode:'pattern', showAnnotations:true, showPeriodBands:true});
    }
  }
  $$('[data-overstory]').forEach(btn => btn.addEventListener('click', () => updateOverstory(btn.dataset.overstory)));
  updateOverstory('evidence');

  // Final chart vs story
  const finalChart = $('#final-chart');
  function updateFinal(mode) {
    const story = mode === 'story';
    $$('[data-final]').forEach(btn => {
      const active = btn.dataset.final === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true':'false');
    });
    if (story) {
      $('#final-headline').textContent = 'A long decline, a partial recovery, another decline — and a small recent rise';
      $('#final-copy').textContent = 'The final view preserves the full series, but hierarchy, turning points, comparison and annotation make the reading path explicit.';
      drawFertilityChart(finalChart, {mode:'pattern', showAnnotations:true, showPeriodBands:true, finalStory:true});
    } else {
      $('#final-headline').textContent = 'Total fertility rate, women. Norway, 1968–2025';
      $('#final-copy').textContent = 'A complete, correct statistical time series. The reader still has to decide what matters.';
      drawFertilityChart(finalChart, {mode:'neutral'});
    }
  }
  $$('[data-final]').forEach(btn => btn.addEventListener('click', () => updateFinal(btn.dataset.final)));
  updateFinal('chart');
})();
