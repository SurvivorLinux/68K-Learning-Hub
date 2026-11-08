/* Exam UI: no answer feedback or source explanations are shown before submission. */
(function () {
  'use strict';
  const bank = window.DEMO_QUESTION_BANK;
  const quizCore = window.QuizCore;
  const examCore = window.ExamCore;
  const root = document.getElementById('exam-root');
  if (!bank || !quizCore || !examCore || !root) {
    if (root) root.textContent = (window.MLT6_BANK_CONTEXT && window.MLT6_BANK_CONTEXT.message) || 'Unable to load Exam Mode.';
    return;
  }
  const examKey = '68k:exam:session:' + bank.bankId + ':' + bank.version;
  const bookmarksKey = '68k:quiz:bookmarks:' + bank.bankId + ':' + bank.version;
  const settingsKey = '68k:quiz:settings:' + bank.bankId;
  const directionKey = '68k:quiz:direction:' + bank.bankId + ':' + bank.version;
  const validIDs = new Set(bank.questions.map(q => q.id));
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (_) { document.getElementById('exam-storage').textContent = 'This browser cannot save exam progress.'; }
  }
  function make(tag, css, text) {
    const element = document.createElement(tag);
    if (css) element.className = css;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function button(text, css, click) {
    const element = make('button', css, text);
    element.type = 'button';
    element.addEventListener('click', click);
    return element;
  }
  function panel() {
    root.replaceChildren();
    const outer = make('section', 'panel exam-panel');
    root.append(outer);
    return outer;
  }
  const rawBookmarks = read(bookmarksKey);
  const bookmarks = new Set(Array.isArray(rawBookmarks) ? rawBookmarks.filter(id => validIDs.has(id)) : []);
  let state;
  let setup = quizCore.normalizeSettings({
    ...(read(settingsKey) || {}),
    direction: read(directionKey) || quizCore.TERM_FIRST
  });
  try {
    quizCore.validateBank(bank);
    state = examCore.restoreExam(bank, quizCore, read(examKey));
  } catch (error) {
    root.textContent = 'Unable to prepare Exam Mode: ' + error.message;
    return;
  }
  function persist() { if (state) save(examKey, state); }
  function toggleBookmark(id) {
    if (bookmarks.has(id)) bookmarks.delete(id); else bookmarks.add(id);
    save(bookmarksKey, [...bookmarks]);
    render();
  }
  function bookmarkButton(id) {
    const marked = bookmarks.has(id);
    const b = button(marked ? '★ Bookmarked' : '☆ Bookmark',
      'bookmark-toggle' + (marked ? ' is-bookmarked' : ''), () => toggleBookmark(id));
    b.setAttribute('aria-pressed', String(marked));
    b.setAttribute('aria-label', marked ? 'Remove bookmark' : 'Bookmark question');
    return b;
  }
  function optionText(question, chosen) {
    if (!chosen || !chosen.length) return 'Not answered';
    return question.choices.filter(c => chosen.includes(c.id)).map(c => c.text).join('; ');
  }
  function sourceDetails(question) {
    const ex = question.explanation || {};
    const box = make('div', 'exam-source-details');
    const page = make('p');
    page.append(make('strong', '', 'Textbook page: '),
      make('span', '', ex.pageNumber != null ? 'Page ' + ex.pageNumber : 'Not available for demo questions.'));
    box.append(page);
    const rationale = make('p');
    rationale.append(make('strong', '', 'Summarized explanation: '),
      make('span', '', ex.summary || 'No explanation supplied.'));
    box.append(rationale, make('strong', '', 'Direct source quote'));
    if (ex.directQuote) box.append(make('blockquote', 'source-quote', ex.directQuote));
    else box.append(make('p', 'quiet', 'No verified textbook quotation available for this demo.'));
    if (ex.sourceName) box.append(make('p', 'quiet', 'Source: ' + ex.sourceName));
    return box;
  }
  function radioOption(group, value, text, selected, onChange, disabled) {
    const label = make('label', 'exam-setting-option');
    const radio = make('input');
    radio.type = 'radio';
    radio.name = group;
    radio.value = value;
    radio.checked = selected;
    radio.disabled = !!disabled;
    radio.addEventListener('change', () => { if (!radio.disabled) onChange(); });
    label.append(radio, make('span', '', text));
    return label;
  }
  function renderSetup() {
    const target = panel();
    target.append(make('p', 'stage-label', 'Ready to begin'));
    target.append(make('h2', '', 'Practice exam setup'));
    target.append(make('p', 'quiet',
      bank.questions.length + ' questions · No immediate feedback · No mandatory review rounds · Results after submission.'));
    target.append(make('p', 'quiet',
      'You may move between questions, change answers, or leave questions blank before submitting. Your in-progress exam saves on this device.'));
    const directionFields = make('fieldset', 'exam-settings');
    directionFields.append(make('legend', '', 'Question direction'));
    for (const [value, text] of [
      [quizCore.TERM_FIRST, 'Term → Definition'],
      [quizCore.DEF_FIRST, 'Definition → Term']
    ]) {
      directionFields.append(radioOption('exam-direction', value, text,
        setup.direction === value,
        () => { setup.direction = value; }, value === quizCore.DEF_FIRST && !quizCore.supportsReverse(bank)));
    }
    target.append(directionFields);
    const row = make('label', 'exam-check');
    const shuffle = make('input');
    shuffle.type = 'checkbox';
    shuffle.checked = setup.shuffleQuestions;
    shuffle.addEventListener('change', () => { setup.shuffleQuestions = shuffle.checked; });
    row.append(shuffle, make('span', '', 'Shuffle question order'));
    target.append(row);
    target.append(make('p', 'quiet',
      'Answer choices are always shuffled. These exam settings do not overwrite your learning-mode preferences.'));
    const actions = make('div', 'actions');
    actions.append(button('Start exam →', 'primary', function () {
      state = examCore.startExam(bank, quizCore, setup);
      persist();
      render();
    }));
    target.append(actions);
  }
  function renderQuestion() {
    const target = panel();
    const id = state.order[state.index];
    const q = examCore.shownQuestion(state, bank, id, quizCore);
    const selected = state.answers[id] || [];
    const number = state.index + 1;
    const answered = examCore.answeredCount(state);
    target.append(make('p', 'stage-label', 'Exam in progress · No answer feedback until submission'));
    const progress = make('div', 'exam-progress-text');
    progress.append(make('strong', '', 'Question ' + number + ' of ' + state.order.length),
      make('span', 'quiet', answered + ' of ' + state.order.length + ' answered'));
    target.append(progress);
    const track = make('div', 'exam-progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Questions answered');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(state.order.length));
    track.setAttribute('aria-valuenow', String(answered));
    const fill = make('div', 'exam-progress-fill');
    fill.style.width = (answered / state.order.length * 100) + '%';
    track.append(fill);
    target.append(track);
    const tools = make('div', 'exam-question-tools');
    tools.append(make('span', 'counter', q.type === 'multi' ? 'Select all that apply' : 'Choose one answer'));
    tools.append(bookmarkButton(id));
    target.append(tools);
    if (q.chapterTitle && window.MLT6_BANK_CONTEXT && window.MLT6_BANK_CONTEXT.kind === 'unit')
      target.append(make('p', 'chapter-origin', 'Chapter: ' + q.chapterTitle));
    target.append(make('h2', '', q.question));
    const answers = make('div', 'answers');
    const letters = ['A', 'B', 'C', 'D'];
    state.optionOrders[id].forEach((optionId, i) => {
      const option = q.choices.find(c => c.id === optionId);
      const picked = selected.includes(optionId);
      const item = button('', 'choice' + (picked ? ' selected' : ''), function () {
        const updated = q.type === 'single' ? [optionId] :
          picked ? selected.filter(v => v !== optionId) : [...selected, optionId];
        examCore.setAnswer(state, bank, quizCore, updated);
        persist();
        render();
      });
      item.setAttribute('aria-pressed', String(picked));
      item.append(make('span', 'choice-key', letters[i]), make('span', 'choice-text', option.text));
      if (picked && q.type === 'multi') item.append(make('span', 'choice-check', '✓'));
      answers.append(item);
    });
    target.append(answers);
    const row = make('div', 'exam-question-actions');
    const clear = button('Clear answer', 'secondary', () => {
      examCore.setAnswer(state, bank, quizCore, []);
      persist(); render();
    });
    clear.disabled = !selected.length;
    const previous = button('← Previous', 'secondary', () => {
      examCore.goTo(state, state.index - 1); persist(); render();
    });
    previous.disabled = state.index === 0;
    const next = button('Next →', 'primary', () => {
      examCore.goTo(state, state.index + 1); persist(); render();
    });
    next.disabled = state.index === state.order.length - 1;
    row.append(clear, previous, next);
    target.append(row);
    target.append(make('h3', 'exam-nav-heading', 'Jump to a question'));
    const navigator = make('div', 'exam-question-jump');
    state.order.forEach((questionId, index) => {
      const flagged = !!(state.answers[questionId] && state.answers[questionId].length);
      const jump = button(String(index + 1),
        'exam-jump' + (index === state.index ? ' is-current' : '') +
        (flagged ? ' is-answered' : ''), () => {
          examCore.goTo(state, index); persist(); render();
        });
      jump.setAttribute('aria-label', 'Question ' + (index + 1) +
        (flagged ? ', answered' : ', unanswered') +
        (index === state.index ? ', current' : ''));
      if (index === state.index) jump.setAttribute('aria-current', 'step');
      navigator.append(jump);
    });
    target.append(navigator);
    const remaining = state.order.length - answered;
    const submit = button('Submit exam and view results', 'exam-submit', function () {
      const message = remaining ?
        'Submit the exam with ' + remaining + ' unanswered ' +
        (remaining === 1 ? 'question' : 'questions') + '? Unanswered questions will be marked incorrect. You cannot edit your answers after submitting.' :
        'Submit your exam? You cannot change answers afterward. Your results and explanations will be revealed.';
      if (!window.confirm(message)) return;
      examCore.submitExam(state);
      persist();
      render();
    });
    target.append(submit);
    target.append(make('p', 'exam-no-feedback', 'Correct answers, grading, and source explanations remain hidden until final submission.'));
  }
  function renderResults() {
    const target = panel();
    const result = examCore.results(state, bank, quizCore);
    target.append(make('p', 'stage-label', 'Exam complete'));
    target.append(make('h2', '', 'Exam results'));
    const grid = make('div', 'summary-grid');
    for (const [value, name] of [
      [result.percent + '%', 'Exam score'],
      [result.correct + ' / ' + result.total, 'Correct'],
      [String(result.incorrect), 'Incorrect or blank']
    ]) {
      const cell = make('div', 'summary-cell');
      cell.append(make('strong', '', value), make('span', '', name));
      grid.append(cell);
    }
    target.append(grid);
    target.append(make('p', 'quiet',
      result.skipped ? result.skipped + ' unanswered questions counted as incorrect.' :
        'All questions were answered. No answers were revealed before submission.'));
    const actions = make('div', 'actions');
    actions.append(button('Retake exam', 'primary', resetExam));
    target.append(actions);
    const report = make('section', 'question-report');
    report.append(make('h2', '', 'All questions and explanations'));
    report.append(make('p', 'report-intro',
      'Answers are shown in the order presented during this exam. You may bookmark difficult questions for later study.'));
    for (const record of result.report) {
      const q = record.question;
      const item = make('article', 'result-item ' + (record.correct ? 'result-correct' : 'result-incorrect'));
      const header = make('div', 'result-marker');
      header.append(make('span', 'result-number',
        'Question ' + record.number + ' of ' + result.total));
      header.append(make('span', 'result-badge ' + (record.correct ? 'is-correct' : 'is-incorrect'),
        record.correct ? 'Correct' : record.skipped ? 'Unanswered' : 'Incorrect'));
      header.append(bookmarkButton(record.id));
      item.append(header);
      if (q.chapterTitle && window.MLT6_BANK_CONTEXT && window.MLT6_BANK_CONTEXT.kind === 'unit')
        item.append(make('p', 'chapter-origin', 'Chapter: ' + q.chapterTitle));
      item.append(make('h3', '', q.question));
      const chosen = make('p', 'result-line');
      chosen.append(make('strong', '', 'Your answer: '), make('span', '', optionText(q, record.chosen)));
      const correct = make('p', 'result-line');
      correct.append(make('strong', '', 'Correct answer: '), make('span', '', optionText(q, q.correct)));
      item.append(chosen, correct, sourceDetails(q));
      report.append(item);
    }
    target.append(report);
  }
  function resetExam() {
    if (!window.confirm('Start a new practice exam? The previous exam answers and score will be replaced. Learning Mode progress and bookmarks will stay saved.')) return;
    state = null;
    try { localStorage.removeItem(examKey); } catch (_) { /* Optional storage */ }
    render();
  }
  function render() {
    if (!state) renderSetup();
    else if (state.submitted) renderResults();
    else renderQuestion();
  }
  render();
})();