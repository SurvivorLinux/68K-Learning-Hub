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

## Remaining unpublished workbook content
| Lesson | Questions | Status |
| --- | ---: | --- |
| 5.2 · Other Major Blood Groups | 58 | Pending individual textbook answer, quote, and rationale audit |
| 5.3 · Identification of Antibodies | 6 | Published with per-question textbook evidence |
| 5.4 · Pretransfusion and Compatibility Testing | 22 | Pending individual textbook answer, quote, and rationale audit |
| **Total** | **86** | **6 published; 80 pending** |

Do not change the 80 pending questions to approved merely to populate the interface. No new questions may be invented from the textbook. The existing OldTests and `main` branch are out of scope.

## Release verification
GitHub Pages success must be verified for the **exact final feature-branch SHA**, followed by direct testing of the lesson page and all six pathways. A pushed commit does not by itself establish successful deployment or browser verification. This report is not a substitute for the remaining full Runbook v2.2 independent audit and release evidence.
