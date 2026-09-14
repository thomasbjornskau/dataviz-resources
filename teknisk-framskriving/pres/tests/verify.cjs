/* Kjør fra vilkårlig mappe med node tests/verify.cjs. Ingen npm-pakker. */
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'sources/original-prototype.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');
const data=fs.readFileSync(path.join(root,'js/data.js'),'utf8');
const evaluation=fs.readFileSync(path.join(root,'js/evaluation.js'),'utf8');
assert.equal(engine,source.slice(source.indexOf('const S=12;'),source.indexOf('/* ============================================================\n   Data')),'Motorblokken skal være ordrett');
const dataOriginal=source.slice(source.indexOf('const PRESETS='),source.indexOf('/* ============================================================\n   Figurer'));
assert.equal(data.slice(0,dataOriginal.length),dataOriginal,'loadTable, FALLBACK og original datablokk skal være ordrett');
const sandbox={};vm.createContext(sandbox);vm.runInContext(engine+data+evaluation,sandbox);
const oldCoverage=source.slice(source.indexOf('function runCoverage(){'),source.indexOf('document.getElementById("korig").addEventListener'));
sandbox.document={getElementById:id=>id==='korig'?{value:sandbox.k}:{innerHTML:''}};
sandbox.drawCoverage=c=>sandbox.oldResult=Array.from(c);
sandbox.lab=()=>'';
vm.runInContext('const DATA=FALLBACK,H=12;'+oldCoverage,sandbox);
const report=[];
for(const K of [24,48,72,120]){
 sandbox.k=K;vm.runInContext('runCoverage()',sandbox);
 const r=vm.runInContext(`evaluateCoverage(FALLBACK,${K})`,sandbox);
 assert.deepEqual(Array.from(r.coverage),sandbox.oldResult,'Adapter matcher original per horisont');
 report.push({K,start:vm.runInContext(`monthLabel(FALLBACK,${r.first})`,sandbox),end:vm.runInContext(`monthLabel(FALLBACK,${r.last})`,sandbox),hits:r.hits.reduce((a,b)=>a+b,0),total:r.counts.reduce((a,b)=>a+b,0),percent:r.overall*100});
}
assert.equal(report[0].hits,277);assert.equal(report[2].hits,642);
assert.equal(Math.round(report[0].percent),96);assert.equal(Math.round(report[2].percent),74);
// Andre reserveserie kontrolleres mot den lagrede JSON-stat-kilden.
const hotel=vm.runInContext('HOTEL',sandbox), raw=JSON.parse(fs.readFileSync(path.join(root,'sources/hotel-data.json'),'utf8'));
assert.deepEqual(Array.from(hotel.v),raw.value);
const demos=[];
for(const year of [2018,2020]){
 const r=vm.runInContext(`(()=>{const o=monthIndex(HOTEL,${year},1), m=fitAirline(HOTEL.v.slice(0,o+1)),fc=forecastAirline(m,12);let hits=0;fc.forEach((p,h)=>{const a=Math.log(HOTEL.v[o+h+1]);if(a>=p.lg-1.96*p.se&&a<=p.lg+1.96*p.se)hits++});return {year:${year},hits,months:12};})()`,sandbox);
 demos.push(r);
}
assert.equal(demos[0].hits,12);assert.equal(demos[1].hits,1);
console.log(JSON.stringify({passed:true,engine:'ordrett',data:'originalblokk ordrett; hotellserie lik JSON-stat',coverage:report,demos},null,2));
