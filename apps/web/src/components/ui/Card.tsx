import React from 'react';
import Link from 'next/link';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  padding?: 'normal' | 'list' | 'none';
  children: React.ReactNode;
}

export function Card({
  href,
  padding = 'normal',
  className = '',
  children,
  ...props
}: CardProps) {
  const padClass =
    padding === 'normal' ? 'p-5' : padding === 'list' ? 'px-6 py-5' : '';

  const baseClass = [
    'rounded-card border border-line bg-surface shadow-sm transition-colors',
    padClass,
    href ? 'hover:border-line-input block' : '',
    className,
  ].join(' ');

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {children}
      </Link>
    );
  }

  return (
    <div className={baseClass} {...props}>
      {children}
    </div>
  );
}
