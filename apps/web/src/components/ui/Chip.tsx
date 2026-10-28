import React from 'react';
import { RequestStatus, STATUS_META, Tone } from '@jongwen/shared';

export type ChipTone = 'warn' | 'ok' | 'info' | 'danger' | Tone;

const TONE_CLASSES: Record<ChipTone, string> = {
  warn: 'bg-warn-bg text-warn-fg',
  ok: 'bg-ok-bg text-ok-fg',
  info: 'bg-info-bg text-info-fg',
  danger: 'bg-danger-bg text-danger-fg',
  // Legacy mappings for backwards compatibility
  amber: 'bg-warn-bg text-warn-fg',
  green: 'bg-ok-bg text-ok-fg',
  blue: 'bg-info-bg text-info-fg',
  red: 'bg-danger-bg text-danger-fg',
  gray: 'bg-surface-muted text-muted',
};

export function Chip({
  tone = 'info',
  className = '',
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold tracking-tight',
        TONE_CLASSES[tone] || TONE_CLASSES.info,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function statusToTone(status: RequestStatus | string): 'warn' | 'ok' | 'info' | 'danger' {
  switch (status) {
    case 'pending_staff':
    case 'pending_l2':
    case 'pending_l1':
    case 'repair_submitted':
    case 'repair_awaiting_acceptance':
      return 'warn';
    case 'approved':
    case 'repair_done':
    case 'returned':
      return 'ok';
    case 'borrowing':
    case 'return_inspect':
    case 'repair_in_progress':
      return 'info';
    case 'rejected':
    case 'cancelled':
      return 'danger';
    default:
      return 'info';
  }
}

export function StatusChip({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  const label = meta ? meta.label : status;
  const tone = statusToTone(status);

  return <Chip tone={tone}>{label}</Chip>;
}
