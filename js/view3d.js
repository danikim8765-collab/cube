/* CSS 3D 큐브 뷰: 외부 라이브러리 없이 동작 (폰/패드 오프라인 OK)
 * new CM.CubeView(el) / .setState(state54) / .animate(token, ms) → Promise
 * 드래그로 둘러보기, 더블탭으로 원래 각도 */
(function (CM) {
  'use strict';
  const C = CM.cube;
  const COLOR_VAR = { w: 'var(--st-w)', y: 'var(--st-y)', g: 'var(--st-g)', b: 'var(--st-b)', r: 'var(--st-r)', o: 'var(--st-o)' };
  // 각 면의 CSS 변환 (cubie 기준)
  const FACE_TF = {
    F: 'translateZ(var(--h))', B: 'rotateY(180deg) translateZ(var(--h))',
    R: 'rotateY(90deg) translateZ(var(--h))', L: 'rotateY(-90deg) translateZ(var(--h))',
    U: 'rotateX(90deg) translateZ(var(--h))', D: 'rotateX(-90deg) translateZ(var(--h))',
  };
  const DEFAULT_VIEW = { rx: -28, ry: -36 };

  class CubeView {
    constructor(host, opts = {}) {
      this.host = host;
      this.opts = opts;
      this.view = Object.assign({}, DEFAULT_VIEW, opts.view || {});
      this.state = C.solved();
      this.highlight = null;
      this.busy = false;
      host.classList.add('cv-host');
      host.innerHTML = '';
      this.scene = document.createElement('div');
      this.scene.className = 'cv-scene';
      this.root = document.createElement('div');
      this.root.className = 'cv-root';
      this.scene.appendChild(this.root);
      host.appendChild(this.scene);
      this.cubies = [];
      C.CUBIES.concat([]).forEach((cb) => this._makeCubie(cb.pos));
      // 센터 조각(6)
      C.FACES.forEach((f) => this._makeCubie(C.NORMAL[f]));
      this._applyView();
      this.render();
      if (opts.interactive !== false) this._bindDrag();
    }

    _makeCubie(pos) {
      const el = document.createElement('div');
      el.className = 'cv-cubie';
      el.style.transform = this._cubieTf(pos);
      const faces = {};
      C.FACES.forEach((f) => {
        const n = C.NORMAL[f];
        const fe = document.createElement('div');
        fe.className = 'cv-face';
        fe.style.transform = FACE_TF[f];
        if (C.dot(pos, n) === 1) {
          const st = document.createElement('div');
          st.className = 'cv-sticker';
          fe.appendChild(st);
          faces[f] = { el: fe, st, fl: C.FL_INDEX[C.key(pos, n)] };
        } else fe.classList.add('cv-inner');
        el.appendChild(fe);
      });
      this.root.appendChild(el);
      this.cubies.push({ pos, el, faces });
    }
    _cubieTf(p) { return `translate3d(calc(${p[0]} * var(--s)), calc(${-p[1]} * var(--s)), calc(${p[2]} * var(--s)))`; }
    _applyView() { this.root.style.transform = `rotateX(${this.view.rx}deg) rotateY(${this.view.ry}deg)`; }

    resetView() { this.view = Object.assign({}, DEFAULT_VIEW, this.opts.view || {}); this.root.classList.add('cv-ease'); this._applyView(); setTimeout(() => this.root.classList.remove('cv-ease'), 400); }

    setState(state) { this.state = state.slice(); this.render(); }
    setHighlight(colors) { this.highlight = colors ? C.colorKey(colors) : null; this.render(); }

    render() {
      const s = this.state;
      this.cubies.forEach((cb) => {
        const cols = [];
        Object.keys(cb.faces).forEach((f) => { const fc = cb.faces[f]; const c = s[fc.fl]; cols.push(c); fc.st.style.background = c ? COLOR_VAR[c] : 'var(--st-empty)'; });
        const hl = this.highlight && cols.length >= 2 && C.colorKey(cols) === this.highlight;
        cb.el.classList.toggle('cv-hl', !!hl);
        cb.el.classList.toggle('cv-dim', !!this.highlight && !hl);
      });
    }

    // 한 수 애니메이션 후 상태 반영
    animate(tok, ms = 420) {
      const p = C.parseToken(tok);
      if (!p) return Promise.resolve();
      if (this.busy) return new Promise((res) => setTimeout(() => res(this.animate(tok, ms)), 30));
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const AX = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1], M: [-1, 0, 0], E: [0, -1, 0], S: [0, 0, 1], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
      const b = p.base;
      const up = b.toUpperCase();
      const axis = AX[b] || AX[up];
      let inLayer;
      if ('xyz'.includes(b)) inLayer = () => true;
      else if (b === 'M') inLayer = (q) => q[0] === 0;
      else if (b === 'E') inLayer = (q) => q[1] === 0;
      else if (b === 'S') inLayer = (q) => q[2] === 0;
      else if (b !== up) inLayer = (q) => C.dot(q, axis) >= 0;
      else inLayer = (q) => C.dot(q, axis) === 1;
      const qTurns = p.turns === 3 ? 1 : -p.turns; // 모델 기준(오른손) 1/4바퀴 수
      const angle = -qTurns * 90; // CSS(y 반전) 기준
      const done = () => { this.state = C.applyMove(this.state, p.token); };
      if (reduce || ms <= 0) { done(); this.render(); return Promise.resolve(); }
      this.busy = true;
      const layer = document.createElement('div');
      layer.className = 'cv-layer';
      this.root.appendChild(layer);
      const moving = this.cubies.filter((cb) => inLayer(cb.pos));
      moving.forEach((cb) => layer.appendChild(cb.el));
      const dur = p.turns === 2 ? ms * 1.5 : ms;
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          layer.style.transition = `transform ${dur}ms cubic-bezier(.45,.05,.3,1)`;
          layer.style.transform = `rotate3d(${axis[0]}, ${-axis[1]}, ${axis[2]}, ${angle}deg)`;
          let finished = false;
          const end = () => {
            if (finished) return; finished = true;
            moving.forEach((cb) => this.root.appendChild(cb.el));
            layer.remove();
            done(); this.render();
            this.busy = false;
            resolve();
          };
          layer.addEventListener('transitionend', end, { once: true });
          setTimeout(end, dur + 120);
        });
      });
    }

    _bindDrag() {
      let start = null, lastTap = 0;
      const sc = this.scene;
      sc.addEventListener('pointerdown', (e) => {
        start = { x: e.clientX, y: e.clientY, rx: this.view.rx, ry: this.view.ry, id: e.pointerId };
        try { sc.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        const now = Date.now();
        if (now - lastTap < 300) this.resetView();
        lastTap = now;
      });
      sc.addEventListener('pointermove', (e) => {
        if (!start || e.pointerId !== start.id) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        this.view.ry = start.ry + dx * 0.5;
        this.view.rx = Math.max(-85, Math.min(85, start.rx - dy * 0.5));
        this._applyView();
      });
      const up = () => { start = null; };
      sc.addEventListener('pointerup', up);
      sc.addEventListener('pointercancel', up);
    }
  }

  CM.CubeView = CubeView;
})(window.CM);
