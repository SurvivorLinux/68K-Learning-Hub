/* MLT 106 Blood Bank (22 Oct 2025), table of contents, printed pp. 3–7.
 * Six existing legacy test headings are the STUDY UNIT tiles, not individual lessons.
 * Lesson numbers / page starts are sourced from the actual textbook.
 * These study groupings differ from the book's official eight Unit divisions:
 * for instance Test21 spans textbook Units 1 and 2; Tests26/27 split book Unit 7.
 * Other book lessons not represented by the original six headings are not invented here. */
(function () {
  'use strict';
  const lesson = (id, title, page, description = '') => Object.freeze({ id, title, page, description });
  const units = {
    '21': {
      title: 'Immun', legacyLabel: 'Test21: Immun', quiz: '../OldTests/test21.html',
      lessons: [
        lesson('1.1', 'Fundamentals of Immunology', 12),
        lesson('1.2', 'Cells and Soluble Mediators of the Immune System', 42),
        lesson('1.3', 'Serologic Procedures', 59),
        lesson('2.1', 'Immunology', 77),
        lesson('2.2', 'Autoimmunity and Related Disorders', 88),
        lesson('2.3', 'Immunoassays and Automated Procedures', 96)
      ]
    },
    '23': {
      title: 'ABO', legacyLabel: 'Test23: ABO', quiz: '../OldTests/test23.html',
      lessons: [
        lesson('4.1', 'The ABO Blood Group System', 169),
        lesson('4.2', 'The Rh Blood Group System', 199),
        lesson('4.3', 'Antibody Detection', 220)
      ]
    },
    '24': {
      title: 'Other Blood Groups', legacyLabel: 'Test24: Other Blood Groups', quiz: '../OldTests/test24.html',
      lessons: [
        lesson('5.1', 'Miscellaneous Blood Bank Testing', 233),
        lesson('5.2', 'Other Major Blood Groups', 247, 'Lewis and secretor genetics; MNS, P/Globoside and Ii systems; Kell/Kx, Duffy, Kidd and Lutheran antigens and antibodies, including their clinical significance.'),
        lesson('5.3', 'Identification of Antibodies', 281, 'Interpret positive antibody screens, apply antibody exclusion and identify compatible antigen-negative donor red blood cells.'),
        lesson('5.4', 'Pretransfusion and Compatibility Testing', 289, 'Recipient identification and specimen requirements, donor unit selection, crossmatching and compatibility testing for safe transfusion.')
      ]
    },
    '25': {
      title: 'Transfusions', legacyLabel: 'Test25: Transfusions', quiz: '../OldTests/test25.html',
      lessons: [
        lesson('6.1', 'Donor Screening and Component Preparation', 308),
        lesson('6.2', 'Transfusion Therapy', 352)
      ]
    },
    '26': {
      title: 'Transfusion Diseases', legacyLabel: 'Test26: TransDiseases', quiz: '../OldTests/test26.html',
      lessons: [
        lesson('7.1', 'Transfusion-Transmitted Diseases (TTD)', 392),
        lesson('7.2', 'Hemolytic Disease of the Fetus and Newborn (HDFN)', 408)
      ]
    },
    '27': {
      title: 'Autoimmune Diseases', legacyLabel: 'Test27: AutoDiseases', quiz: '../OldTests/test27.html',
      lessons: [
        lesson('7.3', 'Autoimmune Hemolytic Anemias (AIHA)', 424)
      ]
    }
  };
  const frozen = {};
  for (const [id, unit] of Object.entries(units)) {
    unit.lessons = Object.freeze(unit.lessons);
    frozen[id] = Object.freeze(unit);
  }
  window.MLT6_UNIT_ORDER = Object.freeze(['21', '23', '24', '25', '26', '27']);
  window.MLT6_UNITS = Object.freeze(frozen);
  window.MLT6_TESTS = window.MLT6_UNITS; // Old navigation pages keep resolving legacy test IDs.
})();