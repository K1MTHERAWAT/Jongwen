'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Menu, PanelLeft, X } from 'lucide-react';
import { useAuth } from './auth-context';
import type { NavItem } from './nav';
import { ROLE_META } from '@jongwen/shared';

export function Sidebar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const { account, logout } = useAuth();
  const [open, setOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(localStorage.getItem('jw-sidebar') !== '0');
  }, []);

  useEffect(() => {
    setDrawer(false);
  }, [path]);

  const closeDrawer = useCallback(() => {
    setDrawer(false);
    openBtn.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, closeDrawer]);

  const toggle = () =>
    setOpen((v) => {
      localStorage.setItem('jw-sidebar', v ? '0' : '1');
      return !v;
    });

  return (
    <>
      <button
        ref={openBtn}
        onClick={() => setDrawer(true)}
        aria-label="เปิดเมนู"
        className="fixed left-3 top-3 z-30 grid size-11 place-items-center rounded-control bg-surface border border-line text-ink-soft hover:bg-hover lg:hidden shadow-xs"
      >
        <Menu className="size-5" />
      </button>

      {drawer && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-ink/45 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        aria-label="เมนูหลัก"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-drawer flex-col justify-between bg-surface p-3 shadow-pop transition-all duration-200',
          drawer ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-3 lg:z-auto lg:m-3 lg:h-[calc(100dvh-24px)] lg:translate-x-0',
          'lg:rounded-float lg:border lg:border-line lg:shadow-float',
          open ? 'lg:w-sidebar' : 'lg:w-sidebar-mini',
        ].join(' ')}
      >
        <div className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden flex-1">
          {/* Header */}
          <div className="flex h-11 items-center justify-between pl-2 mb-1">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-brand text-white font-bold flex items-center justify-center shrink-0 text-body">
                J
              </span>
              <span className={['text-heading text-ink font-bold tracking-tight', open ? '' : 'lg:sr-only'].join(' ')}>
                Jongwen
              </span>
            </Link>
            <button
              onClick={toggle}
              aria-label={open ? 'ย่อแถบข้าง' : 'ขยายแถบข้าง'}
              className="hidden size-9 place-items-center rounded-control hover:bg-hover text-ink-soft lg:grid"
            >
              <PanelLeft className="size-[18px]" />
            </button>
            <button
              onClick={closeDrawer}
              aria-label="ปิดเมนู"
              className="grid size-11 place-items-center rounded-control hover:bg-hover text-ink-soft lg:hidden"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {items.map((i) => {
              const active = i.exact || i.href === '/' ? path === i.href : path.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  title={i.label}
                  aria-current={active ? 'page' : undefined}
                  className="flex h-11 items-center gap-3 rounded-control px-3 text-ink-soft hover:bg-hover transition-colors aria-[current=page]:bg-brand-tint aria-[current=page]:font-semibold aria-[current=page]:text-brand-ink"
                >
                  <i.icon className="size-5 shrink-0" />
                  <span className={['text-body truncate', open ? '' : 'lg:sr-only'].join(' ')}>
                    {i.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / User Profile */}
        <div className="border-t border-line-soft pt-3 mt-2 flex flex-col gap-1">
          {account ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-control bg-surface-muted">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-tint text-brand-ink font-bold flex items-center justify-center text-caption shrink-0">
                  {account.initial || account.name.charAt(0) || 'ผ'}
                </div>
                <div className={['min-w-0 flex-1 leading-tight', open ? '' : 'lg:sr-only'].join(' ')}>
                  <div className="text-caption font-semibold text-ink truncate">{account.name}</div>
                  <div className="text-[11px] text-muted truncate">
                    {ROLE_META[account.role]?.shortLabel || 'ผู้ใช้'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="ออกจากระบบ"
                aria-label="ออกจากระบบ"
                className="size-8 grid place-items-center rounded-control hover:bg-hover text-ink-soft hover:text-danger-fg shrink-0"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              title="เข้าสู่ระบบ"
              className="flex h-11 items-center gap-3 rounded-control px-3 text-ink-soft hover:bg-hover transition-colors font-medium text-body"
            >
              <LogIn className="size-5 shrink-0" />
              <span className={open ? '' : 'lg:sr-only'}>เข้าสู่ระบบ</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
