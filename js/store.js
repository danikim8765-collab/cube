/* 학습 기록 저장 (localStorage). 저장이 막힌 환경에서도 앱은 동작한다. */
(function (CM) {
  'use strict';
  const KEY = 'cube-coach-v1';
  const STAGES = CM.solver.STAGES;

  function blank() {
    const stages = {};
    STAGES.forEach((s) => { stages[s] = { done: 0, solo: 0, clean: 0, mistakes: 0, last: null }; });
    return {
      v: 1, created: Date.now(), solves: 0, introSeen: false,
      stages, session: null, history: [],
      settings: { speed: 1 },
    };
  }

  let data = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      data = Object.assign(blank(), d);
      STAGES.forEach((s) => { data.stages[s] = Object.assign(blank().stages[s], (d.stages || {})[s]); });
      data.settings = Object.assign(blank().settings, d.settings || {});
    }
  } catch (_) { /* 저장 불가 환경 */ }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* noop */ } }

  function stars(stage) {
    const s = data.stages[stage];
    let n = 0;
    if (s.done >= 1) n = 1;
    if (s.done >= 3) n = 2;
    if (s.solo >= 1 && s.done >= 1) n = Math.max(n, 2);
    if (s.solo >= 1 && s.done >= 3) n = 3;
    if (s.solo >= 2) n = 3;
    return n;
  }
  const mastered = () => STAGES.every((s) => stars(s) >= 2);
  // 더 배우기 잠금 단계: 0 기본, 1 첫 완주 후, 2 마스터 후
  const unlockLevel = () => (mastered() ? 2 : data.solves >= 1 ? 1 : 0);

  function stageCompleted(stage, { solo = false, clean = true } = {}) {
    const s = data.stages[stage];
    s.done += 1; if (solo) s.solo += 1; if (clean) s.clean += 1; s.last = Date.now();
    data.history.push({ t: Date.now(), ev: 'stage', stage, solo });
    if (data.history.length > 200) data.history = data.history.slice(-200);
    save();
  }
  function mistake(stage) { if (data.stages[stage]) { data.stages[stage].mistakes += 1; save(); } }
  function solved() { data.solves += 1; data.history.push({ t: Date.now(), ev: 'solve' }); save(); }
  function setSession(sess) { data.session = sess ? Object.assign({ updated: Date.now() }, sess) : null; save(); }
  function reset() { data = blank(); save(); }

  CM.store = {
    get data() { return data; }, save, stars, mastered, unlockLevel, stageCompleted, mistake, solved, setSession, reset,
  };
})(window.CM);
