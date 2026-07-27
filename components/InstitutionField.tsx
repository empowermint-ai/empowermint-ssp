'use client';

import { useState } from 'react';

type InstitutionType = 'school' | 'uni';

const GRADES = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const STUDY_YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'];

export default function InstitutionField({
  institution,
  grade,
  onInstitutionChange,
  onGradeChange,
}: {
  institution: string;
  grade: string;
  onInstitutionChange: (value: string) => void;
  onGradeChange: (value: string) => void;
}) {
  const [type, setType] = useState<InstitutionType | null>(null);

  function handleTypeChange(next: InstitutionType) {
    setType(next);
    onInstitutionChange('');
    onGradeChange('');
  }

  return (
    <div className="text-left">
      <label className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5">
        Institution
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
            {option === 'school' ? 'School' : 'Uni / Other'}
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
              {type === 'school' ? 'Name of school' : 'Name of uni / other'}
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
              {type === 'school' ? 'Grade' : 'Year of study'}
            </label>
            <select
              id="gradeOrYear"
              value={grade}
              required
              onChange={(e) => onGradeChange(e.target.value)}
              className="neu-pressed w-full rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
            >
              <option value="" disabled>
                Select…
              </option>
              {(type === 'school' ? GRADES : STUDY_YEARS).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
