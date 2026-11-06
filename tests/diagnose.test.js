const CM = require('./load.js'); const C = CM.cube, S = CM.solver, D = CM.diagnose;
let ok = 0, n = 0, fail = 0;
const codes = {};
for (let t = 0; t < 150; t++) {
  let s = C.applyMoves(C.solved(), C.randomScramble(25)); let pf = null;
  while (!C.isSolved(s)) {
    const st = S.nextStep(s, pf);
    // 정답
    if (D.diagnose(st, st.expected).kind !== 'ok') { console.log('ok-fail'); fail++; }
    // 무작위 실수 하나
    const vars = D.variants(st);
    const v = vars[Math.floor(Math.random() * vars.length)];
    const actual = C.applyInFrame(st.start, st.hold, v.P);
    if (!C.sameState(actual, st.expected)) {
      n++;
      const r = D.diagnose(st, actual);
      if (r.kind === 'mistake') {
        ok++; codes[r.code] = (codes[r.code] || 0) + 1;
        // 복구 경로 검증: 복구 + 남은 수 = 예상 상태
        const fixed = C.applyInFrame(actual, st.hold, r.recovery.concat(st.moves.slice(r.resumeAt)));
        if (!C.sameState(fixed, st.expected)) { fail++; console.log('recovery fail', r.code); }
      } else console.log('not found', v.code, r.kind);
    }
    // 잡는 방향 실수
    const G = C.ROTATIONS[Math.floor(Math.random() * 24)];
    const a2 = C.applyInFrame(st.start, { up: G.up, front: G.front }, st.moves);
    if (!C.sameState(a2, st.expected)) {
      const r = D.diagnose(st, a2);
      if (r.kind !== 'mistake') { console.log('hold not found', r.kind); fail++; }
      else { const fixed = C.applyInFrame(a2, st.hold, r.recovery.concat(st.moves.slice(r.resumeAt))); if (!C.sameState(fixed, st.expected)) { fail++; console.log('hold recovery fail', r.code); } }
    }
    s = st.expected; pf = st.hold.front;
  }
}
console.log(`mistakes diagnosed ${ok}/${n}, fails ${fail}`, codes);
// 입력 실수: 면 회전
const st = S.nextStep(C.applyMoves(C.solved(), C.randomScramble(25)));
console.log(D.diagnose(st, D.rotateFace(st.expected, 'F', 1)).kind);
process.exit(fail ? 1 : 0);
