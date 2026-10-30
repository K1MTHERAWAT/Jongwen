'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Menu, PanelLeft, X } from 'lucide-react';
import { useAuth } from './auth-context';
import type { NavItem } from './nav';
import { ROLE_LABEL } from '@jongwen/shared';

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

  // จัดกลุ่มเมนูตาม section
  const sections: { title: string; list: NavItem[] }[] = [];
  for (const item of items) {
    const sec = item.section || 'เมนูหลัก';
    const found = sections.find((s) => s.title === sec);
    if (found) {
      found.list.push(item);
    } else {
      sections.push({ title: sec, list: [item] });
    }
  }

  return (
    <>
      <button
        ref={openBtn}
        onClick={() => setDrawer(true)}
        aria-label="เปิดเมนู"
        className="fixed left-3.5 top-3 z-30 grid size-10 place-items-center rounded-control bg-surface border border-line text-ink-soft hover:bg-hover lg:hidden shadow-sm print:hidden"
      >
        <Menu className="size-5" />
      </button>

      {drawer && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden backdrop-blur-[2px] transition-opacity print:hidden"
        />
      )}

      <aside
        aria-label="เมนูหลัก"
        className={[
          'print:hidden',
          'fixed inset-y-0 left-0 z-50 flex w-drawer flex-col justify-between bg-surface p-3.5 shadow-pop transition-all duration-200',
          drawer ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-3 lg:z-auto lg:m-3 lg:h-[calc(100dvh-24px)] lg:translate-x-0',
          'lg:rounded-float lg:border lg:border-line/90 lg:shadow-float',
          open ? 'lg:w-sidebar' : 'lg:w-sidebar-mini',
        ].join(' ')}
      >
        <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden flex-1 pr-0.5">
          {/* Brand Header */}
          <div className="flex h-12 items-center justify-between pl-1.5 pb-2 border-b border-line-soft">
            <Link href="/" className="flex items-center gap-2.5 min-w-0" title="Jongwen">
              <div className="size-9 rounded-control overflow-hidden shrink-0 flex items-center justify-center bg-brand-tint border border-brand/20 p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Jongwen Logo"
                  className="size-full object-contain"
                />
              </div>
              <div className={['min-w-0 leading-tight', open ? '' : 'lg:sr-only'].join(' ')}>
                <span className="text-[16px] text-ink font-bold tracking-tight block truncate">
                  Jongwen
                </span>
                <span className="text-[11px] text-muted block truncate">
                  ระบบบริการออนไลน์ อบต.
                </span>
              </div>
            </Link>
            <button
              onClick={toggle}
              aria-label={open ? 'ย่อแถบข้าง' : 'ขยายแถบข้าง'}
              className="hidden size-8 place-items-center rounded-control hover:bg-hover text-muted hover:text-ink lg:grid transition-colors"
            >
              <PanelLeft className="size-[18px]" />
            </button>
            <button
              onClick={closeDrawer}
              aria-label="ปิดเมนู"
              className="grid size-9 place-items-center rounded-control hover:bg-hover text-ink-soft lg:hidden"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="flex flex-col gap-3.5">
            {sections.map((sec, sIdx) => (
              <div key={sec.title} className="flex flex-col gap-0.5">
                <div
                  className={[
                    'px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted/80 select-none',
                    open ? '' : 'lg:hidden',
                  ].join(' ')}
                >
                  {sec.title}
                </div>
                {!open && sIdx > 0 && (
                  <div className="hidden lg:block h-px bg-line-soft mx-2 my-1" />
                )}
                {sec.list.map((i) => {
                  const active =
                    i.exact || i.href === '/'
                      ? path === i.href
                      : path === i.href || path.startsWith(`${i.href}/`);
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      title={i.label}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'relative flex h-10 items-center gap-3 rounded-control px-3 text-[13.5px] transition-all',
                        active
                          ? 'bg-brand-tint font-bold text-brand-ink shadow-sm'
                          : 'text-ink-soft font-medium hover:bg-hover hover:text-ink',
                      ].join(' ')}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand" />
                      )}
                      <i.icon
                        className={[
                          'size-[19px] shrink-0 transition-colors',
                          active ? 'text-brand' : 'text-muted',
                        ].join(' ')}
                      />
                      <span className={['truncate', open ? '' : 'lg:sr-only'].join(' ')}>
                        {i.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer / User Profile */}
        <div className="border-t border-line-soft pt-3 mt-2 flex flex-col gap-1">
          {account ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-control bg-surface-muted/80 border border-line/60">
              <Link
                href="/account"
                title="จัดการบัญชีของฉัน"
                className="flex items-center gap-2.5 min-w-0 flex-1 rounded-control p-0.5 hover:opacity-90 transition-opacity"
              >
                <div className="size-9 rounded-full bg-brand text-white font-bold flex items-center justify-center text-caption shrink-0 shadow-sm">
                  {account.initial || account.name.charAt(0) || 'ผ'}
                </div>
                <div className={['min-w-0 flex-1 leading-tight', open ? '' : 'lg:sr-only'].join(' ')}>
                  <div className="text-[13px] font-bold text-ink truncate">{account.name}</div>
                  <div className="text-[11px] text-brand font-semibold truncate">
                    {ROLE_LABEL[account.role]}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={logout}
                title="ออกจากระบบ"
                aria-label="ออกจากระบบ"
                className={[
                  'size-8 grid place-items-center rounded-control hover:bg-danger-bg text-muted hover:text-danger-fg shrink-0 transition-colors',
                  open ? '' : 'lg:hidden',
                ].join(' ')}
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              title="เข้าสู่ระบบ"
              className="flex h-10 items-center gap-3 rounded-control px-3 bg-brand text-white hover:bg-brand-ink transition-colors font-semibold text-body justify-center"
            >
              <LogIn className="size-4 shrink-0" />
              <span className={open ? '' : 'lg:sr-only'}>เข้าสู่ระบบ</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
