import { supabase } from '@/lib/supabaseClient';
import type { MilestoneRow, StreakRow } from '@/lib/streakMoment';

export async function fetchStreak(): Promise<StreakRow | null> {
  const { data, error } = await supabase.rpc('get_my_streak');
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function fetchLatestMilestone(learnerId: string): Promise<MilestoneRow | null> {
  const { data } = await supabase
    .from('activity_log')
    .select('id, created_at, metadata')
    .eq('learner_id', learnerId)
    .eq('event_type', 'streak_milestone_reached')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const meta = (data.metadata ?? {}) as { milestone?: number; streak?: number };
  if (typeof meta.milestone !== 'number') return null;
  return {
    id: data.id,
    created_at: data.created_at,
    milestone: meta.milestone,
    streak: typeof meta.streak === 'number' ? meta.streak : meta.milestone,
  };
}
