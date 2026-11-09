// Synthetic course-shaped records. Never loaded by the website.
function question(lessonId, sourceOrder, options = {}) {
  const subject = lessonId + ' item ' + sourceOrder;
  return {
    id: lessonId + '-q' + sourceOrder,
    lessonId, sourceOrder, factIds: ['synthetic-' + subject],
    type: options.multi ? 'multi' : 'single',
    question: options.stem || 'Synthetic prompt for ' + subject + '?',
    choices: [
      { id: 'a', text: options.answer || 'Answer ' + subject },
      { id: 'b', text: 'Second ' + subject },
      { id: 'c', text: 'Wrong ' + subject },
      { id: 'd', text: 'Other ' + subject }
    ],
    correct: options.multi ? ['a', 'b'] : ['a'],
    explanation: { summary: 'Synthetic explanation.', pageNumber: 1, directQuote: 'Synthetic quote — café.' },
    sourceAnchors: [{ pageNumber: 1, exactQuote: 'Synthetic quote — café.' }],
    study: { term: 'Pair ' + subject, definition: 'Definition ' + subject, reversible: !!options.reversible }
  };
}

function bank(lessonId, questions) {
  return {
    schemaVersion: '1.0', lessonId, parentUnit: '5', verified: true, releaseStatus: 'APPROVED',
    bankId: 'fixture-' + lessonId, version: 'fixture-v1', title: 'Synthetic ' + lessonId,
    questions
  };
}

const registry = {
  '5.1': bank('5.1', [
    question('5.1', 3, { stem: 'Shared café?', answer: 'Same' }),
    question('5.1', 1),
    question('5.1', 2, { multi: true })
  ]),
  '5.2': bank('5.2', [
    question('5.2', 3, { multi: true }),
    question('5.2', 2, { stem: 'SHARED cafe\u0301?', answer: 'Same' }),
    question('5.2', 1)
  ])
};

module.exports = { question, bank, registry };
