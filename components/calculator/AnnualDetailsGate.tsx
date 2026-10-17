'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import InstitutionField from '@/components/InstitutionField';
import AuthCard from '@/components/AuthCard';
import Button from '@/components/Button';
import CalculatorShell from '@/components/calculator/CalculatorShell';
import { supabase } from '@/lib/supabaseClient';
import { CalculatorKind, calculatorFor, needsAnnualConfirmation } from '@/lib/educationLevel';

const deviceKey = (userId: string) => `ssp_details_confirmed_${userId}`;

export interface GateProfile {
  userId: string;
  studentType: string | null;
  grade: string | null;
  institution: string | null;
  confirmedYear: number | null;
  createdYear: number | null;
  currentYear: number;
}

/**
 * Asks the learner to confirm or update their grade / level once per academic
 * year (and whenever it is unknown) BEFORE the gated feature loads, then shows the
 * calculator that matches the confirmed level.
 */
export default function AnnualDetailsGate({ profile }: { profile: GateProfile }) {
  const t = useTranslations('calculator.annual');
  const [kind, setKind] = useState<CalculatorKind | null>(calculatorFor(profile.studentType, profile.grade));
  const [checked, setChecked] = useState(false);
  const [needs, setNeeds] = useState(false);

  const [type, setType] = useState<'school' | 'uni' | null>(
    profile.studentType === 'uni' || profile.studentType === 'school' ? profile.studentType : null
  );
  const [grade, setGrade] = useState(profile.grade ?? '');
  const [institution, setInstitution] = useState(profile.institution ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let device: number | null = null;
    try {
      const raw = localStorage.getItem(deviceKey(profile.userId));
      device = raw ? Number(raw) : null;
    } catch {
      // storage blocked: the database value alone decides
    }
    setNeeds(
      needsAnnualConfirmation({
        kind,
        confirmedYear: profile.confirmedYear,
        createdYear: profile.createdYear,
        deviceConfirmedYear: device,
        currentYear: profile.currentYear,
      })
    );
    setChecked(true);
    // runs once per visit: `kind` here is the one derived from the stored profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !grade || !institution.trim()) {
      setError(t('incomplete'));
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('users')
      .update({ student_type: type, grade, institution: institution.trim() })
      .eq('id', profile.userId);
    if (updateError) {
      setSaving(false);
      setError(t('saveError'));
      return;
    }
    // Recorded separately: the column is optional until its migration has been applied.
    await supabase
      .from('users')
      .update({ details_confirmed_year: profile.currentYear })
      .eq('id', profile.userId);
    try {
      localStorage.setItem(deviceKey(profile.userId), String(profile.currentYear));
    } catch {
      // ignore
    }
    setKind(calculatorFor(type, grade));
    setNeeds(false);
    setSaving(false);
  }

  if (!checked) return null;

  if (needs || kind === null) {
    return (
      <AuthCard title={t('title')} subtitle={t('subtitle')}>
        <form onSubmit={confirm} className="flex flex-col gap-4">
          <InstitutionField
            institution={institution}
            grade={grade}
            initialType={type}
            onInstitutionChange={setInstitution}
            onGradeChange={setGrade}
            onTypeChange={setType}
          />
          {error ? <p className="text-center text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? t('saving') : t('confirm')}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return <CalculatorShell kind={kind} />;
}
