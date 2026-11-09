const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const path = require('node:path');
const { question, bank, registry } = require('./mlt6-fixtures.cjs');
const quiz = require('../mlt6/demo/quiz-core.js');
const exam = require('../mlt6/demo/exam-core.js');

function load(banks = {}, search = '') {
  const stored = new Map();
  const window = { MLT6_APPROVED_BANKS: banks, location: { search } };
  const context = vm.createContext({
    window, URLSearchParams,
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value)
    }
  });
  for (const script of ['tests.js', 'banks/bookmarks.js', 'demo/banks/test23-demo.js', 'banks/scope-loader.js']) {
    vm.runInContext(readFileSync(path.join(__dirname, '../mlt6', script), 'utf8'), context);
  }
  return window;
}
const ids = bank => Array.from(bank.questions, q => q.id);
const reload = state => JSON.parse(JSON.stringify(state));

test('both lesson URLs use canonical source order and keep the release metadata', () => {
  for (const lessonId of ['5.1', '5.2']) {
    const w = load(registry, '?unit=24&lesson=' + lessonId);
    const normalized = w.DEMO_QUESTION_BANK;
    assert.equal(w.MLT6_BANK_CONTEXT.kind, 'lesson');
    assert.equal(w.MLT6Library.verifiedLesson('25', lessonId), null);
    assert.deepEqual(ids(normalized), [1, 2, 3].map(i => lessonId + '-q' + i));
    assert.equal(registry[lessonId].questions[0].sourceOrder, 3);
    assert.equal(normalized.questions[0].sourceAnchors[0].exactQuote, 'Synthetic quote — café.');
    assert.equal(normalized.questions[0].term, normalized.questions[0].question);
    assert.equal(quiz.validateBank(normalized), true);
  }
});

test('canonical drafts, incomplete release records and malformed payloads fail closed', () => {
  const good = registry['5.1'];
  for (const change of [
    b => { b.releaseStatus = 'DRAFT'; },
    b => { delete b.releaseStatus; },
    b => { b.verified = false; },
    b => { b.schemaVersion = '2.0'; },
    b => { b.lessonId = '5.2'; },
    b => { b.parentUnit = 24; },
    b => { b.questions[0].lessonId = '5.2'; },
    b => { b.questions[0].sourceOrder = b.questions[1].sourceOrder; },
    b => { b.questions[0].question = 23; },
    b => { b.questions[0].explanation.directQuote = null; },
    b => { b.questions[0].correct = ['z']; },
    b => { b.questions[0].id = b.questions[1].id; },
    b => { b.questions[0].study = { reversible: true }; }
  ]) {
    const bad = structuredClone(good);
    change(bad);
    const w = load({ '5.1': bad, '5.2': registry['5.2'] }, '?unit=24&lesson=5.1');
    assert.equal(w.DEMO_QUESTION_BANK, null);
    assert.deepEqual(Array.from(w.MLT6Library.aggregate('24').invalid), ['5.1']);
    assert.equal(w.MLT6Library.aggregate('24').questionCount, 3);
  }
});

test('legacy course schema and direct demo work, but demo does not enter aggregate views', () => {
  const legacy = { verified: true, bankId: 'legacy', version: 'v1', questions: [question('5.1', 1)] };
  assert.equal(load({ '5.1': legacy }).MLT6Library.verifiedLesson('24', '5.1'), legacy);
  const bare = load();
  assert.equal(bare.DEMO_QUESTION_BANK.questions.length, 25);
  assert.equal(bare.MLT6Library.aggregate('23').ready, false);
  assert.equal(load({}, '?unit=23&demo=1').MLT6_BANK_CONTEXT.kind, 'demo');
  assert.equal(load({}, '?unit=constructor&bank=unit').DEMO_QUESTION_BANK, null);
});

test('Comprehensive works at zero, one and two approved lessons', () => {
  const empty = load({}, '?unit=24&bank=unit');
  assert.equal(empty.DEMO_QUESTION_BANK, null);
  assert.equal(empty.MLT6Library.aggregate('24').bookmarkBank.questions.length, 0);
  const partial = load({ '5.2': registry['5.2'] }).MLT6Library.aggregate('24');
  assert.equal(partial.questionCount, 3);
  assert.deepEqual(Array.from(partial.missing), ['5.1', '5.3', '5.4']);
  const both = load({ '5.2': registry['5.2'], '5.1': registry['5.1'] }).MLT6Library.aggregate('24');
  assert.equal(both.complete, false);
  assert.deepEqual(Array.from(both.bank.questions, q => q.originQuestionId),
    ['5.1-q1', '5.1-q2', '5.1-q3', '5.2-q1', '5.2-q3']);
  assert.notEqual(partial.bank.version, both.bank.version);
});

test('ambiguous bank IDs are rejected for individual lessons and Comprehensive', () => {
  const duplicate = { ...registry['5.2'], bankId: registry['5.1'].bankId };
  const w = load({ '5.1': registry['5.1'], '5.2': duplicate });
  assert.equal(w.MLT6Library.verifiedLesson('24', '5.1'), null);
  assert.equal(w.MLT6Library.verifiedLesson('24', '5.2'), null);
  assert.deepEqual(Array.from(w.MLT6Library.aggregate('24').invalid), ['5.1', '5.2']);
});

