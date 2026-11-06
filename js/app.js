/* 큐브 코치 앱: 장면(scene) 흐름과 코치 대화 */
(function (CM) {
  'use strict';
  const C = CM.cube, S = CM.solver, D = CM.diagnose, T = CM.content, store = CM.store;
  const $ = (sel, root = document) => root.querySelector(sel);
  const stageEl = $('#stage'), chatEl = $('#chat'), actEl = $('#actions'), railEl = $('#rail');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const app = {
    state: null,        // 마지막으로 확인된 큐브 상태(기준 방향)
    prevHold: null,     // 직전 단계에서 잡은 방향
    hadMistake: false,  // 이번 단계에서 실수했는지
    player: null,
  };

  // ---------- 작은 도우미 ----------
  function josa(word, pair) {
    const plain = word.replace(/<[^>]+>/g, '');
    const c = plain.charCodeAt(plain.length - 1);
    const [a, b] = pair.split('/');
    if (!(c >= 0xac00 && c <= 0xd7a3)) return word + a;
    const jong = (c - 0xac00) % 28;
    if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? b : a);
    return word + (jong ? a : b);
  }
  const dot = (c) => `<span class="dot c-${c}"></span>`;
  const KO = C.SHORT_KO;
  const stageMeta = (id) => T.STAGES[id];
  const stageLabel = (id) => `${stageMeta(id).no}단계 ${stageMeta(id).name}`;
  const holdHTML = (fr) => `${dot(fr.up)} <b>${KO[fr.up]}</b> 센터가 위, ${dot(fr.front)} <b>${KO[fr.front]}</b> 센터가 앞`;
  const sameHold = (a, b) => a && b && a.up === b.up && a.front === b.front;
  const algHTML = (a) => `<span class="alg-chip">${a}</span>`;
  const starHTML = (n) => `<span class="stars" aria-label="별 ${n}개">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;

  // ---------- 코치 대화 ----------
  function clearChat() { chatEl.innerHTML = ''; }
  function say(lines, opts = {}) {
    lines = [].concat(lines).filter(Boolean);
    const start = chatEl.querySelectorAll('.msg').length;
    if (!chatEl.querySelector('.coach-name')) {
      const n = document.createElement('div'); n.className = 'coach-name'; n.textContent = '큐브 코치'; chatEl.appendChild(n);
    }
    lines.forEach((html, i) => {
      const m = document.createElement('div');
      const prevIsCoach = chatEl.lastElementChild && chatEl.lastElementChild.classList.contains('msg') && !chatEl.lastElementChild.classList.contains('user');
      m.className = 'msg' + (prevIsCoach ? ' follow' : '') + (opts.tone ? ' tone-' + opts.tone : '');
      m.style.animationDelay = reduceMotion ? '0s' : `${(i + (start ? 0 : 0)) * 0.16}s`;
      m.innerHTML = `<div class="avatar" aria-hidden="true">${'<i></i>'.repeat(9)}</div><div class="bubble">${[].concat(html).map((p) => `<p>${p}</p>`).join('')}</div>`;
      chatEl.appendChild(m);
    });
  }
  function userSays(text) {
    if (!text) return;
    const m = document.createElement('div');
    m.className = 'msg user';
    m.innerHTML = `<div class="bubble"><p>${text}</p></div>`;
    chatEl.appendChild(m);
  }
  // 새 장면: 대화창을 비우고 사용자의 선택을 첫 줄에 남긴다
  function scene(echo) {
    if (app.player) app.player.stop();
    app.player = null;
    clearChat();
    if (echo) userSays(echo);
    stageEl.innerHTML = '';
    setActions([]);
    closeMenu();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function setActions(list) {
    actEl.innerHTML = '';
    list.filter(Boolean).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.kind || '');
      b.innerHTML = a.label;
      if (a.disabled) b.disabled = true;
      if (a.id) b.id = a.id;
      b.addEventListener('click', () => a.onClick(a.echo === false ? null : a.label.replace(/<[^>]+>/g, '')));
      actEl.appendChild(b);
    });
  }

  // ---------- 상단 단계 표시 ----------
  function renderRail(current) {
    railEl.innerHTML = '';
    const ci = current ? S.stageIndex(current) : -1;
    S.STAGES.forEach((id, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const st = store.stars(id);
      b.className = (i === ci ? 'is-now' : '') + (ci > i || (ci < 0 && st > 0) ? ' is-done' : '');
      b.innerHTML = `<span>${i + 1}</span><span class="r-name">${stageMeta(id).name}</span>`;
      b.setAttribute('aria-label', `${stageLabel(id)} · 별 ${st}개`);
      b.addEventListener('click', () => go('progress'));
      li.appendChild(b);
      railEl.appendChild(li);
    });
    const now = railEl.querySelector('.is-now');
    if (now && now.scrollIntoView) now.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ---------- 목표 그림 ----------
  function goalState(stage) {
    const s = C.solved();
    const upto = S.stageIndex(stage);
    const keep = new Array(54).fill(false);
    C.FACES.forEach((f) => { keep[C.CENTER[f]] = true; });
    C.CUBIES.forEach((cb) => {
      const y = cb.pos[1];
      const add = (cond, fl = cb.fl) => { if (cond) fl.forEach((i) => { keep[i] = true; }); };
      add(upto >= 0 && y === 1 && cb.type === 'edge');
      add(upto >= 1 && y === 1 && cb.type === 'corner');
      add(upto >= 2 && y === 0);
      add(upto >= 3 && y === -1 && cb.type === 'edge', cb.fl.filter((i) => C.FL[i].face === 'D'));
      add(upto >= 4 && y === -1 && cb.type === 'edge');
      add(upto >= 5 && y === -1 && cb.type === 'corner');
    });
    return s.map((c, i) => (keep[i] ? c : ''));
  }
  const stageHold = (stage) => (stage === 'cross' ? { up: 'w', front: 'g' } : { up: 'y', front: 'g' });

  function cubeBox(host, state, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'mat';
    wrap.innerHTML = '<div class="cv"></div><div class="cv-tip">드래그로 돌려 보기 · 두 번 탭하면 원위치</div>';
    host.appendChild(wrap);
    const cv = wrap.querySelector('.cv');
    if (opts.small) cv.classList.add('small');
    const view = new CM.CubeView(cv);
    view.setState(state);
    return view;
  }

  // ---------- 이동 플레이어 ----------
  class Player {
    constructor(host, step, idx = 0, opts = {}) {
      this.step = step; this.opts = opts; this.idx = idx; this.auto = false; this.alive = true;
      this.moves = step.moves;
      // 각 수가 속한 구간
      this.segOf = [];
      (step.segments || [{ label: '', moves: step.moves }]).forEach((g, gi) => g.moves.forEach(() => this.segOf.push(gi)));
      this.segs = step.segments || [{ label: '', moves: step.moves }];
      host.insertAdjacentHTML('beforeend', `
        <div class="hold${opts.holdChanged ? ' changed' : ''}"><span class="lbl">잡는 방향</span><span class="pair">${holdHTML(step.hold)}</span></div>
        <div class="pl-cube"></div>
        <div class="card move-card" aria-live="polite">
          <div class="mc-icon"></div>
          <div><div class="move-seg"></div><div class="move-tok"></div><div class="move-txt"></div></div>
          <div class="move-count"></div>
        </div>
        <div class="controls">
          <button type="button" class="btn pl-prev" aria-label="한 수 되돌리기">◀ 이전</button>
          <button type="button" class="btn primary pl-next">다음 수 ▶</button>
          <button type="button" class="btn pl-reset" aria-label="처음부터">↺ 처음</button>
        </div>
        <div class="ctl-row">
          <button type="button" class="toggle pl-auto" aria-pressed="false">자동 재생</button>
          <button type="button" class="toggle pl-speed"></button>
          ${step.focus ? '<button type="button" class="toggle pl-hl" aria-pressed="true">조각 강조</button>' : ''}
        </div>
        <div class="card"><div class="strip"></div></div>`);
      this.root = host;
      this.view = cubeBox($('.pl-cube', host), C.toFrame(step.start, step.hold));
      this.view.setState(C.applyMoves(C.toFrame(step.start, step.hold), this.moves.slice(0, idx)));
      if (step.focus) this.view.setHighlight(step.focus);
      $('.pl-next', host).addEventListener('click', () => this.next());
      $('.pl-prev', host).addEventListener('click', () => this.prev());
      $('.pl-reset', host).addEventListener('click', () => this.jump(0));
      $('.pl-auto', host).addEventListener('click', (e) => this.toggleAuto(e.currentTarget));
      const sp = $('.pl-speed', host);
      const SPEEDS = [[0.6, '느리게'], [1, '보통'], [1.7, '빠르게']];
      const showSpeed = () => { const cur = SPEEDS.find((x) => x[0] === store.data.settings.speed) || SPEEDS[1]; sp.textContent = `속도: ${cur[1]}`; };
      sp.addEventListener('click', () => {
        const i = SPEEDS.findIndex((x) => x[0] === store.data.settings.speed);
        store.data.settings.speed = SPEEDS[(i + 1) % SPEEDS.length][0]; store.save(); showSpeed();
      });
      showSpeed();
      const hl = $('.pl-hl', host);
      if (hl) hl.addEventListener('click', () => { const on = hl.getAttribute('aria-pressed') !== 'true'; hl.setAttribute('aria-pressed', on); this.view.setHighlight(on ? step.focus : null); });
      this.buildStrip();
      this.update();
    }
    get ms() { return Math.round(480 / (store.data.settings.speed || 1)); }
    buildStrip() {
      const strip = $('.strip', this.root);
      strip.innerHTML = '';
      let k = 0;
      this.segs.forEach((g) => {
        if (this.segs.length > 1 || g.label) { const l = document.createElement('div'); l.className = 'seg-label'; l.textContent = g.label; strip.appendChild(l); }
        g.moves.forEach((m) => {
          const i = k++;
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = m; b.dataset.i = i;
          b.setAttribute('aria-label', `${i + 1}번째 수 ${m}로 이동`);
          b.addEventListener('click', () => this.jump(i));
          strip.appendChild(b);
        });
      });
    }
    update() {
      const n = this.moves.length, i = this.idx;
      const card = $('.move-card', this.root);
      const finished = i >= n;
      card.classList.toggle('finished', finished);
      if (finished) {
        $('.mc-icon', this.root).innerHTML = '';
        $('.move-tok', this.root).textContent = '끝!';
        $('.move-txt', this.root).textContent = this.opts.endText || '실제 큐브도 화면과 똑같이 됐나요?';
        $('.move-seg', this.root).textContent = '';
      } else {
        const m = this.moves[i];
        const g = this.segs[this.segOf[i]];
        $('.mc-icon', this.root).innerHTML = T.moveIcon(m);
        $('.move-tok', this.root).textContent = m;
        $('.move-txt', this.root).textContent = T.moveText(m);
        $('.move-seg', this.root).textContent = (g.label || '') + (g.note ? ` · ${g.note}` : '');
      }
      $('.move-count', this.root).textContent = `${Math.min(i + (finished ? 0 : 1), n)} / ${n}`;
      [...$('.strip', this.root).querySelectorAll('button')].forEach((b) => {
        const j = +b.dataset.i;
        b.className = j < i ? 'done' : j === i ? 'cur' : '';
      });
      $('.pl-prev', this.root).disabled = i === 0;
      $('.pl-next', this.root).disabled = finished;
      $('.pl-next', this.root).textContent = i === 0 ? '첫 수 보기 ▶' : '다음 수 ▶';
      if (this.opts.onProgress) this.opts.onProgress(i, finished);
    }
    async next() {
      if (this.view.busy || this.idx >= this.moves.length) return;
      if (this.idx === 0 && !this.auto) { const hb = $('.hold', this.root); const r = hb.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.5) hb.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
      await this.view.animate(this.moves[this.idx], this.ms);
      if (!this.alive) return;
      this.idx++; this.update();
    }
    async prev() {
      if (this.view.busy || this.idx === 0) return;
      this.stopAuto();
      await this.view.animate(C.invertToken(this.moves[this.idx - 1]), this.ms);
      if (!this.alive) return;
      this.idx--; this.update();
    }
    jump(i) {
      if (this.view.busy) return;
      this.stopAuto();
      this.idx = i;
      this.view.setState(C.applyMoves(C.toFrame(this.step.start, this.step.hold), this.moves.slice(0, i)));
      this.update();
    }
    async toggleAuto(btn) {
      this.auto = !this.auto;
      btn.setAttribute('aria-pressed', this.auto);
      btn.textContent = this.auto ? '자동 재생 멈춤' : '자동 재생';
      while (this.auto && this.alive && this.idx < this.moves.length) {
        await this.next();
        await new Promise((r) => setTimeout(r, Math.round(450 / (store.data.settings.speed || 1))));
      }
      if (this.alive && this.auto) this.toggleAuto(btn);
    }
    stopAuto() { if (this.auto) { const b = $('.pl-auto', this.root); this.auto = false; if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '자동 재생'; } } }
    stop() { this.alive = false; this.auto = false; }
  }

  // ---------- 효과 ----------
  function confetti() {
    if (reduceMotion) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['w', 'y', 'g', 'b', 'r', 'o'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = `var(--st-${cols[i % 6]})`;
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.transform = `rotate(${Math.random() * 90}deg)`;
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3400);
  }

  // =====================================================================
  //  장면들
  // =====================================================================

  // ---------- 홈 ----------
  function home(echo) {
    scene(echo);
    renderRail(null);
    const d = store.data;
    const sess = d.session;
    const totalDone = S.STAGES.reduce((a, s) => a + d.stages[s].done, 0);
    stageEl.insertAdjacentHTML('beforeend', `
      <div class="hero"><span class="eyebrow">3×3 초보 풀이법 · 7단계</span><h1>옆에서 같이 맞춰 주는<br>큐브 코치</h1></div>
      <div class="home-cube"></div>
      <div class="stats">
        <div class="stat"><b>${d.solves}</b><span>완주</span></div>
        <div class="stat"><b>${S.STAGES.filter((s) => store.stars(s) >= 1).length}/7</b><span>배운 단계</span></div>
        <div class="stat"><b>${S.STAGES.filter((s) => store.stars(s) >= 2).length}/7</b><span>익숙한 단계</span></div>
      </div>`);
    const v = cubeBox($('.home-cube', stageEl), sess && sess.state ? sess.state : C.applyMoves(C.solved(), "R U R' U' F2 D L'"));
    if (!reduceMotion) {
      let k = 0; const seq = ['y', 'y', 'y', 'y'];
      const spin = () => { if (!document.body.contains(v.host)) return; v.animate(seq[k++ % 4], 1400).then(() => setTimeout(spin, 900)); };
      setTimeout(spin, 800);
    }
    if (sess && sess.scene) {
      const where = sess.scene === 'scramble' ? '지난번엔 큐브를 <b>섞는 중</b>이었어요.'
        : `지난번엔 <b>${stageLabel(sess.stage)}</b>${sess.step ? ` — "${sess.step.title}"` : ''}${sess.scene === 'verify' ? '의 결과 확인' : ''}까지 하셨어요.`;
      say([
        '다시 오셨네요, 반가워요! 😊',
        `${where} 큐브를 그때 모습 그대로 두셨다면 바로 이어서 할 수 있어요.`,
        '큐브를 그사이 만지셨다면 새로 입력해 주시면 돼요.',
      ]);
      setActions([
        { label: '이어서 하기', kind: 'primary', onClick: resume },
        { label: '지금 큐브 새로 입력', onClick: (e) => startNew(e) },
      ]);
    } else if (!d.introSeen && totalDone === 0) {
      say([
        '안녕하세요! 저는 <b>큐브 코치</b>예요. 처음 큐브를 잡아 보셔도 괜찮아요. 처음부터 끝까지 옆에서 한 단계씩 같이 맞춰 드릴게요.',
        '이렇게 진행해요: ① 지금 큐브 색을 탭으로 알려주시면 → ② 상태를 쉽게 설명드리고 → ③ 어떻게 잡을지 알려드린 뒤 → ④ 화면의 3D 큐브를 보며 한 수씩 같이 돌리고 → ⑤ 결과를 다시 확인해요.',
        '틀려도 걱정 마세요. 뭐가 잘못됐는지 찾아서 되돌리는 방법까지 알려드릴게요. 배운 곳까지는 자동으로 기억해요.',
      ]);
      setActions([
        { label: '큐브 맞추기 시작', kind: 'primary', onClick: (e) => { d.introSeen = true; store.save(); startNew(e); } },
        { label: '기호부터 배우기 (3분)', onClick: (e) => { d.introSeen = true; store.save(); basics(e); } },
      ]);
    } else {
      const lvl = store.unlockLevel();
      say([
        d.solves ? `벌써 <b>${d.solves}번</b> 완주하셨어요! 오늘도 같이 해볼까요?` : '오늘도 같이 맞춰 볼까요?',
        lvl >= 2 ? '초보법은 이제 마스터하셨어요 🎓 <b>더 배우기</b>에서 다른 풀이법도 구경해 보세요.' : lvl >= 1 ? '한 번 완주하셨으니 <b>더 배우기</b>에 새 내용이 열렸어요.' : '',
      ]);
      setActions([
        { label: '큐브 맞추기 시작', kind: 'primary', onClick: startNew },
        { label: '더 배우기', onClick: (e) => explore(e) },
      ]);
    }
  }

  function resume() {
    const sess = store.data.session;
    if (!sess) return home();
    app.state = sess.state; app.prevHold = sess.prevHold || null; app.hadMistake = !!sess.hadMistake;
    switch (sess.scene) {
      case 'intro': return stageIntro(sess.stage, '이어서 할게요');
      case 'step': return stepScene(sess.step, sess.idx || 0, { echo: '이어서 할게요' });
      case 'verify': return verifyScene(sess.step, '이어서 할게요');
      case 'solo': return soloScene(sess.stage, '이어서 할게요');
      case 'scramble': return scrambleScene(sess.step, '이어서 할게요');
      default: return home();
    }
  }
  function saveSession(extra) {
    store.setSession(Object.assign({ state: app.state, prevHold: app.prevHold, hadMistake: app.hadMistake }, extra));
  }

  // ---------- 새로 시작 ----------
  function startNew(echo) {
    scene(echo);
    renderRail(null);
    say([
      '좋아요! 먼저 지금 큐브가 어떤 모습인지 알려주세요.',
      '큐브가 섞여 있다면 <b>색을 입력</b>해 주세요. 6면 × 9칸을 탭으로 칠하면 돼요 (2~3분 걸려요).',
      '다 맞춰진 큐브가 있다면 제가 <b>섞는 순서</b>를 알려드릴게요. 그러면 입력 없이 바로 시작할 수 있어요.',
    ]);
    cubeBox(stageEl, C.solved().map((c, i) => (i % 9 === 4 ? c : '')));
    setActions([
      { label: '내 큐브 색 입력하기', kind: 'primary', onClick: (e) => inputScene(e) },
      { label: '맞춰진 큐브를 섞어 주세요', onClick: (e) => scrambleScene(null, e) },
    ]);
  }

  // ---------- 처음 상태 입력 ----------
  function inputScene(echo, prefill, flags) {
    scene(echo);
    renderRail(null);
    say([
      '큐브를 <b>흰 센터가 위, 초록 센터가 앞</b>을 보게 잡아 주세요. 센터(가운데 칸)는 움직이지 않으니 기준으로 쓰기 좋아요.',
      '아래에서 색을 고르고 칸을 누르면 칠해져요. 면마다 잡는 방법을 위에 적어 뒀어요. 칸 둘레의 색 막대는 그쪽에 있어야 할 센터 색이에요.',
    ]);
    const box = document.createElement('div'); stageEl.appendChild(box);
    new CM.InputEditor(box, { mode: 'initial', prefill, flags, onDone: (st) => checkInitial(st) });
    setActions([{ label: '처음으로', onClick: home }]);
  }
  function checkInitial(st) {
    const v = C.validate(st);
    if (!v.ok) {
      say(['앗, 입력에서 이상한 점이 보여요:'].concat(v.errors.map((e) => '• ' + e.msg)).concat(['실제 큐브를 보면서 한 번만 더 확인해 주세요. 면을 잡는 방향(흰 위·초록 앞)이 맞는지도 봐 주세요.']), { tone: 'warn' });
      const cells = v.errors.flatMap((e) => e.cells || []);
      setActions([
        { label: '입력 고치기', kind: 'primary', onClick: (e) => inputScene(e, st, cells) },
        { label: '처음으로', onClick: home },
      ]);
      chatEl.lastElementChild.scrollIntoView({ block: 'nearest' });
      return;
    }
    app.prevHold = null; app.hadMistake = false;
    analyze(st, '입력 끝!');
  }

  // ---------- 상태 분석 ----------
  function analyze(st, echo) {
    app.state = st;
    scene(echo);
    const stage = S.currentStage(st);
    renderRail(stage === 'done' ? null : stage);
    const ch = S.stageChecks(st);
    cubeBox(stageEl, st);
    const grid = document.createElement('div');
    grid.className = 'checks';
    grid.innerHTML = S.STAGES.map((id) => {
      const okUntil = S.stageIndex(stage) > S.stageIndex(id);
      return `<div class="check${okUntil ? ' ok' : ''}"><span>${stageMeta(id).no}. ${stageMeta(id).name}</span><span>${okUntil ? '완성' : id === stage ? `${ch[id].n}/4` : '—'}</span></div>`;
    }).join('');
    stageEl.appendChild(grid);
    if (stage === 'done') {
      say(['와, 이 큐브는 이미 <b>다 맞춰져</b> 있어요! 🎉', '연습하려면 제가 섞는 순서를 알려드릴게요.'], { tone: 'good' });
      setActions([{ label: '섞어서 연습하기', kind: 'primary', onClick: (e) => scrambleScene(null, e) }, { label: '처음으로', onClick: home }]);
      store.setSession(null);
      return;
    }
    const doneStages = S.STAGES.slice(0, S.stageIndex(stage)).map((id) => stageMeta(id).name);
    const lines = ['큐브 상태를 확인했어요! 👀'];
    if (doneStages.length) lines.push(`${josa(`<b>${doneStages.join(', ')}</b>`, '은/는')} 이미 잘 돼 있어요. 그 부분은 건너뛸게요.`);
    else lines.push('아직 완성된 단계는 없어요. 섞인 큐브라면 당연해요 — 처음부터 같이 해요!');
    lines.push(`지금 할 차례는 <b>${stageLabel(stage)}</b>이에요.`);
    const partial = ch[stage].n;
    const partText = {
      cross: `흰 모서리 4개 중 <b>${partial}개</b>는 이미 제자리에 있어요.`,
      corners: `흰 코너 4개 중 <b>${partial}개</b>는 이미 제자리에 있어요.`,
      middle: `2층 모서리 4개 중 <b>${partial}개</b>는 이미 맞아요.`,
      ycross: `노란 모서리 중 노란색이 노란 면 쪽을 보는 게 <b>${partial}개</b>예요.`,
      yedges: `노란 모서리 중 옆 색까지 맞는 게 <b>${partial}개</b>예요.`,
      ycorners: `노란 코너 중 제자리에 있는 게 <b>${partial}개</b>예요.`,
      twist: `노란 코너 중 방향까지 맞는 게 <b>${partial}개</b>예요.`,
    }[stage];
    if (partial) lines.push(partText);
    say(lines);
    setActions([{ label: `${stageMeta(stage).name} 시작하기`, kind: 'primary', onClick: (e) => stageIntro(stage, e) }]);
  }

  // ---------- 단계 소개 ----------
  function stageIntro(stage, echo) {
    scene(echo);
    renderRail(stage);
    saveSession({ scene: 'intro', stage });
    const m = stageMeta(stage);
    const seen = store.stars(stage) > 0;
    stageEl.insertAdjacentHTML('beforeend', `<div class="hero"><span class="eyebrow">${m.no}단계 / 7 · 목표 모습</span><h2>${m.name}</h2></div>`);
    const goal = goalState(stage);
    cubeBox(stageEl, C.toFrame(goal, stageHold(stage)));
    if (m.alg) stageEl.insertAdjacentHTML('beforeend', `<div class="card"><div class="eyebrow">이 단계 공식</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${algHTML(m.alg)}${m.alg2 ? algHTML(m.alg2) : ''}</div></div>`);
    const lines = [];
    if (seen) lines.push(`다시 만난 <b>${m.name}</b> 단계예요! 지난번 기억 나시죠? ${starHTML(store.stars(stage))}`);
    else lines.push(`<b>${m.no}단계: ${m.name}</b>`);
    lines.push(m.goal);
    lines.push('잡는 방향: ' + m.hold);
    if (!seen) m.idea.forEach((l) => lines.push(l));
    lines.push('💡 ' + m.tip);
    say(lines);
    const canSolo = store.stars(stage) >= 2;
    setActions([
      { label: '같이 해볼게요', kind: 'primary', onClick: (e) => beginStage(stage, e) },
      canSolo ? { label: '혼자 해볼게요', onClick: (e) => soloScene(stage, e) } : null,
      m.alg ? { label: '공식 먼저 구경하기', onClick: (e) => algPreview(stage, e) } : null,
    ]);
  }

  function algPreview(stage, echo) {
    scene(echo);
    const m = stageMeta(stage);
    const alg = C.parseAlg(m.alg);
    const hold = stageHold(stage);
    const step = { hold, moves: alg, start: C.fromFrame(C.toFrame(C.solved(), hold), hold), segments: [{ label: '공식 ' + m.alg, moves: alg }] };
    say([`<b>${m.alg}</b>를 천천히 보여드릴게요. 실제 큐브로 따라 해 봐도 괜찮아요 — 공식을 6번 반복하면 보통 원래대로 돌아와요.`, '화살표 그림은 <b>앞에서 본 모습</b>이에요. 색칠된 줄이 움직이는 줄이에요.']);
    app.player = new Player(stageEl, step, 0, { endText: '이게 이 단계의 공식이에요!' });
    setActions([{ label: '이제 같이 해볼게요', kind: 'primary', onClick: (e) => beginStage(stage, e) }]);
  }

  function beginStage(stage, echo) {
    const step = S.nextStep(app.state, app.prevHold && app.prevHold.front);
    if (!step) return analyze(app.state, echo);
    stepScene(step, 0, { echo });
  }

  // ---------- 한 단계 따라하기 ----------
  function stepScene(step, idx = 0, opts = {}) {
    scene(opts.echo);
    renderRail(step.stage);
    const changed = !sameHold(app.prevHold, step.hold);
    if (opts.preface) say(opts.preface, { tone: 'good' });
    const lines = [];
    if (changed && app.prevHold) {
      if (app.prevHold.up !== step.hold.up) lines.push(`🔄 <b>잡는 방향이 바뀌어요!</b> 큐브를 뒤집어서 ${holdHTML(step.hold)}을 보게 잡아 주세요.`);
      else lines.push(`🔄 <b>잡는 방향이 바뀌어요!</b> 위는 그대로 두고 큐브를 통째로 돌려 ${dot(step.hold.front)} <b>${KO[step.hold.front]}</b> 센터가 앞을 보게 해 주세요.`);
    } else if (!app.prevHold) lines.push(`먼저 큐브를 ${holdHTML(step.hold)}을 보게 잡아 주세요.`);
    step.say.forEach((l) => lines.push(l));
    if (!step.isRecovery) lines.push(`총 <b>${step.moves.length}수</b>예요. <b>다음 수 ▶</b>를 누르면 화면 큐브가 먼저 돌아가요. 똑같이 따라 돌린 다음 또 누르면 돼요.${idx ? ` (${idx}수까지 하셨으니 그다음부터 이어서 해요)` : ''}`);
    if (step.remaining > 1) lines.push(`<span class="muted">이 단계에서 이런 작업이 ${step.remaining - 1}번 정도 더 남았어요.</span>`);
    say(lines);
    const actions = (finished) => setActions([
      { label: finished ? '다 따라했어요 · 결과 확인' : '이미 다 했어요 · 결과 확인', kind: finished ? 'primary' : '', onClick: (e) => verifyScene(step, e) },
    ]);
    app.player = new Player(stageEl, step, idx, {
      holdChanged: changed && !!app.prevHold,
      onProgress: (i, finished) => { saveSession({ scene: 'step', stage: step.stage, step, idx: i }); actions(finished); },
    });
  }

  // ---------- 결과 확인 ----------
  function verifyScene(step, echo, prefill, flags) {
    scene(echo);
    renderRail(step.stage);
    saveSession({ scene: 'verify', stage: step.stage, step });
    say([
      '잘하셨어요! 이제 <b>실제 큐브</b>를 보면서 결과를 확인할게요.',
      `입력할 땐 다시 <b>흰 센터 위, 초록 센터 앞</b> 기준으로 잡아 주세요. 제가 예상한 모습을 미리 채워 뒀으니, 실제 큐브와 <b>다른 칸만</b> 고치고 면마다 "이 면 맞아요"를 눌러 주세요.`,
    ]);
    const box = document.createElement('div'); stageEl.appendChild(box);
    new CM.InputEditor(box, { mode: 'verify', prefill: prefill || step.expected, flags, onDone: (st) => handleResult(step, st) });
    setActions([{ label: '따라하기로 돌아가기', onClick: (e) => (step.kind === 'scramble' ? scrambleScene(step, e) : stepScene(step, step.moves.length, { echo: e })) }]);
  }

  function handleResult(step, actual) {
    const r = D.diagnose(step, actual);
    if (r.kind === 'ok') return success(step, actual);
    if (step.stage && r.kind === 'mistake') { store.mistake(step.stage); app.hadMistake = true; }
    scene('결과 입력 끝!');
    renderRail(step.stage);
    const vw = cubeBox(stageEl, C.toFrame(actual, step.hold));
    void vw;
    stageEl.insertAdjacentHTML('beforeend', `<div class="hold"><span class="lbl">지금 큐브</span><span class="pair">${holdHTML(step.hold)} 기준으로 본 모습</span></div>`);
    if (r.kind === 'mistake') {
      const lines = ['앗, 예상과 조금 달라요. 괜찮아요, 큐브 배우면 누구나 하는 실수예요!', '🔍 ' + r.msg];
      if (r.code === 'prefix' && r.resumeAt > 0) {
        say(lines, { tone: 'warn' });
        setActions([{ label: '남은 수 이어서 하기', kind: 'primary', onClick: (e) => stepScene(step, r.resumeAt, { echo: e }) }]);
        return;
      }
      if (r.code === 'prefix') {
        say(lines.concat(['처음부터 같이 다시 따라 해 볼까요?']), { tone: 'warn' });
        setActions([{ label: '다시 따라하기', kind: 'primary', onClick: (e) => stepScene(step, 0, { echo: e }) }, { label: '입력 다시 확인', onClick: (e) => verifyScene(step, e, actual) }]);
        return;
      }
      const rest = step.moves.slice(r.resumeAt);
      lines.push(`<b>되돌리는 방법</b>: ${r.recovery.length ? `${algHTML(r.recovery.join(' '))} 로 실수하기 전 모습으로 돌아간 다음, ` : ''}${r.resumeAt ? `${r.resumeAt + 1}번째 수부터` : '처음부터'} 다시 하면 돼요. 제가 한 수씩 같이 보여드릴게요.`);
      lines.push('아니면 지금 상태에서 새로 계획을 세울 수도 있어요.');
      say(lines, { tone: 'warn' });
      const rec = Object.assign({}, step, {
        title: '되돌리고 다시 하기', isRecovery: true, start: actual,
        moves: r.recovery.concat(rest),
        segments: [r.recovery.length ? { label: '① 되돌리기 (실수 전으로)', moves: r.recovery } : null, { label: r.recovery.length ? '② 다시 이어서' : '다시 이어서', moves: rest }].filter(Boolean),
        say: ['좋아요, 같이 되돌려 봐요. 이번엔 화면 큐브를 보고 <b>방향</b>을 한 번 더 확인하면서 천천히 해요.'],
        remaining: 0,
      });
      setActions([
        { label: '같이 되돌리고 다시 하기', kind: 'primary', onClick: (e) => { app.prevHold = step.hold; stepScene(rec, 0, { echo: e }); } },
        { label: '지금 상태에서 새로 계획', onClick: (e) => replan(actual, e) },
      ]);
      return;
    }
    if (r.kind === 'input') {
      say(['음… 큐브를 돌리다 생긴 실수는 아닌 것 같아요.', r.msg], { tone: 'warn' });
      setActions([{ label: '입력 다시 고치기', kind: 'primary', onClick: (e) => verifyScene(step, e, actual, r.cells) }]);
      return;
    }
    if (r.kind === 'invalid') {
      say(['입력한 색 조합이 실제 큐브에선 나올 수 없는 모양이에요:'].concat(r.errors.map((e) => '• ' + e.msg)).concat(['실제 큐브와 한 번 더 비교해 주세요.']), { tone: 'warn' });
      setActions([{ label: '입력 다시 고치기', kind: 'primary', onClick: (e) => verifyScene(step, e, actual, r.errors.flatMap((x) => x.cells || [])) }]);
      return;
    }
    // unknown
    const lines = ['예상과 달라요. 정확히 어떤 실수인지까지는 찾지 못했어요 — 여러 수가 섞였을 수도 있어요.'];
    if (r.regressed) lines.push(`그 바람에 앞에서 맞춰 둔 <b>${stageMeta(r.stage).name}</b> 부분이 흐트러졌어요. 괜찮아요! 이미 한 번 해 본 단계라 금방 다시 할 수 있어요.`);
    else lines.push('다행히 지금까지 맞춘 부분은 그대로예요. 지금 상태에서 다음 수를 다시 계산할게요.');
    say(lines, { tone: 'warn' });
    setActions([{ label: '지금 상태에서 계속하기', kind: 'primary', onClick: (e) => replan(actual, e) }, { label: '입력 다시 확인', onClick: (e) => verifyScene(step, e, actual) }]);
  }

  function replan(actual, echo) {
    const before = app.state ? S.currentStage(app.state) : null;
    app.state = actual;
    const st = S.currentStage(actual);
    if (st === 'done') return finished(echo);
    if (st !== before) return analyze(actual, echo);
    const step = S.nextStep(actual, app.prevHold && app.prevHold.front);
    stepScene(step, 0, { echo, preface: ['지금 상태에서 다시 계산했어요.'] });
  }

  function success(step, actual) {
    if (step.kind === 'scramble') { app.state = actual; app.prevHold = null; return analyze(actual, '결과 입력 끝!'); }
    const before = S.stageIndex(step.stage);
    app.state = actual;
    app.prevHold = step.hold;
    const now = S.currentStage(actual);
    if (now === 'done') { store.stageCompleted(step.stage, { clean: !app.hadMistake }); return finished('결과 입력 끝!'); }
    if (S.stageIndex(now) > before) {
      const oldStars = store.stars(step.stage);
      store.stageCompleted(step.stage, { clean: !app.hadMistake });
      app.hadMistake = false;
      return stageDone(step.stage, now, oldStars);
    }
    const next = S.nextStep(actual, step.hold.front);
    stepScene(next, 0, { echo: '결과 입력 끝!', preface: [`${T.praise()} ${step.isRecovery ? '실수를 잘 되돌렸어요.' : `"${step.title}" 성공이에요.`} 다음으로 가요!`] });
  }

  function stageDone(stage, nextStage, oldStars, preface) {
    scene('결과 입력 끝!');
    if (preface) say(preface, { tone: 'good' });
    renderRail(nextStage);
    saveSession({ scene: 'intro', stage: nextStage });
    confetti();
    const m = stageMeta(stage), n = stageMeta(nextStage);
    cubeBox(stageEl, C.toFrame(app.state, app.prevHold || stageHold(nextStage)));
    const st = store.stars(stage);
    say([
      `🎉 <b>${josa(m.name, '이/가')} 완성됐어요!</b> 정말 잘하셨어요. ${starHTML(st)}`,
      st > oldStars ? (st === 1 ? '이 단계를 처음 배웠어요. 기록해 둘게요!' : st === 2 ? '이 단계가 꽤 익숙해지셨어요. 다음부턴 <b>혼자 해보기</b>도 할 수 있어요.' : '이 단계는 이제 <b>마스터</b>예요! 👏') : '',
      `다음은 <b>${n.no}단계 ${n.name}</b>예요. ${S.stageIndex(nextStage) >= 3 ? '이제 노란 면 차례예요, 거의 다 왔어요!' : ''}`,
    ], { tone: 'good' });
    setActions([{ label: `다음 단계: ${n.name}`, kind: 'primary', onClick: (e) => stageIntro(nextStage, e) }]);
  }

  function finished(echo) {
    scene(echo);
    renderRail(null);
    store.solved();
    store.setSession(null);
    app.prevHold = null;
    confetti();
    stageEl.insertAdjacentHTML('beforeend', '<div class="hero"><span class="eyebrow">완주!</span><h1>큐브를 다 맞췄어요!</h1></div>');
    const v = cubeBox(stageEl, C.solved());
    if (!reduceMotion) { let k = 0; const spin = () => { if (!document.body.contains(v.host) || k > 8) return; k++; v.animate('y', 900).then(spin); }; spin(); }
    const lvl = store.unlockLevel();
    say([
      '🎉🎉 축하해요! <b>큐브를 처음부터 끝까지 다 맞추셨어요!</b>',
      `지금까지 <b>${store.data.solves}번</b> 완주하셨어요. 할수록 공식이 손에 익어요.`,
      lvl >= 2 ? '7단계 모두 익숙해지셨어요 — 초보법 <b>마스터</b>예요! <b>더 배우기</b>에서 F2L과 다른 풀이법이 열렸어요.' : '<b>더 배우기</b>에 새로운 내용이 열렸어요. 같은 단계를 몇 번 더 하면 "혼자 해보기"도 할 수 있어요.',
    ], { tone: 'good' });
    setActions([
      { label: '섞어서 한 번 더', kind: 'primary', onClick: (e) => scrambleScene(null, e) },
      { label: '더 배우기', onClick: explore },
    ]);
  }

  // ---------- 혼자 해보기 ----------
  function soloScene(stage, echo) {
    scene(echo);
    renderRail(stage);
    saveSession({ scene: 'solo', stage });
    const m = stageMeta(stage);
    stageEl.insertAdjacentHTML('beforeend', `<div class="hero"><span class="eyebrow">혼자 해보기 · 목표 모습</span><h2>${m.name}</h2></div>`);
    cubeBox(stageEl, C.toFrame(goalState(stage), stageHold(stage)));
    say([
      `좋아요, 이번엔 <b>혼자</b> 해보세요! 제가 옆에서 지켜볼게요.`,
      m.goal,
      m.alg ? `공식: ${algHTML(m.alg)}${m.alg2 ? ' / ' + algHTML(m.alg2) : ''}` : '',
      '다 하셨으면 <b>다 했어요</b>를 눌러 결과를 알려주세요. 막히면 <b>힌트</b>를 드릴게요.',
    ]);
    setActions([
      { label: '다 했어요', kind: 'primary', onClick: (e) => soloInput(stage, e) },
      { label: '힌트', onClick: () => soloHint(stage) },
      { label: '같이 하기로', onClick: (e) => beginStage(stage, e) },
    ]);
  }
  function soloHint(stage) {
    const step = S.nextStep(app.state, app.prevHold && app.prevHold.front);
    userSays('힌트 주세요');
    if (!step || step.stage !== stage) { say('이 단계는 이미 완성돼 있는 것 같아요!'); return; }
    say([`힌트: ${holdHTML(step.hold)}으로 잡고, ${algHTML(step.moves.join(' '))}`, '(시작했을 때 모습 기준이에요. 이미 몇 수 돌리셨다면 <b>다 했어요</b>로 지금 상태를 알려주시면 새로 계산해 드려요.)']);
    chatEl.lastElementChild.scrollIntoView({ block: 'nearest' });
  }
  function soloInput(stage, echo, prefill, flags) {
    scene(echo);
    renderRail(stage);
    say(['좋아요! 지금 큐브 모습을 알려주세요. <b>흰 센터 위, 초록 센터 앞</b> 기준이에요.']);
    const box = document.createElement('div'); stageEl.appendChild(box);
    new CM.InputEditor(box, {
      mode: 'initial', prefill, flags,
      onDone: (st) => {
        const v = C.validate(st);
        if (!v.ok) {
          say(['입력에서 이상한 점이 보여요:'].concat(v.errors.map((e) => '• ' + e.msg)), { tone: 'warn' });
          setActions([{ label: '입력 고치기', kind: 'primary', onClick: (e) => soloInput(stage, e, st, v.errors.flatMap((x) => x.cells || [])) }]);
          return;
        }
        const now = S.currentStage(st);
        app.state = st;
        if (now === 'done' || S.stageIndex(now) > S.stageIndex(stage)) {
          const old = store.stars(stage);
          store.stageCompleted(stage, { solo: true, clean: true });
          app.prevHold = null;
          if (now === 'done') return finished('입력 끝!');
          return stageDone(stage, now, old, [`👏 <b>혼자서 ${josa(stageMeta(stage).name, '을/를')} 해내셨어요!</b> 코치 없이도 되는 걸 확인했어요.`]);
        }
        if (S.stageIndex(now) < S.stageIndex(stage)) {
          analyze(st, '입력 끝!');
          say([`앞 단계 <b>${stageMeta(now).name}</b> 부분이 흐트러졌네요. 거기서부터 같이 해요!`], { tone: 'warn' });
          return;
        }
        scene('입력 끝!');
        cubeBox(stageEl, C.toFrame(st, stageHold(stage)));
        const ch = S.stageChecks(st)[stage];
        say([`아직 <b>${stageMeta(stage).name}</b>이 완성되진 않았어요 (${ch.n}/4). 조금만 더 해볼까요, 아니면 같이 할까요?`], { tone: 'warn' });
        setActions([
          { label: '혼자 계속하기', kind: 'primary', onClick: (e) => soloScene(stage, e) },
          { label: '같이 하기', onClick: (e) => beginStage(stage, e) },
        ]);
      },
    });
  }

  // ---------- 섞기 ----------
  function scrambleScene(step, echo) {
    scene(echo);
    renderRail(null);
    if (!step) {
      const scr = C.randomScramble(20);
      step = { kind: 'scramble', stage: null, title: '섞기', hold: { up: 'w', front: 'g' }, moves: scr, start: C.solved(), expected: C.applyMoves(C.solved(), scr), segments: [{ label: '섞는 순서', moves: scr }], say: [] };
    }
    store.setSession({ scene: 'scramble', step, state: null });
    say([
      '<b>다 맞춰진 큐브</b>를 준비해 주세요.',
      `${holdHTML(step.hold)}을 보게 잡고, 아래 순서대로 한 수씩 돌려요. 다 섞으면 그 모습이 출발점이 돼요.`,
      '<span class="muted">섞는 중에 실수해도 괜찮아요. 끝나고 "입력해서 확인"을 고르면 제가 찾아서 바로잡아 드려요.</span>',
    ]);
    const act = (finished) => setActions([
      { label: '다 섞었어요', kind: finished ? 'primary' : '', onClick: (e) => { app.prevHold = null; app.hadMistake = false; analyze(step.expected, e); } },
      { label: '입력해서 확인', onClick: (e) => verifyScene(step, e) },
    ]);
    app.player = new Player(stageEl, step, 0, { endText: '다 섞었어요! 이 모습이 출발점이에요.', onProgress: (i, f) => act(f) });
  }

  // ---------- 큐브와 친해지기 ----------
  function basics(echo) {
    scene(echo);
    renderRail(null);
    stageEl.insertAdjacentHTML('beforeend', '<div class="hero"><span class="eyebrow">기초 · 3분</span><h2>큐브와 친해지기</h2></div>');
    const v = cubeBox(stageEl, C.solved());
    const pad = document.createElement('div');
    pad.className = 'card';
    pad.innerHTML = `<div class="eyebrow">눌러서 돌려 보세요</div><div class="move-card" style="padding:8px 0"><div class="mc-icon"></div><div><div class="move-tok">R</div><div class="move-txt">${T.moveText('R')}</div></div><div></div></div>
      <div class="keypad">${['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"].map((m) => `<button type="button" data-m="${m}">${m}</button>`).join('')}</div>
      <div class="ctl-row" style="margin-top:8px"><button type="button" class="toggle bs-reset">원래대로</button><span class="muted">센터는 움직이지 않아요!</span></div>`;
    stageEl.appendChild(pad);
    $('.mc-icon', pad).innerHTML = T.moveIcon('R');
    pad.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
      const m = b.dataset.m;
      $('.mc-icon', pad).innerHTML = T.moveIcon(m); $('.move-tok', pad).textContent = m; $('.move-txt', pad).textContent = T.moveText(m);
      v.animate(m, 450);
    }));
    $('.bs-reset', pad).addEventListener('click', () => v.setState(C.solved()));
    say([
      '큐브는 <b>조각 26개</b>로 되어 있어요.',
      '• <b>센터</b>(가운데, 6개): 색이 하나. <b>절대 움직이지 않아요.</b> 그래서 센터 색이 그 면의 색이에요.<br>• <b>모서리</b>(12개): 색이 둘.<br>• <b>코너</b>(8개): 색이 셋.',
      '돌리는 방법은 알파벳으로 써요. <b>R</b>(오른쪽) <b>L</b>(왼쪽) <b>U</b>(위) <b>D</b>(아래) <b>F</b>(앞) <b>B</b>(뒤). 그 면을 정면에서 볼 때 <b>시계 방향</b>으로 돌리는 거예요.',
      '<b>\'</b>(프라임)이 붙으면 반대 방향, <b>2</b>가 붙으면 두 번이에요. 예: R\' = 오른쪽 줄을 아래로.',
      '왼쪽 버튼을 눌러 직접 돌려 보세요. 특히 <b>R</b>과 <b>L</b>은 방향이 반대처럼 느껴져요 — R은 위로, L은 아래로!',
    ]);
    setActions([{ label: '이제 큐브 맞추러 가기', kind: 'primary', onClick: startNew }, { label: '처음으로', onClick: home }]);
  }

  // ---------- 더 배우기 ----------
  function explore(echo) {
    scene(echo);
    renderRail(null);
    const lvl = store.unlockLevel();
    stageEl.insertAdjacentHTML('beforeend', '<div class="hero"><span class="eyebrow">초보법 다음 이야기</span><h2>더 배우기 · 다른 방법</h2></div>');
    const box = document.createElement('div'); box.className = 'topics';
    T.EXPLORE.forEach((t) => {
      const locked = t.lock > lvl;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'topic' + (locked ? ' locked' : '');
      b.innerHTML = `<span class="t">${t.title}${locked ? `<span class="lock">${t.lock === 1 ? '첫 완주 후' : '7단계 마스터 후'}</span>` : ''}</span><span class="d">${t.blurb}</span>`;
      b.addEventListener('click', () => topic(t, t.title));
      box.appendChild(b);
    });
    const pg = document.createElement('button');
    pg.type = 'button'; pg.className = 'topic';
    pg.innerHTML = '<span class="t">공식 연습장</span><span class="d">아무 공식이나 입력해서 3D로 천천히 돌려 봐요.</span>';
    pg.addEventListener('click', () => playground('공식 연습장'));
    box.appendChild(pg);
    stageEl.appendChild(box);
    const mastered = S.STAGES.filter((s) => store.stars(s) >= 2).length;
    say([
      '초보법 7단계를 익히면, 같은 원리로 더 빠른 방법들을 배울 수 있어요.',
      lvl === 0 ? '아직 첫 완주 전이에요. 잠긴 내용도 눌러서 <b>미리 엿볼</b> 수는 있어요. 첫 완주를 하면 "업그레이드"와 "4-Look"이 열려요.'
        : lvl === 1 ? `첫 완주 축하해요! 7단계를 모두 익숙하게(★★) 만들면 F2L과 다른 풀이법 지도가 열려요. 지금 ${mastered}/7 단계가 익숙해요.`
          : '초보법 마스터! 모든 내용이 열렸어요. 추천 순서는 4-Look → F2L → 전체 OLL/PLL이에요.',
    ]);
    setActions([{ label: '처음으로', onClick: home }]);
  }

  function topic(t, echo) {
    scene(echo);
    renderRail(null);
    const locked = t.lock > store.unlockLevel();
    stageEl.insertAdjacentHTML('beforeend', `<div class="hero"><span class="eyebrow">더 배우기</span><h2>${t.title}</h2></div>`);
    const list = document.createElement('div'); list.className = 'alg-list';
    t.algs.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'alg-item';
      b.innerHTML = `<span>${a.name}</span><span class="alg">${a.alg}</span>`;
      b.addEventListener('click', () => algViewer(a, t));
      list.appendChild(b);
    });
    if (t.algs.length) stageEl.appendChild(list);
    else cubeBox(stageEl, C.solved());
    say((locked ? [`<span class="lock">${t.lock === 1 ? '첫 완주 후 추천' : '7단계 마스터 후 추천'}</span> 미리 엿보기예요. 지금 초보법을 먼저 익히면 훨씬 쉽게 이해돼요!`] : []).concat(t.body).concat(t.algs.length ? ['공식을 누르면 3D로 보여드릴게요.'] : []));
    setActions([{ label: '목록으로', onClick: explore }, { label: '처음으로', onClick: home }]);
  }

  function algViewer(a, t) {
    scene(a.name);
    const moves = C.parseAlg(a.alg);
    const ll = t.id === '4lll' || t.id === 'upgrade' || t.id === 'f2l';
    const hold = ll ? { up: 'y', front: 'g' } : { up: 'w', front: 'g' };
    const solvedF = C.toFrame(C.solved(), hold);
    const demo = t.id === 'notation';
    const startF = demo ? solvedF : C.applyMoves(solvedF, C.invertAlg(moves));
    const step = { hold, moves, start: C.fromFrame(startF, hold), segments: [{ label: a.name, moves }] };
    say(demo ? [`<b>${a.alg}</b>를 돌려 볼게요.`] : [`<b>${a.name}</b> — 화면은 이 공식이 필요한 상황이에요. 공식을 끝까지 하면 해결돼요.`, `공식: ${algHTML(a.alg)}`]);
    app.player = new Player(stageEl, step, 0, { endText: demo ? '이렇게 움직여요!' : '해결! 이 모양을 기억해 두세요.' });
    setActions([{ label: '목록으로', onClick: (e) => topic(t, e) }]);
  }

  function playground(echo) {
    scene(echo);
    renderRail(null);
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = `<label class="eyebrow" for="pgAlg">공식 입력 (예: R U R' U')</label>
      <div class="field" style="margin-top:6px"><input id="pgAlg" autocomplete="off" autocapitalize="off" spellcheck="false" value="R U R' U'"><button type="button" class="btn primary small" id="pgGo">보기</button></div>
      <div class="ctl-row" style="margin-top:8px"><label class="muted"><input type="checkbox" id="pgCase"> 이 공식이 푸는 상황부터 보기</label></div>
      <div class="muted pg-err" style="margin-top:6px"></div>`;
    stageEl.appendChild(wrap);
    const area = document.createElement('div'); area.className = 'stage'; stageEl.appendChild(area);
    const show = () => {
      let moves;
      try { moves = C.parseAlg($('#pgAlg').value); } catch (e) { $('.pg-err').textContent = e.message + ' (쓸 수 있는 기호: R L U D F B, r l u d f b, M E S, x y z, \', 2)'; return; }
      if (!moves.length) return;
      $('.pg-err').textContent = '';
      if (app.player) app.player.stop();
      area.innerHTML = '';
      const hold = { up: 'w', front: 'g' };
      const sf = C.toFrame(C.solved(), hold);
      const start = $('#pgCase').checked ? C.applyMoves(sf, C.invertAlg(moves)) : sf;
      app.player = new Player(area, { hold, moves, start: C.fromFrame(start, hold), segments: [{ label: moves.join(' '), moves }] }, 0, { endText: '끝까지 돌렸어요.' });
    };
    $('#pgGo').addEventListener('click', show);
    $('#pgAlg').addEventListener('keydown', (e) => { if (e.key === 'Enter') show(); });
    show();
    say(['원하는 공식을 적고 <b>보기</b>를 누르세요. 영상이나 책에서 본 공식을 천천히 확인할 때 좋아요.', '쓸 수 있는 기호: R L U D F B, 두 층 r l u d f b (Rw도 돼요), 가운데 M E S, 통째 회전 x y z.']);
    setActions([{ label: '처음으로', onClick: home }]);
  }

  // ---------- 학습 기록 ----------
  function progress(echo) {
    scene(echo);
    renderRail(null);
    const d = store.data;
    const sessStage = d.session && d.session.stage;
    stageEl.insertAdjacentHTML('beforeend', `<div class="hero"><span class="eyebrow">어디까지 배웠나</span><h2>나의 학습 기록</h2></div>
      <div class="stats">
        <div class="stat"><b>${d.solves}</b><span>완주</span></div>
        <div class="stat"><b>${S.STAGES.filter((s) => store.stars(s) >= 2).length}/7</b><span>익숙한 단계 ★★</span></div>
        <div class="stat"><b>${S.STAGES.reduce((a, s) => a + d.stages[s].mistakes, 0)}</b><span>실수에서 배운 횟수</span></div>
      </div>
      <ol class="path">${S.STAGES.map((id) => {
        const m = stageMeta(id), s = d.stages[id], st = store.stars(id);
        return `<li class="${st ? 'done' : ''}${sessStage === id ? ' now' : ''}"><span class="no">${m.no}</span><span><span class="nm">${m.name}</span><br><span class="sub">${m.alg || '공식 없이 조각 옮기기'}</span></span><span class="meta">${starHTML(st)}<br>${s.done}회${s.solo ? ` · 혼자 ${s.solo}` : ''}</span></li>`;
      }).join('')}</ol>
      <div class="card muted" style="font-size:14px">★ 한 번 해봄 · ★★ 3번 하거나 혼자 성공 · ★★★ 혼자서도 여러 번 성공. 모든 단계가 ★★이 되면 "더 배우기"의 고급 내용이 열려요.</div>
      <div class="ctl-row"><span class="muted">기록은 이 기기의 브라우저에 저장돼요.</span><button type="button" class="toggle" id="resetBtn">기록 지우기</button></div>`);
    $('#resetBtn').addEventListener('click', () => {
      say(['정말 모든 학습 기록을 지울까요? 되돌릴 수 없어요.'], { tone: 'bad' });
      setActions([{ label: '네, 지울게요', kind: '', onClick: () => { store.reset(); home('기록을 지웠어요'); } }, { label: '아니요', kind: 'primary', onClick: progress }]);
    });
    const next = S.STAGES.find((s) => store.stars(s) < 2);
    say([
      d.solves ? `지금까지 <b>${d.solves}번</b> 완주하셨어요!` : '아직 완주 전이에요. 한 단계씩 차근차근 가요!',
      next ? `다음 목표: <b>${stageMeta(next).name}</b> 단계를 ★★로 만들기.` : '모든 단계가 익숙해졌어요. 이제 더 빠른 방법에 도전해 보세요!',
    ]);
    setActions([d.session ? { label: '이어서 하기', kind: 'primary', onClick: resume } : { label: '큐브 맞추기 시작', kind: 'primary', onClick: startNew }, { label: '처음으로', onClick: home }]);
  }

  // ---------- 메뉴 ----------
  const menu = $('#menu');
  function closeMenu() { menu.hidden = true; }
  $('#menuBtn').addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
  function go(where, echo) {
    const map = { home, new: startNew, basics, explore, playground, progress };
    (map[where] || home)(echo);
  }
  menu.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go, b.textContent)));
  $('#homeBtn').addEventListener('click', () => home());

  CM.app = { go, app, analyze, stepScene, handleResult, verifyScene };
  home();
})(window.CM);
