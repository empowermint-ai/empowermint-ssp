'use client';
import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'neu-raised-accent text-white',
  secondary: 'neu-raised text-text-primary',
  destructive: 'neu-raised neu-outline-accent text-text-primary',
};

export default function Button({
  children,
  loading,
  disabled,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full rounded-neu-lg font-heading font-bold text-[14px] py-4 transition-all active:scale-[0.97] disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
