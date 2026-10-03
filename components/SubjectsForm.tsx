'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { PRESET_SUBJECTS, foldForSearch } from '@/lib/i18n/subjects';
import { useOtherLanguageLabels } from '@/lib/i18n/useOtherLanguageLabels';
import { useSubjectLabel } from '@/lib/i18n/useSubjectLabel';

interface SubjectItem {
  id: string | null;
  name: string;
  isCustom: boolean;
}

export default function SubjectsForm({
  userId,
  initialSubjects,
}: {
  userId: string;
  initialSubjects: { id: string; subject_name: string; is_custom: boolean }[];
}) {
  const router = useRouter();
  const t = useTranslations('subjects');
  const subjectLabel = useSubjectLabel();
  const [subjects, setSubjects] = useState<SubjectItem[]>(
    initialSubjects.map((s) => ({ id: s.id, name: s.subject_name, isCustom: s.is_custom }))
  );
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentSubjects() {
      const { data } = await supabase
        .from('subjects')
        .select('id, subject_name, is_custom')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('created_at', { ascending: true });

      if (!cancelled && data) {
        setSubjects(data.map((s) => ({ id: s.id, name: s.subject_name, isCustom: s.is_custom })));
      }
    }

    // Next.js can restore this page from a stale cached snapshot on browser
    // back navigation (e.g. from /subjects/rank), which would otherwise show
    // an empty list even though subjects were already saved. Re-checking the
    // database on mount keeps this screen honest no matter how it was reached.
    loadCurrentSubjects();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const otherLabels = useOtherLanguageLabels(query.trim() !== '');

  const filteredOptions = useMemo(() => {
    // Search matches the stored (English) name, the label in the active language and the
    // labels in the other enabled languages.
    const q = foldForSearch(query.trim());
    const already = new Set(subjects.map((s) => s.name.toLowerCase()));
    return PRESET_SUBJECTS.map((p) => p.name).filter(
      (subj) =>
        !already.has(subj.toLowerCase()) &&
        (q === '' ||
          foldForSearch(subj).includes(q) ||
          foldForSearch(subjectLabel(subj)).includes(q) ||
          (otherLabels[subj] ?? []).some((l) => foldForSearch(l).includes(q)))
    );
  }, [query, subjects, subjectLabel, otherLabels]);

  function addSubject(name: string, isCustom: boolean) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSubjects((prev) => [...prev, { id: null, name: trimmed, isCustom }]);
  }

  function handleSelectOption(name: string) {
    addSubject(name, false);
    setQuery('');
    setDropdownOpen(false);
  }

  async function removeSubject(subject: SubjectItem) {
    setSubjects((prev) => prev.filter((s) => s.name !== subject.name));
    if (subject.id) {
      await supabase.from('subjects').delete().eq('id', subject.id);
    }
  }

  function handleAddCustom() {
    addSubject(customValue, true);
    setCustomValue('');
    setShowCustomInput(false);
  }

  async function handleNext() {
    if (subjects.length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);

    const newRows = subjects
      .filter((s) => s.id === null)
      .map((s) => ({
        user_id: userId,
        subject_name: s.name,
        is_custom: s.isCustom,
      }));

    if (newRows.length > 0) {
      const { error } = await supabase.from('subjects').insert(newRows);

      if (error) {
        submittingRef.current = false;
        setSaving(false);
        setError(t('saveError'));
        return;
      }
    }

    router.push('/subjects/rank');
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 mt-6">
      <div className="relative">
        <label className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5">
          {t('searchLabel')}
        </label>
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          className="neu-pressed w-full rounded-neu-md px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
        />
        {dropdownOpen && filteredOptions.length > 0 && (
          <div className="neu-raised absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-neu-md">
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className="w-full text-left px-[14px] py-[10px] font-body text-[14px] text-text-primary"
              >
                {subjectLabel(opt)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {subjects.map((subject) => (
          <div
            key={subject.name}
            className="neu-raised flex items-center justify-between rounded-neu-sm px-[14px] py-[11px] mb-[9px]"
          >
            <span className="font-body font-bold text-[13.5px] text-text-primary">
              {subjectLabel(subject.name)}
            </span>
            <button
              type="button"
              onClick={() => removeSubject(subject)}
              className="text-text-muted text-lg leading-none px-2"
              aria-label={t('remove', { subject: subjectLabel(subject.name) })}
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
            placeholder={t('customPlaceholder')}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            className="neu-pressed flex-1 rounded-neu-md px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="neu-raised-accent text-black font-heading font-bold text-[13.5px] rounded-neu-sm px-4"
          >
            {t('add')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowCustomInput((v) => !v)}
        className="neu-raised w-full text-text-primary font-heading font-bold text-[13.5px] rounded-full py-[13px] mt-3"
      >
        {t('addOwn')}
      </button>

      {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}

      <button
        type="button"
        disabled={subjects.length === 0 || saving}
        onClick={handleNext}
        className="neu-raised-accent w-full text-black font-heading font-bold text-[13.5px] rounded-full py-[14px] mt-3 disabled:opacity-40"
      >
        {saving ? t('saving') : t('next')}
      </button>
    </div>
  );
}
