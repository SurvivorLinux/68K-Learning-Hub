# MLT6 feature branch — direct scope-loader execution check

**Target:** `feature/mlt6-foundation`; **registered bank integration commit:** `2f8f2554c399b6f5f355b5ceda5ff65a008f99d8`.

## Method

Fetched the actual GitHub feature-branch JavaScript source files (`mlt6/banks/approved-banks.js`, `mlt6/tests.js`, `mlt6/banks/bookmarks.js`, `mlt6/demo/banks/test23-demo.js`, and `mlt6/banks/scope-loader.js`) through the connected repository. Evaluated these scripts sequentially in an isolated JavaScript runtime with simulated `window.location`, `localStorage` and a minimal `URLSearchParams` implementation.

This **is not** the Node.js test runner and **is not** a browser or GitHub Pages test. It verifies the actual repository loader code with a small host shim.

| Route | Loader context | Bank questions | Bank validation |
|---|---|---:|---|
| `?unit=24&lesson=5.2` | lesson | 58 | PASS |
| `?unit=24&lesson=5.3` | lesson | 6 | PASS |
| `?unit=24&lesson=5.4` | lesson | 22 | PASS |
| `?unit=24&bank=unit` | comprehensive | 86 | PASS |
| `?unit=24&bank=bookmarks` | all-bookmarks | 0 | Expected empty-state bank (not a populated quiz) |

The unit aggregate reported **86** questions, **no invalid lesson banks**, and **Lesson 5.1 missing**, which is expected because no approved Lesson 5.1 bank has been supplied. The comprehensive remains progressively available despite the missing lesson.

## Remaining release gates

- Node test runner (`node --test tests/mlt6.test.cjs tests/mlt6-registered-banks.test.cjs`) **not executed** in a checked-out repository.
- GitHub Actions workflow **not confirmed** (commit workflow-run lookup and combined status both returned empty).
- Full six-mode browser study/exam UI, bookmark persistence and GitHub Pages deployment **not tested**.
- Main branch **not modified**.

**Decision:** Loader integration passed these five route checks, but full release certification is still pending.
