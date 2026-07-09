import { ReactNode } from 'react';

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="font-heading text-2xl text-navy dark:text-text-primary mb-1">{title}</h1>
        {subtitle && <p className="text-text-body text-sm mb-6">{subtitle}</p>}
        <div className="bg-card border border-card-border rounded-2xl p-6 mt-4">
          {children}
        </div>
      </div>
    </main>
  );
}
