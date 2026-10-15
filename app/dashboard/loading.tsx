import { NAV_HEIGHT } from '@/lib/layout';

// Shown instantly while the plan loads: the same shape as the real screen
// (heading, date, three session cards) so the page feels ready straight away.
export default function Loading() {
  return (
    <main
      className="min-h-dvh flex flex-col px-[22px] pt-[38px] bg-bg"
      style={{ paddingBottom: `calc(${NAV_HEIGHT}px + 18px + env(safe-area-inset-bottom))` }}
      aria-busy="true"
    >
      <div className="h-[22px] w-[60%] rounded-full bg-card animate-pulse" />
      <div className="mt-2 h-[12px] w-[35%] rounded-full bg-card animate-pulse" />
      <div className="mt-8 h-[16px] w-[70%] rounded-full bg-card animate-pulse" />
      <div className="mt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mb-[8px] h-[46px] rounded-neu-sm bg-card animate-pulse" />
        ))}
      </div>
    </main>
  );
}
