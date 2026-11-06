/* 초보자 풀이법(7단계) 계획기
 * 모든 단계는 '잡는 방향(frame)'과 그 방향 기준의 이동 기호로 안내한다.
 * 상태(abs)는 항상 기준 방향(흰 위/초록 앞) 54칸 배열. */
(function (CM) {
  'use strict';
  const C = CM.cube;
  const { FL, CENTER, CUBIES, EDGES, CORNERS } = C;

  const ALG = {
    sexy: "R U R' U'",
    midRight: "U R U' R' U' F' U F",
    midLeft: "U' L' U L U F U' F'",
    ycross: "F R U R' U' F'",
    yedges: "R U R' U R U2 R' U",
    ycorners: "U R U' L' U R' U' L",
    twist: "R' D' R D",
  };

  const STAGES = ['cross', 'corners', 'middle', 'ycross', 'yedges', 'ycorners', 'twist'];
  const SIDES = ['g', 'r', 'b', 'o'];

  // ---------- 단계 판정 (abs 기준: 흰=U, 노랑=D) ----------
  const posKey = (p) => p.join(',');
  const U_EDGES = EDGES.filter((e) => e.pos[1] === 1);
  const D_EDGES = EDGES.filter((e) => e.pos[1] === -1);
  const M_EDGES = EDGES.filter((e) => e.pos[1] === 0);
  const U_CORNERS = CORNERS.filter((e) => e.pos[1] === 1);
  const D_CORNERS = CORNERS.filter((e) => e.pos[1] === -1);
  const centerOfFl = (s, i) => s[CENTER[FL[i].face]];

  function stageChecks(s) {
    const solvedCount = (list) => list.filter((cb) => C.cubieSolved(s, cb)).length;
    const yUp = D_EDGES.filter((cb) => s[cb.fl.find((i) => FL[i].face === 'D')] === 'y').length;
    const placed = D_CORNERS.filter((cb) => C.colorKey(cb.fl.map((i) => s[i])) === C.colorKey(cb.fl.map((i) => centerOfFl(s, i)))).length;
    const twisted = D_CORNERS.filter((cb) => C.cubieSolved(s, cb)).length;
    return {
      cross: { n: solvedCount(U_EDGES), of: 4 },
      corners: { n: solvedCount(U_CORNERS), of: 4 },
      middle: { n: solvedCount(M_EDGES), of: 4 },
      ycross: { n: yUp, of: 4 },
      yedges: { n: solvedCount(D_EDGES), of: 4 },
      ycorners: { n: placed, of: 4 },
      twist: { n: twisted, of: 4 },
    };
  }
  function currentStage(s) {
    if (C.isSolved(s)) return 'done';
    const ch = stageChecks(s);
    return STAGES.find((st) => ch[st].n < ch[st].of) || 'done';
  }
  const stageIndex = (st) => (st === 'done' ? 7 : STAGES.indexOf(st));

  // ---------- 위치 설명 ----------
  function locName(pos) {
    const [x, y, z] = pos;
    const layer = y === 1 ? '윗층' : y === -1 ? '아랫층' : '가운데층';
    const parts = [];
    if (z === 1) parts.push('앞'); if (z === -1) parts.push('뒤');
    if (x === -1) parts.push('왼쪽'); if (x === 1) parts.push('오른쪽');
    if (!parts.length) return layer;
    return `${layer} ${parts.join('-')}`;
  }
  const FACE_KO = { U: '위쪽', D: '아래쪽', F: '앞쪽', B: '뒤쪽', R: '오른쪽', L: '왼쪽' };
  const SIDE_POS_KO = (pos) => (pos[2] === 1 ? '앞쪽' : pos[2] === -1 ? '뒤쪽' : pos[0] === 1 ? '오른쪽' : '왼쪽');

  const frameOf = (up, front) => ({ up, front });
  function yellowFrames() { return SIDES.map((f) => frameOf('y', f)); }

  function uTurns(k) { return k === 0 ? [] : k === 1 ? ['U'] : k === 2 ? ['U2'] : ["U'"]; }

  // ---------- 1. 흰 십자 (흰 위) : 조각별 BFS ----------
  const EDGE_FL = []; // 모서리 칸 24개
  EDGES.forEach((e) => e.fl.forEach((i) => EDGE_FL.push(i)));
  const EIDX = {}; EDGE_FL.forEach((fi, k) => { EIDX[fi] = k; });
  const CROSS_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
  const CROSS_TABLE = CROSS_MOVES.map((m) => {
    const src = C.movePerm(m); const dest = new Array(54);
    for (let j = 0; j < 54; j++) dest[src[j]] = j;
    return EDGE_FL.map((fi) => EIDX[dest[fi]]);
  });

  function bfsEdges(starts, goals) {
    const k = starts.length;
    const enc = (arr) => arr.reduce((a, v) => a * 24 + v, 0);
    const goal = enc(goals);
    const start = enc(starts);
    if (start === goal) return [];
    const size = Math.pow(24, k);
    const prev = new Int32Array(size).fill(-1);
    const pmove = new Int8Array(size);
    prev[start] = start;
    let frontier = [start];
    const dec = (code) => { const a = new Array(k); for (let i = k - 1; i >= 0; i--) { a[i] = code % 24; code = Math.floor(code / 24); } return a; };
    while (frontier.length) {
      const next = [];
      for (const code of frontier) {
        const a = dec(code);
        for (let m = 0; m < CROSS_MOVES.length; m++) {
          const t = CROSS_TABLE[m];
          let c2 = 0; for (let i = 0; i < k; i++) c2 = c2 * 24 + t[a[i]];
          if (prev[c2] !== -1) continue;
          prev[c2] = code; pmove[c2] = m;
          if (c2 === goal) {
            const path = []; let c = c2;
            while (c !== start) { path.push(CROSS_MOVES[pmove[c]]); c = prev[c]; }
            return path.reverse();
          }
          next.push(c2);
        }
      }
      frontier = next;
    }
    return null;
  }

  function planCross(abs) {
    const steps = [];
    let s = abs;
    for (let guard = 0; guard < 6; guard++) {
      const done = SIDES.filter((c) => { const h = C.homeOf(s, ['w', c]); return C.cubieSolved(s, h) && s[h.fl.find((i) => FL[i].face === 'U')] === 'w'; });
      const todo = SIDES.filter((c) => !done.includes(c));
      if (!todo.length) break;
      let best = null;
      todo.forEach((c) => {
        const frame = frameOf('w', c);
        const fs = C.toFrame(s, frame);
        const pieces = done.concat([c]);
        const starts = pieces.map((pc) => EIDX[C.findPiece(fs, ['w', pc]).map.w]);
        const goals = pieces.map((pc) => { const h = C.homeOf(fs, ['w', pc]); return EIDX[h.fl.find((i) => FL[i].face === 'U')]; });
        const path = bfsEdges(starts, goals);
        if (path && (!best || path.length < best.moves.length)) best = { c, frame, moves: path, fs };
      });
      const p = C.findPiece(best.fs, ['w', best.c]);
      const whiteFace = FL[p.map.w].face;
      const name = C.pieceName(['w', best.c]);
      const say = [
        `<b>${name}</b> 모서리 조각을 찾아볼게요. 지금 <b>${locName(p.cubie.pos)}</b>에 있고, 흰색 스티커는 <b>${FACE_KO[whiteFace]}</b>을 보고 있어요.`,
        `이 조각을 흰 센터 바로 앞, 그러니까 <b>윗면 앞쪽</b>으로 보낼 거예요. 흰색은 위로, ${C.SHORT_KO[best.c]}색은 앞면 ${C.SHORT_KO[best.c]} 센터와 붙게요.`,
      ];
      if (done.length) say.push('이미 맞춘 흰 모서리들은 잠깐 움직여도 마지막엔 제자리로 돌아오니 걱정 마세요.');
      const next = C.applyInFrame(s, best.frame, best.moves);
      steps.push({ stage: 'cross', title: `${name} 모서리 넣기`, hold: best.frame, moves: best.moves, say, focus: ['w', best.c], start: s, expected: next });
      s = next;
    }
    return steps;
  }

  // ---------- 2. 흰 코너 (노랑 위, 흰 아래) : R U R' U' 반복 ----------
  function cornerSlotFrame(colors) { // 흰-a-b 코너의 자리가 앞-오른쪽 아래(DFR)가 되는 잡는 방향
    const others = colors.filter((c) => c !== 'w');
    return yellowFrames().find((fr) => { const cc = C.frameCenters(fr); return C.colorKey([cc.F, cc.R]) === C.colorKey(others); });
  }
  const WHITE_CORNERS = [['w', 'g', 'r'], ['w', 'r', 'b'], ['w', 'b', 'o'], ['w', 'o', 'g']];
  const POS = { UFR: [1, 1, 1], DFR: [1, -1, 1], FR: [1, 0, 1], UF: [0, 1, 1] };

  function planCorners(abs) {
    const steps = [];
    let s = abs;
    const solvedC = (st, cols) => C.cubieSolved(st, C.homeOf(st, cols)) && C.findPiece(st, cols).cubie === C.homeOf(st, cols);
    for (let guard = 0; guard < 10; guard++) {
      const todo = WHITE_CORNERS.filter((cols) => !solvedC(s, cols));
      if (!todo.length) break;
      let best = null;
      todo.forEach((cols) => {
        const frame = cornerSlotFrame(cols);
        const fs = C.toFrame(s, frame);
        const p = C.findPiece(fs, cols);
        if (p.cubie.pos[1] !== 1) return; // 윗층(노랑 쪽)에 있는 것만
        for (let k = 0; k < 4; k++) {
          const t = C.applyMoves(fs, uTurns(k));
          if (!C.eq(C.findPiece(t, cols).cubie.pos, POS.UFR)) continue;
          let u = t;
          for (let n = 1; n <= 5; n++) {
            u = C.applyMoves(u, ALG.sexy);
            if (C.cubieSolved(u, C.cubieAt(POS.DFR))) {
              const cost = k + 4 * n;
              if (!best || cost < best.cost) best = { cols, frame, k, n, cost, p };
              break;
            }
          }
        }
      });
      if (best) {
        const name = C.pieceName(best.cols);
        const cc = C.frameCenters(best.frame);
        const segs = [];
        if (best.k) segs.push({ label: '윗층을 돌려 코너를 목표 자리 바로 위로', moves: uTurns(best.k) });
        segs.push({ label: `R U R' U' × ${best.n}번`, moves: C.parseAlg(Array(best.n).fill(ALG.sexy).join(' ')), unit: C.parseAlg(ALG.sexy), count: best.n });
        const moves = segs.flatMap((g) => g.moves);
        const say = [
          `<b>${name}</b> 코너가 지금 <b>${locName(best.p.cubie.pos)}</b>에 있어요.`,
          `이 코너가 들어갈 자리는 ${C.SHORT_KO[cc.F]} 센터와 ${C.SHORT_KO[cc.R]} 센터 사이, <b>앞-오른쪽 아래</b>예요.`,
          best.k ? '먼저 윗층(U)만 돌려서 코너를 그 자리 <b>바로 위</b>로 옮긴 다음,' : '코너가 이미 목표 자리 바로 위에 있어요.',
          `<b>R U R' U'</b>를 흰색이 아래를 볼 때까지 반복해요. 이번엔 <b>${best.n}번</b>이면 돼요.`,
        ];
        const next = C.applyInFrame(s, best.frame, moves);
        steps.push({ stage: 'corners', title: `${name} 코너 넣기`, hold: best.frame, moves, segments: segs, say, focus: best.cols, start: s, expected: next });
        s = next;
      } else {
        // 아랫층에 잘못 들어간 코너 → 꺼내기
        const cols = todo[0];
        let frame = null, fs = null;
        for (const fr of yellowFrames()) {
          const t = C.toFrame(s, fr);
          if (C.eq(C.findPiece(t, cols).cubie.pos, POS.DFR)) { frame = fr; fs = t; break; }
        }
        const name = C.pieceName(cols);
        const moves = C.parseAlg(ALG.sexy);
        const say = [
          `<b>${name}</b> 코너가 아래층에 있긴 한데, 자리나 방향이 틀렸어요.`,
          '이럴 땐 그 코너를 <b>앞-오른쪽 아래</b>에 오게 잡고 <b>R U R\' U\'</b>를 한 번 해서 윗층으로 꺼내요. 그다음 제대로 넣어 줄게요.',
        ];
        const next = C.applyInFrame(s, frame, moves);
        steps.push({ stage: 'corners', title: `${name} 코너 꺼내기`, hold: frame, moves, segments: [{ label: "R U R' U' × 1번 (꺼내기)", moves, unit: moves, count: 1 }], say, focus: cols, start: s, expected: next });
        s = next;
      }
    }
    return steps;
  }

  // ---------- 3. 2층 ----------
  const MID_PIECES = [['g', 'r'], ['r', 'b'], ['b', 'o'], ['o', 'g']];
  function planMiddle(abs) {
    const steps = [];
    let s = abs;
    const solvedE = (st, cols) => { const h = C.homeOf(st, cols); return C.findPiece(st, cols).cubie === h && C.cubieSolved(st, h); };
    for (let guard = 0; guard < 10; guard++) {
      const todo = MID_PIECES.filter((cols) => !solvedE(s, cols));
      if (!todo.length) break;
      let best = null;
      todo.forEach((cols) => {
        const fs0 = C.toFrame(s, frameOf('y', 'g'));
        const p0 = C.findPiece(fs0, cols);
        if (p0.cubie.pos[1] !== 1) return;
        const topFl = p0.cubie.fl.find((i) => FL[i].face === 'U');
        const top = fs0[topFl];
        const side = cols.find((c) => c !== top);
        const frame = frameOf('y', side);
        const fs = C.toFrame(s, frame);
        for (let k = 0; k < 4; k++) {
          const t = C.applyMoves(fs, uTurns(k));
          if (!C.eq(C.findPiece(t, cols).cubie.pos, POS.UF)) continue;
          const cc = C.frameCenters(frame);
          const dir = top === cc.R ? 'right' : 'left';
          if (!best || k < best.k) best = { cols, frame, k, dir, top, side, pos: p0.cubie.pos, fs };
        }
      });
      if (best) {
        const name = C.pieceName(best.cols);
        const cc = C.frameCenters(best.frame);
        const alg = best.dir === 'right' ? ALG.midRight : ALG.midLeft;
        const segs = [];
        if (best.k) segs.push({ label: '윗층을 돌려 옆면 색을 센터와 맞추기', moves: uTurns(best.k) });
        segs.push({ label: best.dir === 'right' ? '오른쪽으로 넣기' : '왼쪽으로 넣기', moves: C.parseAlg(alg) });
        const moves = segs.flatMap((g) => g.moves);
        const say = [
          `노란색이 없는 <b>${name}</b> 모서리가 윗층에 있어요.`,
          `${C.SHORT_KO[best.side]} 센터가 앞을 보게 잡고, ${best.k ? '윗층을 돌려서 ' : ''}이 조각의 앞쪽 색(${C.SHORT_KO[best.side]})이 앞 센터와 <b>세로로 이어지게</b> 해요.`,
          `윗면 쪽 색이 <b>${C.SHORT_KO[best.top]}</b>이니까 ${C.SHORT_KO[best.top]} 센터가 있는 <b>${best.dir === 'right' ? '오른쪽' : '왼쪽'}</b>으로 보내요.`,
        ];
        const next = C.applyInFrame(s, best.frame, moves);
        steps.push({ stage: 'middle', title: `${name} 모서리 ${best.dir === 'right' ? '오른쪽' : '왼쪽'}으로 넣기`, hold: best.frame, moves, segments: segs, say, focus: best.cols, start: s, expected: next, alg: best.dir === 'right' ? 'midRight' : 'midLeft' });
        void cc;
        s = next;
      } else {
        const cols = todo[0];
        let frame = null;
        for (const fr of yellowFrames()) {
          const t = C.toFrame(s, fr);
          if (C.eq(C.findPiece(t, cols).cubie.pos, POS.FR)) { frame = fr; break; }
        }
        if (!frame) {
          // 다른 잘못 놓인 2층 모서리 찾기
          for (const fr of yellowFrames()) {
            const t = C.toFrame(s, fr);
            const cb = C.cubieAt(POS.FR);
            if (!C.cubieSolved(t, cb)) { frame = fr; break; }
          }
        }
        const fs = C.toFrame(s, frame);
        const atFR = C.cubieAt(POS.FR).fl.map((i) => fs[i]);
        const name = C.pieceName(atFR);
        const moves = C.parseAlg(ALG.midRight);
        const say = [
          '윗층에 넣을 조각이 없네요. 대신 <b>2층에 잘못 들어간 조각</b>이 있어요.',
          `<b>${name}</b> 조각이 있는 자리를 <b>앞-오른쪽</b>에 오게 잡고, 오른쪽 넣기 공식을 한 번 해서 윗층으로 꺼낼게요.`,
        ];
        const next = C.applyInFrame(s, frame, moves);
        steps.push({ stage: 'middle', title: `${name} 모서리 꺼내기`, hold: frame, moves, segments: [{ label: '오른쪽 공식으로 꺼내기', moves }], say, focus: atFR, start: s, expected: next, alg: 'midRight' });
        s = next;
      }
    }
    return steps;
  }

  // ---------- 4~6. 공식 적용 계획 (매크로 BFS) ----------
  function macroBFS(fs0, macros, goal, maxDepth) {
    if (goal(fs0)) return [];
    let frontier = [{ s: fs0, path: [] }];
    const seen = new Set([fs0.join('')]);
    for (let d = 0; d < maxDepth; d++) {
      const next = [];
      for (const node of frontier) {
        const last = node.path[node.path.length - 1];
        for (let m = 0; m < macros.length; m++) {
          const mac = macros[m];
          if (mac.isU && last !== undefined && macros[last].isU) continue;
          const s2 = C.applyPerm(node.s, mac.perm);
          const k = s2.join('');
          if (seen.has(k)) continue;
          seen.add(k);
          const path = node.path.concat([m]);
          if (goal(s2)) return path.map((i) => macros[i]);
          next.push({ s: s2, path });
        }
      }
      frontier = next;
    }
    return null;
  }

  // 노랑 위 기준 프레임(앞=front0)에서 y 회전 h번 한 프레임으로 공식을 적용하는 매크로
  function algMacros(alg, front0) {
    const base = frameOf('y', front0);
    const order = [front0].concat(SIDES.filter((c) => c !== front0));
    return order.map((front) => {
      const fr = frameOf('y', front);
      // base 프레임 기준 perm = (base→abs) ∘ (abs→fr) ∘ alg ∘ 역
      const rb = C.findRotation(base.up, base.front).perm;
      const rf = C.findRotation(fr.up, fr.front).perm;
      const inv = (p) => { const o = new Array(54); for (let j = 0; j < 54; j++) o[p[j]] = j; return o; };
      let perm = C.composePerm(inv(rb), rf);
      perm = C.composePerm(perm, C.seqPerm(alg));
      perm = C.composePerm(perm, inv(rf));
      perm = C.composePerm(perm, rb);
      return { isU: false, front, perm, alg: C.parseAlg(alg) };
    });
  }
  function uMacros() { return ['U', 'U2', "U'"].map((m) => ({ isU: true, move: m, perm: C.movePerm(m) })); }

  // 프레임 상태 fs(노랑 위) 판정 도우미
  const UE = { F: [0, 1, 1], R: [1, 1, 0], B: [0, 1, -1], L: [-1, 1, 0] };
  function yellowEdgeSides(fs) { // 노랑이 위를 보는 윗층 모서리 위치 이름
    return Object.keys(UE).filter((k) => fs[C.cubieAt(UE[k]).fl.find((i) => FL[i].face === 'U')] === 'y');
  }
  function matchedEdgeSides(fs) {
    return Object.keys(UE).filter((k) => C.cubieSolved(fs, C.cubieAt(UE[k])));
  }
  const UC = { FR: [1, 1, 1], FL: [-1, 1, 1], BR: [1, 1, -1], BL: [-1, 1, -1] };
  const UC_KO = { FR: '앞-오른쪽', FL: '앞-왼쪽', BR: '뒤-오른쪽', BL: '뒤-왼쪽' };
  const SIDE_KO = { F: '앞쪽', R: '오른쪽', B: '뒤쪽', L: '왼쪽' };
  function placedCorners(fs) {
    return Object.keys(UC).filter((k) => {
      const cb = C.cubieAt(UC[k]);
      return C.colorKey(cb.fl.map((i) => fs[i])) === C.colorKey(cb.fl.map((i) => centerOfFl(fs, i)));
    });
  }
  function shapeName(sides) {
    if (sides.length === 0) return '점';
    if (sides.length === 4) return '십자';
    if (sides.length === 2) return (sides.includes('F') && sides.includes('B')) || (sides.includes('L') && sides.includes('R')) ? '일자' : 'ㄱ자';
    return '?';
  }

  function planWithMacros(abs, stage, prevFront) {
    const front0 = prevFront && SIDES.includes(prevFront) ? prevFront : 'g';
    const base = frameOf('y', front0);
    const fs0 = C.toFrame(abs, base);
    let macros, goal, depth, algKey;
    if (stage === 'ycross') {
      algKey = 'ycross'; macros = algMacros(ALG.ycross, front0); depth = 4;
      goal = (fs) => yellowEdgeSides(fs).length === 4;
    } else if (stage === 'yedges') {
      algKey = 'yedges'; macros = uMacros().concat(algMacros(ALG.yedges, front0)); depth = 7;
      goal = (fs) => matchedEdgeSides(fs).length === 4;
    } else {
      algKey = 'ycorners'; macros = algMacros(ALG.ycorners, front0); depth = 4;
      goal = (fs) => placedCorners(fs).length === 4;
    }
    const path = macroBFS(fs0, macros, goal, depth);
    if (!path) return [];
    // 매크로 → 단계(step)
    const steps = [];
    let s = abs;
    let pendingU = [];
    path.forEach((mac, idx) => {
      if (mac.isU) { pendingU.push(mac.move); return; }
      const frame = frameOf('y', mac.front);
      const segs = [];
      if (pendingU.length) segs.push({ label: '윗층만 돌려서 맞추기', moves: pendingU.slice() });
      segs.push({ label: '공식 ' + ALG[algKey], moves: mac.alg.slice() });
      // 마지막 공식 뒤에 남은 U
      if (idx === path.findLastIndex((m) => !m.isU)) {
        const tail = path.slice(idx + 1).map((m) => m.move);
        if (tail.length) segs.push({ label: '윗층만 돌려서 마무리', moves: tail });
      }
      const moves = segs.flatMap((g) => g.moves);
      const fsBefore = C.applyMoves(C.toFrame(s, frame), pendingU);
      const say = describeMacroStep(stage, fsBefore, frame, pendingU, steps.length);
      const next = C.applyInFrame(s, frame, moves);
      steps.push({ stage, title: stageStepTitle(stage, fsBefore), hold: frame, moves, segments: segs, say, start: s, expected: next, alg: algKey });
      s = next;
      pendingU = [];
    });
    if (!steps.length && path.length) { // U만으로 해결
      const frame = base;
      const moves = path.map((m) => m.move);
      const next = C.applyInFrame(s, frame, moves);
      steps.push({ stage, title: '윗층 돌려서 맞추기', hold: frame, moves, segments: [{ label: '윗층만 돌리기', moves }], say: ['공식 없이 <b>윗층만 돌리면</b> 옆면 색이 모두 맞아요!'], start: s, expected: next });
    }
    return steps;
  }

  function stageStepTitle(stage, fs) {
    if (stage === 'ycross') return `노란 ${shapeName(yellowEdgeSides(fs))} → 공식`;
    if (stage === 'yedges') return `맞는 모서리 ${matchedEdgeSides(fs).length}개 → 공식`;
    return `제자리 코너 ${placedCorners(fs).length}개 → 공식`;
  }

  function describeMacroStep(stage, fs, frame, preU, n) {
    const cc = C.frameCenters(frame);
    const hold = `<b>${C.SHORT_KO[cc.F]}</b> 센터가 앞을 보게`;
    if (stage === 'ycross') {
      const sides = yellowEdgeSides(fs);
      const shape = shapeName(sides);
      const lines = [`윗면을 보면 노란색이 위를 보는 모서리가 <b>${shape}</b> 모양이에요${shape === '점' ? ' (가운데 노란 센터만 있어요)' : ''}.`];
      if (shape === '점') lines.push(`점 모양은 방향 상관없이 공식을 한 번 하면 ㄱ자나 일자가 나와요. ${hold} 잡고 해볼게요.`);
      else if (shape === 'ㄱ자') lines.push(`ㄱ자는 노란 모서리가 <b>${sides.map((k) => SIDE_KO[k]).join('과 ')}</b>에 오도록 잡아야 해요. ${hold} 잡으면 딱 그 모양이에요.`);
      else lines.push(`일자는 <b>가로(왼쪽-오른쪽)</b>로 놓이게 잡아야 해요. ${hold} 잡으면 가로 일자예요.`);
      lines.push('공식 <b>F R U R\' U\' F\'</b> — 앞면 돌리고, "오른쪽 위, 윗줄 왼쪽, 오른쪽 아래, 윗줄 오른쪽", 앞면 되돌리기예요.');
      return lines;
    }
    if (stage === 'yedges') {
      const m = matchedEdgeSides(fs);
      const lines = [];
      if (preU.length) lines.push(`먼저 윗층만 <b>${preU.join(' ')}</b> 돌려요. 그러면 옆면 색이 센터와 맞는 노란 모서리가 <b>${m.length}개</b> 생겨요.`);
      else lines.push(`지금 옆면 색이 센터와 맞는 노란 모서리가 <b>${m.length}개</b>예요.`);
      if (m.length === 2) {
        const opposite = (m.includes('F') && m.includes('B')) || (m.includes('L') && m.includes('R'));
        if (opposite) lines.push(`맞는 두 개가 서로 <b>마주 보고</b> 있어요. 이럴 땐 공식을 한 번 하면 옆으로 붙은 모양이 돼요. ${hold} 잡아요.`);
        else lines.push(`맞는 두 개가 <b>${m.map((k) => SIDE_KO[k]).join('과 ')}</b>에 오도록 ${hold} 잡고 공식을 해요.`);
      } else lines.push(`${hold} 잡고 공식을 해요.`);
      lines.push('공식 <b>R U R\' U R U2 R\' U</b> — "오른쪽 위, 윗줄 왼쪽, 오른쪽 아래, 윗줄 왼쪽, 오른쪽 위, 윗줄 두 번, 오른쪽 아래, 윗줄 왼쪽".');
      return lines;
    }
    const p = placedCorners(fs);
    const lines = [];
    if (p.length === 0) lines.push(`지금 제자리(색 조합이 맞는 자리)에 있는 노란 코너가 하나도 없어요. 걱정 마세요, ${hold} 잡고 공식을 한 번 하면 하나가 생겨요.`);
    else lines.push(`제자리에 있는 코너가 <b>${p.length}개</b> 있어요. 방향은 틀려도 괜찮아요 — 세 색이 둘러싼 센터 색과 같으면 제자리예요.`, `제자리 코너가 <b>${p.map((k) => UC_KO[k]).join(', ')} 위</b>에 오도록 ${hold} 잡아요.`);
    lines.push('공식 <b>U R U\' L\' U R\' U\' L</b> — 앞-오른쪽 위 코너는 그대로 두고 나머지 세 개를 돌려 줘요.');
    void n;
    return lines;
  }

  // ---------- 7. 코너 비틀기 ----------
  function planTwist(abs, prevFront) {
    const unsolvedAtUFR = (fs) => fs[C.cubieAt(POS.UFR).fl.find((i) => FL[i].face === 'U')] !== 'y';
    const order = [prevFront && SIDES.includes(prevFront) ? prevFront : 'g'].concat(SIDES);
    let frame = null, fs = null;
    for (const f of order) {
      const t = C.toFrame(abs, frameOf('y', f));
      if (unsolvedAtUFR(t)) { frame = frameOf('y', f); fs = t; break; }
    }
    if (!frame) { // 비틀 코너 없음: 윗층만 맞추기
      frame = frameOf('y', order[0]); fs = C.toFrame(abs, frame);
    }
    const segs = [];
    let cur = fs, corner = 0;
    const yCount = (st) => ['FR', 'FL', 'BR', 'BL'].filter((k) => st[C.cubieAt(UC[k]).fl.find((i) => FL[i].face === 'U')] === 'y').length;
    for (let guard = 0; guard < 8 && yCount(cur) < 4; guard++) {
      if (unsolvedAtUFR(cur)) {
        let n = 0;
        while (unsolvedAtUFR(cur) && n < 6) { cur = C.applyMoves(cur, ALG.twist); n++; }
        corner++;
        segs.push({ label: `${corner}번째 코너: R' D' R D × ${n}번`, moves: C.parseAlg(Array(n).fill(ALG.twist).join(' ')), unit: C.parseAlg(ALG.twist), count: n, note: '노란색이 위를 보면 멈춰요. 아래층이 엉망이어도 괜찮아요!' });
      }
      if (yCount(cur) === 4) break;
      for (const k of [1, 3, 2]) {
        const t = C.applyMoves(cur, uTurns(k));
        if (unsolvedAtUFR(t)) { cur = t; segs.push({ label: '윗층(U)만 돌려 다음 코너를 앞-오른쪽 위로', moves: uTurns(k), note: '큐브 전체를 돌리면 안 돼요! 윗층만 돌려요.' }); break; }
      }
    }
    for (let k = 0; k < 4; k++) {
      const t = C.applyMoves(cur, uTurns(k));
      if (C.isSolved(t)) { if (k) segs.push({ label: '윗층을 돌려 완성!', moves: uTurns(k) }); cur = t; break; }
    }
    const moves = segs.flatMap((g) => g.moves);
    const twisted = ['FR', 'FL', 'BR', 'BL'].filter((k) => fs[C.cubieAt(UC[k]).fl.find((i) => FL[i].face === 'U')] !== 'y').length;
    const say = [
      `노란색이 위를 보지 않는 코너가 <b>${twisted}개</b> 있어요. 마지막 단계예요!`,
      `그중 하나를 <b>앞-오른쪽 위</b>에 두고 <b>R' D' R D</b>를 노란색이 위를 볼 때까지 반복해요 (2번 또는 4번).`,
      '⚠️ 중요해요: 하는 도중 아래층이 엉망이 된 것처럼 보여요. <b>정상이에요!</b> 큐브를 통째로 돌리지 말고, 다음 코너는 <b>윗층(U)만</b> 돌려서 앞-오른쪽 위로 가져와요. 마지막엔 저절로 다 돌아와요.',
    ];
    const next = C.fromFrame(cur, frame);
    return [{ stage: 'twist', title: '노란 코너 비틀기', hold: frame, moves, segments: segs, say, start: abs, expected: next, alg: 'twist', longStep: true }];
  }

  function planStage(abs, prevFront) {
    const st = currentStage(abs);
    switch (st) {
      case 'cross': return planCross(abs);
      case 'corners': return planCorners(abs);
      case 'middle': return planMiddle(abs);
      case 'ycross': case 'yedges': case 'ycorners': return planWithMacros(abs, st, prevFront);
      case 'twist': return planTwist(abs, prevFront);
      default: return [];
    }
  }
  function nextStep(abs, prevFront) { const p = planStage(abs, prevFront); return p.length ? Object.assign(p[0], { remaining: p.length }) : null; }

  // 전체 풀이 시뮬레이션 (테스트용)
  function solveAll(abs) {
    let s = abs; const log = []; let prevFront = null;
    for (let guard = 0; guard < 60 && !C.isSolved(s); guard++) {
      const st = nextStep(s, prevFront);
      if (!st) return { ok: false, log, state: s, reason: 'no step at ' + currentStage(s) };
      const after = C.applyInFrame(s, st.hold, st.moves);
      if (!C.sameState(after, st.expected)) return { ok: false, log, reason: 'expected mismatch' };
      if (stageIndex(currentStage(after)) < stageIndex(st.stage)) return { ok: false, log, reason: 'regressed in ' + st.stage, step: st };
      log.push({ stage: st.stage, n: st.moves.length });
      s = after; prevFront = st.hold.front;
    }
    return { ok: C.isSolved(s), log, state: s };
  }

  CM.solver = { ALG, STAGES, stageChecks, currentStage, stageIndex, planStage, nextStep, solveAll, locName, yellowEdgeSides, matchedEdgeSides, placedCorners, shapeName };
})(typeof window !== 'undefined' ? window.CM : globalThis.CM);
