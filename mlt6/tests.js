/* Phase 1: only the six verified MLT 6 entries are exposed. Keep legacy quizzes untouched. */
(function () {
  "use strict";
  window.MLT6_TESTS = Object.freeze({
    "21": Object.freeze({ label: "Test21: Immun", quiz: "../OldTests/test21.html" }),
    "23": Object.freeze({ label: "Test23: ABO", quiz: "../OldTests/test23.html" }),
    "24": Object.freeze({ label: "Test24: Other Blood Groups", quiz: "../OldTests/test24.html" }),
    "25": Object.freeze({ label: "Test25: Transfusions", quiz: "../OldTests/test25.html" }),
    "26": Object.freeze({ label: "Test26: TransDiseases", quiz: "../OldTests/test26.html" }),
    "27": Object.freeze({ label: "Test27: AutoDiseases", quiz: "../OldTests/test27.html" })
  });
})();
