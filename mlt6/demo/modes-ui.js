/* Shared question-bank study pathways: Review, Flashcards, Write, Bookmarked. */
(function () {
  "use strict";
  const bank = window.DEMO_QUESTION_BANK;
  const root = document.getElementById("mode-root");
  if (!bank || !Array.isArray(bank.questions) || !root) {
    if (root) root.textContent = "The study question bank could not be loaded.";
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("mode");
  const mode = ["review", "flashcards", "write", "bookmarked"].includes(requested) ? requested : "review";
  const scope = params.get("scope") === "bookmarked" ? "bookmarked" : "all";
  const title = { review: "Review", flashcards: "Flashcards", write: "Write", bookmarked: "Bookmarked Questions" };
  const descriptions = {
    review: "Study questions, correct answers, explanations, and textbook references without grading.",
    flashcards: "Flip one card at a time and mark Know it or Need practice.",
    write: "Type an answer from memory, reveal the source answer, then assess yourself.",
    bookmarked: "Return to saved questions and choose which study mode to use."
  };
  const key = "68k:quiz:bookmarks:" + bank.bankId + ":" + bank.version;
  const directionKey = "68k:quiz:direction:" + bank.bankId + ":" + bank.version;
  const FORWARD = "term-to-definition";
  const REVERSE = "definition-to-term";
  const allowsReverse = bank.questions.every(q =>
    typeof q.term === "string" && q.term.trim() &&
    typeof q.definition === "string" && q.definition.trim());
  let direction = readDirection();
  function readDirection() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(directionKey)); } catch (_) { /* Optional */ }
    return allowsReverse && stored === REVERSE ? REVERSE : FORWARD;
  }
  function getProgressKey() {
    return "68k:mode:" + bank.bankId + ":" + bank.version + ":" + mode + ":" + scope +
      (direction === REVERSE ? ":definition-to-term" : "");
  }
  function term(q) { return q.term || q.question; }
  function definition(q) { return q.definition ||
    q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join("; "); }
  function prompt(q) { return direction === REVERSE ? definition(q) : term(q); }
  function answer(q) { return direction === REVERSE ? term(q) : definition(q); }
  const validIds = new Set(bank.questions.map(q => q.id));
  const questionMap = Object.fromEntries(bank.questions.map(q => [q.id, q]));
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { document.getElementById("mode-storage-note").textContent = "Browser storage is unavailable; changes may not persist."; }
  }
  const storedBookmarks = read(key);
  let bookmarks = new Set(Array.isArray(storedBookmarks) ? storedBookmarks.filter(id => validIds.has(id)) : []);
  function loadProgress() {
    const saved = read(getProgressKey());
    const result = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    if (!result.ratings || typeof result.ratings !== "object" || Array.isArray(result.ratings)) result.ratings = {};
    if (!result.drafts || typeof result.drafts !== "object" || Array.isArray(result.drafts)) result.drafts = {};
    if (!result.revealed || typeof result.revealed !== "object" || Array.isArray(result.revealed)) result.revealed = {};
    if (!Number.isInteger(result.index) || result.index < 0) result.index = 0;
    return result;
  }
  let progress = loadProgress();
  let flipped = false, settingsOpen = false;
  function el(tag, css, text) {
    const e = document.createElement(tag);
    if (css) e.className = css;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function btn(label, css, action) {
    const b = el("button", css, label);
    b.type = "button";
    b.addEventListener("click", action);
    return b;
  }
  function link(label, href, css) {
    const a = el("a", css, label);
    a.href = href;
    return a;
  }
  function saveProgress() { save(getProgressKey(), progress); }
  function items() {
    return scope === "bookmarked" ? bank.questions.filter(q => bookmarks.has(q.id)) : bank.questions;
  }
  function toggleBookmark(id) {
    if (!validIds.has(id)) return;
    if (bookmarks.has(id)) bookmarks.delete(id);
    else bookmarks.add(id);
    save(key, [...bookmarks]);
    flipped = false;
    render();
  }
  function bookmarkControl(q) {
    const marked = bookmarks.has(q.id);
    const b = btn(marked ? "★ Bookmarked" : "☆ Bookmark", "bookmark-toggle" + (marked ? " is-bookmarked" : ""), () => toggleBookmark(q.id));
    b.setAttribute("aria-pressed", String(marked));
    b.setAttribute("aria-label", marked ? "Remove bookmark for question" : "Bookmark question");
    return b;
  }
  function answers(q) { return q.choices.filter(c => q.correct.includes(c.id)).map(c => c.text).join("; "); }
  function explanation(q) {
    const ex = q.explanation || {};
    const holder = el("section", "path-explanation");
    const page = el("p");
    page.append(el("strong", "", "Textbook page: "));
    page.append(el("span", "", ex.pageNumber != null ? "Page " + ex.pageNumber : "Not available for demo questions."));
    holder.append(page);
    const summary = el("p");
    summary.append(el("strong", "", "Summarized explanation: "));
    summary.append(el("span", "", ex.summary || "No explanation supplied."));
    holder.append(summary);
    holder.append(el("strong", "", "Direct source quote"));
    if (ex.directQuote) holder.append(el("blockquote", "source-quote", ex.directQuote));
    else holder.append(el("p", "quiet", "No verified source quote is available for this demo question."));
    if (ex.sourceName) holder.append(el("p", "quiet", "Source: " + ex.sourceName));
    return holder;
  }
  function container() {
    root.replaceChildren();
    const card = el("section", "panel mode-panel");
    root.append(card);
    return card;
  }
  function navigate(delta, count) {
    progress.index = Math.max(0, Math.min(count - 1, progress.index + delta));
    flipped = false;
    saveProgress();
    render();
  }
  function navigation(card, count) {
    const nav = el("div", "path-navigation");
    const back = btn("← Previous", "secondary", () => navigate(-1, count));
    const next = btn("Next →", "secondary", () => navigate(1, count));
    back.disabled = progress.index === 0;
    next.disabled = progress.index >= count - 1;
    nav.append(back, next);
    card.append(nav);
  }
  function heading(card, q, count) {
    const row = el("div", "question-marker");
    row.append(el("span", "stage-label", title[mode]), el("span", "counter", "Question " + (progress.index + 1) + " of " + count));
    card.append(row);
    const tools = el("div", "question-tools");
    tools.append(bookmarkControl(q));
    card.append(tools, el("h2", "", mode === "flashcards" || mode === "write" ? prompt(q) : q.question));
  }
  function renderReview(q, count) {
    const card = container();
    heading(card, q, count);
    card.append(el("p", "path-answer", "Correct answer: " + answers(q)));
    card.append(explanation(q));
    navigation(card, count);
  }
  function renderFlashcard(q, count) {
    const card = container();
    heading(card, q, count);
    const known = progress.ratings[q.id];
    const flip = btn(flipped ? "Answer: " + answer(q) : "Tap to reveal answer", "flashcard-face", () => {
      flipped = !flipped;
      render();
    });
    flip.setAttribute("aria-expanded", String(flipped));
    card.append(flip);
    if (flipped) {
      card.append(explanation(q));
      const mark = el("div", "path-actions");
      mark.append(btn("Need practice", "secondary", () => grade(q, "miss", count)));
      mark.append(btn("Know it", "primary", () => grade(q, "know", count)));
      card.append(mark);
    } else {
      card.append(el("p", "quiet", "Think of the answer first. Flip the card, then mark your recall."));
    }
    if (known) card.append(el("p", "study-rating", "Previous rating: " + (known === "know" ? "Know it" : "Need practice")));
    navigation(card, count);
  }
  function grade(q, value, count) {
    progress.ratings[q.id] = value;
    progress.index = Math.min(count - 1, progress.index + 1);
    flipped = false;
    saveProgress();
    render();
  }
  function renderWrite(q, count) {
    const card = container();
    heading(card, q, count);
    card.append(el("p", "quiet", "No answer choices are shown. Type what you remember, then reveal the answer and assess your own response."));
    const inputLabel = el("label", "write-label", "Your written answer");
    inputLabel.htmlFor = "write-response";
    card.append(inputLabel);
    const textarea = el("textarea", "write-input");
    textarea.id = "write-response";
    textarea.rows = 4;
    textarea.placeholder = "Type your answer here…";
    textarea.value = typeof progress.drafts[q.id] === "string" ? progress.drafts[q.id] : "";
    textarea.disabled = Boolean(progress.revealed[q.id]);
    textarea.addEventListener("input", () => {
      progress.drafts[q.id] = textarea.value;
      saveProgress();
    });
    card.append(textarea);
    if (!progress.revealed[q.id]) {
      const actions = el("div", "path-actions");
      actions.append(btn("Reveal answer and compare", "primary", () => {
        progress.revealed[q.id] = true;
        progress.drafts[q.id] = textarea.value;
        saveProgress();
        render();
      }));
      card.append(actions);
    } else {
      card.append(el("p", "path-answer", "Approved answer: " + answer(q)));
      card.append(explanation(q));
      card.append(el("p", "quiet", "Self-assessment only. Different correct wording is possible; this demo does not automatically grade typed answers."));
      const actions = el("div", "path-actions");
      actions.append(btn("Need practice", "secondary", () => grade(q, "miss", count)));
      actions.append(btn("I got it", "primary", () => grade(q, "know", count)));
      card.append(actions);
      if (progress.ratings[q.id]) card.append(el("p", "study-rating", "Your rating: " + (progress.ratings[q.id] === "know" ? "I got it" : "Need practice")));
    }
    navigation(card, count);
  }
  function renderBookmarked() {
    const holder = container();
    const chosen = bank.questions.filter(q => bookmarks.has(q.id));
    holder.append(el("h2", "", chosen.length + " bookmarked " + (chosen.length === 1 ? "question" : "questions")));
    if (!chosen.length) {
      holder.append(el("p", "quiet", "Nothing bookmarked yet. Save difficult questions while using Multiple Choice, Review, Flashcards, or Write."));
      const links = el("div", "path-actions");
      links.append(link("Browse all questions in Review", "modes.html?mode=review&v=pathways-v6", "secondary path-link"));
      links.append(link("Open Multiple Choice", "index.html?v=pathways-v6", "secondary path-link"));
      holder.append(links);
      return;
    }
    holder.append(el("p", "quiet", "These bookmarks are shared by every mode for this test and are saved in this browser."));
    const links = el("div", "bookmarked-links");
    links.append(link("Multiple Choice", "index.html?practice=bookmarks&v=pathways-v6", "secondary path-link"));
    links.append(link("Review", "modes.html?mode=review&scope=bookmarked&v=pathways-v6", "secondary path-link"));
    links.append(link("Flashcards", "modes.html?mode=flashcards&scope=bookmarked&v=pathways-v6", "secondary path-link"));
    links.append(link("Write", "modes.html?mode=write&scope=bookmarked&v=pathways-v6", "secondary path-link"));
    holder.append(links);
    const list = el("div", "bookmark-list");
    for (const q of chosen) {
      const item = el("article", "bookmark-item");
      const header = el("div", "bookmark-item-header");
      header.append(el("strong", "", q.question), bookmarkControl(q));
      item.append(header, el("p", "quiet", "Answer: " + answers(q)));
      list.append(item);
    }
    holder.append(list);
  }
  function renderDirectionSettings() {
    const card = container();
    card.append(el("p", "stage-label", "Study settings"));
    card.append(el("h2", "", "Term and definition direction"));
    card.append(el("p", "quiet", "Choose which side appears first. This preference is shared with Multiple Choice, Flashcards, and Write. Each direction remembers its own Flashcards and Write progress."));
    let choice = direction;
    const fieldset = el("fieldset", "direction-fieldset");
    fieldset.append(el("legend", "", "Show first"));
    for (const [value, text] of [[FORWARD, "Term → Definition"], [REVERSE, "Definition → Term"]]) {
      const option = el("label", "direction-option");
      const radio = el("input");
      radio.type = "radio"; radio.name = "direction"; radio.value = value;
      radio.checked = choice === value;
      radio.disabled = value === REVERSE && !allowsReverse;
      radio.addEventListener("change", function () { if (!radio.disabled) choice = value; });
      option.append(radio, el("span", "", text));
      fieldset.append(option);
    }
    card.append(fieldset);
    if (!allowsReverse) card.append(el("p", "quiet", "This question bank needs reviewed term/definition pairs before reverse study is available."));
    const actions = el("div", "path-actions");
    actions.append(btn("Cancel", "secondary", () => { settingsOpen = false; render(); }));
    actions.append(btn("Save direction", "primary", () => {
      direction = choice;
      save(directionKey, direction);
      progress = loadProgress();
      flipped = false;
      settingsOpen = false;
      render();
    }));
    card.append(actions);
  }
  function renderScope() {
    const root = document.getElementById("scope-actions");
    root.replaceChildren();
    if (mode === "bookmarked") return;
    root.append(link("All questions", "modes.html?mode=" + mode + "&v=pathways-v6", "scope-link" + (scope === "all" ? " active" : "")));
    root.append(link("Bookmarked only", "modes.html?mode=" + mode + "&scope=bookmarked&v=pathways-v6", "scope-link" + (scope === "bookmarked" ? " active" : "")));
  }
  function render() {
    const list = items();
    document.title = title[mode] + " | Test23 | 68K Learning Hub";
    document.getElementById("crumb-mode").textContent = title[mode];
    document.getElementById("mode-title").textContent = title[mode];
    document.getElementById("mode-description").textContent = descriptions[mode];
    document.getElementById("tab-" + mode).setAttribute("aria-current", "page");
    renderScope();
    const directionButton = document.getElementById("direction-settings");
    directionButton.hidden = !(mode === "flashcards" || mode === "write");
    if (mode === "flashcards" || mode === "write") {
      directionButton.textContent = "Settings · " + (direction === REVERSE ? "Definition → Term" : "Term → Definition");
    }
    if (settingsOpen) {
      document.getElementById("mode-status").textContent = "Choose study direction";
      renderDirectionSettings();
      return;
    }
    if (mode === "bookmarked") {
      document.getElementById("mode-status").textContent = bookmarks.size + " saved questions";
      renderBookmarked();
      return;
    }
    if (!list.length) {
      document.getElementById("mode-status").textContent = "0 questions";
      const card = container();
      card.append(el("h2", "", "No bookmarked questions yet"));
      card.append(el("p", "quiet", "Bookmark a question in any study mode, then return here."));
      card.append(link("Browse all " + title[mode] + " questions", "modes.html?mode=" + mode + "&v=pathways-v6", "secondary path-link"));
      return;
    }
    progress.index = Math.min(progress.index, list.length - 1);
    const done = list.filter(q => progress.ratings[q.id] === "know" || progress.ratings[q.id] === "miss").length;
    document.getElementById("mode-status").textContent = mode === "review" ?
      "Question " + (progress.index + 1) + " of " + list.length :
      (direction === REVERSE ? "Definition → Term · " : "Term → Definition · ") +
      done + " of " + list.length + " rated · " + list.filter(q => progress.ratings[q.id] === "know").length + " known";
    const current = list[progress.index];
    if (mode === "review") renderReview(current, list.length);
    if (mode === "flashcards") renderFlashcard(current, list.length);
    if (mode === "write") renderWrite(current, list.length);
  }
  document.getElementById("direction-settings").addEventListener("click", function () {
    if (mode !== "flashcards" && mode !== "write") return;
    settingsOpen = !settingsOpen;
    render();
  });
  render();
})();