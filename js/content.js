/* 한국어 콘텐츠: 이동 설명, 아이콘, 단계 설명, 더 배우기 */
(function (CM) {
  'use strict';

  const MOVE_TEXT = {
    R: '오른쪽 줄을 위로', "R'": '오른쪽 줄을 아래로', R2: '오른쪽 줄을 두 번',
    L: '왼쪽 줄을 아래로', "L'": '왼쪽 줄을 위로', L2: '왼쪽 줄을 두 번',
    U: '윗줄을 왼쪽으로', "U'": '윗줄을 오른쪽으로', U2: '윗줄을 두 번',
    D: '아랫줄을 오른쪽으로', "D'": '아랫줄을 왼쪽으로', D2: '아랫줄을 두 번',
    F: '앞면을 시계 방향으로', "F'": '앞면을 시계 반대 방향으로', F2: '앞면을 두 번',
    B: '뒷면을 (앞에서 볼 때) 시계 반대로', "B'": '뒷면을 (앞에서 볼 때) 시계 방향으로', B2: '뒷면을 두 번',
    M: '가운데 세로줄을 아래로', "M'": '가운데 세로줄을 위로', M2: '가운데 세로줄을 두 번',
    E: '가운데 가로줄을 오른쪽으로', "E'": '가운데 가로줄을 왼쪽으로', E2: '가운데 가로줄을 두 번',
    S: '가운데 앞뒤층을 시계 방향으로', "S'": '가운데 앞뒤층을 시계 반대로', S2: '가운데 앞뒤층을 두 번',
    r: '오른쪽 두 줄을 함께 위로', "r'": '오른쪽 두 줄을 함께 아래로', r2: '오른쪽 두 줄을 두 번',
    l: '왼쪽 두 줄을 함께 아래로', "l'": '왼쪽 두 줄을 함께 위로', l2: '왼쪽 두 줄을 두 번',
    u: '위 두 줄을 함께 왼쪽으로', "u'": '위 두 줄을 함께 오른쪽으로', u2: '위 두 줄을 두 번',
    d: '아래 두 줄을 함께 오른쪽으로', "d'": '아래 두 줄을 함께 왼쪽으로', d2: '아래 두 줄을 두 번',
    f: '앞 두 층을 시계 방향으로', "f'": '앞 두 층을 시계 반대로', f2: '앞 두 층을 두 번',
    b: '뒤 두 층을 (앞에서 볼 때) 시계 반대로', "b'": '뒤 두 층을 (앞에서 볼 때) 시계 방향으로', b2: '뒤 두 층을 두 번',
    x: '큐브 전체를 앞면이 위로 가게 굴려요', "x'": '큐브 전체를 앞면이 아래로 가게 굴려요', x2: '큐브 전체를 위아래 뒤집어요',
    y: '큐브 전체를 왼쪽으로 돌려요', "y'": '큐브 전체를 오른쪽으로 돌려요', y2: '큐브 전체를 반 바퀴 돌려요',
    z: '큐브 전체를 시계 방향으로 기울여요', "z'": '큐브 전체를 시계 반대로 기울여요', z2: '큐브 전체를 반 바퀴 기울여요',
  };
  function moveText(t) { return MOVE_TEXT[t] || t; }

  // 앞에서 본 3x3 그림 + 화살표
  function moveIcon(tok) {
    const p = CM.cube.parseToken(tok);
    if (!p) return '';
    const base = p.base, dbl = p.turns === 2, prime = p.turns === 3;
    const cell = (r, c, on) => `<rect x="${6 + c * 20}" y="${6 + r * 20}" width="18" height="18" rx="4" class="${on ? 'ic-on' : 'ic-off'}"/>`;
    let on = () => false, arrow = '';
    const vArrow = (x, up) => up
      ? `<path d="M${x} 58 V12 M${x - 7} 20 L${x} 11 L${x + 7} 20" class="ic-ar"/>`
      : `<path d="M${x} 10 V56 M${x - 7} 48 L${x} 57 L${x + 7} 48" class="ic-ar"/>`;
    const hArrow = (y, left) => left
      ? `<path d="M58 ${y} H12 M20 ${y - 7} L11 ${y} L20 ${y + 7}" class="ic-ar"/>`
      : `<path d="M10 ${y} H56 M48 ${y - 7} L57 ${y} L48 ${y + 7}" class="ic-ar"/>`;
    const circ = (cw, dashed, small) => {
      const r = small ? 14 : 22;
      const d = cw
        ? `M${36 - r} 36 A${r} ${r} 0 1 1 36 ${36 + r}`
        : `M${36 + r} 36 A${r} ${r} 0 1 0 36 ${36 + r}`;
      const hx = 36, hy = 36 + r;
      const head = cw ? `M${hx + 8} ${hy - 6} L${hx} ${hy} L${hx + 8} ${hy + 6}` : `M${hx - 8} ${hy - 6} L${hx} ${hy} L${hx - 8} ${hy + 6}`;
      return `<path d="${d}" class="ic-ar${dashed ? ' ic-dash' : ''}" fill="none"/><path d="${head}" class="ic-ar"/>`;
    };
    // 기본 방향(시계방향 turn 기준) 설정
    let dirUp = true, dirLeft = true, cw = true;
    switch (base) {
      case 'R': on = (r, c) => c === 2; dirUp = !prime; arrow = vArrow(56, dirUp); break;
      case 'r': on = (r, c) => c >= 1; dirUp = !prime; arrow = vArrow(46, dirUp); break;
      case 'L': on = (r, c) => c === 0; dirUp = prime; arrow = vArrow(16, dirUp); break;
      case 'l': on = (r, c) => c <= 1; dirUp = prime; arrow = vArrow(26, dirUp); break;
      case 'M': on = (r, c) => c === 1; dirUp = prime; arrow = vArrow(36, dirUp); break;
      case 'x': on = () => true; dirUp = !prime; arrow = vArrow(36, dirUp); break;
      case 'U': on = (r) => r === 0; dirLeft = !prime; arrow = hArrow(16, dirLeft); break;
      case 'u': on = (r) => r <= 1; dirLeft = !prime; arrow = hArrow(26, dirLeft); break;
      case 'D': on = (r) => r === 2; dirLeft = prime; arrow = hArrow(56, dirLeft); break;
      case 'd': on = (r) => r >= 1; dirLeft = prime; arrow = hArrow(46, dirLeft); break;
      case 'E': on = (r) => r === 1; dirLeft = prime; arrow = hArrow(36, dirLeft); break;
      case 'y': on = () => true; dirLeft = !prime; arrow = hArrow(36, dirLeft); break;
      case 'F': case 'f': on = () => true; cw = !prime; arrow = circ(cw, false, false); break;
      case 'S': on = (r, c) => r === 1 && c === 1; cw = !prime; arrow = circ(cw, false, true); break;
      case 'z': on = () => true; cw = !prime; arrow = circ(cw, false, false); break;
      case 'B': case 'b': on = () => false; cw = prime; arrow = circ(cw, true, false); break;
      default: break;
    }
    let cells = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells += cell(r, c, on(r, c));
    const badge = dbl ? '<g class="ic-badge"><circle cx="60" cy="12" r="11"/><text x="60" y="16" text-anchor="middle">×2</text></g>' : '';
    return `<svg viewBox="0 0 72 72" class="move-icon" aria-hidden="true">${cells}${arrow}${badge}</svg>`;
  }

  const STAGES = {
    cross: {
      no: 1, name: '흰 십자', short: '십자',
      goal: '흰 센터 둘레에 흰 모서리 4개를 붙여 <b>+ 모양</b>을 만들어요. 모서리의 옆 색이 옆면 센터 색과 맞아야 진짜 완성이에요.',
      hold: '흰 센터가 위를 보게 잡아요.',
      alg: null,
      idea: [
        '큐브의 <b>센터(가운데 칸)는 절대 움직이지 않아요.</b> 그래서 센터 색이 곧 그 면의 색이에요.',
        '흰 십자는 공식 없이 조각 하나씩 옮기면 돼요. 제가 조각마다 어떻게 옮길지 정확히 알려드릴게요.',
      ],
      tip: '흰색 + 옆 색이 모두 센터와 맞아야 해요. 흰색만 위를 보고 옆 색이 다르면 아직 안 된 거예요.',
    },
    corners: {
      no: 2, name: '흰 코너', short: '코너',
      goal: '흰 코너 4개를 넣어서 <b>흰 면 전체와 첫 번째 층</b>을 완성해요.',
      hold: '큐브를 뒤집어 <b>흰 십자가 아래</b>, 노란 센터가 위를 보게 잡아요.',
      alg: "R U R' U'",
      idea: [
        '이번 공식은 딱 하나, <b>R U R\' U\'</b>예요. "오른쪽 위, 윗줄 왼쪽, 오른쪽 아래, 윗줄 오른쪽".',
        '코너를 들어갈 자리 <b>바로 위</b>에 두고, 흰색이 아래를 볼 때까지 이 공식을 반복해요. 1번, 3번, 또는 5번이면 돼요.',
      ],
      tip: '반복하는 중간에 다른 칸이 흐트러져 보여도 정상이에요. 횟수만 지키면 돌아와요.',
    },
    middle: {
      no: 3, name: '2층', short: '2층',
      goal: '가운데 층의 모서리 4개를 넣어서 <b>아래 두 층</b>을 완성해요.',
      hold: '노란 센터가 계속 위를 보게 잡아요.',
      alg: "U R U' R' U' F' U F",
      alg2: "U' L' U L U F U' F'",
      idea: [
        '윗층에서 <b>노란색이 없는 모서리</b>를 찾아요. 그 조각의 앞쪽 색을 앞 센터와 세로로 맞춘 뒤,',
        '윗면 쪽 색이 오른쪽 센터 색이면 <b>오른쪽 공식</b>, 왼쪽 센터 색이면 <b>왼쪽 공식</b>을 해요.',
      ],
      tip: '오른쪽 공식과 왼쪽 공식은 거울처럼 서로 대칭이에요. "피하고, 넣고, 앞면 정리"라고 기억해 보세요.',
    },
    ycross: {
      no: 4, name: '노란 십자', short: '노랑+',
      goal: '윗면에 <b>노란 십자</b>를 만들어요. 옆 색은 아직 신경 안 써도 돼요.',
      hold: '노란 센터가 위를 보게 잡아요.',
      alg: "F R U R' U' F'",
      idea: [
        '윗면을 보면 노란 모서리가 <b>점 → ㄱ자 → 일자 → 십자</b> 순서로 바뀌어요.',
        '공식은 <b>F R U R\' U\' F\'</b> 하나예요. 모양에 맞게 잡는 방향만 바꾸면 돼요.',
      ],
      tip: 'ㄱ자는 뒤쪽과 왼쪽, 일자는 가로로! 잡는 방향이 제일 중요해요.',
    },
    yedges: {
      no: 5, name: '노란 가장자리', short: '가장자리',
      goal: '노란 모서리들의 <b>옆면 색</b>을 센터 색과 맞춰요.',
      hold: '노란 센터가 위를 보게 잡아요.',
      alg: "R U R' U R U2 R' U",
      idea: [
        '먼저 윗층만 돌려서 옆 색이 맞는 모서리가 <b>2개</b> 이상 되게 해요.',
        '맞는 두 개의 위치에 따라 잡는 방향을 정하고 <b>R U R\' U R U2 R\' U</b>를 해요.',
      ],
      tip: '이 공식은 "오른쪽 위, 윗줄 왼쪽, 오른쪽 아래, 윗줄 왼쪽, 오른쪽 위, 윗줄 두 번, 오른쪽 아래, 윗줄 왼쪽" — 리듬처럼 외워 보세요.',
    },
    ycorners: {
      no: 6, name: '노란 코너 자리', short: '코너자리',
      goal: '노란 코너 4개를 <b>제자리</b>로 보내요. 이 단계에선 방향(비틀림)은 틀려도 괜찮아요.',
      hold: '노란 센터가 위를 보게 잡아요.',
      alg: "U R U' L' U R' U' L",
      idea: [
        '코너의 세 색이 둘러싼 세 센터 색과 같으면 <b>제자리</b>예요 (방향은 무시).',
        '제자리 코너를 <b>앞-오른쪽 위</b>에 두고 <b>U R U\' L\' U R\' U\' L</b>을 하면 나머지 세 코너가 돌아가며 자리를 바꿔요.',
      ],
      tip: '한 번에 안 되면 같은 방향으로 한 번 더 하면 돼요.',
    },
    twist: {
      no: 7, name: '코너 비틀기', short: '비틀기',
      goal: '코너를 비틀어 <b>노란색이 모두 위</b>를 보게 하면 완성이에요!',
      hold: '노란 센터가 위를 보게 잡아요.',
      alg: "R' D' R D",
      idea: [
        '비틀 코너를 <b>앞-오른쪽 위</b>에 두고 <b>R\' D\' R D</b>를 노란색이 위를 볼 때까지 반복해요 (2번 또는 4번).',
        '다음 코너는 큐브를 통째로 돌리지 말고 <b>윗층(U)만</b> 돌려서 앞-오른쪽 위로 가져와요.',
      ],
      tip: '중간에 아래 두 층이 엉망으로 보이는 게 정상이에요! 끝까지 하면 저절로 돌아와요. 겁먹지 말고 계속!',
    },
  };

  const PRAISE = ['완벽해요!', '아주 잘하셨어요!', '좋아요, 정확해요!', '훌륭해요!', '손이 점점 빨라지시네요!', '딱 맞았어요!'];
  const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  // ===== 더 배우기 =====
  // lock: 0=항상, 1=첫 완주 후, 2=초보법 마스터 후
  const EXPLORE = [
    {
      id: 'notation', lock: 0, title: '기호 완전 정복',
      blurb: 'R, U, F 말고도 두 층(r), 가운데 줄(M), 통째 회전(x y z)까지. 다른 풀이법 영상을 볼 때 꼭 필요해요.',
      body: [
        '<b>면 기호</b>: R(오른쪽) L(왼쪽) U(위) D(아래) F(앞) B(뒤). 그 면을 정면으로 바라봤을 때 <b>시계 방향</b>이 기본이에요.',
        '<b>\'(프라임)</b>은 반대 방향, <b>2</b>는 두 번(반 바퀴).',
        '<b>소문자(r, u…) 또는 Rw</b>: 바깥 줄과 가운데 줄을 함께 돌려요.',
        '<b>M, E, S</b>: 가운데 줄. M은 L 방향, E는 D 방향, S는 F 방향이에요.',
        '<b>x, y, z</b>: 큐브 전체를 돌려 잡는 방향을 바꿔요. x는 R 방향, y는 U 방향, z는 F 방향.',
      ],
      algs: [
        { name: '두 층 함께', alg: "r U r'" }, { name: '가운데 줄', alg: "M' U2 M U2" },
        { name: '통째 회전', alg: "x y z" },
      ],
    },
    {
      id: 'upgrade', lock: 1, title: '초보법 업그레이드',
      blurb: '같은 7단계를 더 적은 수로. 지금 방법에서 한 걸음만 나아가요.',
      body: [
        '<b>흰 십자를 아래에서 만들기</b>: 고수들은 처음부터 흰 십자를 아래에 만들어요. 큐브를 뒤집는 시간이 줄고, 다음 단계 조각이 잘 보여요.',
        '<b>노란 십자 지름길</b>: ㄱ자일 때 <b>F U R U\' R\' F\'</b>를 쓰면 한 번에 십자가 돼요.',
        '<b>코너 넣기 지름길</b>: 흰색이 오른쪽을 보면 <b>R U R\'</b> 3수, 앞을 보면 <b>F\' U\' F</b> 3수로 끝나요.',
      ],
      algs: [
        { name: 'ㄱ자 → 바로 십자', alg: "F U R U' R' F'" },
        { name: '코너 3수 (흰색 오른쪽)', alg: "R U R'" },
        { name: '코너 3수 (흰색 앞)', alg: "F' U' F" },
      ],
    },
    {
      id: '4lll', lock: 1, title: '4-Look 마지막 층',
      blurb: '노란 층을 공식 4번 안에 끝내요. CFOP로 가는 첫 관문이에요.',
      body: [
        '초보법의 노란 층 4단계를 <b>2-Look OLL</b>(노란 면 맞추기 2번) + <b>2-Look PLL</b>(옆면 맞추기 2번)으로 바꿔요.',
        '먼저 지금 아는 노란 십자 공식을 쓰고, 그다음 아래 코너 공식 7개 중 하나로 노란 면을 한 번에 완성해요.',
        '공식을 누르면 그 상황을 만든 다음 풀이를 보여드려요.',
      ],
      algs: [
        { name: 'OLL · Sune (물고기)', alg: "R U R' U R U2 R'" },
        { name: 'OLL · Anti-Sune', alg: "R U2 R' U' R U' R'" },
        { name: 'OLL · H', alg: "F R U R' U' R U R' U' R U R' U' F'" },
        { name: 'OLL · Pi', alg: "R U2 R2 U' R2 U' R2 U2 R" },
        { name: 'OLL · Headlights', alg: "R2 D R' U2 R D' R' U2 R'" },
        { name: 'OLL · T', alg: "r U R' U' r' F R F'" },
        { name: 'OLL · Bowtie', alg: "F' r U R' U' r' F R" },
        { name: 'PLL · T-perm (코너)', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
        { name: 'PLL · Y-perm (대각 코너)', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
        { name: 'PLL · Ua (모서리)', alg: "R U' R U R U R U' R' U' R2" },
        { name: 'PLL · Ub (모서리)', alg: "R2 U R U R' U' R' U' R' U R'" },
        { name: 'PLL · H (모서리)', alg: "M2 U M2 U2 M2 U M2" },
        { name: 'PLL · Z (모서리)', alg: "M' U M2 U M2 U M' U2 M2 U'" },
      ],
    },
    {
      id: 'f2l', lock: 2, title: 'F2L 입문',
      blurb: '흰 코너와 2층 모서리를 짝지어 한 번에 넣어요. CFOP의 핵심이에요.',
      body: [
        'F2L(First Two Layers)은 <b>코너와 그 옆 모서리를 짝(pair)</b>으로 만들어 한 번에 넣는 방법이에요.',
        '초보법의 2단계(흰 코너) + 3단계(2층)를 하나로 합쳐서, 수가 절반 가까이 줄어들어요.',
        '기본 원리: 짝을 윗층에서 만들고 → 빈 자리 위로 옮기고 → 3~4수로 넣어요. 아래 기본 4가지부터 익혀 보세요.',
      ],
      algs: [
        { name: '붙은 짝 오른쪽으로', alg: "R U R'" },
        { name: '붙은 짝 앞으로', alg: "F' U' F" },
        { name: '떨어진 짝 (오른쪽)', alg: "U R U' R'" },
        { name: '떨어진 짝 (앞)', alg: "U' F' U F" },
      ],
    },
    {
      id: 'methods', lock: 2, title: '세계의 풀이법 지도',
      blurb: 'CFOP, Roux, ZZ… 지금 배운 초보법이 어디에 연결되는지 알아봐요.',
      body: [
        '<b>CFOP (프리드리히)</b>: 십자 → F2L → OLL → PLL. 가장 많이 쓰는 스피드큐빙 방법이에요. 지금 초보법에서 가장 자연스럽게 이어져요.',
        '<b>Roux (루)</b>: 왼쪽·오른쪽에 1×2×3 블록을 만들고 마지막에 M 줄로 정리해요. 수가 적고 M 기호를 많이 써요.',
        '<b>ZZ</b>: 처음에 모서리 방향을 모두 정리(EO)해서 이후엔 R, U, L만 돌려요. 손이 편해요.',
        '<b>Petrus</b>: 2×2×2 → 2×2×3 블록을 키워 가는 방법. 블록을 만드는 감각을 기르기 좋아요.',
        '추천 순서: 초보법 완주 → 4-Look 마지막 층 → F2L → 전체 OLL/PLL. 다른 방법이 궁금하면 Roux를 구경해 보세요!',
      ],
      algs: [],
    },
  ];

  CM.content = { moveText, moveIcon, STAGES, praise, EXPLORE };
})(typeof window !== 'undefined' ? window.CM : globalThis.CM);
