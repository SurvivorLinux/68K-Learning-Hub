(function () {
  'use strict';
  const fullBank = window.DEMO_QUESTION_BANK;
  const core = window.QuizCore;
  const app = document.getElementById('app');
  if (!fullBank || !core || !app) {
    if (app) app.textContent = 'Unable to load the demonstration quiz.';
    return;
  }
  const key = '68k:quiz:session:' + fullBank.bankId;
  const practiceKey = '68k:quiz:practice:' + fullBank.bankId;
  const settingsKey = '68k:quiz:settings:' + fullBank.bankId;
  const bookmarksKey = '68k:quiz:bookmarks:' + fullBank.bankId + ':' + fullBank.version;
  const questionIDs = new Set(fullBank.questions.map(q => q.id));
  function readStorage(storageKey) {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch (_) { return null; }
  }
  function store(storageKey, value) {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); return true; }
    catch (_) {
      const note = document.getElementById('storage-note');
      if (note) note.textContent = 'Progress cannot be stored in this browser.';
      return false;
    }
  }
  function practiceBank(kind, ids) {
    const allowed = new Set(ids);
    return {
      bankId: fullBank.bankId + ':practice:' + kind,
      version: fullBank.version + ':subset:' + ids.join('|'),
      title: kind === 'missed' ? 'Practice missed questions' : 'Practice bookmarks',
      questions: fullBank.questions.filter(q => allowed.has(q.id))
    };
  }
  let settings = core.normalizeSettings(readStorage(settingsKey));
  const savedBookmarks = readStorage(bookmarksKey);
  let bookmarks = new Set(Array.isArray(savedBookmarks) ?
    savedBookmarks.filter(id => typeof id === 'string' && questionIDs.has(id)) : []);
  let bank = fullBank, state, mainState, selected = [], screen = 'quiz';
  let previousScreen = 'quiz', historyIndex = 0, sessionMode = 'main', practiceIDs = [];
  let settingsMessage = '';
  try {
    core.validateBank(fullBank);
    mainState = core.restoreSession(fullBank, readStorage(key)) ||
      core.startSession(fullBank, settings);
    state = mainState;
    const savedPractice = readStorage(practiceKey);
    if (savedPractice && ['missed', 'bookmarks'].includes(savedPractice.kind) &&
        Array.isArray(savedPractice.ids) && savedPractice.ids.length > 0 &&
        new Set(savedPractice.ids).size === savedPractice.ids.length &&
        savedPractice.ids.every(id => questionIDs.has(id))) {
      const resumedBank = practiceBank(savedPractice.kind, savedPractice.ids);
      const resumed = core.restoreSession(resumedBank, savedPractice.state);
      if (resumed) {
        bank = resumedBank;
        state = resumed;
        practiceIDs = [...savedPractice.ids];
        sessionMode = savedPractice.kind;
      }
    }
  } catch (err) {
    app.textContent = 'Unable to start this quiz: ' + err.message;
    return;
  }
  function save() {
    if (sessionMode === 'main') mainState = state;
    store(key, mainState);
    if (sessionMode !== 'main') {
      store(practiceKey, { kind: sessionMode, ids: practiceIDs, state });
    }
  }
  function saveBookmarks() { store(bookmarksKey, [...bookmarks]); }
  function isBookmarked(id) { return bookmarks.has(id); }
  function toggleBookmark(id) {
    if (!questionIDs.has(id)) return;
    if (isBookmarked(id)) bookmarks.delete(id); else bookmarks.add(id);
    saveBookmarks();
    render();
  }
  function bookmarkButton(id) {
    const saved = isBookmarked(id);
    const control = button(saved ? '★ Bookmarked' : '☆ Bookmark', 'bookmark-toggle' + (saved ? ' is-bookmarked' : ''), () => toggleBookmark(id));
    control.setAttribute('aria-label', saved ? 'Remove bookmark from question' : 'Bookmark this question');
    control.setAttribute('aria-pressed', String(saved));
    return control;
  }
  function startPractice(kind) {
    if (sessionMode !== 'main') return;
    const wanted = kind === 'missed' ?
      new Set(mainState.firstMissed) : bookmarks;
    const ids = fullBank.questions.map(q => q.id).filter(id => wanted.has(id));
    if (!ids.length) return;
    save(); // Keep the finished main test intact.
    practiceIDs = ids;
    sessionMode = kind;
    bank = practiceBank(kind, ids);
    state = core.startSession(bank, settings);
    screen = 'quiz'; selected = []; historyIndex = 0;
    save(); render();
  }
  function returnToFull() {
    if (sessionMode === 'main') return;
    if (state.stage !== 'done' &&
      !window.confirm('Leave this practice session? Its progress will be discarded. Your original quiz results are safe.')) return;
    sessionMode = 'main';
    bank = fullBank; state = mainState; practiceIDs = [];
    screen = 'quiz'; selected = []; historyIndex = 0;
    try { localStorage.removeItem(practiceKey); } catch (_) { /* Optional storage */ }
    save(); render();
  }
  function make(tag, cssClass, text) {
    const el = document.createElement(tag);
    if (cssClass) el.className = cssClass;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function button(text, cssClass, onClick) {
    const el = make('button', cssClass, text);
    el.type = 'button';
    el.addEventListener('click', onClick);
    return el;
  }
  function panel() {
    app.replaceChildren();
    const result = make('section', 'panel');
    app.appendChild(result);
    if (screen === 'quiz' && core.getMissedHistory(state, bank).length) {
      enableSwipe(result, showMissed, null); // Swipe right to look back; no answer is changed.
    }
    return result;
  }
  function enableSwipe(element, swipeRight, swipeLeft) {
    let start = null;
    element.addEventListener('touchstart', function (event) {
      start = event.touches.length === 1 ?
        { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    element.addEventListener('touchend', function (event) {
      if (!start || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      start = null;
      if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0 && swipeRight) swipeRight();
      if (dx < 0 && swipeLeft) swipeLeft();
    }, { passive: true });
    element.addEventListener('touchcancel', function () { start = null; }, { passive: true });
  }
  function missedCount() { return core.getMissedHistory(state, bank).length; }
  function showMissed() {
    if (!missedCount()) return;
    historyIndex = missedCount() - 1;
    screen = 'history';
    render();
  }
  function returnToQuiz() { screen = 'quiz'; render(); }
  function moveHistory(delta) {
    const max = missedCount() - 1;
    historyIndex = Math.min(max, Math.max(0, historyIndex + delta));
    render();
  }
  function addHistoryAction(actions) {
    if (!missedCount()) return;
    actions.prepend(button('← View missed (' + missedCount() + ')', 'secondary', showMissed));
  }
  function stats() {
    const progress = core.summary(state, bank);
    const percent = 100 * progress.answeredNew / progress.total;
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-track').setAttribute('aria-valuenow', String(Math.round(percent)));
    document.getElementById('progress-text').textContent = progress.answeredNew + ' of ' + progress.total + ' new questions';
    const phase = screen === 'history' ? 'Missed history (read-only)' :
      screen === 'settings' ? 'Study settings' :
      state.stage === 'new' ? 'Learning round' : state.stage === 'done' ? 'Complete' : 'Required review';
    document.getElementById('phase-status').textContent = (sessionMode === 'main' ? '' :
      sessionMode === 'missed' ? 'Missed practice · ' : 'Bookmarked practice · ') + phase;
    document.getElementById('bookmark-count').textContent = bookmarks.size + ' bookmarked';
    document.getElementById('return-full').hidden = sessionMode === 'main';
    document.getElementById('active-mode').textContent = sessionMode === 'main' ? 'Full question bank' :
      sessionMode === 'missed' ? 'Practicing missed questions' : 'Practicing bookmarks';
    document.getElementById('checkpoint-note').textContent =
      'Required review every ' + state.roundSize + ' new questions when you have misses. Your results include all original questions and explanations.';
    document.getElementById('settings-message').textContent = settingsMessage;
    document.getElementById('accuracy').textContent = progress.answeredNew === 0 ? '—' : progress.firstAttemptAccuracy + '%';
    document.getElementById('mastered').textContent = progress.mastered;
    document.getElementById('unresolved').textContent = progress.unresolved;
  }
  function grade() {
    if (!selected.length || state.response) return;
    try { core.submit(state, bank, selected); save(); render(); }
    catch (err) { alert(err.message); }
  }
  // Render the same source-grounded explanation after a correct or incorrect answer.
  // The demo has no textbook citations: never invent page numbers or quotations.
  function renderAnswerDetails(q) {
    const explanation = q.explanation || {};
    const details = make('section', 'answer-details');
    details.setAttribute('aria-label', 'Answer explanation and source');
    details.append(make('h3', 'answer-details-heading', 'Answer explanation'));
    if (explanation.sourceName) {
      details.append(make('p', 'answer-source-name', 'Source: ' + explanation.sourceName));
    }
    const page = make('div', 'answer-detail-row');
    page.append(make('strong', 'answer-detail-label', 'Textbook page'));
    page.append(make('p', 'answer-detail-value',
      explanation.pageNumber != null && String(explanation.pageNumber).trim() ?
        'Page ' + explanation.pageNumber : 'Not available for this demo question.'));
    details.append(page);
    const summary = make('div', 'answer-detail-row');
    summary.append(make('strong', 'answer-detail-label', 'Summarized explanation'));
    summary.append(make('p', 'answer-detail-value',
      explanation.summary && explanation.summary.trim() ?
        explanation.summary : 'Summary has not been provided for this question.'));
    details.append(summary);
    const quote = make('div', 'answer-detail-row');
    quote.append(make('strong', 'answer-detail-label', 'Direct source quote'));
    if (explanation.directQuote && explanation.directQuote.trim()) {
      quote.append(make('blockquote', 'answer-direct-quote', explanation.directQuote));
    } else {
      quote.append(make('p', 'answer-detail-value answer-source-unavailable',
        'Not available for this demo question. A verbatim quotation will appear when verified source text is provided.'));
    }
    details.append(quote);
    return details;
  }
  function renderQuestion() {
    const q = core.currentQuestion(state, bank);
    const reviewed = state.stage === 'review';
    const target = panel();
    const bar = make('div', 'question-marker');
    bar.append(make('span', 'stage-label', reviewed ? 'Required review' : 'New question'));
    bar.append(make('span', 'counter', reviewed ? 'Review ' + (state.reviewIndex + 1) + ' of ' + state.reviewQueue.length : 'Question ' + (state.newIndex + 1) + ' of ' + bank.questions.length));
    target.append(bar);
    const tools = make('div', 'question-tools');
    tools.append(bookmarkButton(q.id));
    target.append(tools, make('h2', '', q.question));
    if (q.type === 'multi') target.append(make('p', 'hint', 'Select all correct answers, then choose Check answers.'));
    const answers = make('div', 'answers');
    const graded = Boolean(state.response);
    if (graded) selected = [...state.response.selected];
    const letters = ['A','B','C','D'];
    state.optionOrder.forEach((choiceId, i) => {
      const choice = q.choices.find(c => c.id === choiceId);
      const isSelected = selected.includes(choiceId);
      const isRight = q.correct.includes(choiceId);
      const css = ['choice', isSelected ? 'selected' : '', graded && isRight ? 'correct-option' : '', graded && isSelected && !isRight ? 'incorrect-option' : ''].filter(Boolean).join(' ');
      const b = make('button', css);
      b.type = 'button';
      b.disabled = graded;
      b.setAttribute('aria-pressed', String(isSelected));
      b.append(make('span','choice-key', letters[i]),make('span','choice-text',choice.text));
      if (q.type === 'multi' && isSelected) b.append(make('span','choice-check','✓'));
      b.addEventListener('click', function () {
        if (graded) return;
        if (q.type === 'single') { selected = [choiceId]; grade(); }
        else { selected = isSelected ? selected.filter(id => id !== choiceId) : [...selected, choiceId]; render(); }
      });
      answers.appendChild(b);
    });
    target.append(answers);
    if (graded) {
      const feedback = make('div', 'feedback ' + (state.response.correct ? 'good' : 'bad'));
      feedback.append(make('strong', '', state.response.correct ? 'Correct!' : 'Not quite.'));
      feedback.append(make('p', '', 'Correct answer: ' +
        q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join('; ')));
      if (reviewed && !state.response.correct) feedback.append(make('p','', 'This question stays unresolved and will return at a later review checkpoint (or in your final results).'));
      target.append(feedback, renderAnswerDetails(q));
    }
    const actions = make('div','actions');
    if (graded) actions.append(button('Continue →','primary',function () { core.advance(state, bank); selected=[]; save(); render(); }));
    else if (q.type === 'multi') {
      const b=button('Check answers','primary',grade);
      b.disabled = selected.length === 0;
      actions.append(b);
    }
    addHistoryAction(actions);
    target.append(actions);
    if (missedCount()) target.append(make('p', 'swipe-hint', 'On a phone, swipe right to look back at missed questions. Your answers stay locked.'));
  }
  function renderReviewIntro() {
    const target = panel();
    target.append(make('p','stage-label','Mandatory checkpoint'));
    target.append(make('h2','', 'Time to review your misses'));
    target.append(make('p','', 'You have ' + state.reviewQueue.length + ' unresolved ' + (state.reviewQueue.length===1?'question':'questions') + '. You’ll answer each once before unlocking new questions. Questions still missed will return later.'));
    const actions=make('div','actions');
    actions.append(button('Start required review →','primary',function(){core.beginReview(state, bank);selected=[];save();render();}));
    addHistoryAction(actions);
    target.append(actions);
  }
  function answerText(question, selected) {
    if (!selected) return 'Not recorded in this older saved session';
    return question.choices.filter(c => selected.includes(c.id)).map(c => c.text).join('; ');
  }
  function resultLine(label, text) {
    const line = make('p', 'result-line');
    line.append(make('strong', '', label + ' '));
    line.append(make('span', '', text));
    return line;
  }
  function renderFullAnswerReport(target) {
    const report = make('section', 'question-report');
    report.id = 'question-report';
    report.setAttribute('aria-label', 'Complete question-by-question results');
    report.append(make('h2', '', 'All questions and explanations'));
    report.append(make('p', 'report-intro', 'Questions are listed in the order you encountered them. Correct and incorrect reflect your FIRST attempt; reviewing a missed question later does not erase the original result.'));
    const entries = core.questionReport(state, bank);
    for (const entry of entries) {
      const q = entry.question;
      const item = make('article', 'result-item ' + (entry.firstCorrect ? 'result-correct' : 'result-incorrect'));
      const marker = make('div', 'result-marker');
      marker.append(make('span', 'result-number', 'Question ' + entry.number + ' of ' + entries.length));
      marker.append(make('span', 'result-badge ' + (entry.firstCorrect ? 'is-correct' : 'is-incorrect'), entry.firstCorrect ? 'Correct on first try' : 'Incorrect on first try'));
      if (!entry.firstCorrect) marker.append(make('span', 'result-badge ' + (entry.unresolved ? 'is-unresolved' : 'is-resolved'), entry.unresolved ? 'Still unresolved' : 'Corrected in review'));
      marker.append(bookmarkButton(q.id));
      item.append(marker, make('h3', '', q.question));
      item.append(resultLine('Your first answer:', answerText(q, entry.firstSelection)));
      item.append(resultLine('Correct answer:', answerText(q, q.correct)));
      const explanation = q.explanation;
      const why = make('div', 'result-explanation');
      why.append(make('strong', '', 'Why this answer is correct'));
      why.append(make('p', '', explanation && explanation.summary ?
        explanation.summary : 'Explanation not yet provided for this question.'));
      item.append(why);
      if (explanation && (explanation.pageNumber != null || explanation.sourceName || explanation.directQuote)) {
        const source = make('div', 'result-source');
        const parts = [];
        if (explanation.sourceName) parts.push(explanation.sourceName);
        if (explanation.pageNumber != null) parts.push('Page ' + explanation.pageNumber);
        if (parts.length) source.append(make('p', 'source-reference', 'Source: ' + parts.join(' · ')));
        if (explanation.directQuote) {
          source.append(make('strong', '', 'Direct source quote'));
          source.append(make('blockquote', 'source-quote', explanation.directQuote));
        }
        item.append(source);
      }
      report.append(item);
    }
    target.append(report);
  }
  function renderDone() {
    const target = panel();
    const s = core.summary(state, bank);
    target.append(make('p', 'stage-label', 'Session complete'));
    target.append(make('h2', '', sessionMode === 'main' ?
      'You finished the demo question bank.' : 'You finished your practice session.'));
    target.append(make('p', '', 'First-attempt accuracy is fixed after each new question. Correctly answered review questions can increase mastery without inflating that accuracy.'));
    const grid = make('div', 'summary-grid');
    for (const [num, label] of [[s.firstAttemptAccuracy + '%', 'First-attempt accuracy'], [s.mastered + '/' + s.total, 'Mastered'], [String(s.unresolved), 'Still unresolved']]) {
      const cell = make('div', 'summary-cell');
      cell.append(make('strong', '', num), make('span', '', label)); grid.append(cell);
    }
    target.append(grid);
    target.append(make('p', '', s.unresolved ? 'Some questions remain unresolved after the final review.' : 'No unresolved questions remain.'));
    const actions = make('div', 'actions');
    actions.append(button('Practice again', 'primary', reset));
    if (sessionMode !== 'main') {
      actions.append(button('← Return to full results', 'secondary', returnToFull));
    }
    addHistoryAction(actions);
    target.append(actions);
    if (sessionMode === 'main') {
      const options = make('section', 'practice-options');
      options.append(make('h3', '', 'Focused practice'));
      options.append(make('p', '', 'Start a separate practice session. Your original full-test score and results will be preserved.'));
      const actionRow = make('div', 'practice-actions');
      if (mainState.firstMissed.length) {
        actionRow.append(button('Practice missed (' + mainState.firstMissed.length + ')', 'secondary', function () { startPractice('missed'); }));
      }
      if (bookmarks.size) {
        actionRow.append(button('Practice bookmarked (' + bookmarks.size + ')', 'secondary', function () { startPractice('bookmarks'); }));
      }
      if (!actionRow.children.length) actionRow.append(make('p', 'quiet', 'Miss a question or bookmark something to unlock focused practice.'));
      options.append(actionRow);
      target.append(options);
    }
    renderFullAnswerReport(target);
  }
  function renderMissedHistory() {
    const misses = core.getMissedHistory(state, bank);
    if (!misses.length) { returnToQuiz(); return; }
    historyIndex = Math.min(historyIndex, misses.length - 1);
    const record = misses[historyIndex];
    const q = record.question;
    const target = panel();
    target.classList.add('history-panel');
    const marker = make('div', 'question-marker');
    marker.append(make('span', 'stage-label', 'Missed-question history · Read-only'));
    marker.append(make('span', 'counter', (historyIndex + 1) + ' of ' + misses.length + ' missed'));
    target.append(marker, make('h2', '', q.question));
    target.append(make('p', 'history-info', 'Original answers are locked. Looking back does not affect your progress, accuracy, or required review.'));
    const status = make('p', 'history-status', record.unresolved ? 'Still unresolved · returns at a required checkpoint' : 'Resolved during a required review');
    target.append(status, bookmarkButton(q.id));
    const answers = make('div', 'answers');
    const letters = ['A', 'B', 'C', 'D'];
    record.optionOrder.forEach((id, i) => {
      const choice = q.choices.find(c => c.id === id);
      const chosen = record.selected && record.selected.includes(id);
      const correct = q.correct.includes(id);
      const css = ['choice', 'history-choice', correct ? 'correct-option' : '', chosen && !correct ? 'incorrect-option' : ''].filter(Boolean).join(' ');
      const item = make('div', css);
      item.append(make('span', 'choice-key', letters[i]), make('span', 'choice-text', choice.text));
      if (chosen || correct) item.append(make('span', 'history-flag', chosen && correct ? 'Your choice · Correct' : chosen ? 'Your choice' : 'Correct'));
      answers.append(item);
    });
    target.append(answers);
    const feedback = make('div', 'feedback bad');
    if (record.selected) {
      feedback.append(make('strong', '', 'Your previous incorrect answer:'));
      feedback.append(make('p', '', q.choices.filter(c => record.selected.includes(c.id)).map(c => c.text).join('; ')));
    } else {
      feedback.append(make('strong', '', 'Previous answer unavailable'));
      feedback.append(make('p', '', 'This question was missed before answer history was added, so the original selection was not saved.'));
    }
    feedback.append(make('p', '', 'Correct answer: ' + q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join('; ')));
    target.append(feedback);
    const actions = make('div', 'history-actions');
    const prev = button('← Older miss', 'secondary', function () { moveHistory(-1); });
    const next = button('Newer miss →', 'secondary', function () { moveHistory(1); });
    prev.disabled = historyIndex === 0;
    next.disabled = historyIndex === misses.length - 1;
    actions.append(prev, next);
    target.append(actions);
    target.append(make('p', 'swipe-hint', 'Swipe right for an older missed question, or left for a newer one.'));
    const back = make('div', 'actions');
    back.append(button('Return to current question →', 'primary', returnToQuiz));
    target.append(back);
    enableSwipe(target, function () { moveHistory(-1); }, function () { moveHistory(1); });
    target.tabIndex = 0;
    target.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveHistory(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveHistory(1); }
    });
  }
  function reset() {
    const message = sessionMode === 'main' ?
      'Restart the full demonstration? Your full-test results will be replaced. Bookmarks are kept.' :
      'Restart this focused practice set? Your original full-test results are safe.';
    if (!window.confirm(message)) return;
    state = core.startSession(bank, settings);
    selected = []; screen = 'quiz'; historyIndex = 0;
    save(); render();
  }
  function openSettings() {
    previousScreen = screen;
    screen = 'settings'; settingsMessage = '';
    render();
  }
  function closeSettings() { screen = previousScreen; render(); }
  function renderSettings() {
    const target = panel();
    target.append(make('p', 'stage-label', 'Study settings'));
    target.append(make('h2', '', 'Customize your next study session'));
    target.append(make('p', 'settings-description',
      'These settings apply when you start or restart a session. They do not rearrange or reset the current quiz.'));
    let roundSize = settings.roundSize, shuffle = settings.shuffleQuestions;
    const fieldset = make('fieldset', 'settings-fieldset');
    fieldset.append(make('legend', '', 'Required review after every…'));
    for (const num of core.ROUND_OPTIONS) {
      const label = make('label', 'setting-option');
      const radio = make('input');
      radio.type = 'radio'; radio.name = 'review-interval'; radio.value = String(num); radio.checked = roundSize === num;
      radio.addEventListener('change', function () { roundSize = num; });
      label.append(radio, make('span', '', num + ' new questions'));
      fieldset.append(label);
    }
    target.append(fieldset);
    const shuffleLabel = make('label', 'setting-option shuffle-option');
    const checkbox = make('input');
    checkbox.type = 'checkbox'; checkbox.checked = shuffle;
    checkbox.addEventListener('change', function () { shuffle = checkbox.checked; });
    shuffleLabel.append(checkbox, make('span', '', 'Shuffle question order in a new session'));
    target.append(shuffleLabel);
    target.append(make('p', 'settings-description',
      'Answer choices remain shuffled for fairness. Your current session uses ' + state.roundSize +
      '-question checkpoints. Saved bookmarks are not deleted when starting over.'));
    const actions = make('div', 'actions');
    actions.append(button('Cancel', 'secondary', closeSettings));
    actions.append(button('Save settings', 'primary', function () {
      settings = core.normalizeSettings({ roundSize, shuffleQuestions: shuffle });
      store(settingsKey, settings);
      settingsMessage = 'Settings saved for your next session. Use Start over to apply them now.';
      closeSettings();
    }));
    target.append(actions);
  }
  function render() {
    stats();
    if (screen === 'settings') { renderSettings(); return; }
    if (screen === 'history') { renderMissedHistory(); return; }
    if (state.stage === 'new' || state.stage === 'review') renderQuestion();
    else if (state.stage === 'review-intro') renderReviewIntro();
    else renderDone();
  }
  document.getElementById('restart').addEventListener('click',reset);
  document.getElementById('settings').addEventListener('click',openSettings);
  document.getElementById('return-full').addEventListener('click',returnToFull);
  // Launch bookmarked Multiple Choice from the shared Bookmarked pathway.
  // A focused practice session never overwrites the saved full-test result.
  let directPractice = null;
  try { directPractice = new URLSearchParams(window.location.search).get('practice'); }
  catch (_) { /* Non-browser test environment */ }
  if (directPractice === 'bookmarks' && sessionMode === 'main' && bookmarks.size) {
    startPractice('bookmarks');
  } else {
    save();
    render();
  }
})();
