# MLT 106 workbook integration status — Strict Mode / workbook-authorized source

## Source and publication rules
The user explicitly authorized the existing Kahoot workbook `MLT_106_Master_Download.xlsx` as the question-selection source instead of marked page photographs. Strict Mode red/pink and black remains the selected mark mode but is not independently certified from photographs. The 22 Oct 2025 MLT 106 Unit 5 textbook is the independent factual reference for correct answers, rationales and verbatim quotations. Original workbook stems, answer options, answer keys and source order are preserved.

## Published lesson: 5.3 — Identification of Antibodies
- **6/6 workbook questions** published from workbook rows 60–65, source printed pages 282 and 286.
- **5 C1 / 1 C2**, all single-select; no question stem or answer option edited.
- Individual textbook quotes and page numbers are stored with every question in `mlt6/banks/approved-banks.js`.
- Page 282 confirms additional antibody identification after positive screen, exclusion to narrow possible antibodies, and homozygous expression for rule-outs.
- Page 286 confirms antigen-negative donor cell selection and the need to phenotype donor red cells for corresponding antigens; the anti-Fya question applies this general principle.
- All six use `study.reversible: false` because reverse flashcards were not independently approved.
- Lesson route: `mlt6/study.html?unit=24&lesson=5.3`. Unit Comprehensive and All Bookmarks derive this bank automatically.
- The workbook has no separate textbook evidence or explanations, so these were added by checking the textbook. The original instructor mark colors are not independently verified.

## Published lesson: 5.4 — Pretransfusion and Compatibility Testing
- **22/22 workbook questions** registered from workbook rows 66–87, using source printed pages 290–300.
- Original stems, choices, and keys retained; each record includes a rationale, source page, and textbook quotation.
- Content covers purpose, patient identification, specimen freshness, donor selection, compatibility testing, plasma products and neonatal transfusion.
- Source-specific caution: the course says neonatal blood should be no older than 7 days; this is a textbook-specific answer, not a universal contemporary transfusion standard.
- All reverse-study flags are false pending independently approved reversible pairs.
- Lesson route: `mlt6/study.html?unit=24&lesson=5.4`.

## Remaining unpublished workbook content
| Lesson | Questions | Status |
| --- | ---: | --- |
| 5.2 · Other Major Blood Groups | 58 | Pending individual textbook answer, quote, and rationale audit |
| 5.3 · Identification of Antibodies | 6 | Published with per-question textbook evidence |
| 5.4 · Pretransfusion and Compatibility Testing | 22 | Registered with per-question textbook evidence |
| **Total** | **86** | **28 registered; 58 pending** |

Do not change the 58 pending questions to approved merely to populate the interface. No new questions may be invented from the textbook. The existing OldTests and `main` branch are out of scope.

## Release verification
GitHub Pages success must be verified for the **exact final feature-branch SHA**, followed by direct testing of the lesson page and all six pathways. A pushed commit does not by itself establish successful deployment or browser verification. This report is not a substitute for the remaining full Runbook v2.2 independent audit and release evidence.

## Lesson 5.2 correction approval checkpoint

All 58 workbook questions have a first-pass answer-key comparison recorded in `docs/lesson-5.2-workbook-audit.md`. The user approved four narrowly scoped edits to Q3, Q18, Q30 and Q41; the exact changes are locked in `docs/lesson-5.2-approved-corrections.json`. All four original workbook stems, option positions and answers were rechecked against the source workbook. Only Q30 changes one option text; every answer position remains unchanged.

**Not yet a release:** Lesson 5.2 still has no published bank. Per-question verbatim quotes and explanations, the independent manifest/hash audit, and six-mode runtime/browser verification remain pending. The existing 5.3/5.4 registration count remains 28, not 86. Do not confuse first-pass answer-key support with Runbook v2.2 approval.

## Lesson 5.2 per-question evidence work

The first **12 of 58** Lesson 5.2 records now have individually stored printed-page citations, source quotations, and explanations in `docs/lesson-5.2-evidence-batch-01.json`. These are **audit records**, not released quiz-bank questions. Q3 uses the explicitly approved H-gene correction. The workbook is still the source for all question stems, four answer options and correct-option positions. Lesson 5.2 stays unpublished until all 58 evidence records and full structural/independent QA are complete.
