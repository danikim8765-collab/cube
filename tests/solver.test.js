const CM = require('./load.js'); const C = CM.cube, S = CM.solver;
let fails = 0; const N = +(process.argv[2] || 200); const t0 = Date.now();
const stats = {}; let maxSteps = 0, totalMoves = 0;
for (let i = 0; i < N; i++) {
  const scr = C.randomScramble(25);
  const st = C.applyMoves(C.solved(), scr);
  const r = S.solveAll(st);
  if (!r.ok) { fails++; console.log('FAIL', scr.join(' '), r.reason, JSON.stringify(r.log.slice(-3))); continue; }
  maxSteps = Math.max(maxSteps, r.log.length);
  r.log.forEach((l) => { stats[l.stage] = (stats[l.stage] || 0) + l.n; totalMoves += l.n; });
}
console.log(`${N - fails}/${N} solved, ${(Date.now() - t0) / N | 0}ms each, avg moves ${(totalMoves / N).toFixed(1)}, max steps ${maxSteps}`);
for (const k in stats) console.log(' ', k, (stats[k] / N).toFixed(1));
process.exit(fails ? 1 : 0);
