/* Study hierarchy: MLT 6 -> six familiar study units -> textbook lessons.
 * Verified course questions live ONCE in their lesson banks (approved-banks.js).
 * The unit comprehensive and unit-wide bookmarks are derived views in source order.
 * Legacy easy Test23 demo never contributes to verified course views. */
(function (root) {
  'use strict';
  const units = root.MLT6_UNITS || {};
  const registered = root.MLT6_APPROVED_BANKS || {};
  const bookmarks = root.MLT6Bookmarks;
  function checkBank(bank) {
    if (!bank || bank.verified !== true || typeof bank.bankId !== 'string' ||
        !bank.bankId || typeof bank.version !== 'string' || !bank.version ||
        !Array.isArray(bank.questions) || !bank.questions.length) return false;
    const seen = new Set();
    for (const q of bank.questions) {
      if (!q || typeof q.id !== 'string' || !q.id || seen.has(q.id) ||
          !['single', 'multi'].includes(q.type) || !String(q.question || '').trim() ||
          !Array.isArray(q.choices) || q.choices.length !== 4 ||
          q.choices.some(c => !c || typeof c.id !== 'string' || !c.id || !String(c.text || '').trim()) ||
          new Set(q.choices.map(c => c.id)).size !== 4 ||
          !Array.isArray(q.correct) || !q.correct.length ||
          new Set(q.correct).size !== q.correct.length ||
          (q.type === 'single' ? q.correct.length !== 1 : q.correct.length < 2) ||
          q.correct.some(id => !q.choices.some(c => c.id === id)) ||
          !q.explanation || typeof q.explanation.summary !== 'string' ||
          !q.explanation.summary.trim() ||
          q.explanation.pageNumber == null ||
          typeof q.explanation.directQuote !== 'string' ||
          !q.explanation.directQuote.trim()) return false;
      seen.add(q.id);
    }
    return true;
  }
  function lessonOf(unitId, lessonId) {
    const unit = units[unitId];
    return unit && unit.lessons.find(x => x.id === lessonId);
  }
  function verifiedLesson(unitId, lessonId) {
    return lessonOf(unitId, lessonId) && checkBank(registered[lessonId]) ?
      registered[lessonId] : null;
  }
  function dedupeKey(q) {
    if (typeof q.canonicalId === 'string' && q.canonicalId.trim())
      return 'canonical:' + q.canonicalId.trim();
    // Equivalent stems with equivalent answer keys count as one question, even
    // if they were accidentally imported under two lesson identifiers.
    const correctTexts = q.choices.filter(c => q.correct.includes(c.id))
      .map(c => String(c.text).replace(/\s+/g, ' ').trim().toLowerCase()).sort();
    return 'question:' + String(q.question).replace(/\s+/g, ' ').trim().toLowerCase() +
      '|answers:' + correctTexts.join('|');
  }
  function aggregate(unitId) {
    const unit = units[unitId];
    if (!unit) return null;
    const valid = [], missing = [], invalid = [], versions = [], questions = [];
    const seen = new Set(), bankIDs = new Set();
    for (const lesson of unit.lessons) {
      const bank = registered[lesson.id];
      if (!bank) { missing.push(lesson.id); continue; }
      if (!checkBank(bank) || bankIDs.has(bank.bankId)) {
        invalid.push(lesson.id);
        continue;
      }
      valid.push(lesson.id);
      bankIDs.add(bank.bankId);
      versions.push(lesson.id + '@' + bank.version);
      for (const q of bank.questions) {
        const fingerprint = dedupeKey(q);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        questions.push({
          ...q,
          id: 'unit-' + unitId + '/' + lesson.id + '/' + q.id,
          originQuestionId: q.id,
          originBankId: bank.bankId,
          originVersion: bank.version,
          originLessonId: lesson.id,
          lessonTitle: lesson.title,
          chapterTitle: 'Lesson ' + lesson.id + ' · ' + lesson.title
        });
      }
    }
    const ready = unit.lessons.length > 0 && missing.length === 0 && invalid.length === 0;
    const bank = {
      verified: ready, bankId: 'mlt6-unit-' + unitId + '-comprehensive',
      version: 'assembled-v2-' + versions.join('~'),
      title: unit.title + ' · All Lessons',
      questions,
      reversePool: questions
    };
    const saved = bookmarks ? bookmarks.list(bank) : new Set();
    const bookmarkQuestions = questions.filter(q => saved.has(q.id));
    return {
      unitId, unit, ready, valid, missing, invalid,
      questionCount: questions.length, bookmarkedCount: bookmarkQuestions.length,
      bank: ready ? bank : null,
      // All Bookmarks must work with any completed lessons; unlike the full
      // comprehensive, it must NOT wait for all lessons to become available.
      bookmarkBank: {
        verified: true,
        bankId: 'mlt6-unit-' + unitId + '-all-bookmarks',
        version: 'bookmarks-v2-' + versions.join('~') + '-' +
          bookmarkQuestions.map(q => q.id).join('|'),
        title: unit.title + ' · All Bookmarks',
        questions: bookmarkQuestions,
        reversePool: questions
      }
    };
  }
  const library = Object.freeze({ checkBank, lessonOf, verifiedLesson, aggregate, dedupeKey });
  root.MLT6Library = library;
  // Old entry point has been replaced with a per-study-unit view.
  root.MLT6BankCatalog = library;
  const params = new URLSearchParams(root.location.search);
  const unitId = params.get('unit');
  const lessonId = params.get('lesson');
  const view = params.get('bank');
  const demo = params.get('demo');
  if (!unitId && !lessonId && !view && !demo) return; // legacy bare demo.
  const unit = units[unitId];
  const rootHref = '../study.html?unit=' + encodeURIComponent(unitId || '');
  function context(kind, title, backHref, message) {
    return { kind, unitId, lessonId, title, backHref, message: message || '' };
  }
  if (!unit) {
    root.DEMO_QUESTION_BANK = null;
    root.MLT6_BANK_CONTEXT = context('missing', 'Unknown MLT 6 study unit',
      '../index.html#mlt6', 'Choose a valid MLT 6 study unit.');
  } else if (lessonId) {
    const lesson = lessonOf(unitId, lessonId);
    const bank = verifiedLesson(unitId, lessonId);
    root.DEMO_QUESTION_BANK = bank;
    root.MLT6_BANK_CONTEXT = context(bank ? 'lesson' : 'missing',
      lesson ? 'Lesson ' + lesson.id + ' · ' + lesson.title : 'Unknown lesson',
      rootHref, bank ? '' : 'This lesson is awaiting verified textbook questions.');
  } else if (view === 'unit') {
    const status = aggregate(unitId);
    root.DEMO_QUESTION_BANK = status.ready ? status.bank : null;
    root.MLT6_BANK_CONTEXT = context(status.ready ? 'comprehensive' : 'missing',
      unit.title + ' · Comprehensive', rootHref,
      status.ready ? '' : 'This unit comprehensive is not ready: every listed lesson must have a verified question bank.');
  } else if (view === 'bookmarks') {
    const status = aggregate(unitId);
    root.DEMO_QUESTION_BANK = status.bookmarkBank;
    root.MLT6_BANK_CONTEXT = context('all-bookmarks',
      unit.title + ' · All Bookmarks', rootHref,
      status.bookmarkedCount ? '' : 'No bookmarked questions in this unit yet.');
  } else if (demo === '1' && unitId === '23') {
    root.MLT6_BANK_CONTEXT = context('demo', 'ABO · Feature demo', rootHref, '');
  } else {
    root.DEMO_QUESTION_BANK = null;
    root.MLT6_BANK_CONTEXT = context('missing', unit.title, rootHref,
      'Select an individual textbook lesson, Comprehensive, or All Bookmarks from this study unit.');
  }
})(window);