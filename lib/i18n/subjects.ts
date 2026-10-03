// The preset subject list. The STORED value is always the canonical English
// name below (plans, past papers and existing data key off it). Only the
// label shown to the learner is translated - see messages/*.json "presets".
// Subjects a learner typed themselves are never translated.

export const PRESET_SUBJECTS: { name: string; id: string }[] = [
  { name: 'Accounting', id: 'accounting' },
  { name: 'Afrikaans FAL', id: 'afrikaansFal' },
  { name: 'Afrikaans HL', id: 'afrikaansHl' },
  { name: 'Agricultural Sciences', id: 'agriculturalSciences' },
  { name: 'Biology', id: 'biology' },
  { name: 'Business Studies', id: 'businessStudies' },
  { name: 'CAT', id: 'cat' },
  { name: 'Consumer Studies', id: 'consumerStudies' },
  { name: 'Dramatic Arts', id: 'dramaticArts' },
  { name: 'Economics', id: 'economics' },
  { name: 'Engineering Graphics & Design', id: 'engineeringGraphicsDesign' },
  { name: 'English FAL', id: 'englishFal' },
  { name: 'English HL', id: 'englishHl' },
  { name: 'Geography', id: 'geography' },
  { name: 'History', id: 'history' },
  { name: 'Information Technology', id: 'informationTechnology' },
  { name: 'Life Orientation', id: 'lifeOrientation' },
  { name: 'Life Sciences', id: 'lifeSciences' },
  { name: 'Mathematical Literacy', id: 'mathematicalLiteracy' },
  { name: 'Mathematics', id: 'mathematics' },
  { name: 'Music', id: 'music' },
  { name: 'Physical Sciences', id: 'physicalSciences' },
  { name: 'Religion Studies', id: 'religionStudies' },
  { name: 'Sepedi HL', id: 'sepediHl' },
  { name: 'Setswana HL', id: 'setswanaHl' },
  { name: 'Tourism', id: 'tourism' },
  { name: 'Visual Arts', id: 'visualArts' },
  { name: 'Xhosa HL', id: 'xhosaHl' },
  { name: 'Zulu HL', id: 'zuluHl' },
];

const ID_BY_NAME = new Map(PRESET_SUBJECTS.map((s) => [s.name.toLowerCase(), s.id]));

/** The messages key for a stored subject name, or null for a custom subject. */
export function presetSubjectId(storedName: string): string | null {
  return ID_BY_NAME.get(storedName.trim().toLowerCase()) ?? null;
}

/** Lower-cases and strips accents so "lewensori" finds "Lewensoriëntering". */
export function foldForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
