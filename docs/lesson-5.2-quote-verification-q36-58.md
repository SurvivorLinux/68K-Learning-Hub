# Lesson 5.2 — independent textbook quotation audit, Q36–58

**Source checked:** uploaded `Unit 5- Other Major Blood Groups and Pretransfusion Testing (1).pdf`, extracted locally with `pdftotext -layout`.

**Method:** for each question Q36–Q58, find the quoted string in the extracted PDF text and require it to occur **verbatim on the same PDF page that displays the specified printed textbook page number**. Do not accept a match elsewhere in the textbook.

**Result:** **23/23 directQuote fields passed** exact-string and printed-page checks.

| Questions | Printed textbook pages | Exact quotation and printed page |
|---|---|---|
| Q36–41 | 271 | PASS (6/6) |
| Q42 | 272 | PASS (1/1) |
| Q43–49 | 274–275 | PASS (7/7) |
| Q50–53 | 276 | PASS (4/4) |
| Q54–57 | 277 | PASS (4/4) |
| Q58 | 278 | PASS (1/1) |

**Important limits:** This validates only quotation text and page placement for Q36–58. It does not prove that the explanation is semantically correct or that the workbook stem/choices/key are correct. The approved Q49 change to **Kidd antibodies** is documented in the corrections manifest; its quote is exact on printed p.275. Q36/Q41 evidence specifically requires the missing Fy6 receptor.

**Release decision:** HOLD pending equivalent independent audit of Q1–35, workbook-to-bank reconciliation, actual bank integration and runtime tests. No GitHub Pages or six-mode testing is claimed.
