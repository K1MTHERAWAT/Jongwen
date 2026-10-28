import React from 'react';
import { Button } from './Button';

export function LoadingSkeleton({ className = 'h-24 w-full' }: { className?: string }) {
  return <div className={`bg-surface-muted animate-pulse rounded-card ${className}`} />;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-card border border-dashed border-line bg-surface">
      <div className="text-heading text-ink font-semibold">{title}</div>
      {description && <div className="text-body text-muted mt-1 max-w-sm">{description}</div>}
      {actionLabel && (
        <div className="mt-4">
          {actionHref ? (
            <a href={actionHref}>
              <Button variant="primary">{actionLabel}</Button>
            </a>
          ) : (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-card border border-danger-fg/20 bg-danger-bg p-5">
      <div className="text-body font-semibold text-danger-fg">
        {message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}
      </div>
      {onRetry && (
        <div className="mt-3">
          <Button variant="secondary" onClick={onRetry}>
            ลองอีกครั้ง
          </Button>
        </div>
      )}
    </div>
  );
}
