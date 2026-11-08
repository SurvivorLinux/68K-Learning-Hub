(function () {
  'use strict';
  const bank = window.DEMO_QUESTION_BANK;
  const core = window.QuizCore;
  const app = document.getElementById('app');
  if (!bank || !core || !app) {
    if (app) app.textContent = 'Unable to load the demonstration quiz.';
    return;
  }
  const key = '68k:quiz:session:' + bank.bankId;
  let state, selected = [], screen = 'quiz', historyIndex = 0;
  try {
    core.validateBank(bank);
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(key)); } catch (_) { /* Browser privacy mode */ }
    state = core.restoreSession(bank, stored) || core.startSession(bank);
  } catch (err) {
    app.textContent = 'Unable to start this quiz: ' + err.message;
    return;
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch (_) { document.getElementById('storage-note').textContent = 'Progress cannot be stored in this browser.'; }
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
    document.getElementById('phase-status').textContent = screen === 'history' ? 'Missed history (read-only)' : state.stage === 'new' ? 'Learning round' : state.stage === 'done' ? 'Complete' : 'Required review';
    document.getElementById('accuracy').textContent = progress.answeredNew === 0 ? '—' : progress.firstAttemptAccuracy + '%';
    document.getElementById('mastered').textContent = progress.mastered;
    document.getElementById('unresolved').textContent = progress.unresolved;
  }
  function grade() {
    if (!selected.length || state.response) return;
    try { core.submit(state, bank, selected); save(); render(); }
    catch (err) { alert(err.message); }
  }
  function renderQuestion() {
    const q = core.currentQuestion(state, bank);
    const reviewed = state.stage === 'review';
    const target = panel();
    const bar = make('div', 'question-marker');
    bar.append(make('span', 'stage-label', reviewed ? 'Required review' : 'New question'));
    bar.append(make('span', 'counter', reviewed ? 'Review ' + (state.reviewIndex + 1) + ' of ' + state.reviewQueue.length : 'Question ' + (state.newIndex + 1) + ' of ' + bank.questions.length));
    target.append(bar, make('h2', '', q.question));
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
      if (!state.response.correct) feedback.append(make('p', '', 'Correct answer: ' + q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join('; ')));
      if (reviewed && !state.response.correct) feedback.append(make('p','', 'This question stays unresolved and will return at a later review checkpoint (or in your final results).'));
      target.append(feedback);
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
  function renderDone() {
    const target = panel();
    const s = core.summary(state,bank);
    target.append(make('p','stage-label','Session complete'));
    target.append(make('h2','', 'You finished the demo question bank.'));
    target.append(make('p','', 'First-attempt accuracy is fixed after each new question. Correctly answered review questions can increase mastery without inflating that accuracy.'));
    const grid=make('div','summary-grid');
    for(const [num,label] of [[s.firstAttemptAccuracy+'%','First-attempt accuracy'],[s.mastered+'/'+s.total,'Mastered'],[String(s.unresolved),'Still unresolved']]) {
      const cell=make('div','summary-cell'); cell.append(make('strong','',num),make('span','',label));grid.append(cell);
    }
    target.append(grid);
    target.append(make('p','', s.unresolved ? 'Unresolved questions are listed in your result count. A future version can offer optional targeted practice after completion.' : 'No unresolved questions remain.'));
    const actions=make('div','actions');
    actions.append(button('Practice again','primary',reset));
    addHistoryAction(actions);
    target.append(actions);
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
    target.append(status);
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
    if (!window.confirm('Restart this demonstration? Your saved quiz progress will be cleared.')) return;
    state=core.startSession(bank);selected=[];screen='quiz';historyIndex=0;save();render();
  }
  function render() {
    stats();
    if (screen === 'history') { renderMissedHistory(); return; }
    if (state.stage === 'new' || state.stage === 'review') renderQuestion();
    else if (state.stage === 'review-intro') renderReviewIntro();
    else renderDone();
  }
  document.getElementById('restart').addEventListener('click',reset);
  save();render();
})();
