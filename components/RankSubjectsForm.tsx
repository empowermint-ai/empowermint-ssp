'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Subject {
  id: string;
  subject_name: string;
  confidence_score: number | null;
}

export default function RankSubjectsForm({ initialSubjects }: { initialSubjects: Subject[] }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRanked = subjects.every((s) => s.confidence_score !== null);

  function selectScore(id: string, score: number) {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, confidence_score: score } : s))
    );
  }

  async function handleNext() {
    if (!allRanked) return;
    setSaving(true);
    setError(null);

    const results = await Promise.all(
      subjects.map((s) =>
        supabase.from('subjects').update({ confidence_score: s.confidence_score }).eq('id', s.id)
      )
    );

    setSaving(false);

    if (results.some((r) => r.error)) {
      setError('Could not save your rankings. Try again.');
      return;
    }

    router.push('/subjects/dates');
  }

  return (
    <div className="flex flex-col flex-1">
      <div>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="flex items-center justify-between bg-card border-[1.5px] border-card-border rounded-[10px] px-[14px] py-[11px] mb-[10px]"
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
                    onClick={() => selectScore(subject.id, score)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-heading font-bold text-[10px] ${
                      selected
                        ? 'bg-orange text-white border-0'
                        : 'bg-transparent text-text-primary border-[1.5px] border-text-primary'
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

      <div className="mt-6">
        {error && <p className="text-red-600 text-xs text-center mb-2">{error}</p>}

        <button
          type="button"
          disabled={!allRanked || saving}
          onClick={handleNext}
          className="w-full bg-orange text-white font-heading font-bold text-[13.5px] rounded-[10px] py-[14px] disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Next: exam dates'}
        </button>
      </div>
    </div>
  );
}
