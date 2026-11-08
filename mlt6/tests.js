/* MLT 6 chapter/topic catalog. Entries presently match ORIGINAL legacy test topics.
 * Exact textbook chapter numbering is assigned only when supplied source pages verify it.
 * Retain legacy tests and their links until verified chapter banks replace them. */
(function () {
  "use strict";
  window.MLT6_CHAPTER_ORDER = Object.freeze(["21", "23", "24", "25", "26", "27"]);
  window.MLT6_TESTS = Object.freeze({
    "21": Object.freeze({ label: "Test21: Immun", chapterTitle: "Immun", quiz: "../OldTests/test21.html" }),
    "23": Object.freeze({ label: "Test23: ABO", chapterTitle: "ABO", quiz: "../OldTests/test23.html" }),
    "24": Object.freeze({ label: "Test24: Other Blood Groups", chapterTitle: "Other Blood Groups", quiz: "../OldTests/test24.html" }),
    "25": Object.freeze({ label: "Test25: Transfusions", chapterTitle: "Transfusions", quiz: "../OldTests/test25.html" }),
    "26": Object.freeze({ label: "Test26: TransDiseases", chapterTitle: "Transfusion Diseases", quiz: "../OldTests/test26.html" }),
    "27": Object.freeze({ label: "Test27: AutoDiseases", chapterTitle: "Autoimmune Diseases", quiz: "../OldTests/test27.html" })
  });
})();
