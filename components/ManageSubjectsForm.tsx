'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { recalculateTodayPlan } from '@/lib/recalculateTodayPlan';

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

interface ExamDate {
  id: string;
  exam_date: string;
}

interface Subject {
  id: string;
  subject_name: string;
  confidence_score: number | null;
  exam_dates: ExamDate[];
}

function sortDates(dates: ExamDate[]): ExamDate[] {
  return [...dates].sort((a, b) => (a.exam_date < b.exam_date ? -1 : 1));
}

function formatDateChip(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ManageSubjectsForm({
  userId,
  initialSubjects,
}: {
  userId: string;
  initialSubjects: Subject[];
}) {
  const [tab, setTab] = useState<'subjects' | 'ranking' | 'dates'>('ranking');
  const [subjects, setSubjects] = useState(
    initialSubjects.map((s) => ({ ...s, exam_dates: sortDates(s.exam_dates) }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [pendingDates, setPendingDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentSubjects() {
      const { data } = await supabase
        .from('subjects')
        .select('id, subject_name, confidence_score, exam_dates(id, exam_date)')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('created_at', { ascending: true });

      if (!cancelled && data) {
        setSubjects(data.map((s) => ({ ...s, exam_dates: sortDates(s.exam_dates) })));
      }
    }

    // Next.js can restore this page from a stale cached snapshot on browser
    // back navigation, which would otherwise show subjects as missing or
    // stale even though they were already saved. Re-checking the database on
    // mount keeps this screen honest no matter how it was reached.
    loadCurrentSubjects();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().slice(0, 10);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const already = new Set(subjects.map((s) => s.subject_name.toLowerCase()));
    return PREDEFINED_SUBJECTS.filter(
      (subj) => !already.has(subj.toLowerCase()) && (q === '' || subj.toLowerCase().includes(q))
    );
  }, [query, subjects]);

  async function addSubject(name: string, isCustom: boolean) {
    const trimmed = name.trim();
    if (!trimmed || addingSubject) return;
    if (subjects.some((s) => s.subject_name.toLowerCase() === trimmed.toLowerCase())) return;

    setAddingSubject(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('subjects')
      .insert({ user_id: userId, subject_name: trimmed, is_custom: isCustom, confidence_score: null })
      .select('id, subject_name, confidence_score')
      .single();

    setAddingSubject(false);

    if (insertError || !data) {
      setError('Could not add that subject. Try again.');
      return;
    }

    setSubjects((prev) => [...prev, { ...data, exam_dates: [] }]);
    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
  }

  function handleSelectOption(name: string) {
    addSubject(name, false);
    setQuery('');
    setDropdownOpen(false);
  }

  function handleAddCustom() {
    addSubject(customValue, true);
    setCustomValue('');
    setShowCustomInput(false);
  }

  async function removeSubject(subject: Subject) {
    setRemovingId(subject.id);
    setError(null);

    const { error: deleteError } = await supabase.from('subjects').delete().eq('id', subject.id);

    setRemovingId(null);

    if (deleteError) {
      setError('Could not remove that subject. Try again.');
      return;
    }

    setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
  }

  async function handleRankChange(subjectId: string, score: number) {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, confidence_score: score } : s))
    );
    setSavingId(subjectId);
    setError(null);

    const { error: updateError } = await supabase
      .from('subjects')
      .update({ confidence_score: score })
      .eq('id', subjectId);

    if (updateError) {
      setSavingId(null);
      setError('Could not save that. Try again.');
      return;
    }

    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
    setSavingId(null);
  }

  // Some mobile browsers pre-highlight the min date when today is disabled
  // and can commit it on a stray tap. Staging the pick and requiring an
  // explicit confirm tap ensures an exam date is only saved when the
  // learner actually chooses to add it.
  function handlePickDate(subjectId: string, value: string) {
    if (!value || value < minDateStr) return;
    setPendingDates((prev) => ({ ...prev, [subjectId]: value }));
  }

  function handleCancelPending(subjectId: string) {
    setPendingDates((prev) => {
      const next = { ...prev };
      delete next[subjectId];
      return next;
    });
  }

  async function handleConfirmDate(subjectId: string) {
    const value = pendingDates[subjectId];
    if (!value) return;
    handleCancelPending(subjectId);
    await handleAddDate(subjectId, value);
  }

  async function handleAddDate(subjectId: string, value: string) {
    if (!value || value < minDateStr) return;
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject?.exam_dates.some((d) => d.exam_date === value)) return;

    setAddingId(subjectId);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('exam_dates')
      .insert({ subject_id: subjectId, exam_date: value })
      .select('id, exam_date')
      .single();

    if (insertError || !data) {
      setAddingId(null);
      setError('Could not add that date. Try again.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, exam_dates: sortDates([...s.exam_dates, data]) } : s
      )
    );

    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
    setAddingId(null);
  }

  async function handleRemoveDate(subjectId: string, dateId: string) {
    setError(null);
    const { error: deleteError } = await supabase.from('exam_dates').delete().eq('id', dateId);

    if (deleteError) {
      setError('Could not remove that date. Try again.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, exam_dates: s.exam_dates.filter((d) => d.id !== dateId) }
          : s
      )
    );

    setRecalculating(true);
    await recalculateTodayPlan(userId);
    setRecalculating(false);
  }

  return (
    <div className="flex flex-col flex-1 mt-6">
      <div className="neu-pressed flex rounded-neu-sm p-[4px] mb-5">
        <button
          type="button"
          onClick={() => setTab('subjects')}
          className={`flex-1 font-heading font-bold text-[11.5px] rounded-neu-sm py-[9px] transition-all ${
            tab === 'subjects' ? 'neu-raised-accent text-white' : 'text-text-muted'
          }`}
        >
          Subjects
        </button>
        <button
          type="button"
          onClick={() => setTab('ranking')}
          className={`flex-1 font-heading font-bold text-[11.5px] rounded-neu-sm py-[9px] transition-all ${
            tab === 'ranking' ? 'neu-raised-accent text-white' : 'text-text-muted'
          }`}
        >
          Ranking
        </button>
        <button
          type="button"
          onClick={() => setTab('dates')}
          className={`flex-1 font-heading font-bold text-[11.5px] rounded-neu-sm py-[9px] transition-all ${
            tab === 'dates' ? 'neu-raised-accent text-white' : 'text-text-muted'
          }`}
        >
          Exam dates
        </button>
      </div>

      {error && <p className="text-red-600 text-xs text-center mb-3">{error}</p>}

      {tab === 'subjects' && (
        <div>
          <div className="relative">
            <label className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5">
              Add a subject
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
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showCustomInput ? (
            <div className="flex gap-2 mt-3">
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
                className="neu-pressed flex-1 rounded-neu-md px-[14px] py-[13px] font-body text-[14px] text-text-primary outline-none focus:ring-1 focus:ring-teal/40"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                className="neu-raised-accent text-white font-heading font-bold text-[13.5px] rounded-neu-sm px-4"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="neu-raised w-full text-text-primary font-heading font-bold text-[12.5px] rounded-neu-md py-[11px] mt-3"
            >
              + Add my own subject
            </button>
          )}

          <p className="font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mt-6 mb-2">
            Your subjects
          </p>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="neu-raised flex items-center justify-between rounded-neu-sm px-[14px] py-[11px] mb-[9px]"
            >
              <span className="font-body font-bold text-[13.5px] text-text-primary">
                {subject.subject_name}
              </span>
              <button
                type="button"
                disabled={removingId === subject.id}
                onClick={() => removeSubject(subject)}
                className="text-text-muted text-lg leading-none px-2 disabled:opacity-40"
                aria-label={`Remove ${subject.subject_name}`}
              >
                ✕
              </button>
            </div>
          ))}
          <p className="font-body text-[10px] text-text-muted mt-2">
            New subjects will need a confidence ranking and exam date before they show up in your
            plan.
          </p>
        </div>
      )}

      {tab === 'ranking' && (
        <div>
          <p className="font-body text-[10px] text-text-muted mb-[14px]">
            1 = weakest &nbsp;·&nbsp; 5 = strongest
          </p>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="neu-raised flex items-center justify-between rounded-neu-sm px-[14px] py-[11px] mb-[10px]"
            >
              <span className="font-body font-bold text-[13.5px] text-text-primary">
                {subject.subject_name}
              </span>
              <div className="flex gap-[5px]">
                {[1, 2, 3, 4, 5].map((score) => {
                  const selected = subject.confidence_score === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      disabled={savingId === subject.id}
                      onClick={() => handleRankChange(subject.id, score)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-heading font-bold text-[10px] disabled:opacity-50 ${
                        selected ? 'neu-pressed-accent-sm text-white' : 'neu-raised text-text-primary'
                      }`}
                      aria-label={`${subject.subject_name}: confidence ${score}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dates' && (
        <div>
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="neu-raised rounded-neu-sm px-[14px] py-[11px] mb-[10px]"
            >
              <div className="flex items-center justify-between">
                <span className="font-body font-bold text-[13.5px] text-text-primary">
                  {subject.subject_name}
                </span>
                {pendingDates[subject.id] ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-body text-xs text-text-primary whitespace-nowrap">
                      Add {formatDateChip(pendingDates[subject.id])}?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleConfirmDate(subject.id)}
                      aria-label={`Confirm ${formatDateChip(pendingDates[subject.id])} for ${subject.subject_name}`}
                      className="text-teal font-bold leading-none"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelPending(subject.id)}
                      aria-label="Cancel"
                      className="text-text-muted leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="font-body text-xs rounded-[8px] px-[10px] py-[5px] border-[1.3px] text-orange border-orange whitespace-nowrap">
                      {addingId === subject.id ? 'Adding…' : '+ Add date'}
                    </span>
                    <input
                      type="date"
                      min={minDateStr}
                      value=""
                      onChange={(e) => handlePickDate(subject.id, e.target.value)}
                      className="accent-orange absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                )}
              </div>

              {subject.exam_dates.length > 0 && (
                <div className="flex flex-wrap gap-[6px] mt-[10px]">
                  {subject.exam_dates.map((d) => (
                    <span
                      key={d.id}
                      className="flex items-center gap-1 font-body text-xs rounded-[8px] pl-[10px] pr-[6px] py-[5px] border-[1.3px] text-navy dark:text-text-primary border-navy dark:border-text-primary"
                    >
                      {formatDateChip(d.exam_date)}
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(subject.id, d.id)}
                        aria-label={`Remove ${formatDateChip(d.exam_date)} for ${subject.subject_name}`}
                        className="text-text-muted leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {recalculating && (
        <p className="font-body text-[11px] text-text-muted text-center mt-2">
          Updating your plan…
        </p>
      )}
    </div>
  );
}
