/* Chapter-scoped or all-chapter question-bank selection.
 * The unit comprehensive is a derived VIEW of verified chapter banks, not a copy.
 * This utility deliberately excludes the unverified Test23 feature-demo bank. */
(function (root) {
  'use strict';
  const chapters = root.MLT6_TESTS || {};
  const chapterOrder = root.MLT6_CHAPTER_ORDER || Object.keys(chapters);
  const approved = root.MLT6_APPROVED_BANKS || {};
  function checkBank(bank) {
    if (!bank || bank.verified !== true || !bank.bankId ||
        typeof bank.version !== 'string' || !bank.version ||
        !Array.isArray(bank.questions) || bank.questions.length === 0) return false;
    const ids = new Set();
    for (const q of bank.questions) {
      if (!q || typeof q.id !== 'string' || ids.has(q.id) ||
          !['single', 'multi'].includes(q.type) || !q.question ||
          !Array.isArray(q.choices) || q.choices.length !== 4 ||
          new Set(q.choices.map(choice => choice.id)).size !== 4 ||
          q.choices.some(choice => !choice.id || !choice.text) ||
          !Array.isArray(q.correct) ||
          q.correct.length < (q.type === 'multi' ? 2 : 1) ||
          (q.type === 'single' && q.correct.length !== 1) ||
          q.correct.some(id => !q.choices.some(choice => choice.id === id)) ||
          !q.explanation || !q.explanation.summary ||
          q.explanation.pageNumber == null ||
          !String(q.explanation.directQuote || '').trim()) return false;
      ids.add(q.id);
    }
    return true;
  }
  function makeComprehensive(order, registry) {
    const missing = [], invalid = [], ready = [], questions = [], versions = [];
    const ordered = Array.from(order);
    for (const id of ordered) {
      const bank = registry[id];
      if (!bank) { missing.push(id); continue; }
      if (!checkBank(bank)) { invalid.push(id); continue; }
      ready.push(id);
      versions.push(id + '@' + bank.version);
      // Preserve the chapter order and the original in-chapter source order.
      for (const q of bank.questions) {
        questions.push({ ...q, id: 'chapter-' + id + ':' + q.id,
          chapterId: id, chapterTitle: chapters[id] ? chapters[id].chapterTitle : id });
      }
    }
    const complete = ordered.length >= 2 && !missing.length && !invalid.length;
    return {
      ready: complete, chapterCount: ordered.length, readyChapters: ready,
      missing, invalid, questionCount: complete ? questions.length : 0,
      bank: complete ? {
        verified: true,
        bankId: 'mlt6-all-chapters',
        version: 'combined-v1-' + versions.join('__'),
        title: 'MLT 6 · All Chapters Comprehensive',
        description: 'All approved MLT 6 chapters in original source order.',
        questions
      } : null
    };
  }
  const status = makeComprehensive(chapterOrder, approved);
  root.MLT6_COMPREHENSIVE_STATUS = status;
  root.MLT6BankCatalog = Object.freeze({ checkBank, makeComprehensive });
  const params = new URLSearchParams(root.location.search);
  if (params.get('bank') === 'unit') {
    root.DEMO_QUESTION_BANK = status.bank;
    root.MLT6_BANK_CONTEXT = {
      kind: 'unit',
      title: 'MLT 6 · All Chapters Comprehensive',
      backHref: '../comprehensive.html',
      message: status.ready ? '' :
        'The all-chapters comprehensive is not ready. Approved question banks are required for every chapter.'
    };
  } else {
    const chapterId = params.get('chapter');
    if (!chapterId) return; // Legacy Test23 feature-demo URLs keep working.
    const item = chapters[chapterId];
    const candidate = approved[chapterId];
    if (item && checkBank(candidate)) {
      root.DEMO_QUESTION_BANK = candidate;
      root.MLT6_BANK_CONTEXT = {
        kind: 'chapter', id: chapterId,
        title: item.chapterTitle + ' · MLT 6',
        backHref: '../study.html?chapter=' + encodeURIComponent(chapterId),
        message: ''
      };
    } else if (chapterId === '23' && item && !candidate) {
      root.MLT6_BANK_CONTEXT = {
        kind: 'demo', id: chapterId,
        title: 'Test23: ABO · Easy Feature Demo',
        backHref: '../study.html?chapter=23',
        message: ''
      };
    } else {
      root.DEMO_QUESTION_BANK = null;
      root.MLT6_BANK_CONTEXT = {
        kind: 'missing', id: chapterId,
        title: item ? item.chapterTitle : 'Unknown chapter',
        backHref: '../index.html#mlt6',
        message: 'A verified question bank is not available for this chapter yet.'
      };
    }
  }
})(window);