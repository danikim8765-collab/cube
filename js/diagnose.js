/* 결과 확인 & 실수 진단
 * 단계 시작 상태 + 안내한 이동 + 사용자가 입력한 결과를 비교해서
 * 흔한 실수(반대로 돌림, 빠뜨림, 잡는 방향 틀림 등)를 시뮬레이션으로 찾아낸다. */
(function (CM) {
  'use strict';
  const C = CM.cube;
  const S = CM.solver;

  const ord = (i) => (i === 0 ? '첫 번째' : `${i + 1}번째`);
  const mt = (t) => (CM.content ? CM.content.moveText(t) : t);
  const holdText = (fr) => `위 <b>${C.SHORT_KO[fr.up]}</b> · 앞 <b>${C.SHORT_KO[fr.front]}</b>`;

  function variants(step) {
    const M = step.moves;
    const out = [];
    const push = (code, P, msg, extra) => out.push(Object.assign({ code, P, msg }, extra || {}));
    // 1. 중간에 멈춤
    for (let k = 0; k < M.length; k++) {
      push('prefix', M.slice(0, k), k === 0
        ? '큐브가 이 단계를 시작하기 전 모습 그대로인 것 같아요. 아직 안 돌리셨거나, 시작 전 상태를 입력하셨을 수 있어요.'
        : `<b>${k}수</b>까지 하시고 멈춘 것 같아요. 남은 <b>${M.length - k}수</b>만 이어서 하면 돼요!`);
    }
    // 2. 한 수를 반대로
    M.forEach((t, i) => {
      const p = C.parseToken(t);
      if (p.turns === 2) return;
      const P = M.slice(); P[i] = C.invertToken(t);
      push('invert', P, `${ord(i)} 수 <b>${t}</b>(${mt(t)})를 반대 방향 <b>${P[i]}</b>(${mt(P[i])})로 돌리신 것 같아요.`, { at: i });
    });
    // 3. 한 수를 빠뜨림
    M.forEach((t, i) => {
      const P = M.slice(0, i).concat(M.slice(i + 1));
      push('omit', P, `${ord(i)} 수 <b>${t}</b>(${mt(t)})를 건너뛰신 것 같아요.`, { at: i });
    });
    // 4. 두 번/한 번 혼동
    M.forEach((t, i) => {
      const p = C.parseToken(t);
      if (p.turns === 2) {
        [p.base, p.base + "'"].forEach((alt) => { const P = M.slice(); P[i] = alt; push('half', P, `${ord(i)} 수 <b>${t}</b>는 <b>두 번(반 바퀴)</b> 돌려야 하는데 한 번만 돌리신 것 같아요.`, { at: i }); });
      } else {
        const P = M.slice(); P[i] = p.base + '2';
        push('double', P, `${ord(i)} 수 <b>${t}</b>를 한 번만 돌려야 하는데 두 번 돌리신 것 같아요.`, { at: i });
      }
    });
    // 5. 한 수를 한 번 더
    M.forEach((t, i) => {
      const P = M.slice(0, i + 1).concat([t], M.slice(i + 1));
      push('extra', P, `${ord(i)} 수 <b>${t}</b>를 한 번 더 돌리신 것 같아요.`, { at: i });
    });
    // 6. 이웃한 두 수 순서 바뀜
    for (let i = 0; i + 1 < M.length; i++) {
      if (M[i] === M[i + 1]) continue;
      const P = M.slice(); P[i] = M[i + 1]; P[i + 1] = M[i];
      push('swap', P, `${ord(i)}와 ${ord(i + 1)} 수(<b>${M[i]}</b>, <b>${M[i + 1]}</b>)의 순서가 바뀐 것 같아요.`, { at: i });
    }
    // 7. 반복 횟수 틀림
    if (step.segments) {
      let off = 0;
      step.segments.forEach((g) => {
        if (g.unit && g.count) {
          [-2, -1, 1, 2].forEach((d) => {
            const n = g.count + d;
            if (n < 0) return;
            const P = M.slice(0, off).concat(Array(n).fill(g.unit).flat(), M.slice(off + g.moves.length));
            push('reps', P, `<b>${g.unit.join(' ')}</b>를 ${g.count}번 해야 하는데 <b>${n}번</b> 하신 것 같아요.${d < 0 ? ' 노란/흰 스티커가 원하는 쪽을 볼 때까지 반복해야 해요.' : ''}`);
          });
        }
        off += g.moves.length;
      });
    }
    // 8. 윗층(U) 대신 큐브 전체(y)를 돌림
    M.forEach((t, i) => {
      const p = C.parseToken(t);
      if (p.base !== 'U') return;
      const P = M.slice(); P[i] = 'y' + (p.turns === 1 ? '' : p.turns === 3 ? "'" : '2');
      push('rotate', P, `${ord(i)} 수 <b>${t}</b>에서 윗층만 돌려야 하는데 <b>큐브 전체</b>를 돌리신 것 같아요.`, { at: i });
    });
    // 9. 공식 전체를 두 번
    push('twice', M.concat(M), '이 단계를 <b>두 번</b> 하신 것 같아요.');
    return out;
  }

  function divergence(P, M) {
    let i = 0;
    while (i < P.length && i < M.length && P[i] === M[i]) i++;
    return i;
  }

  // 사용자의 입력 실수 찾기 (면이 돌아가 입력됨 / 두 면이 바뀜 / 몇 칸 오타)
  function rotateFace(state, f, q) {
    const b = C.FACES.indexOf(f) * 9;
    const out = state.slice();
    for (let k = 0; k < q; k++) {
      const cur = out.slice(b, b + 9);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[b + r * 3 + c] = cur[(2 - c) * 3 + r];
    }
    return out;
  }
  const FACE_NAME = { U: '윗면(흰 센터)', D: '아랫면(노랑 센터)', F: '초록 면', B: '파랑 면', R: '빨강 면', L: '주황 면' };

  function inputSlips(actual, targets) {
    for (const f of C.FACES) {
      for (const q of [1, 2, 3]) {
        const t = rotateFace(actual, f, q);
        if (targets.some((x) => C.sameState(x, t))) return { code: 'faceRot', face: f, msg: `<b>${FACE_NAME[f]}</b>을 입력할 때 큐브를 ${q === 2 ? '거꾸로' : '옆으로 돌려'} 잡으신 것 같아요. 그 면만 안내대로 다시 확인해 주세요.` };
      }
    }
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
      const t = actual.slice();
      for (let k = 0; k < 9; k++) { if (k === 4) continue; t[a * 9 + k] = actual[b * 9 + k]; t[b * 9 + k] = actual[a * 9 + k]; }
      if (targets.some((x) => C.sameState(x, t))) return { code: 'faceSwap', msg: `<b>${FACE_NAME[C.FACES[a]]}</b>과 <b>${FACE_NAME[C.FACES[b]]}</b>의 입력이 서로 바뀐 것 같아요.` };
    }
    return null;
  }

  /* 반환:
   *  {kind:'ok'}
   *  {kind:'mistake', code, msg, recovery:[...], resumeAt, frame}
   *  {kind:'input', msg, cells}
   *  {kind:'invalid', errors}
   *  {kind:'unknown', stage, regressed, msg} */
  function diagnose(step, actual) {
    if (C.sameState(actual, step.expected)) return { kind: 'ok' };
    const valid = C.validate(actual);
    const M = step.moves;
    const F = step.hold;
    const vars = variants(step);
    const results = [];
    for (const v of vars) {
      const r = C.applyInFrame(step.start, F, v.P);
      results.push(r);
      if (C.sameState(r, actual)) {
        const i = divergence(v.P, M);
        const recovery = C.invertAlg(v.P.slice(i));
        return { kind: 'mistake', code: v.code, msg: v.msg, recovery, resumeAt: i, frame: F };
      }
    }
    // 잡는 방향이 틀린 경우
    for (const rot of C.ROTATIONS) {
      const G = { up: rot.up, front: rot.front };
      if (G.up === F.up && G.front === F.front) continue;
      const r = C.applyInFrame(step.start, G, M);
      if (C.sameState(r, actual)) {
        const recovery = C.invertAlg(M).map((t) => C.translateMove(t, G, F));
        const sameUp = G.up === F.up;
        return {
          kind: 'mistake', code: 'hold', frame: F, resumeAt: 0, recovery,
          msg: `큐브를 ${holdText(G)}으로 잡고 하신 것 같아요. 이번 단계는 ${holdText(F)}으로 잡아야 해요.${sameUp ? ' 윗면은 맞았는데 앞면이 달랐어요.' : ''}`,
        };
      }
    }
    // 입력 실수
    const slip = inputSlips(actual, [step.expected, step.start]);
    if (slip) return { kind: 'input', msg: slip.msg, cells: [] };
    if (!valid.ok) {
      const diff = [];
      for (let i = 0; i < 54; i++) if (actual[i] !== step.expected[i]) diff.push(i);
      if (diff.length <= 6) return { kind: 'input', msg: `예상과 <b>${diff.length}칸</b>만 달라요. 이건 큐브를 돌린 실수라기보다 입력하실 때 색을 잘못 누른 것 같아요. 표시된 칸을 실제 큐브와 다시 비교해 주세요.`, cells: diff };
      return { kind: 'invalid', errors: valid.errors };
    }
    // 알 수 없는 실수 → 지금 상태 분석
    const stage = S.currentStage(actual);
    const regressed = S.stageIndex(stage) < S.stageIndex(step.stage);
    return { kind: 'unknown', stage, regressed };
  }

  CM.diagnose = { diagnose, rotateFace, variants };
})(typeof window !== 'undefined' ? window.CM : globalThis.CM);
