# Lesson 5.2 — independent quotation audit, Q1–35

**Source:** uploaded Unit 5 textbook PDF, locally extracted with `pdftotext -layout`. Compared each of 35 repository evidence quotes with the **same printed textbook page** in the extracted PDF.

**Initial result:** 31/35 exact matches. Four mismatches were due to line breaks embedded in the PDF text, not different factual claims: Q3 (p249), Q9 and Q10 (p255), Q11 (p256).

**Remediation:** changed only the four `directQuote` excerpts in `docs/lesson-5.2-evidence-batch-01.json` to shorter **verbatim contiguous strings** that occur on the same printed pages. All question stems, options, answers, explanations and other evidence records were untouched.

**After remediation:** all 35/35 evidence excerpts are exact contiguous text on their cited printed textbook pages. Combined with the separately completed Q36–58 audit, **58/58 quote-text and printed-page checks pass**.

**Important:** This check does **not** establish clinical accuracy of each question, correctness of answer options or full runtime validity. It is only an exact quote and printed-page verification. Original workbook-to-bank reconciliation, code integration, six-mode tests, and final Runbook QA remain outstanding. Release remains **HOLD**.
