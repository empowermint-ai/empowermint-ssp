import { supabase } from '@/lib/supabaseClient';

export async function logActivity(
  learnerId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from('activity_log').insert({
      learner_id: learnerId,
      event_type: eventType,
      metadata,
    });
  } catch {
    // Activity logging is best-effort - it should never block the feature it's tracking.
  }
}
