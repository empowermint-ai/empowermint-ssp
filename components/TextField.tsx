'use client';
import { InputHTMLAttributes } from 'react';
import PasswordInput from '@/components/PasswordInput';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function TextField({ label, id, className = '', type, ...props }: TextFieldProps) {
  const inputClassName = `neu-pressed w-full rounded-neu-md px-4 py-3.5 text-text-primary outline-none focus:ring-1 focus:ring-teal/40 ${className}`;

  return (
    <div className="text-left">
      <label
        htmlFor={id}
        className="block font-heading font-bold text-[10.5px] uppercase tracking-[0.6px] text-text-muted mb-1.5"
      >
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
