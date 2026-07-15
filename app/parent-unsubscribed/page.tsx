import Image from 'next/image';

export default function ParentUnsubscribedPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ok = searchParams.status === 'ok';

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-10 text-center">
      <div className="w-24">
        <Image
          src="/brand/logo-em-power-black.png"
          alt="empower"
          width={84}
          height={60}
          className="block dark:hidden w-full h-auto"
        />
        <Image
          src="/brand/logo-em-power-white.png"
          alt="empower"
          width={84}
          height={60}
          className="hidden dark:block w-full h-auto"
        />
      </div>

      <h1 className="font-heading font-bold text-[22px] tracking-[-0.066em] text-text-primary mt-8">
        {ok ? "You're unsubscribed" : 'Link expired'}
      </h1>

      <p className="font-body text-[14px] text-text-body mt-2 max-w-xs">
        {ok
          ? "You won't get any more weekly updates. Your child can re-add you from their account settings any time."
          : 'This link is invalid or has already been used.'}
      </p>
    </main>
  );
}
