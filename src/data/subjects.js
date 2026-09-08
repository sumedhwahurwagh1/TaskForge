export const SUBJECTS = [
  { id: 'cs301', code: 'CS 301', name: 'Distributed Systems', color: '#6366f1' },
  { id: 'cs201', code: 'CS 201', name: 'Algorithms & Data Structures', color: '#8b5cf6' },
  { id: 'econ201', code: 'ECON 201', name: 'Macroeconomics', color: '#0ea5e9' },
  { id: 'math301', code: 'MATH 301', name: 'Calculus III', color: '#14b8a6' },
  { id: 'psy101', code: 'PSY 101', name: 'Cognitive Psychology', color: '#f59e0b' },
  { id: 'chem201', code: 'CHEM 201', name: 'Organic Chemistry', color: '#ef4444' },
  { id: 'bio201', code: 'BIO 201', name: 'Bioenergetics', color: '#22c55e' },
];

export function getSubjectById(id) {
  return SUBJECTS.find(s => s.id === id);
}

export function getSubjectColor(subjectId) {
  const subject = getSubjectById(subjectId);
  return subject ? subject.color : '#6366f1';
}
