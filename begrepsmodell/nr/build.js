#!/usr/bin/env node
/**
 * build.js — bygger begrepsmodellen fra data/-filene og oppdaterer index.html.
 *
 * Kjør fra modell-mappen:
 *   node build.js
 *
 * Skriptet er idempotent: kjør så mange ganger du vil, samme resultat.
 * Ingen npm-dependencies. Trenger Node.js 18+.
 *
 * Se README.md for beskrivelse av data-filenes format og bygge-reglene.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const HTML = path.join(ROOT, 'index.html');

// ─── 1. LES OG VALIDER DATA ────────────────────────────────────────────

function les(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { avslutt(`Klarte ikke å lese ${p}: ${e.message}`); }
}

function avslutt(msg) { console.error('FEIL:', msg); process.exit(1); }
function advar(msg)  { console.warn('ADVARSEL:', msg); }

const rows  = les(path.join(DATA, 'begreper.json'));
const lag   = les(path.join(DATA, 'lag.json'));
const faser = les(path.join(DATA, 'faser.json'));
const meta  = les(path.join(DATA, 'metadata.json'));

// Sjekk struktur
if (!Array.isArray(rows))  avslutt('begreper.json må være en array');
if (!Array.isArray(lag))   avslutt('lag.json må være en array');
if (!Array.isArray(faser)) avslutt('faser.json må være en array');

const lagIds = new Set(lag.map(l => l.id));
const rowIds = new Set();
const feil = [];

rows.forEach((r, i) => {
  if (!r.id || !r.t || !r.lag || r.k === undefined)
    feil.push(`Rad ${i}: mangler id/t/lag/k`);
  if (rowIds.has(r.id)) feil.push(`Duplikat id: ${r.id}`);
  rowIds.add(r.id);
  if (!lagIds.has(r.lag))
    feil.push(`Ukjent lag i '${r.id}': ${r.lag} (finnes ikke i lag.json)`);
  (r.par || []).forEach(p => {
    if (!rows.some(x => x.id === p))
      feil.push(`'${r.id}' har par-referanse til ukjent id: ${p}`);
  });
});

if (feil.length) {
  feil.forEach(f => console.error('  •', f));
  avslutt(`${feil.length} valideringsfeil — stopper.`);
}

// ─── 2. BYGG EDGES ──────────────────────────────────────────────────────
//
// Tre typer:
//   par    (w=2.5)  — eksplisitt fra par:[...] i begreper.json
//   ref    (w=0.6)  — automatisk: term X nevnt i definisjonen til Y
//   gruppe (w=0.35) — automatisk: kjeder sammen rader i samme (lag, gruppe)

const edges = [];
const sett = new Set();
const nokkel = (a, b) => [a, b].sort().join('|');

// 2a. Par-kanter
rows.forEach(r => {
  (r.par || []).forEach(p => {
    const k = nokkel(r.id, p);
    if (sett.has(k)) return;
    sett.add(k);
    edges.push({a: r.id, b: p, type: 'par', w: 2.5});
  });
});

// 2b. Tekstreferanse-kanter (ordgrense ved start, tillater bøyning)
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
rows.forEach(a => {
  rows.forEach(b => {
    if (a.id === b.id) return;
    const k = nokkel(a.id, b.id);
    if (sett.has(k)) return;
    if (new RegExp('\\b' + esc(b.t), 'i').test(a.d || '')) {
      sett.add(k);
      edges.push({a: a.id, b: b.id, type: 'ref', w: 0.6});
    }
  });
});

// 2c. Gruppekohesjon
const grupper = {};
rows.forEach(r => {
  const gk = r.lag + '|' + (r.gruppe || '');
  (grupper[gk] = grupper[gk] || []).push(r);
});
Object.values(grupper).forEach(medl => {
  for (let i = 0; i < medl.length - 1; i++) {
    const k = nokkel(medl[i].id, medl[i + 1].id);
    if (sett.has(k)) continue;
    sett.add(k);
    edges.push({a: medl[i].id, b: medl[i + 1].id, type: 'gruppe', w: 0.35});
  }
});

// ─── 3. BEREGNEDE METADATA ──────────────────────────────────────────────

const antKjerne  = rows.filter(r => r.k).length;
const antUtvidet = rows.length - antKjerne;

const beregnet = {
  omfang: `${rows.length} begreper i ${lag.length} lag`,
  kjerneAntall: `${antKjerne} kjerne, ${antUtvidet} utvidet`,
  antallBegreper: String(rows.length),
  antallLag: String(lag.length)
};

// ─── 4. INJISER I INDEX.HTML ────────────────────────────────────────────

if (!fs.existsSync(HTML)) avslutt(`Mangler ${HTML}`);
let html = fs.readFileSync(HTML, 'utf8');

// 4a. Injiser JSON i <script id="data" ...>
const embed = JSON.stringify({rows, edges, lag, faser});
const dataTag = /(<script id="data"[^>]*>)([\s\S]*?)(<\/script>)/;
if (!dataTag.test(html)) avslutt('index.html mangler <script id="data" ...>');
html = html.replace(dataTag, (_, a, _b, c) => a + embed + c);

// 4b. Oppdater tekstnoder merket data-meta="nøkkel"
// Regelen: elementer med data-meta="X" får sitt textContent satt til
// meta[X] eller beregnet[X]. Kun elementer med rent tekstinnhold.
const allMeta = {...meta, ...beregnet};
const metaTag = /(<[^>]*\bdata-meta="([^"]+)"[^>]*>)([^<]*)(<\/[^>]+>)/g;
let oppdatert = 0;
html = html.replace(metaTag, (full, apen, nokkel, gammel, lukk) => {
  if (!(nokkel in allMeta)) {
    advar(`data-meta="${nokkel}" i HTML men ikke i metadata.json/beregnet`);
    return full;
  }
  oppdatert++;
  // Escape HTML-spesialtegn i verdi
  const verdi = String(allMeta[nokkel])
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return apen + verdi + lukk;
});

// 4c. Oppdater <title>
if (meta.tittel) {
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.tittel}</title>`);
}

fs.writeFileSync(HTML, html);

// ─── 5. RAPPORT ─────────────────────────────────────────────────────────

console.log('Bygget begrepsmodell:');
console.log(`  begreper:  ${rows.length}  (${antKjerne} kjerne + ${antUtvidet} utvidet)`);
console.log(`  lag:       ${lag.length}`);
console.log(`  faser:     ${faser.length}`);
console.log(`  kanter:    ${edges.length}`);
console.log(`               par:    ${edges.filter(e => e.type === 'par').length}`);
console.log(`               ref:    ${edges.filter(e => e.type === 'ref').length}`);
console.log(`               gruppe: ${edges.filter(e => e.type === 'gruppe').length}`);
console.log(`  metadata:  ${oppdatert} tekstfelt oppdatert i index.html`);
console.log(`  størrelse: ${(fs.statSync(HTML).size / 1024).toFixed(1)} KB`);
console.log('OK — index.html er oppdatert.');
