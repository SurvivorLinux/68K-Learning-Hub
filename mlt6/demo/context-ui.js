/* Keep lesson, comprehensive, and All Bookmarks study modes in their own scope.
 * A content page never silently falls back to the Test23 easy demo. */
(function () {
  'use strict';
  const ctx = window.MLT6_BANK_CONTEXT;
  if (!ctx) return; // Legacy direct demo bookmark remains compatible.
  const scope = new URLSearchParams();
  if (ctx.unitId) scope.set('unit', ctx.unitId);
  if (ctx.lessonId) scope.set('lesson', ctx.lessonId);
  else if (ctx.kind === 'comprehensive') scope.set('bank', 'unit');
  else if (ctx.kind === 'all-bookmarks') scope.set('bank', 'bookmarks');
  else if (ctx.kind === 'demo') scope.set('demo', '1');
  window.MLT6_SCOPE_SUFFIX = scope.toString();
  function preserved(href) {
    const url = new URL(href, window.location.href);
    for (const [key, value] of scope) url.searchParams.set(key, value);
    return url.href;
  }
  const eyebrow = document.querySelector('.intro .eyebrow');
  const hint = document.querySelector('.notice');
  const small = document.querySelector('.brand small');
  const demoPill = document.querySelector('.demo-pill');
  const sourceCrumb = document.querySelector('.crumb a[href*="study.html"]');
  const footer = document.querySelector('.mode-footer a');
  const contextName = ctx.title;
  const backHref = ctx.backHref || '../index.html#mlt6';
  if (small) small.textContent = contextName;
  if (demoPill && ctx.kind !== 'demo') demoPill.textContent = 'MLT 106';
  if (eyebrow) eyebrow.textContent = (ctx.kind === 'lesson' ?
    'MLT 106 · Individual lesson' : ctx.kind === 'comprehensive' ?
    'MLT 106 · Unit comprehensive' : ctx.kind === 'all-bookmarks' ?
    'MLT 106 · All Bookmarks' : ctx.kind === 'demo' ?
    'MLT 106 · Easy feature demo' : 'MLT 106 · Not yet available');
  if (sourceCrumb) {
    sourceCrumb.textContent = contextName;
    sourceCrumb.href = backHref;
  }
  if (footer) {
    footer.textContent = ctx.kind === 'lesson' ?
      '← Back to unit lessons' : ctx.kind === 'demo' ?
      '← Back to ABO unit' : '← Back to this study unit';
    footer.href = backHref;
  }
  if (hint && ctx.kind !== 'demo') {
    hint.textContent = ctx.kind === 'all-bookmarks' ?
      'This unit bookmark collection gathers approved questions across its lessons without duplicates. Changing a bookmark here also changes it within its original lesson.' :
      ctx.kind === 'comprehensive' ?
      'This unit comprehensive combines approved questions from the available lessons in textbook order, even while other lessons are awaiting question banks. Bookmarks are shared with the original lessons.' :
      ctx.kind === 'lesson' ?
      'Verified course questions from this textbook lesson. Save questions here to review them individually or under your unit’s All Bookmarks.' :
      ctx.message;
  }
  const description = document.querySelector('.intro p:not(.eyebrow):not(.checkpoint-note)');
  if (description && ctx.kind !== 'demo') {
    description.textContent = ctx.kind === 'all-bookmarks' ?
      'Your saved questions across this unit, each displayed once.' :
      ctx.kind === 'comprehensive' ?
      'Practice currently approved lesson questions together. More appear automatically as lessons are added; shuffle remains optional.' :
      ctx.kind === 'lesson' ?
      'Study this lesson with required reviews, flashcards, written recall, or exam simulation.' :
      ctx.message;
  }
  for (const a of document.querySelectorAll('.study-tabs a, .quiz-path-links a')) {
    a.href = preserved(a.href);
  }
  document.title = contextName + ' | 68K Learning Hub';
  if (!window.DEMO_QUESTION_BANK && ctx.message) {
    const host = document.getElementById('app') ||
      document.getElementById('mode-root') || document.getElementById('exam-root');
    if (host) host.textContent = ctx.message;
  }
})();
