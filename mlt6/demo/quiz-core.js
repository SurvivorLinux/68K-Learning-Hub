/* 68K Learning Hub demo learning cycle. No external dependencies. */
(function (root, factory) {
  const exported = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (root) root.QuizCore = exported;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const ROUND_SIZE = 10;
  const randomize = function (array) {
    const out = [...array];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  function validateBank(bank) {
    if (!bank || !bank.bankId || !bank.version || !Array.isArray(bank.questions) || bank.questions.length < 1) throw new Error('Question bank is missing or empty.');
    const ids = new Set();
    for (const q of bank.questions) {
      if (typeof q.id !== 'string' || ids.has(q.id)) throw new Error('Missing or duplicate question ID.');
      ids.add(q.id);
      if (!['single', 'multi'].includes(q.type) || !q.question || !Array.isArray(q.choices) || q.choices.length !== 4) throw new Error('Invalid question format: ' + q.id);
      const choices = q.choices.map(c => c.id);
      if (new Set(choices).size !== 4 || q.choices.some(c => !c.text || !c.id)) throw new Error('Invalid answer choice: ' + q.id);
      if (!Array.isArray(q.correct) || q.correct.length < (q.type === 'multi' ? 2 : 1) || (q.type === 'single' && q.correct.length !== 1) || new Set(q.correct).size !== q.correct.length || q.correct.some(id => !choices.includes(id))) throw new Error('Invalid answer key: ' + q.id);
    }
    return true;
  }
  function indexBank(bank) { return Object.fromEntries(bank.questions.map(q => [q.id, q])); }
  function currentQuestion(state, bank) {
    const indexed = indexBank(bank);
    if (state.stage === 'new') return indexed[state.order[state.newIndex]] || null;
    if (state.stage === 'review') return indexed[state.reviewQueue[state.reviewIndex]] || null;
    return null;
  }
  function freshOptionOrder(state, bank) {
    const q = currentQuestion(state, bank);
    state.optionOrder = q ? randomize(q.choices.map(c => c.id)) : [];
  }
  function startSession(bank) {
    validateBank(bank);
    const state = {
      format: 1, bankId: bank.bankId, bankVersion: bank.version,
      stage: 'new', order: randomize(bank.questions.map(q => q.id)),
      newIndex: 0, reviewQueue: [], reviewIndex: 0,
      unresolved: [], mastered: [], firstMissed: [], firstCorrect: 0,
      reviewAttempts: 0, optionOrder: [], response: null, missedHistory: []
    };
    freshOptionOrder(state, bank);
    return state;
  }
  function restoreSession(bank, candidate) {
    validateBank(bank);
    if (!candidate || candidate.format !== 1 || candidate.bankId !== bank.bankId || candidate.bankVersion !== bank.version) return null;
    const ids = bank.questions.map(q => q.id);
    const allIDs = new Set(ids);
    if (!['new', 'review-intro', 'review', 'done'].includes(candidate.stage) || !Array.isArray(candidate.order) || candidate.order.length !== ids.length || new Set(candidate.order).size !== ids.length || candidate.order.some(id => !allIDs.has(id))) return null;
    if (!Number.isInteger(candidate.newIndex) || candidate.newIndex < 0 || candidate.newIndex > ids.length || !Number.isInteger(candidate.reviewIndex) || candidate.reviewIndex < 0 || !Array.isArray(candidate.reviewQueue) || candidate.reviewIndex > candidate.reviewQueue.length) return null;
    for (const key of ['unresolved', 'mastered', 'firstMissed', 'reviewQueue']) if (!Array.isArray(candidate[key]) || candidate[key].some(id => !allIDs.has(id))) return null;
    if (!Number.isInteger(candidate.firstCorrect) || candidate.firstCorrect < 0 || candidate.firstCorrect > ids.length || !Number.isInteger(candidate.reviewAttempts) || candidate.reviewAttempts < 0) return null;
    // Existing browser sessions predate saved answer snapshots; keep their progress.
    if (candidate.missedHistory === undefined) candidate.missedHistory = [];
    if (!Array.isArray(candidate.missedHistory)) return null;
    const indexed = indexBank(bank);
    for (const miss of candidate.missedHistory) {
      const q = miss && indexed[miss.questionId];
      if (!q || !['new', 'review'].includes(miss.phase) ||
          !Array.isArray(miss.selected) || miss.selected.length === 0 ||
          !Array.isArray(miss.optionOrder) || miss.optionOrder.length !== 4 ||
          new Set(miss.optionOrder).size !== 4 ||
          miss.optionOrder.some(id => !q.choices.some(c => c.id === id)) ||
          new Set(miss.selected).size !== miss.selected.length ||
          miss.selected.some(id => !q.choices.some(c => c.id === id))) return null;
    }
    if ((candidate.stage === 'new' && candidate.newIndex >= ids.length) || (candidate.stage === 'review' && candidate.reviewIndex >= candidate.reviewQueue.length)) return null;
    if (candidate.stage === 'new' || candidate.stage === 'review') {
      const q = currentQuestion(candidate, bank);
      if (!q || !Array.isArray(candidate.optionOrder) || candidate.optionOrder.length !== 4 || new Set(candidate.optionOrder).size !== 4 || candidate.optionOrder.some(id => !q.choices.some(c => c.id === id))) return null;
      if (candidate.response && (!Array.isArray(candidate.response.selected) || candidate.response.selected.some(id => !q.choices.some(c => c.id === id)))) return null;
    }
    return candidate;
  }
  function isCorrect(q, chosen) {
    return chosen.length === q.correct.length && chosen.every(id => q.correct.includes(id));
  }
  function submit(state, bank, selected) {
    if (state.response || (state.stage !== 'new' && state.stage !== 'review')) throw new Error('Not ready to accept an answer.');
    const q = currentQuestion(state, bank);
    if (!q || !Array.isArray(selected) || selected.length < 1 || (q.type === 'single' && selected.length !== 1) || new Set(selected).size !== selected.length || selected.some(id => !q.choices.some(c => c.id === id))) throw new Error('Please select a valid answer.');
    const correct = isCorrect(q, selected);
    if (state.stage === 'new') {
      if (correct) {
        state.firstCorrect += 1;
        if (!state.mastered.includes(q.id)) state.mastered.push(q.id);
      } else {
        state.firstMissed.push(q.id);
        if (!state.unresolved.includes(q.id)) state.unresolved.push(q.id);
      }
    } else {
      state.reviewAttempts += 1;
      if (correct) {
        state.unresolved = state.unresolved.filter(id => id !== q.id);
        if (!state.mastered.includes(q.id)) state.mastered.push(q.id);
      }
    }
    if (!correct) {
      state.missedHistory.push({
        questionId: q.id,
        phase: state.stage,
        selected: [...selected],
        optionOrder: [...state.optionOrder]
      });
    }
    state.response = { selected: [...selected], correct };
    return correct;
  }
  function advance(state, bank) {
    if (!state.response || (state.stage !== 'new' && state.stage !== 'review')) throw new Error('Answer before continuing.');
    const wasNew = state.stage === 'new';
    state.response = null;
    if (wasNew) {
      state.newIndex += 1;
      if ((state.newIndex % ROUND_SIZE === 0 || state.newIndex === bank.questions.length) && state.unresolved.length) {
        state.reviewQueue = [...state.unresolved];
        state.reviewIndex = 0;
        state.stage = 'review-intro';
      } else if (state.newIndex === bank.questions.length) {
        state.stage = 'done';
      }
    } else {
      state.reviewIndex += 1;
      if (state.reviewIndex >= state.reviewQueue.length) {
        state.reviewQueue = [];
        state.reviewIndex = 0;
        state.stage = state.newIndex === bank.questions.length ? 'done' : 'new';
      }
    }
    freshOptionOrder(state, bank);
    return state.stage;
  }
  function beginReview(state, bank) {
    if (state.stage !== 'review-intro' || state.reviewQueue.length === 0) throw new Error('No review is pending.');
    state.stage = 'review';
    freshOptionOrder(state, bank);
  }
  function getMissedHistory(state, bank) {
    const indexed = indexBank(bank);
    return [...new Set(state.firstMissed)].filter(id => Boolean(indexed[id])).map(id => {
      // Show the most recent incorrect submission while preserving earlier scores.
      const latestMiss = [...(state.missedHistory || [])].reverse().find(entry => entry.questionId === id);
      return {
        question: indexed[id],
        selected: latestMiss ? [...latestMiss.selected] : null,
        optionOrder: latestMiss ? [...latestMiss.optionOrder] : indexed[id].choices.map(c => c.id),
        unresolved: state.unresolved.includes(id)
      };
    });
  }
  function answeredNew(state) { return state.newIndex + (state.stage === 'new' && state.response ? 1 : 0); }
  function summary(state, bank) {
    const attempted = answeredNew(state);
    return {
      total: bank.questions.length,
      answeredNew: state.stage === 'done' ? bank.questions.length : attempted,
      firstCorrect: state.firstCorrect,
      firstAttemptAccuracy: attempted ? Math.round(state.firstCorrect / attempted * 100) : 0,
      mastered: state.mastered.length,
      unresolved: state.unresolved.length,
      reviewAttempts: state.reviewAttempts
    };
  }
  return { ROUND_SIZE, validateBank, startSession, restoreSession, currentQuestion, submit, advance, beginReview, summary, answeredNew, getMissedHistory };
});
