import React from 'react';
import Link from 'next/link';

export interface ListRowProps {
  href?: string;
  code?: string;
  title: string;
  subtitle?: string;
  chip?: React.ReactNode;
  rightExtra?: React.ReactNode;
  className?: string;
}

export function ListRow({
  href,
  code,
  title,
  subtitle,
  chip,
  rightExtra,
  className = '',
}: ListRowProps) {
  const innerContent = (
    <div
      className={[
        'flex items-center justify-between gap-3 border-t border-line-soft py-3 first:border-t-0 transition-colors',
        href ? 'group-hover:text-brand' : '',
        className,
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        {code && <div className="text-caption text-muted font-mono">{code}</div>}
        <div className="text-body font-medium text-ink truncate">{title}</div>
        {subtitle && <div className="text-caption text-muted truncate mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {chip}
        {rightExtra}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block focus-visible:outline-2 focus-visible:outline-brand rounded-control">
        {innerContent}
      </Link>
    );
  }

  return innerContent;
}
