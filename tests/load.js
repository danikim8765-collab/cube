// 브라우저용 스크립트를 node에서 불러오기
const fs = require('fs'); const path = require('path'); const vm = require('vm');
globalThis.CM = {};
for (const f of ['cube.js', 'solver.js', 'diagnose.js', 'content.js']) {
  const p = path.join(__dirname, '..', 'js', f);
  if (fs.existsSync(p)) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
}
module.exports = globalThis.CM;
