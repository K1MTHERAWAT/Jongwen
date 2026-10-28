import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'inline-flex h-11 items-center justify-center gap-2 rounded-control bg-brand px-4 font-semibold text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  secondary:
    'inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-input bg-surface px-4 font-semibold text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  ghost:
    'inline-flex h-11 items-center justify-center gap-2 rounded-control px-3 font-semibold text-ink-soft hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  icon:
    'grid size-11 place-items-center rounded-control text-ink-soft hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  danger:
    'inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger-fg px-4 font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-fg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          VARIANTS[variant],
          'transition-colors select-none text-body',
          'disabled:opacity-50 disabled:pointer-events-none',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
