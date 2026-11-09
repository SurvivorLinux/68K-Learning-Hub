/* 68K Learning Hub demo learning cycle. No external dependencies. */
(function (root, factory) {
  const exported = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (root) root.QuizCore = exported;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const ROUND_SIZE = 10;
  const ROUND_OPTIONS = [5, 10, 15];
  const TERM_FIRST = 'term-to-definition';
  const DEF_FIRST = 'definition-to-term';
  function normalizeDirection(direction) { return direction === DEF_FIRST ? DEF_FIRST : TERM_FIRST; }
  function normalizeSettings(settings) {
    return {
      roundSize: settings && ROUND_OPTIONS.includes(Number(settings.roundSize)) ? Number(settings.roundSize) : ROUND_SIZE,
      shuffleQuestions: !!(settings && settings.shuffleQuestions === true),
      direction: normalizeDirection(settings && settings.direction)
    };
  }
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
      // Source fields are optional for the feature-test bank. Verified course banks can provide these.
      if (q.explanation !== undefined) {
        const ex = q.explanation;
        if (!ex || typeof ex.summary !== 'string' || !ex.summary.trim() ||
            (ex.pageNumber != null && !['string', 'number'].includes(typeof ex.pageNumber)) ||
            (ex.sourceName != null && typeof ex.sourceName !== 'string') ||
            (ex.directQuote != null && typeof ex.directQuote !== 'string')) {
          throw new Error('Invalid explanation or source fields: ' + q.id);
        }
      }
    }
    return true;
  }
  function indexBank(bank) { return Object.fromEntries(bank.questions.map(q => [q.id, q])); }
  function reverseSource(bank) {
    return Array.isArray(bank.reversePool) && bank.reversePool.length ? bank.reversePool : bank.questions;
  }
  function hasStudyPairs(questions) {
    if (!questions.length || !questions.every(q => q && q.reversible !== false &&
        typeof q.term === 'string' && q.term.trim() &&
        typeof q.definition === 'string' && q.definition.trim())) return false;
    // Keep the legacy demo's settings. New audited pairs must be unambiguous
    // in both directions, including when lessons are combined.
    if (!questions.some(q => q.reversible === true)) return true;
    const normalize = text => text.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
    return ['term', 'definition'].every(key =>
      new Set(questions.map(q => normalize(q[key]))).size === questions.length);
  }
  function supportsReverse(bank) {
    const pool = reverseSource(bank);
    if (!Array.isArray(pool) || pool.length < 4 ||
        !hasStudyPairs(pool) || !hasStudyPairs(bank.questions)) return false;
    const known = new Set();
    for (const q of pool) {
      if (!q || typeof q.term !== 'string' || !q.term.trim() ||
          typeof q.definition !== 'string' || !q.definition.trim() ||
          known.has(q.term.trim().toLowerCase())) return false;
      known.add(q.term.trim().toLowerCase());
    }
    return bank.questions.every(q => {
      if (!q.term || !q.definition) return false;
      const different = pool.filter(other => other.id !== q.id &&
        other.definition.trim().toLowerCase() !== q.definition.trim().toLowerCase());
      return different.length >= 3;
    });
  }
  function directionalQuestion(q, bank, direction) {
    if (!q || direction !== DEF_FIRST || !supportsReverse(bank)) return q;
    const pool = reverseSource(bank);
    const starting = Math.max(0, pool.findIndex(item => item.id === q.id));
    const alternate = [];
    for (let offset = 1; offset < pool.length && alternate.length < 3; offset++) {
      const other = pool[(starting + offset) % pool.length];
      if (other.id !== q.id && other.definition.trim().toLowerCase() !==
          q.definition.trim().toLowerCase()) alternate.push(other);
    }
    return {
      ...q,
      type: 'single',
      question: q.definition,
      choices: [{ id: 'rev0', text: q.term },
        ...alternate.map((other, i) => ({ id: 'rev' + (i + 1), text: other.term }))],
      correct: ['rev0']
    };
  }
  function currentQuestion(state, bank) {
    const indexed = indexBank(bank);
    const id = state.stage === 'new' ? state.order[state.newIndex] :
      state.stage === 'review' ? state.reviewQueue[state.reviewIndex] : null;
    return id ? directionalQuestion(indexed[id], bank, state.direction) : null;
  }
  function freshOptionOrder(state, bank) {
    const q = currentQuestion(state, bank);
    state.optionOrder = q ? randomize(q.choices.map(c => c.id)) : [];
  }
  function startSession(bank, settings) {
    validateBank(bank);
    const config = normalizeSettings(settings);
    const ids = bank.questions.map(q => q.id);
    const state = {
      format: 1, bankId: bank.bankId, bankVersion: bank.version,
      stage: 'new', order: config.shuffleQuestions ? randomize(ids) : ids,
      roundSize: config.roundSize, shuffleQuestions: config.shuffleQuestions,
      direction: config.direction === DEF_FIRST && supportsReverse(bank) ? DEF_FIRST : TERM_FIRST,
      newIndex: 0, reviewQueue: [], reviewIndex: 0,
      unresolved: [], mastered: [], firstMissed: [], firstCorrect: 0,
      reviewAttempts: 0, optionOrder: [], response: null, missedHistory: [], firstAttempts: {}
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
    // Keep existing saved sessions that were created before adjustable settings.
    if (candidate.roundSize === undefined) candidate.roundSize = ROUND_SIZE;
    if (candidate.shuffleQuestions === undefined) candidate.shuffleQuestions = true;
    if (!ROUND_OPTIONS.includes(candidate.roundSize) || typeof candidate.shuffleQuestions !== 'boolean') return null;
    // Previous sessions were forward-only: retain their question and answer order.
    if (candidate.direction === undefined) candidate.direction = TERM_FIRST;
    if (![TERM_FIRST, DEF_FIRST].includes(candidate.direction) ||
        (candidate.direction === DEF_FIRST && !supportsReverse(bank))) return null;
    // Existing browser sessions predate saved answer snapshots; keep their progress.
    if (candidate.missedHistory === undefined) candidate.missedHistory = [];
    if (!Array.isArray(candidate.missedHistory)) return null;
    const indexed = Object.fromEntries(bank.questions.map(q =>
      [q.id, directionalQuestion(q, bank, candidate.direction)]));
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
    // Upgrade a previously saved demo session without erasing quiz progress.
    // Old sessions stored incorrect attempts but did not preserve every first choice.
    if (candidate.firstAttempts === undefined) candidate.firstAttempts = {};
    if (!candidate.firstAttempts || typeof candidate.firstAttempts !== 'object' || Array.isArray(candidate.firstAttempts)) return null;
    const results = candidate.firstAttempts;
    const knownQuestions = indexed;
    for (const [id, attempt] of Object.entries(results)) {
      const question = knownQuestions[id];
      if (!question || !attempt || typeof attempt.correct !== 'boolean' ||
          (attempt.selected !== null && (!Array.isArray(attempt.selected) ||
            new Set(attempt.selected).size !== attempt.selected.length ||
            attempt.selected.some(choice => !question.choices.some(c => c.id === choice))))) return null;
    }
    const seen = candidate.order.slice(0, candidate.newIndex);
    if (candidate.stage === 'new' && candidate.response) seen.push(candidate.order[candidate.newIndex]);
    for (const id of seen) {
      if (results[id]) continue;
      const wasWrong = candidate.firstMissed.includes(id);
      const oldMiss = candidate.missedHistory.find(entry => entry.questionId === id && entry.phase === 'new');
      results[id] = {
        correct: !wasWrong,
        selected: wasWrong ? (oldMiss ? [...oldMiss.selected] : null) : [...knownQuestions[id].correct]
      };
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
      if (!state.firstAttempts) state.firstAttempts = {};
      state.firstAttempts[q.id] = { correct, selected: [...selected] };
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
      if ((state.newIndex % state.roundSize === 0 || state.newIndex === bank.questions.length) && state.unresolved.length) {
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
    const indexed = Object.fromEntries(bank.questions.map(q => [q.id, directionalQuestion(q, bank, state.direction)]));
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
  function questionReport(state, bank) {
    const indexed = Object.fromEntries(bank.questions.map(q => [q.id, directionalQuestion(q, bank, state.direction)]));
    return state.order.map((id, index) => {
      const q = indexed[id];
      const attempt = state.firstAttempts && state.firstAttempts[id];
      return {
        number: index + 1,
        question: q,
        firstCorrect: attempt ? attempt.correct : null,
        firstSelection: attempt && attempt.selected ? [...attempt.selected] : null,
        mastered: state.mastered.includes(id),
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
  return { ROUND_SIZE, ROUND_OPTIONS, TERM_FIRST, DEF_FIRST, normalizeSettings, normalizeDirection, hasStudyPairs, supportsReverse, directionalQuestion, validateBank, startSession, restoreSession, currentQuestion, submit, advance, beginReview, summary, answeredNew, getMissedHistory, questionReport };
});
