/* 큐브 색 입력기 (탭으로 칠하기)
 * new CM.InputEditor(host, {prefill, flags, mode:'initial'|'verify'|'solo', onDone(state), onChange})
 * 입력 기준: 흰 센터 위, 초록 센터 앞. */
(function (CM) {
  'use strict';
  const C = CM.cube;
  const ORDER = ['F', 'R', 'B', 'L', 'U', 'D'];
  const GUIDE = {
    F: { title: '초록 면', how: '흰 센터가 <b>위</b>, 초록 센터가 <b>나</b>를 보게 잡고 앞면 9칸을 그대로 칠해요.' },
    R: { title: '빨강 면', how: '흰색은 계속 위! 큐브를 통째로 <b>왼쪽으로 한 번</b> 돌려 빨강 센터가 나를 보게 해요.' },
    B: { title: '파랑 면', how: '한 번 더 <b>왼쪽으로</b> 돌려 파랑 센터가 나를 보게 해요. 흰색은 여전히 위예요.' },
    L: { title: '주황 면', how: '한 번 더 <b>왼쪽으로</b> 돌려 주황 센터가 나를 보게 해요.' },
    U: { title: '흰 면 (윗면)', how: '다시 초록이 나를 보게 돌린 뒤, 윗부분을 내 쪽으로 눕혀 흰 면을 봐요. <b>초록 면이 아래쪽</b>(내 쪽)에 있어야 해요.' },
    D: { title: '노랑 면 (아랫면)', how: '다시 초록이 나를 보게 한 뒤, 아랫부분을 내 쪽으로 들어 노랑 면을 봐요. <b>초록 면이 위쪽</b>에 있어야 해요.' },
  };
  const neg = (v) => [-v[0], -v[1], -v[2]];

  class InputEditor {
    constructor(host, opts = {}) {
      this.host = host;
      this.opts = opts;
      this.mode = opts.mode || 'initial';
      this.state = opts.prefill ? opts.prefill.slice() : new Array(54).fill('');
      this.base = opts.prefill ? opts.prefill.slice() : null;
      C.FACES.forEach((f) => { this.state[C.CENTER[f]] = C.SCHEME[f]; });
      this.flags = new Set(opts.flags || []);
      this.confirmed = new Set();
      this.face = opts.startFace || 'F';
      this.color = 'w';
      this.build();
    }

    build() {
      const h = this.host;
      h.innerHTML = `
        <div class="ie mat">
          <div class="ie-tabs" role="tablist"></div>
          <div class="ie-guide"><h3></h3><p></p></div>
          <div class="ie-board">
            <div class="ie-bar top"></div><div class="ie-bar left"></div>
            <div class="ie-grid"></div>
            <div class="ie-bar right"></div><div class="ie-bar bottom"></div>
          </div>
          <div class="ie-palette" aria-label="색 고르기"></div>
          <div class="ie-nav">
            <button type="button" class="btn ie-prev">이전 면</button>
            <button type="button" class="btn primary ie-next"></button>
          </div>
          <div class="ctl-row">
            <span class="muted ie-hint"></span>
            <button type="button" class="toggle ie-clear"></button>
          </div>
        </div>`;
      this.el = {
        tabs: h.querySelector('.ie-tabs'), title: h.querySelector('.ie-guide h3'), how: h.querySelector('.ie-guide p'),
        grid: h.querySelector('.ie-grid'), palette: h.querySelector('.ie-palette'),
        bars: { top: h.querySelector('.ie-bar.top'), left: h.querySelector('.ie-bar.left'), right: h.querySelector('.ie-bar.right'), bottom: h.querySelector('.ie-bar.bottom') },
        prev: h.querySelector('.ie-prev'), next: h.querySelector('.ie-next'), hint: h.querySelector('.ie-hint'), clear: h.querySelector('.ie-clear'),
      };
      ORDER.forEach((f) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'ie-tab'; b.dataset.face = f;
        b.innerHTML = `<span class="mini">${'<i></i>'.repeat(9)}</span><span>${GUIDE[f].title.split(' ')[0]}</span>`;
        b.addEventListener('click', () => this.go(f));
        this.el.tabs.appendChild(b);
      });
      for (let k = 0; k < 9; k++) {
        const c = document.createElement('button');
        c.type = 'button'; c.className = 'ie-cell'; c.dataset.k = k;
        c.addEventListener('click', () => this.paint(k));
        this.el.grid.appendChild(c);
      }
      C.COLORS.forEach((col) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `ie-color c-${col}`; b.dataset.c = col;
        b.setAttribute('aria-label', C.NAME_KO[col]);
        b.addEventListener('click', () => { this.color = col; this.refresh(); });
        this.el.palette.appendChild(b);
      });
      this.el.prev.addEventListener('click', () => { const i = ORDER.indexOf(this.face); if (i > 0) this.go(ORDER[i - 1]); });
      this.el.next.addEventListener('click', () => this.next());
      this.el.clear.addEventListener('click', () => this.clearAll());
      this.go(this.face);
    }

    idx(k) { return C.FACES.indexOf(this.face) * 9 + k; }
    paint(k) {
      if (k === 4) return;
      const i = this.idx(k);
      this.state[i] = this.state[i] === this.color && this.mode !== 'verify' ? '' : this.color;
      this.flags.delete(i);
      this.refresh();
      if (this.opts.onChange) this.opts.onChange(this.state);
    }
    clearAll() {
      // 예상 모습이 있으면 '비우기 ↔ 다시 채우기' 전환
      const empty = this.state.every((c, i) => i % 9 === 4 || !c);
      if (this.base && empty) this.state = this.base.slice();
      else this.state = this.state.map((c, i) => (i % 9 === 4 ? c : ''));
      this.confirmed.clear();
      this.refresh();
    }
    go(f) {
      this.face = f;
      const fv = (v) => C.SCHEME[C.faceOfNormal(v)];
      const D = C.DOWN[f], R = C.RIGHT[f];
      const set = (el, col) => { el.className = el.className.split(' ').slice(0, 2).join(' ') + ` c-${col}`; };
      set(this.el.bars.top, fv(neg(D))); set(this.el.bars.bottom, fv(D));
      set(this.el.bars.left, fv(neg(R))); set(this.el.bars.right, fv(R));
      this.el.title.innerHTML = `<span class="dot c-${C.SCHEME[f]}"></span>${GUIDE[f].title} <span class="muted" style="font-size:14px">${ORDER.indexOf(f) + 1}/6</span>`;
      this.el.how.innerHTML = GUIDE[f].how + ' 가장자리 막대 색은 그쪽에 있어야 할 <b>센터 색</b>이에요.';
      this.refresh();
    }
    next() {
      this.confirmed.add(this.face);
      const i = ORDER.indexOf(this.face);
      const pending = ORDER.find((f, j) => j > i && !this.confirmed.has(f)) || ORDER.find((f) => !this.confirmed.has(f));
      if (pending) { this.go(pending); return; }
      if (this.opts.onDone) this.opts.onDone(this.state.slice());
    }
    filled(f) { const b = C.FACES.indexOf(f) * 9; for (let k = 0; k < 9; k++) if (!this.state[b + k]) return false; return true; }
    refresh() {
      const b = C.FACES.indexOf(this.face) * 9;
      [...this.el.grid.children].forEach((cell, k) => {
        const col = this.state[b + k];
        cell.style.background = col ? `var(--st-${col})` : '';
        cell.classList.toggle('center', k === 4);
        cell.classList.toggle('flag', this.flags.has(b + k));
        cell.classList.toggle('changed', !!this.base && col !== this.base[b + k] && k !== 4);
        cell.setAttribute('aria-label', `${Math.floor(k / 3) + 1}행 ${k % 3 + 1}열 ${col ? C.NAME_KO[col] : '비어 있음'}`);
      });
      const cnt = {}; C.COLORS.forEach((c) => { cnt[c] = 0; }); this.state.forEach((c) => { if (c) cnt[c]++; });
      [...this.el.palette.children].forEach((btn) => {
        const c = btn.dataset.c;
        btn.classList.toggle('sel', c === this.color);
        btn.classList.toggle('over', cnt[c] > 9);
        btn.textContent = `${cnt[c]}/9`;
      });
      [...this.el.tabs.children].forEach((tab) => {
        const f = tab.dataset.face; const fb = C.FACES.indexOf(f) * 9;
        tab.classList.toggle('cur', f === this.face);
        tab.classList.toggle('ok', this.confirmed.has(f) && this.filled(f));
        [...tab.querySelector('.mini').children].forEach((i, k) => { const col = this.state[fb + k]; i.style.background = col ? `var(--st-${col})` : ''; });
      });
      const remaining = ORDER.filter((f) => !this.confirmed.has(f) && f !== this.face).length;
      const filled = this.filled(this.face);
      this.el.next.disabled = !filled;
      if (this.mode === 'verify') this.el.next.textContent = remaining ? '이 면 맞아요 →' : '이 면도 맞아요 · 결과 확인';
      else this.el.next.textContent = remaining ? '다음 면 →' : '입력 끝 · 확인하기';
      this.el.prev.disabled = ORDER.indexOf(this.face) === 0;
      const empties = this.state.filter((c) => !c).length;
      this.el.hint.textContent = this.mode === 'verify'
        ? '예상 모습을 미리 채워 뒀어요. 다른 칸만 고쳐 주세요.'
        : empties ? `빈 칸 ${empties}개 · 색을 고르고 칸을 눌러요` : '모든 칸을 채웠어요!';
      this.el.clear.textContent = this.base ? (this.state.filter((c, i) => i % 9 !== 4 && c).length ? '전부 비우고 직접 입력' : '예상 모습 다시 채우기') : '전부 지우기';
    }
  }

  CM.InputEditor = InputEditor;
  CM.INPUT_ORDER = ORDER;
})(window.CM);
