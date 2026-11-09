# MLT 106 lesson integration status

The production lesson registry is empty. Lessons 5.1 and 5.2 have working study routes and have each been exercised with synthetic banks. Both educational releases are blocked pending independent content approval.

## Textbook and navigation

Both lessons are in textbook Unit 5 and use the existing **Test24: Other Blood Groups** study tile. The hub lists 5.1, 5.2, 5.3 and 5.4 in textbook order. The original Test24 quiz remains linked from the study tile.

| Lesson | Route | Textbook opening page | Topics represented in the draft audit input |
| --- | --- | --- | --- |
| 5.1 · Miscellaneous Blood Bank Testing | `mlt6/study.html?unit=24&lesson=5.1` | 233 | Antibody testing, elution, neutralization, enzymes, and antibody titration |
| 5.2 · Other Major Blood Groups | `mlt6/study.html?unit=24&lesson=5.2` | 247 | Lewis and secretor, Lewis antibodies, Lewis clinical significance, MNS, P and Globoside, Ii, and Duffy |

These topics describe the candidate data. The source audit must establish the complete objective and topic coverage. The loader preserves that evidence and uses explicit source order for study.

## Handoff checks

For each lesson, the exact question and audit file SHA-256 values matched the manifest. The JSON and Unicode checks passed. Lesson and textbook unit IDs, question counts, C1/C2 counts, source order, unique question and choice IDs, and answer-key references were structurally consistent. Each draft was rejected when supplied to the loader in an isolated validation run.

| Lesson | Candidate records | Release gate |
| --- | --- | --- |
| 5.1 | 22 total, 1 multi-select, 12 missing quotations | DRAFT, `verified: false`, `publicationAuthorized: false`, coverage unknown. The STRICT pen-mark inventory, key and distractor verification, cognitive levels, quotations, and duplicate adjudication are incomplete. |
| 5.2 | 61 total, 0 multi-select, 32 missing quotations | Same approval failures. Instructor-marked photos are missing for printed pp. 266–269 and 271 onward, including material for Kell/Kx, Kidd, and Lutheran. |

## Engineering and verification

- The loader accepts a structurally valid canonical 1.0 release keyed by official lesson ID. It requires an APPROVED release with `verified: true`, validates lesson mapping and question order, and retains the original evidence fields. Older verified runtime banks remain compatible.
- Comprehensive and All Bookmarks derive from available lessons. The earliest textbook occurrence of an equivalent question is displayed, and its underlying bookmark origins remain linked. The unit stays usable with partial coverage.
- Multiple Choice and Exam grade exact sets of choice IDs. Review displays the answer, explanation and source. Flashcards and Write support forward recall and only offer canonical reversal for explicitly audited, unambiguous pairs. Bookmarked Questions shares saved items across lesson and unit views.
- `node --test tests/mlt6.test.cjs` runs dependency-free loader, aggregation, grading, shuffle, persistence, compatibility, and reversal regressions.
- `node --test tests/mlt6-browser.test.cjs` runs the real pages with Playwright and Chromium. Make `playwright` available to Node and install its Chromium browser, or set `MLT6_CHROMIUM_PATH` to an installed Chromium executable. The test serves the site under its project path and substitutes synthetic data only in the browser test context.
- Chrome exercised all six study modes for each lesson, plus the real empty registry, partial Comprehensive, duplicate bookmarks across lessons, the legacy unit link and the original ABO demo.

The repository uses static GitHub Pages with GitHub's managed build workflow. The pre-change Pages deployment served this feature branch. After each integration push, verify the Actions run and successful Pages deployment record for the exact branch SHA, and check both lesson URLs and Comprehensive. A successful push alone does not establish deployment.

## Approved release handoff

1. Complete the independent content audit for each lesson. Inventory every qualifying instructor pen mark and map each eligible fact to a question. Exclude highlight-only material. Verify answer keys, qualifiers, distractors, C1/C2 levels, exact quotes and printed pages. Resolve overlaps and duplicate records. For 5.2, obtain the missing marked photos before certifying coverage.
2. Supply `lesson-X.Y-questions.json`, `lesson-X.Y-audit.md`, and `lesson-X.Y-manifest.json` for each completed lesson. The audit must establish 100% eligible-fact coverage with matching eligible and covered counts and zero unresolved blockers. Set `releaseStatus: "APPROVED"` and `verified: true` in both JSON files and `publicationAuthorized: true` in the manifest. Include matching lesson IDs, counts and SHA-256 values for the exact question and audit files.
3. Verify each release independently before registering the canonical bank once under its official ID in `mlt6/banks/approved-banks.js`. Preserve question IDs, answer data and source metadata, and use a new bank version when question data changes. Set `study.reversible: true` only for independently reviewed term/definition pairs. Otherwise use `false`. Comprehensive and All Bookmarks pick up the registered lesson automatically.
4. Re-run schema, Unicode, Node and browser checks with the approved payload. Verify six-mode behavior, source order, bookmarks and progress with the approved bank. Commit only to the authorized branch and verify the exact SHA on GitHub Pages before marking a lesson ready.
