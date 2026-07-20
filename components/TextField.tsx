'use client';

import { InputHTMLAttributes } from 'react';
import PasswordInput from '@/components/PasswordInput';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function TextField({ label, id, className = '', type, ...props }: TextFieldProps) {
  const inputClassName = `w-full rounded-xl border border-card-border bg-card px-4 py-3 text-text-primary outline-none focus:border-teal focus:ring-1 focus:ring-teal ${className}`;

  return (
    <div className="text-left">
      <label htmlFor={id} className="block text-sm text-text-body mb-1.5">
        {label}
      </label>
      {type === 'password' ? (
        <PasswordInput id={id} className={inputClassName} {...props} />
      ) : (
        <input id={id} type={type} className={inputClassName} {...props} />
      )}
    </div>
  );
}
