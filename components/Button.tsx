'use client';

import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function Button({
  children,
  loading,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full rounded-xl bg-orange text-white font-medium py-3.5 transition-opacity disabled:opacity-60 active:opacity-80 ${className}`}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
