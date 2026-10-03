'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type InstitutionType = 'school' | 'uni';

// The stored value stays the English text below (other code compares against
// e.g. 'Grade 12'); only the label shown is translated.
const GRADES = [
  { value: 'Grade 8', key: 'g8' },
  { value: 'Grade 9', key: 'g9' },
  { value: 'Grade 10', key: 'g10' },
  { value: 'Grade 11', key: 'g11' },
  { value: 'Grade 12', key: 'g12' },
];
const STUDY_YEARS = [
  { value: '1st year', key: 'y1' },
  { value: '2nd year', key: 'y2' },
  { value: '3rd year', key: 'y3' },
  { value: '4th year', key: 'y4' },
  { value: 'Postgraduate', key: 'postgrad' },
];

export default function InstitutionField({
  institution,
  grade,
  onInstitutionChange,
  onGradeChange,
  onTypeChange,
}: {
  institution: string;
  grade: string;
  onInstitutionChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onTypeChange: (value: InstitutionType) => void;
}) {
  const t = useTranslations('auth.institution');
  const [type, setType] = useState<InstitutionType | null>(null);

  function handleTypeChange(next: InstitutionType) {
    setType(next);
    onInstitutionChange('');
    onGradeChange('');
    onTypeChange(next);
  }

  return (
    <div className="text-left">
      <label className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5">
        {t('label')}
      </label>

      <div className="flex justify-between mb-1">
        {(['school', 'uni'] as const).map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm text-text-primary cursor-pointer"
          >
            <input
              type="radio"
              name="institutionType"
              className="sr-only"
              required
              checked={type === option}
              onChange={() => handleTypeChange(option)}
            />
            <span
              className={`neu-pressed w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0`}
            >
              {type === option && <span className="w-[9px] h-[9px] rounded-full bg-orange" />}
            </span>
            {option === 'school' ? t('school') : t('uni')}
          </label>
        ))}
      </div>

      {type && (
        <div className="space-y-4 mt-3">
          <div>
            <label
              htmlFor="institutionName"
              className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
            >
              {type === 'school' ? t('schoolName') : t('uniName')}
            </label>
            <input
              id="institutionName"
              type="text"
              autoComplete="organization"
              required
              value={institution}
              onChange={(e) => onInstitutionChange(e.target.value)}
              className="neu-pressed w-full rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
            />
          </div>
          <div>
            <label
              htmlFor="gradeOrYear"
              className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
            >
              {type === 'school' ? t('grade') : t('year')}
            </label>
            <select
              id="gradeOrYear"
              value={grade}
              required
              onChange={(e) => onGradeChange(e.target.value)}
              className="neu-pressed w-full rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
            >
              <option value="" disabled>
                {t('select')}
              </option>
              {(type === 'school' ? GRADES : STUDY_YEARS).map((item) => (
                <option key={item.value} value={item.value}>
                  {t(`options.${item.key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
