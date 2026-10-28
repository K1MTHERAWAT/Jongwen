import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export interface ServiceCardProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ServiceCard({ href, title, description, icon: IconComponent }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-card border border-line bg-surface p-5 shadow-xs hover:border-line-input transition-colors flex flex-col justify-between gap-4"
    >
      <div className="flex flex-col gap-3">
        <div className="size-11 rounded-2xl bg-brand-tint text-brand-ink flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <IconComponent className="size-6" />
        </div>
        <div>
          <h3 className="text-heading text-ink font-semibold group-hover:text-brand transition-colors">
            {title}
          </h3>
          <p className="text-body text-muted mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}
