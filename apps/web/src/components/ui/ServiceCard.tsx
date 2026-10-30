import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
      className="group rounded-card border border-line bg-surface p-5 shadow-card hover:border-brand/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
    >
      <div className="flex flex-col gap-3.5">
        <div className="size-12 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors shadow-sm">
          <IconComponent className="size-6" />
        </div>
        <div>
          <h3 className="text-[17px] text-ink font-bold group-hover:text-brand transition-colors">
            {title}
          </h3>
          <p className="text-body text-muted mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-line-soft flex items-center justify-between text-caption font-semibold text-brand">
        <span>เข้าใช้บริการ</span>
        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
