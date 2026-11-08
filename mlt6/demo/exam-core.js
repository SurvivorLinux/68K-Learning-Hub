/* Self-contained exam state. Correct answers are never released by the UI until submit. */
(function (root, factory) {
  const exported = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (root) root.ExamCore = exported;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function shownQuestion(state, bank, id, quizCore) {
    const original = bank.questions.find(q => q.id === id);
    return original ? quizCore.directionalQuestion(original, bank, state.direction) : null;
  }
  function startExam(bank, quizCore, settings) {
    quizCore.validateBank(bank);
    const config = quizCore.normalizeSettings(settings || {});
    const direction = config.direction === quizCore.DEF_FIRST && quizCore.supportsReverse(bank) ?
      quizCore.DEF_FIRST : quizCore.TERM_FIRST;
    const state = {
      schema: 1, bankId: bank.bankId, bankVersion: bank.version,
      direction, shuffleQuestions: config.shuffleQuestions,
      order: config.shuffleQuestions ? shuffle(bank.questions.map(q => q.id)) : bank.questions.map(q => q.id),
      optionOrders: {}, answers: {}, index: 0, submitted: false
    };
    for (const id of state.order) {
      state.optionOrders[id] = shuffle(shownQuestion(state, bank, id, quizCore).choices.map(c => c.id));
    }
    return state;
  }
  function restoreExam(bank, quizCore, saved) {
    quizCore.validateBank(bank);
    if (!saved || saved.schema !== 1 || saved.bankId !== bank.bankId ||
        saved.bankVersion !== bank.version || typeof saved.submitted !== 'boolean' ||
        typeof saved.shuffleQuestions !== 'boolean' ||
        ![quizCore.TERM_FIRST, quizCore.DEF_FIRST].includes(saved.direction) ||
        (saved.direction === quizCore.DEF_FIRST && !quizCore.supportsReverse(bank))) return null;
    const ids = bank.questions.map(q => q.id);
    const idSet = new Set(ids);
    if (!Array.isArray(saved.order) || saved.order.length !== ids.length ||
        new Set(saved.order).size !== ids.length || saved.order.some(id => !idSet.has(id)) ||
        !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= ids.length ||
        !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers) ||
        !saved.optionOrders || typeof saved.optionOrders !== 'object' || Array.isArray(saved.optionOrders)) return null;
    for (const id of saved.order) {
      const q = shownQuestion(saved, bank, id, quizCore);
      const possible = new Set(q.choices.map(c => c.id));
      const display = saved.optionOrders[id];
      if (!Array.isArray(display) || display.length !== 4 || new Set(display).size !== 4 ||
          display.some(choice => !possible.has(choice))) return null;
    }
    for (const [id, values] of Object.entries(saved.answers)) {
      if (!idSet.has(id) || !Array.isArray(values) || new Set(values).size !== values.length) return null;
      const q = shownQuestion(saved, bank, id, quizCore);
      if (values.length > (q.type === 'single' ? 1 : 4) ||
          values.some(choice => !q.choices.some(c => c.id === choice))) return null;
    }
    return saved;
  }
  function setAnswer(state, bank, quizCore, ids) {
    if (state.submitted) throw new Error('The exam is already submitted.');
    const id = state.order[state.index];
    const q = shownQuestion(state, bank, id, quizCore);
    if (!q || !Array.isArray(ids) || new Set(ids).size !== ids.length ||
        ids.length > (q.type === 'single' ? 1 : 4) ||
        ids.some(choice => !q.choices.some(c => c.id === choice))) {
      throw new Error('Invalid exam answer.');
    }
    if (!ids.length) delete state.answers[id];
    else state.answers[id] = [...ids];
    return state;
  }
  function goTo(state, index) {
    if (state.submitted) throw new Error('This exam has ended.');
    if (!Number.isInteger(index) || index < 0 || index >= state.order.length) throw new Error('Invalid question.');
    state.index = index;
    return state;
  }
  function answeredCount(state) {
    return state.order.filter(id => Array.isArray(state.answers[id]) && state.answers[id].length > 0).length;
  }
  function submitExam(state) {
    if (state.submitted) throw new Error('This exam is already submitted.');
    state.submitted = true;
    return state;
  }
  function results(state, bank, quizCore) {
    if (!state.submitted) throw new Error('Results are only available after submission.');
    const report = state.order.map((id, i) => {
      const question = shownQuestion(state, bank, id, quizCore);
      const chosen = Array.isArray(state.answers[id]) ? [...state.answers[id]] : [];
      const correct = chosen.length === question.correct.length &&
        chosen.every(choice => question.correct.includes(choice));
      return { number: i + 1, id, question, chosen, correct, skipped: chosen.length === 0 };
    });
    const correct = report.filter(r => r.correct).length;
    return {
      total: report.length, correct, incorrect: report.length - correct,
      skipped: report.filter(r => r.skipped).length,
      percent: Math.round(correct * 100 / report.length), report
    };
  }
  return { startExam, restoreExam, shownQuestion, setAnswer, goTo, answeredCount, submitExam, results };
});