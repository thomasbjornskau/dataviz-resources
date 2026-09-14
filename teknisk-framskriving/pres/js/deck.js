/* Vanlig script: fungerer også direkte fra file://. */
(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const notes = [
    ['0:00–1:00 · 1 minutt', 'JDemetra+ regner allerede ut et år framover hver måned. Vi kaster tallene.'],
    ['1:00–2:15 · 1 minutt 15 sekunder', 'Dette er ikke SSBs syn på framtiden. Det er nullmodellen.'],
    ['2:15–4:30 · 2 minutter 15 sekunder', 'Sånn ville det sett ut, og sånn gikk det.'],
    ['4:30–6:00 · 1 minutt 30 sekunder', 'Bytt vindu, og svaret endrer seg. Derfor må vinduet fastsettes på forhånd.'],
    ['6:00–7:30 · 1 minutt 30 sekunder · deretter 30 sekunder buffer', 'Teknisk framskriving, ved siden av serien den forlenger, med etterprøving i fast vindu.']
  ];
  const $ = id => document.getElementById(id);
  let current = 1;
  const readHash = () => /^#[1-5]$/.test(location.hash) ? Number(location.hash.slice(1)) : 1;
  function show(n) {
    current = Math.max(1, Math.min(slides.length, n));
    const focused = document.activeElement;
    if (focused && focused.closest('.slide') && focused.closest('.slide') !== slides[current - 1]) focused.blur();
    slides.forEach((slide, i) => {
      const active = i === current - 1;
      slide.classList.toggle('is-active', active);
      slide.inert = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    $('indicator').textContent = `${current} / ${slides.length}`;
    $('note-time').textContent = notes[current - 1][0];
    $('note-sentence').textContent = notes[current - 1][1];
    $('previous').disabled = current === 1;
    $('next').disabled = current === slides.length;
    document.title = `Side ${current} · Hackathon · Teknisk framskriving`;
    if (location.hash !== `#${current}`) location.hash = String(current);
    document.dispatchEvent(new CustomEvent('slidechange', {detail: {slide: current}}));
  }
  function toggle(id, force) {
    const visible = force === undefined ? $(id).hidden : force;
    $(id).hidden = !visible;
    $(`${id}-toggle`).setAttribute('aria-expanded', String(visible));
    if (visible) toggle(id === 'notes' ? 'help' : 'notes', false);
  }
  $('previous').addEventListener('click', () => show(current - 1));
  $('next').addEventListener('click', () => show(current + 1));
  ['notes', 'help'].forEach(id => $(`${id}-toggle`).addEventListener('click', () => toggle(id)));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') { toggle('notes', false); toggle('help', false); return; }
    if (event.target.closest('input, select, textarea, [contenteditable="true"], [role="slider"]')) return;
    if (event.key === ' ' && event.target.closest('button, a')) return;
    if (event.repeat) return;
    let handled = true;
    if (/^[1-5]$/.test(event.key)) show(Number(event.key));
    else if (['ArrowRight', 'ArrowDown'].includes(event.key)) show(current + 1);
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) show(current - 1);
    else if (event.key === ' ') show(current + (event.shiftKey ? -1 : 1));
    else if (event.key.toLowerCase() === 'n') toggle('notes');
    else if (event.key === '?') toggle('help');
    else handled = false;
    if (handled) event.preventDefault();
  });
  function resize() {
    document.documentElement.style.setProperty('--deck-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  addEventListener('resize', resize);
  addEventListener('hashchange', () => show(readHash()));
  resize();
  show(readHash());
})();
