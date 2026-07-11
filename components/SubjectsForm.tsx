'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const PREDEFINED_SUBJECTS = [
  'Accounting',
  'Afrikaans FAL',
  'Afrikaans HL',
  'Agricultural Sciences',
  'Biology',
  'Business Studies',
  'CAT',
  'Consumer Studies',
  'Dramatic Arts',
  'Economics',
  'Engineering Graphics & Design',
  'English FAL',
  'English HL',
  'Geography',
  'History',
  'Information Technology',
  'Life Orientation',
  'Life Sciences',
  'Mathematical Literacy',
  'Mathematics',
  'Music',
  'Physical Sciences',
  'Religion Studies',
  'Sepedi HL',
  'Setswana HL',
  'Tourism',
  'Visual Arts',
  'Xhosa HL',
  'Zulu HL',
];

interface SubjectItem {
  name: string;
  isCustom: boolean;
}

export default function SubjectsForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const already = new Set(subjects.map((s) => s.name.toLowerCase()));
    return PREDEFINED_SUBJECTS.filter(
      (subj) => !already.has(subj.toLowerCase()) && (q === '' || subj.toLowerCase().includes(q))
    );
  }, [query, subjects]);

  function addSubject(name: string, isCustom: boolean) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSubjects((prev) => [...prev, { name: trimmed, isCustom }]);
  }

  function handleSelectOption(name: string) {
    addSubject(name, false);
    setQuery('');
    setDropdownOpen(false);
  }

  function removeSubject(name: string) {
    setSubjects((prev) => prev.filter((s) => s.name !== name));
  }

  function handleAddCustom() {
    addSubject(customValue, true);
    setCustomValue('');
    setShowCustomInput(false);
  }

  async function handleNext() {
    if (subjects.length === 0) return;
    setSaving(true);
    setError(null);

    const rows = subjects.map((s) => ({
      user_id: userId,
      subject_name: s.name,
      is_custom: s.isCustom,
    }));

    const { error } = await supabase.from('subjects').insert(rows);

    setSaving(false);

    if (error) {
      setError('Could not save your subjects. Try again.');
      return;
    }

    router.push('/subjects/rank');
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 mt-6">
      <div className="relative">
        <label className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5">
          Search or select a subject
        </label>
        <input
          type="text"
          placeholder="e.g. Mathematics"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          className="w-full bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:border-teal"
        />
        {dropdownOpen && filteredOptions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-card border-[1.5px] border-card-border rounded-[10px] shadow-lg">
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className="w-full text-left px-[14px] py-[10px] font-body text-[14px] text-text-primary hover:bg-bg"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 mt-4">
        {subjects.map((subject) => (
          <div
            key={subject.name}
            className="flex items-center justify-between bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] mb-[9px]"
          >
            <span className="font-body font-bold text-[13.5px] text-text-primary">
              {subject.name}
            </span>
            <button
              type="button"
              onClick={() => removeSubject(subject.name)}
              className="text-text-muted text-lg leading-none px-2"
              aria-label={`Remove ${subject.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {showCustomInput && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            maxLength={60}
            placeholder="Your subject name"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            className="flex-1 bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:border-teal"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] px-4"
          >
            Add
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowCustomInput((v) => !v)}
        className="w-full border-[1.5px] border-text-primary text-text-primary font-heading font-bold text-[13.5px] rounded-[10px] py-[13px] mt-3"
      >
        + Add my own subject
      </button>

      {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}

      <button
        type="button"
        disabled={subjects.length === 0 || saving}
        onClick={handleNext}
        className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] mt-3 disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Next: rank these'}
      </button>
    </div>
  );
}