test('unit bookmarks preserve all duplicate origins, source order and lesson storage keys', () => {
  const w = load(registry);
  const { MLT6Bookmarks: bookmarks, MLT6Library: lib } = w;
  const first = lib.verifiedLesson('24', '5.1');
  const second = lib.verifiedLesson('24', '5.2');
  bookmarks.toggle(second, '5.2-q2');
  bookmarks.toggle(first, '5.1-q3');
  bookmarks.toggle(first, '5.1-q1');
  const { bookmarkBank, bank: combined } = lib.aggregate('24');
  assert.deepEqual(Array.from(bookmarkBank.questions, q => q.originQuestionId), ['5.1-q1', '5.1-q3']);
  bookmarks.toggle(bookmarkBank, 'unit-24/5.1/5.1-q3');
  assert.equal(bookmarks.selected(first, '5.1-q3'), false);
  assert.equal(bookmarks.selected(second, '5.2-q2'), false);
  bookmarks.toggle(combined, 'unit-24/5.2/5.2-q1');
  assert.equal(bookmarks.selected(second, '5.2-q1'), true);
});

test('Multiple Choice keeps first-attempt scoring, restores progress and requires review', () => {
  const lesson = load(registry).MLT6Library.verifiedLesson('24', '5.1');
  let state = quiz.startSession(lesson);
  assert.deepEqual(Array.from(state.order), ids(lesson));
  assert.equal(quiz.submit(state, lesson, ['a']), true);
  quiz.advance(state, lesson);
  assert.equal(quiz.submit(state, lesson, ['a']), false);
  const saved = reload(state);
  delete saved.firstAttempts;
  state = quiz.restoreSession(lesson, saved);
  assert.deepEqual(state.optionOrder, saved.optionOrder);
  assert.equal(quiz.getMissedHistory(state, lesson)[0].question.id, '5.1-q2');
  quiz.advance(state, lesson);
  assert.equal(quiz.submit(state, lesson, ['a']), true);
  assert.equal(quiz.advance(state, lesson), 'review-intro');
  quiz.beginReview(state, lesson);
  assert.equal(quiz.submit(state, lesson, ['b', 'a']), true);
  assert.equal(quiz.advance(state, lesson), 'done');
  assert.equal(quiz.summary(state, lesson).firstCorrect, 2);
  assert.equal(quiz.summary(state, lesson).mastered, 3);
  assert.equal(quiz.restoreSession({ ...lesson, version: 'next' }, saved), null);
});

test('Exam keeps source order, restores the exact choices, and grades exact answer sets', () => {
  const lesson = load(registry).MLT6Library.verifiedLesson('24', '5.1');
  let state = exam.startExam(lesson, quiz);
  assert.deepEqual(Array.from(state.order), ids(lesson));
  assert.throws(() => exam.results(state, lesson, quiz), /after submission/);
  exam.setAnswer(state, lesson, quiz, ['a']);
  exam.goTo(state, 1);
  exam.setAnswer(state, lesson, quiz, ['b', 'a', 'c']);
  const saved = reload(state);
  state = exam.restoreExam(lesson, quiz, saved);
  assert.equal(state.index, 1);
  assert.deepEqual(state.optionOrders, saved.optionOrders);
  assert.deepEqual(state.answers['5.1-q2'], ['b', 'a', 'c']);
  exam.submitExam(state);
  assert.equal(exam.results(state, lesson, quiz).correct, 1);
  assert.equal(exam.results(state, lesson, quiz).skipped, 1);
});

test('optional shuffle reorders questions without changing the bank', () => {
  const lesson = load(registry).MLT6Library.verifiedLesson('24', '5.1');
  const random = Math.random;
  try {
    Math.random = () => 0;
    const settings = { shuffleQuestions: true };
    assert.deepEqual(Array.from(quiz.startSession(lesson, settings).order), ['5.1-q2', '5.1-q3', '5.1-q1']);
    assert.deepEqual(Array.from(exam.startExam(lesson, quiz, settings).order), ['5.1-q2', '5.1-q3', '5.1-q1']);
    assert.deepEqual(ids(lesson), ['5.1-q1', '5.1-q2', '5.1-q3']);
  } finally { Math.random = random; }
});

test('reverse study requires audited and unambiguous canonical pairs', () => {
  const pairs = [1, 2, 3, 4].map(i => question('5.1', i, { reversible: true }));
  const normalize = questions => load({ '5.1': bank('5.1', questions) }).MLT6Library.verifiedLesson('24', '5.1');
  const reversible = normalize(pairs);
  assert.equal(quiz.supportsReverse(reversible), true);
  const reversed = quiz.directionalQuestion(reversible.questions[0], reversible, quiz.DEF_FIRST);
  assert.equal(reversed.question, pairs[0].study.definition);
  assert.equal(reversed.choices[0].text, pairs[0].study.term);
  const ambiguous = structuredClone(pairs);
  ambiguous[0].study.definition = pairs[1].study.definition;
  assert.equal(quiz.hasStudyPairs(normalize(ambiguous).questions), false);
  const forward = normalize([question('5.1', 1), ...pairs.slice(1)]);
  assert.equal(quiz.hasStudyPairs(forward.questions), false);
  assert.equal(quiz.startSession(forward, { direction: quiz.DEF_FIRST }).direction, quiz.TERM_FIRST);
  assert.equal(exam.startExam(forward, quiz, { direction: quiz.DEF_FIRST }).direction, quiz.TERM_FIRST);
  assert.equal(quiz.supportsReverse(load().DEMO_QUESTION_BANK), true);
});
