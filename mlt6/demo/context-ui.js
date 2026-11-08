/* Adapt the shared six-mode engine to a chapter or all-chapters bank.
 * Legacy bare Test23 demo URLs continue to display their original demo labels. */
(function () {
  'use strict';
  const context = window.MLT6_BANK_CONTEXT;
  if (!context || context.kind === 'demo') return;
  const params = new URLSearchParams(window.location.search);
  const scopeParameter = context.kind === 'unit' ? 'bank' : 'chapter';
  const scopeValue = context.kind === 'unit' ? 'unit' : context.id;
  function preserveScope(href) {
    const address = new URL(href, window.location.href);
    address.searchParams.set(scopeParameter, scopeValue);
    return address.href;
  }
  const heading = document.querySelector('.intro .eyebrow');
  const warning = document.querySelector('.notice');
  const small = document.querySelector('.brand small');
  const scopeCrumb = document.querySelector('.crumb a[href*="study.html"]');
  const footer = document.querySelector('.mode-footer a');
  const backHref = context.kind === 'unit' ? '../comprehensive.html' :
    '../study.html?chapter=' + encodeURIComponent(context.id);
  const displayName = context.title;
  if (heading) heading.textContent = context.kind === 'unit' ?
    'MLT 6 · All-chapters comprehensive' : 'MLT 6 · Verified chapter bank';
  if (small) small.textContent = displayName;
  if (scopeCrumb) {
    scopeCrumb.textContent = context.kind === 'unit' ? 'All-Chapters Comprehensive' : displayName;
    scopeCrumb.href = backHref;
  }
  if (footer) {
    footer.textContent = context.kind === 'unit' ?
      '← Back to all-chapters comprehensive' : '← Back to chapter study';
    footer.href = backHref;
  }
  if (warning) {
    warning.textContent = context.kind === 'unit' ?
      'Verified chapter question banks are combined in textbook order. The comprehensive is a derived view, not a duplicated bank.' :
      'This chapter uses verified course-source questions. Explanations and quotations follow the applicable study-mode feedback rules.';
  }
  const note = document.querySelector('.intro p:not(.eyebrow):not(.checkpoint-note)');
  if (note) note.textContent = context.kind === 'unit' ?
    'Practice the complete verified unit across chapters. Default question order follows the source; enable shuffle in settings if preferred.' :
    'Practice this verified chapter on its own. Default question order follows the book; enable shuffle in settings if preferred.';
  for (const link of document.querySelectorAll('.study-tabs a, .quiz-path-links a')) {
    link.href = preserveScope(link.href);
  }
  document.title = document.title.replace('Test23: ABO', displayName);
  // preserveScope is also used by modes-ui for links created after this script runs.
  window.MLT6_SCOPE_SUFFIX = scopeParameter + '=' + encodeURIComponent(scopeValue);
  if (!window.DEMO_QUESTION_BANK && context.message) {
    const location = document.getElementById('app') ||
      document.getElementById('mode-root') || document.getElementById('exam-root');
    if (location) location.textContent = context.message;
  }
})();