/* Study hierarchy: MLT 6 -> six familiar study units -> textbook lessons.
 * Verified course questions live ONCE in their lesson banks (approved-banks.js).
 * The unit comprehensive and unit-wide bookmarks are derived views in source order.
 * Legacy easy Test23 demo never contributes to verified course views. */
(function (root) {
  'use strict';
  const units = root.MLT6_UNITS || {};
  const registered = root.MLT6_APPROVED_BANKS || {};
  const bookmarks = root.MLT6Bookmarks;
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  function checkBank(bank) {
    if (!bank || bank.verified !== true || !nonempty(bank.bankId) || !nonempty(bank.version) ||
        (bank.releaseStatus !== undefined && bank.releaseStatus !== 'APPROVED') ||
        !Array.isArray(bank.questions) || !bank.questions.length) return false;
    const seen = new Set();
    for (const q of bank.questions) {
      if (!q || !nonempty(q.id) || seen.has(q.id) ||
          !['single', 'multi'].includes(q.type) || !nonempty(q.question) ||
          !Array.isArray(q.choices) || q.choices.length !== 4 ||
          q.choices.some(c => !c || !nonempty(c.id) || !nonempty(c.text)) ||
          new Set(q.choices.map(c => c.id)).size !== 4 ||
          !Array.isArray(q.correct) || !q.correct.length ||
          new Set(q.correct).size !== q.correct.length ||
          (q.type === 'single' ? q.correct.length !== 1 : q.correct.length < 2) ||
          q.correct.some(id => !q.choices.some(c => c.id === id)) ||
          !q.explanation || !nonempty(q.explanation.summary) ||
          !(nonempty(q.explanation.pageNumber) ||
            (Number.isInteger(q.explanation.pageNumber) && q.explanation.pageNumber > 0)) ||
          !nonempty(q.explanation.directQuote) ||
          (q.explanation.sourceName != null && typeof q.explanation.sourceName !== 'string')) return false;
      seen.add(q.id);
    }
    return true;
  }
  function normalizeBank(bank, lessonId) {
    if (!checkBank(bank) || (bank.lessonId !== undefined && bank.lessonId !== lessonId)) return null;
    if (bank.schemaVersion === undefined) return bank; // Legacy runtime format.
    if (bank.schemaVersion !== '1.0' || bank.releaseStatus !== 'APPROVED' ||
        bank.lessonId !== lessonId || String(bank.parentUnit) !== lessonId.split('.')[0]) return null;
    const positions = new Set();
    const questions = [];
    for (const q of bank.questions) {
      const study = q.study;
      if (q.lessonId !== lessonId || !Number.isSafeInteger(q.sourceOrder) ||
          q.sourceOrder < 1 || positions.has(q.sourceOrder) ||
          !study || typeof study.reversible !== 'boolean' ||
          (study.reversible && (!nonempty(study.term) || !nonempty(study.definition)))) return null;
      positions.add(q.sourceOrder);
      const runtime = { ...q, reversible: study.reversible };
      // Forward recall uses the published stem and answer key unless the source
      // audit explicitly approves this question as a reversible pair.
      runtime.term = study.reversible ? study.term : q.question;
      runtime.definition = study.reversible ? study.definition :
        q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join('; ');
      questions.push(runtime);
    }
    questions.sort((a, b) => a.sourceOrder - b.sourceOrder);
    return { ...bank, questions };
  }
  const approved = new Map();
  const bankCounts = new Map();
  for (const unit of Object.values(units)) {
    for (const lesson of unit.lessons) {
      const bank = normalizeBank(registered[lesson.id], lesson.id);
      if (!bank) continue;
      approved.set(lesson.id, bank);
      bankCounts.set(bank.bankId, (bankCounts.get(bank.bankId) || 0) + 1);
    }
  }
  function lessonOf(unitId, lessonId) {
    const unit = Object.hasOwn(units, unitId) && units[unitId];
    return unit && unit.lessons.find(x => x.id === lessonId);
  }
  function verifiedLesson(unitId, lessonId) {
    const bank = approved.get(lessonId);
    return lessonOf(unitId, lessonId) && bank && bankCounts.get(bank.bankId) === 1 ? bank : null;
  }
  function dedupeKey(q) {
    if (typeof q.canonicalId === 'string' && q.canonicalId.trim())
      return 'canonical:' + q.canonicalId.trim();
    // Equivalent stems with equivalent answer keys count as one question, even
    // if they were accidentally imported under two lesson identifiers.
    const normalize = value => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
    const correctTexts = q.choices.filter(c => q.correct.includes(c.id))
      .map(c => normalize(c.text)).sort();
    return JSON.stringify([normalize(q.question), correctTexts]);
  }
  function compactVersion(text) {
    // Keep localStorage keys short even when hundreds of questions are saved.
    let h = 2166136261;
    for (let i = 0; i < text.length; i++)
      h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
    return h.toString(36);
  }
  function aggregate(unitId) {
    const unit = Object.hasOwn(units, unitId) && units[unitId];
    if (!unit) return null;
    const valid = [], missing = [], invalid = [], versions = [], questions = [];
    const seen = new Map();
    for (const lesson of unit.lessons) {
      if (!Object.hasOwn(registered, lesson.id)) { missing.push(lesson.id); continue; }
      const bank = verifiedLesson(unitId, lesson.id);
      if (!bank) {
        invalid.push(lesson.id);
        continue;
      }
      valid.push(lesson.id);
      versions.push(lesson.id + '@' + bank.version);
      for (const q of bank.questions) {
        const fingerprint = dedupeKey(q);
        const original = {
          bankId: bank.bankId, version: bank.version, id: q.id
        };
        if (seen.has(fingerprint)) {
          // Keep the earliest textbook occurrence, but preserve EVERY source
          // origin, so a bookmark on any duplicate is still represented.
          seen.get(fingerprint).alternateOrigins.push(original);
          continue;
        }
        const combined = {
          ...q,
          id: 'unit-' + unitId + '/' + lesson.id + '/' + q.id,
          originQuestionId: q.id,
          originBankId: bank.bankId,
          originVersion: bank.version,
          originLessonId: lesson.id,
          alternateOrigins: [],
          lessonTitle: lesson.title,
          chapterTitle: 'Lesson ' + lesson.id + ' · ' + lesson.title
        };
        seen.set(fingerprint, combined);
        questions.push(combined);
      }
    }
    // A unit comprehensive is usable from the first verified lesson; never gate
    // on completion of every lesson. With zero questions, routes stay available
    // and the study engines display a truthful empty state.
    const complete = unit.lessons.length > 0 && missing.length === 0 && invalid.length === 0;
    const ready = questions.length > 0;
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
      unitId, unit, ready, complete, valid, missing, invalid,
      questionCount: questions.length, bookmarkedCount: bookmarkQuestions.length,
      bank: ready ? bank : null,
      // All Bookmarks and Comprehensive both build progressively from verified
      // lesson banks. Neither requires every listed lesson to be populated.
      bookmarkBank: {
        verified: true,
        bankId: 'mlt6-unit-' + unitId + '-all-bookmarks',
        version: 'bookmarks-v2-' + bookmarkQuestions.length + '-' +
          compactVersion(versions.join('~') + '|' + bookmarkQuestions.map(q => q.id).join('|')),
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
  const unit = Object.hasOwn(units, unitId) && units[unitId];
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
    root.DEMO_QUESTION_BANK = status.bank;
    root.MLT6_BANK_CONTEXT = context('comprehensive',
      unit.title + ' · Comprehensive', rootHref,
      status.ready ? '' :
        'No verified course questions are available in this unit yet. The comprehensive is open and will automatically include approved lesson questions as they are added.');
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
