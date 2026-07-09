'use client';

import { InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function TextField({ label, id, className = '', ...props }: TextFieldProps) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="block text-sm text-text-body mb-1.5">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-xl border border-card-border bg-card px-4 py-3 text-text-primary outline-none focus:border-teal focus:ring-1 focus:ring-teal ${className}`}
        {...props}
      />
    </div>
  );
}
