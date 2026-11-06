/* 큐브 엔진: 54칸(facelet) 상태, 회전, 조각 찾기, 유효성 검사
 * 좌표계: x=오른쪽, y=위, z=앞(나를 향함). 면 순서 U R F D L B (각 9칸, 바깥에서 본 행 우선).
 * 입력/저장 기준 방향: 흰색 위(U), 초록 앞(F). */
(function (CM) {
  'use strict';

  const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  const NORMAL = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };
  const RIGHT = { U: [1, 0, 0], R: [0, 0, -1], F: [1, 0, 0], D: [1, 0, 0], L: [0, 0, 1], B: [-1, 0, 0] };
  const DOWN = { U: [0, 0, 1], R: [0, -1, 0], F: [0, -1, 0], D: [0, 0, -1], L: [0, -1, 0], B: [0, -1, 0] };
  const SCHEME = { U: 'w', R: 'r', F: 'g', D: 'y', L: 'o', B: 'b' };
  const COLORS = ['w', 'y', 'g', 'b', 'r', 'o'];
  const CENTER = { U: 4, R: 13, F: 22, D: 31, L: 40, B: 49 };

  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const key = (p, n) => p.join(',') + '|' + n.join(',');

  // facelet 정의
  const FL = [];
  const FL_INDEX = {};
  FACES.forEach((f) => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const pos = add(add(NORMAL[f], mul(RIGHT[f], c - 1)), mul(DOWN[f], r - 1));
        const i = FL.length;
        FL.push({ i, face: f, r, c, pos, n: NORMAL[f] });
        FL_INDEX[key(pos, NORMAL[f])] = i;
      }
    }
  });
  const faceOfNormal = (n) => FACES.find((f) => eq(NORMAL[f], n));

  // 축 a(단위 좌표축)에 대해 q*90도(오른손 법칙) 회전
  function rot(v, a, q) {
    q = ((q % 4) + 4) % 4;
    for (let k = 0; k < q; k++) v = add(cross(a, v), mul(a, dot(a, v)));
    return v;
  }

  // 이동 정의: axis, 층 판정, 기본 회전량(q, 시계방향 = -1)
  const BASE = {};
  function defMove(name, axis, layerFn) { BASE[name] = { axis, layerFn }; }
  FACES.forEach((f) => {
    const n = NORMAL[f];
    defMove(f, n, (p) => dot(p, n) === 1);
    defMove(f.toLowerCase(), n, (p) => dot(p, n) >= 0); // 두 층(wide)
  });
  defMove('M', NORMAL.L, (p) => p[0] === 0);
  defMove('E', NORMAL.D, (p) => p[1] === 0);
  defMove('S', NORMAL.F, (p) => p[2] === 0);
  defMove('x', NORMAL.R, () => true);
  defMove('y', NORMAL.U, () => true);
  defMove('z', NORMAL.F, () => true);

  // src 배열: 새 상태[j] = 옛 상태[src[j]]
  function quarterPerm(name) {
    const { axis, layerFn } = BASE[name];
    const src = new Array(54);
    for (let i = 0; i < 54; i++) src[i] = i;
    FL.forEach((fl) => {
      if (!layerFn(fl.pos)) return;
      const p2 = rot(fl.pos, axis, -1);
      const n2 = rot(fl.n, axis, -1);
      src[FL_INDEX[key(p2, n2)]] = fl.i;
    });
    return src;
  }
  function composePerm(a, b) { // 먼저 a, 그 다음 b
    const out = new Array(54);
    for (let j = 0; j < 54; j++) out[j] = a[b[j]];
    return out;
  }
  const IDENT = Array.from({ length: 54 }, (_, i) => i);
  const PERM_CACHE = {};

  function parseToken(tok) {
    const m = /^([URFDLBurfdlbMESxyz])(w?)(2|'|2'|’)?$/.exec(tok);
    if (!m) return null;
    let base = m[1];
    if (m[2] === 'w') base = base.toLowerCase();
    const suf = (m[3] || '').replace('’', "'");
    const turns = suf === '' ? 1 : suf === "'" ? 3 : 2; // 시계방향 quarter 횟수
    return { base, turns, token: base + (turns === 1 ? '' : turns === 3 ? "'" : '2') };
  }
  function normalize(tok) { const p = parseToken(tok); return p ? p.token : null; }

  function movePerm(tok) {
    if (PERM_CACHE[tok]) return PERM_CACHE[tok];
    const p = parseToken(tok);
    if (!p) throw new Error('알 수 없는 기호: ' + tok);
    const q = quarterPerm(p.base);
    let perm = IDENT;
    for (let k = 0; k < p.turns; k++) perm = composePerm(perm, q);
    PERM_CACHE[tok] = perm;
    return perm;
  }

  function parseAlg(s) {
    if (Array.isArray(s)) return s.slice();
    const out = [];
    String(s).replace(/[()\[\]]/g, ' ').trim().split(/\s+/).filter(Boolean).forEach((t) => {
      const n = normalize(t);
      if (!n) throw new Error('알 수 없는 기호: ' + t);
      out.push(n);
    });
    return out;
  }
  function algToString(moves) { return moves.join(' '); }

  function applyPerm(state, perm) {
    const out = new Array(54);
    for (let j = 0; j < 54; j++) out[j] = state[perm[j]];
    return out;
  }
  function applyMove(state, tok) { return applyPerm(state, movePerm(tok)); }
  function applyMoves(state, moves) {
    let s = state;
    parseAlg(moves).forEach((t) => { s = applyMove(s, t); });
    return s;
  }
  function seqPerm(moves) {
    let perm = IDENT;
    parseAlg(moves).forEach((t) => { perm = composePerm(perm, movePerm(t)); });
    return perm;
  }

  function invertToken(tok) {
    const p = parseToken(tok);
    return p.base + (p.turns === 1 ? "'" : p.turns === 3 ? '' : '2');
  }
  function invertAlg(moves) { return parseAlg(moves).reverse().map(invertToken); }

  // 연속된 같은 면 이동 합치기 (U U -> U2, U U' -> 없음)
  function simplify(moves) {
    const out = [];
    parseAlg(moves).forEach((t) => {
      const p = parseToken(t);
      const last = out.length ? parseToken(out[out.length - 1]) : null;
      if (last && last.base === p.base) {
        out.pop();
        const turns = (last.turns + p.turns) % 4;
        if (turns) out.push(p.base + (turns === 1 ? '' : turns === 3 ? "'" : '2'));
      } else out.push(p.token);
    });
    return out;
  }

  const SOLVED = [];
  FACES.forEach((f) => { for (let k = 0; k < 9; k++) SOLVED.push(SCHEME[f]); });
  const solved = () => SOLVED.slice();
  const isSolved = (s) => FACES.every((f) => { const b = FACES.indexOf(f) * 9; for (let k = 0; k < 9; k++) if (s[b + k] !== s[b + 4]) return false; return true; });
  const sameState = (a, b) => { for (let i = 0; i < 54; i++) if (a[i] !== b[i]) return false; return true; };

  // ===== 통째 회전(잡는 방향) 24가지 =====
  const ROTATIONS = []; // {seq:[..], perm, up, front}
  (function genRotations() {
    const seen = {};
    const queue = [{ seq: [], perm: IDENT }];
    while (queue.length) {
      const cur = queue.shift();
      const s = applyPerm(SOLVED, cur.perm);
      const k = s[CENTER.U] + s[CENTER.F];
      if (seen[k]) continue;
      seen[k] = true;
      ROTATIONS.push({ seq: cur.seq, perm: cur.perm, up: s[CENTER.U], front: s[CENTER.F] });
      ['y', 'x', 'z', "y'", "x'", 'y2', 'x2', 'z2', "z'"].forEach((m) => {
        queue.push({ seq: cur.seq.concat([m]), perm: composePerm(cur.perm, movePerm(m)) });
      });
    }
  })();
  function findRotation(up, front) {
    return ROTATIONS.find((r) => r.up === up && r.front === front) || null;
  }
  // 기준 방향(흰 위/초록 앞) 상태를 '위=up, 앞=front'로 잡았을 때 보이는 상태로
  function toFrame(abs, frame) {
    const r = findRotation(frame.up, frame.front);
    return applyPerm(abs, r.perm);
  }
  function fromFrame(st, frame) {
    const r = findRotation(frame.up, frame.front);
    return applyPerm(st, invertPermArr(r.perm));
  }
  function invertPermArr(p) { const o = new Array(54); for (let j = 0; j < 54; j++) o[p[j]] = j; return o; }
  function applyInFrame(abs, frame, moves) { return fromFrame(applyMoves(toFrame(abs, frame), moves), frame); }
  function frameCenters(frame) { // {U:'w', R:'r', ...}
    const s = toFrame(SOLVED, frame);
    const o = {}; FACES.forEach((f) => { o[f] = s[CENTER[f]]; }); return o;
  }
  // 한 프레임의 이동 기호를 다른 프레임 기호로 (면 이동만)
  function translateMove(tok, fromF, toF) {
    const p = parseToken(tok);
    const up = p.base.toUpperCase();
    if (!FACES.includes(up)) return tok;
    const c = frameCenters(fromF)[up];
    const tc = frameCenters(toF);
    let face = FACES.find((f) => tc[f] === c);
    if (p.base !== up) face = face.toLowerCase();
    return face + (p.turns === 1 ? '' : p.turns === 3 ? "'" : '2');
  }

  // ===== 조각(cubie) =====
  const CUBIES = []; // {pos, type, fl:[facelet 인덱스..]}
  (function genCubies() {
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const pos = [x, y, z];
      const nz = pos.filter((v) => v !== 0).length;
      if (nz < 2) continue;
      const fl = FL.filter((f) => eq(f.pos, pos)).map((f) => f.i);
      CUBIES.push({ pos, type: nz === 2 ? 'edge' : 'corner', fl });
    }
  })();
  const EDGES = CUBIES.filter((c) => c.type === 'edge');
  const CORNERS = CUBIES.filter((c) => c.type === 'corner');
  const colorKey = (cols) => cols.slice().sort().join('');

  // 상태에서 색 조합으로 조각 찾기 → {cubie, map: {색: facelet}}
  function findPiece(state, colors) {
    const k = colorKey(colors);
    const list = colors.length === 2 ? EDGES : CORNERS;
    for (const cb of list) {
      const cols = cb.fl.map((i) => state[i]);
      if (colorKey(cols) === k) {
        const map = {}; cb.fl.forEach((i) => { map[state[i]] = i; });
        return { cubie: cb, map };
      }
    }
    return null;
  }
  // 해당 위치(조각)가 센터 색과 일치하는지
  function cubieSolved(state, cubie) {
    return cubie.fl.every((i) => state[i] === state[CENTER[FL[i].face]]);
  }
  function cubieAt(pos) { return CUBIES.find((c) => eq(c.pos, pos)); }
  // 조각의 '집' 위치: 그 색들의 센터 쪽
  function homeOf(state, colors) {
    const normals = colors.map((c) => NORMAL[FACES.find((f) => state[CENTER[f]] === c)]);
    let pos = [0, 0, 0]; normals.forEach((n) => { pos = add(pos, n); });
    return cubieAt(pos);
  }

  // ===== 유효성 검사 =====
  const VALID_EDGES = EDGES.map((e) => colorKey(e.fl.map((i) => SOLVED[i])));
  const VALID_CORNERS = CORNERS.map((e) => colorKey(e.fl.map((i) => SOLVED[i])));
  function cornerCycle(cb) { // 바깥에서 보아 시계방향, 위/아래 면 칸부터
    const ud = cb.fl.find((i) => FL[i].face === 'U' || FL[i].face === 'D');
    const others = cb.fl.filter((i) => i !== ud);
    const det = (a, b, c) => dot(a, cross(b, c));
    const [a, b] = others;
    if (det(FL[ud].n, FL[a].n, FL[b].n) === -1) return [ud, a, b];
    return [ud, b, a];
  }
  function edgePrimary(cb) {
    return cb.fl.find((i) => FL[i].face === 'U' || FL[i].face === 'D') ?? cb.fl.find((i) => FL[i].face === 'F' || FL[i].face === 'B');
  }
  function permParity(arr) {
    const seen = new Array(arr.length).fill(false); let par = 0;
    for (let i = 0; i < arr.length; i++) {
      if (seen[i]) continue; let j = i, len = 0;
      while (!seen[j]) { seen[j] = true; j = arr[j]; len++; }
      par += len - 1;
    }
    return par % 2;
  }
  const NAME_KO = { w: '흰색', y: '노란색', g: '초록색', b: '파란색', r: '빨간색', o: '주황색' };
  const SHORT_KO = { w: '흰', y: '노랑', g: '초록', b: '파랑', r: '빨강', o: '주황' };
  function pieceName(colors) { return colors.map((c) => SHORT_KO[c]).join('-'); }

  // 반환: {ok, errors:[{code, msg, cells:[facelet]}]}
  function validate(state) {
    const errors = [];
    if (state.some((c) => !c)) {
      errors.push({ code: 'empty', msg: '아직 색을 고르지 않은 칸이 있어요.', cells: state.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0) });
      return { ok: false, errors };
    }
    const cnt = {}; COLORS.forEach((c) => { cnt[c] = 0; });
    state.forEach((c) => { cnt[c]++; });
    const bad = COLORS.filter((c) => cnt[c] !== 9);
    if (bad.length) {
      errors.push({ code: 'count', msg: '색깔 수가 맞지 않아요: ' + bad.map((c) => `${NAME_KO[c]} ${cnt[c]}칸`).join(', ') + ' (각 색은 9칸이어야 해요).', cells: [] });
    }
    FACES.forEach((f) => { if (state[CENTER[f]] !== SCHEME[f]) errors.push({ code: 'center', msg: '센터 색이 기준과 달라요.', cells: [CENTER[f]] }); });
    if (errors.length) return { ok: false, errors };

    const ep = [], eo = [], cp = [], co = [];
    let pieceErr = false;
    EDGES.forEach((cb) => {
      const cols = cb.fl.map((i) => state[i]);
      const idx = VALID_EDGES.indexOf(colorKey(cols));
      if (idx < 0) { pieceErr = true; errors.push({ code: 'piece', msg: `${cols.map((c) => NAME_KO[c]).join('+')} 조합의 모서리 조각은 존재하지 않아요.`, cells: cb.fl }); return; }
      ep.push(idx);
      const home = EDGES[idx];
      const homePrimColor = SOLVED[edgePrimary(home)];
      eo.push(state[edgePrimary(cb)] === homePrimColor ? 0 : 1);
    });
    CORNERS.forEach((cb) => {
      const cols = cb.fl.map((i) => state[i]);
      const idx = VALID_CORNERS.indexOf(colorKey(cols));
      if (idx < 0) { pieceErr = true; errors.push({ code: 'piece', msg: `${cols.map((c) => NAME_KO[c]).join('+')} 조합의 코너 조각은 존재하지 않아요.`, cells: cb.fl }); return; }
      cp.push(idx);
      const cyc = cornerCycle(cb);
      co.push(cyc.findIndex((i) => state[i] === 'w' || state[i] === 'y'));
    });
    if (pieceErr) return { ok: false, errors };
    if (new Set(ep).size !== 12 || new Set(cp).size !== 8) {
      errors.push({ code: 'dup', msg: '같은 조각이 두 번 들어간 것 같아요.', cells: [] });
      return { ok: false, errors };
    }
    if (co.reduce((a, b) => a + b, 0) % 3 !== 0) errors.push({ code: 'twist', msg: '코너 하나가 비틀린 상태예요. 입력 실수이거나, 큐브 스티커/코너가 돌아가 있을 수 있어요.', cells: [] });
    if (eo.reduce((a, b) => a + b, 0) % 2 !== 0) errors.push({ code: 'flip', msg: '모서리 하나가 뒤집힌 상태예요. 입력 실수이거나, 큐브가 분해됐다 조립된 적이 있을 수 있어요.', cells: [] });
    if (permParity(ep) !== permParity(cp)) errors.push({ code: 'parity', msg: '조각 두 개의 위치가 서로 바뀐 것 같아요. 입력을 한 번 더 확인해 주세요.', cells: [] });
    return { ok: errors.length === 0, errors };
  }

  // 무작위 섞기 (같은 축 연속 금지)
  function randomScramble(n = 20) {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    const axis = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
    const out = []; let last = null, last2 = null;
    while (out.length < n) {
      const f = faces[Math.floor(Math.random() * 6)];
      if (f === last) continue;
      if (last && last2 && axis[f] === axis[last] && axis[f] === axis[last2]) continue;
      if (last && axis[f] === axis[last] && f === last2) continue;
      const suf = ['', "'", '2'][Math.floor(Math.random() * 3)];
      out.push(f + suf); last2 = last; last = f;
    }
    return out;
  }

  CM.cube = {
    FACES, NORMAL, RIGHT, DOWN, SCHEME, COLORS, CENTER, FL, FL_INDEX, CUBIES, EDGES, CORNERS, ROTATIONS,
    NAME_KO, SHORT_KO, add, dot, eq, faceOfNormal, key,
    parseToken, normalize, parseAlg, algToString, movePerm, seqPerm, applyPerm, applyMove, applyMoves,
    invertToken, invertAlg, simplify, solved, isSolved, sameState, findRotation, toFrame, fromFrame,
    applyInFrame, frameCenters, translateMove, findPiece, cubieSolved, cubieAt, homeOf, colorKey,
    validate, pieceName, randomScramble, composePerm, IDENT,
  };
})(typeof window !== 'undefined' ? (window.CM = window.CM || {}) : (globalThis.CM = globalThis.CM || {}));
