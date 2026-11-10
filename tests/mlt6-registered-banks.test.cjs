const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
function registry() {
  const window = {};
  vm.runInNewContext(readFileSync(path.join(root, 'mlt6/banks/approved-banks.js'), 'utf8'), { window });
  return window.MLT6_APPROVED_BANKS;
}
function loadLesson(lessonId) {
  const window = {
    location: { search: '?unit=24&lesson=' + lessonId },
    MLT6_APPROVED_BANKS: registry()
  };
  const context = vm.createContext({ window, URLSearchParams, localStorage: {
    getItem() { return null; },
    setItem() {}
  } });
  for (const relative of ['tests.js', 'banks/bookmarks.js', 'demo/banks/test23-demo.js', 'banks/scope-loader.js']) {
    vm.runInContext(readFileSync(path.join(root, 'mlt6', relative), 'utf8'), context);
  }
  return window;
}

test('registered MLT 106 lessons contain all 86 unique original workbook records', () => {
  const banks = registry();
  assert.deepEqual(Object.keys(banks).sort(), ['5.2','5.3','5.4']);
  assert.deepEqual(['5.2','5.3','5.4'].map(id => banks[id].questions.length), [58,6,22]);
  const ids = [];
  for (const [lessonId, bank] of Object.entries(banks)) {
    assert.equal(bank.releaseStatus, 'APPROVED');
    assert.equal(bank.verified, true);
    const positions = bank.questions.map(q => q.sourceOrder);
    assert.deepEqual(positions, Array.from({length:bank.questions.length},(_,i)=>i+1));
    for (const q of bank.questions) {
      ids.push(q.canonicalId);
      assert.equal(q.lessonId, lessonId);
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices.map(c=>c.id)).size,4);
      assert.equal(q.correct.length, q.type === 'multi' ? 4 : 1);
      assert.ok(q.correct.every(id => q.choices.some(c => c.id === id)));
      assert.ok(q.explanation.summary && q.explanation.directQuote && q.explanation.pageNumber);
    }
  }
  assert.equal(new Set(ids).size,86);
});

test('user-approved lesson 5.2 corrections are preserved', () => {
  const q = registry()['5.2'].questions;
  assert.match(q[2].question, /L-fucose to type 2 precursor chains/);
  assert.match(q[17].question, /cold agglutinin syndrome/);
  assert.equal(q[29].choices[0].text, 'Ficin and papain');
  assert.equal(q[33].type,'multi');
  assert.deepEqual(Array.from(q[33].correct),['a','b','c','d']);
  assert.match(q[40].question,/lack the Fy6 receptor/);
  assert.match(q[48].question,/Kidd antibodies/);
  assert.deepEqual(Array.from(q[48].correct),['b']);
});

test('lesson 5.2, 5.3 and 5.4 load through the actual scope loader', () => {
  for (const [id,count] of [['5.2',58],['5.3',6],['5.4',22]]) {
    const window = loadLesson(id);
    assert.equal(window.MLT6_BANK_CONTEXT.kind, 'lesson', id);
    assert.equal(window.DEMO_QUESTION_BANK.questions.length, count, id);
    assert.equal(window.MLT6Library.checkBank(window.DEMO_QUESTION_BANK),true,id);
  }
});

test('comprehensive derives all 86 questions and preserves source order', () => {
  const window = loadLesson('5.2');
  const summary = window.MLT6Library.aggregate('24');
  assert.ok(summary);
  assert.equal(summary.questionCount,86);
  assert.equal(summary.ready,true);
  assert.equal(new Set(summary.bank.questions.map(q=>q.canonicalId)).size,86);
});
