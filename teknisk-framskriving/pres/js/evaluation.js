/* Etterprøvingsadapter. Motoren i engine.js endres ikke.
   Samme startpunkt, horisonter og inklusjonsregel som prototypens runCoverage. */
function evaluateCoverage(data, K) {
  const H = 12, n = data.v.length, hits = Array(H).fill(0), counts = Array(H).fill(0);
  let first = null, last = null, origins = 0;
  for (let o = n - 1 - H; o > n - 1 - H - K && o > 60; o--) {
    if (last === null) last = o;
    first = o;
    const model = fitAirline(data.v.slice(0, o + 1));
    if (!model) continue;
    const fc = forecastAirline(model, H); origins++;
    for (let h = 0; h < H; h++) {
      if (o + 1 + h >= n) continue;
      const actual = Math.log(data.v[o + 1 + h]); counts[h]++;
      if (actual >= fc[h].lg - 1.96 * fc[h].se && actual <= fc[h].lg + 1.96 * fc[h].se) hits[h]++;
    }
  }
  const coverage = hits.map((v, h) => counts[h] ? v / counts[h] : 0);
  return {origins, first, last, hits, counts, coverage, overall: coverage.reduce((a,b) => a+b, 0) / H};
}
function monthIndex(data, year, month) { return (year - data.start.y) * 12 + month - data.start.m; }
function monthLabel(data, i) {
  const t = data.start.m - 1 + i;
  return ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'][t % 12] + ' ' + (data.start.y + Math.floor(t / 12));
}
