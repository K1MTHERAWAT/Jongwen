'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  PERMISSION_KEYS,
  PERMISSION_LABEL,
  PublicAccount,
  ROLE_LABEL,
  ROLE_META,
  ROLE_TONE,
  Role,
  canAccessRoute,
  hasPermission,
} from '@jongwen/shared';
import { useAuth } from './auth-context';
import { Icon, IconName } from './icons';
import { Chip } from './ui';
import { formatThaiDateTime } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  action?: 'notifications';
}

function getNavForAccount(account: PublicAccount | null, unreadCount: number): NavItem[] {
  const role = account?.role ?? 'USER';
  switch (role) {
    case 'STAFF': {
      const items: NavItem[] = [{ href: '/staff', label: 'หน้าแรก', icon: 'home' }];
      if (hasPermission(account, 'review')) {
        items.push({ href: '/staff/review', label: 'คำขอ', icon: 'list-details' });
      }
      if (hasPermission(account, 'handover')) {
        items.push({ href: '/staff/handover', label: 'รับมอบ-คืน', icon: 'package' });
      }
      items.push({
        href: '#notif',
        label: 'แจ้งเตือน',
        icon: 'bell',
        badge: unreadCount || undefined,
        action: 'notifications',
      });
      return items;
    }
    case 'APPROVER_L2':
    case 'APPROVER_L1': {
      const items: NavItem[] = [{ href: '/approver', label: 'หน้าแรก', icon: 'home' }];
      items.push({ href: '/approver/settings', label: 'ลายเซ็น/PIN', icon: 'lock' });
      items.push({
        href: '#notif',
        label: 'แจ้งเตือน',
        icon: 'bell',
        badge: unreadCount || undefined,
        action: 'notifications',
      });
      return items;
    }
    case 'ADMIN': {
      const items: NavItem[] = [{ href: '/admin', label: 'ภาพรวม', icon: 'chart-bar' }];
      if (hasPermission(account, 'manageResources')) {
        items.push({ href: '/admin/resources', label: 'ทรัพยากร', icon: 'building-community' });
      }
      if (hasPermission(account, 'manageUsers')) {
        items.push({ href: '/admin/permissions', label: 'สิทธิ์', icon: 'shield-check' });
      }
      return items;
    }
    case 'USER':
    default:
      return [
        { href: '/', label: 'หน้าแรก', icon: 'home' },
        { href: '/booking', label: 'สถานที่', icon: 'calendar' },
        { href: '/repair', label: 'แจ้งซ่อม', icon: 'tool' },
        { href: '/borrow/my', label: 'อุปกรณ์', icon: 'package' },
        { href: '#notif', label: 'แจ้งเตือน', icon: 'bell', badge: unreadCount || undefined, action: 'notifications' },
      ];
  }
}

export function roleHomePath(role?: Role): string {
  switch (role) {
    case 'STAFF':
      return '/staff';
    case 'APPROVER_L2':
    case 'APPROVER_L1':
      return '/approver';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}

export function AppShell({
  title,
  backHref,
  onBack,
  rightLabel,
  children,
  footer,
  maxWidth = 'max-w-[1280px]',
}: {
  title?: string;
  backHref?: string;
  onBack?: () => void;
  rightLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    account,
    loading,
    logout,
    notifications,
    unreadCount,
    markAllNotificationsRead,
  } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = getNavForAccount(account, unreadCount);
  const desktopNavItems = navItems.filter((i) => !i.action);
  const access = canAccessRoute(account, pathname);
  const grantedPerms = PERMISSION_KEYS.filter((k) => account?.permissions?.[k]);

  const handleLogoutAndLogin = () => {
    logout();
    setShowUserMenu(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col print:min-h-0 print:block">
      {/* Header หลัก (Green Gradient) — ซ่อนเวลาสั่งพิมพ์ PDF */}
      <header className="no-print print:hidden jw-header text-white h-16 px-4 sm:px-8 flex items-center gap-4 shadow-low sticky top-0 z-30">
        {onBack || backHref ? (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : backHref && router.push(backHref))}
            className="lg:hidden -ml-1 p-1.5 rounded-full hover:bg-white/15"
            aria-label="ย้อนกลับ"
          >
            <Icon name="chevron-left" className="w-6 h-6" />
          </button>
        ) : null}

        <Link href={roleHomePath(account?.role)} className="flex items-center gap-2.5 font-bold text-[19px] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Jongwen Logo"
            className="w-9 h-9 rounded-[8px] bg-white p-0.5 object-contain shrink-0"
          />
          <span>Jongwen</span>
        </Link>

        {title && <span className="lg:hidden font-bold text-[16px] truncate">{title}</span>}

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {desktopNavItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href)) ||
              (item.href === '/borrow/my' && pathname.startsWith('/borrow'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-[8px] font-semibold text-[14px] flex items-center gap-2 transition ${
                  active ? 'bg-white/25 text-white' : 'text-[#DDF1E8] hover:bg-white/15 hover:text-white'
                }`}
              >
                <Icon name={item.icon} className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ข้อมูลผู้ใช้และแจ้งเตือน */}
        <div className="ml-auto flex items-center gap-3 relative">
          {rightLabel && <span className="text-[13px] opacity-90 hidden sm:inline">{rightLabel}</span>}

          <button
            type="button"
            onClick={() => {
              setShowUserMenu(false);
              setShowNotif((v) => !v);
            }}
            className="relative p-1.5 rounded-full hover:bg-white/15"
            aria-label="การแจ้งเตือน"
          >
            <Icon name="bell" className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-status-crit text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {account ? (
            <button
              type="button"
              onClick={() => {
                setShowNotif(false);
                setShowUserMenu((v) => !v);
              }}
              className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 transition"
            >
              <span className="w-8 h-8 rounded-full bg-white text-brand font-bold text-[14px] flex items-center justify-center border border-white/70">
                {account.initial}
              </span>
              <span className="hidden sm:flex flex-col text-left leading-tight">
                <b className="text-[13px] text-white">{account.name}</b>
                <span className="text-[11px] text-white/85">
                  {ROLE_META[account.role]?.shortLabel ?? account.position}
                </span>
              </span>
            </button>
          ) : (
            <Link href="/login" className="jw-btn jw-btn-sm bg-white text-brand hover:bg-brand-mint">
              เข้าสู่ระบบ
            </Link>
          )}

          {/* กล่องแจ้งเตือน */}
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white text-ink rounded-hard shadow-high border border-line p-3.5 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <b className="text-[14px]">การแจ้งเตือน ({notifications.length})</b>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllNotificationsRead()}
                      className="text-[12px] text-brand font-semibold hover:underline"
                    >
                      อ่านทั้งหมดแล้ว
                    </button>
                  )}
                  <button type="button" onClick={() => setShowNotif(false)} className="text-ink-mute">
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-line">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-ink-mute">ไม่มีการแจ้งเตือน</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setShowNotif(false);
                        if (n.link) router.push(n.link);
                      }}
                      className={`py-2.5 px-2 rounded-sq cursor-pointer hover:bg-soft ${
                        !n.read ? 'bg-brand-mint/50' : ''
                      }`}
                    >
                      <div className="font-semibold text-[13px]">{n.title}</div>
                      <div className="text-[12px] text-ink-mute">{n.body}</div>
                      <div className="text-[11px] text-ink-ph mt-0.5">{formatThaiDateTime(n.at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* เมนูบัญชีผู้ใช้ */}
          {showUserMenu && account && (
            <div className="absolute right-0 top-12 w-64 bg-white text-ink rounded-hard shadow-high border border-line p-3 z-50 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-line">
                <div className="min-w-0 flex-1">
                  <b className="block text-[14px] truncate">{account.name}</b>
                  <span className="text-[12px] text-ink-mute truncate block">
                    {account.position} · {account.department}
                  </span>
                </div>
                <Chip tone={ROLE_TONE[account.role]}>{ROLE_META[account.role]?.shortLabel}</Chip>
              </div>

              <div className="flex flex-col gap-1 text-[13px] pt-0.5">
                <Link
                  href={roleHomePath(account.role)}
                  onClick={() => setShowUserMenu(false)}
                  className="px-2.5 py-2 rounded-sq hover:bg-soft font-semibold flex items-center gap-2"
                >
                  <Icon name="home" className="w-4 h-4 text-brand" /> หน้าหลักตามบทบาท (
                  {ROLE_META[account.role]?.shortLabel})
                </Link>
                <Link
                  href="/history"
                  onClick={() => setShowUserMenu(false)}
                  className="px-2.5 py-2 rounded-sq hover:bg-soft font-semibold flex items-center gap-2"
                >
                  <Icon name="clock" className="w-4 h-4 text-brand" /> ประวัติคำขอ
                </Link>
                {(account.role === 'STAFF' ||
                  account.role === 'APPROVER_L2' ||
                  account.role === 'APPROVER_L1') && (
                  <Link
                    href="/approver/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="px-2.5 py-2 rounded-sq hover:bg-soft font-semibold flex items-center gap-2"
                  >
                    <Icon name="lock" className="w-4 h-4 text-brand" /> ตั้งค่าลายเซ็นและ PIN
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    router.push('/login');
                  }}
                  className="px-2.5 py-2 rounded-sq hover:bg-[#FDE8E8] text-status-crit font-semibold flex items-center gap-2 text-left"
                >
                  <Icon name="x" className="w-4 h-4" /> ออกจากระบบ / เปลี่ยนผู้ใช้
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content (พร้อมตรวจสิทธิ์การเข้าถึงหน้าชัดเจน) */}
      <main className={`flex-1 w-full ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10 print:p-0 print:max-w-none`}>
        {(onBack || backHref) && (
          <div className="no-print print:hidden hidden lg:flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => (onBack ? onBack() : backHref && router.push(backHref))}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mute hover:text-ink"
            >
              <Icon name="chevron-left" className="w-4 h-4" /> ย้อนกลับ
            </button>
            {title && (
              <>
                <span className="text-line">/</span>
                <span className="text-[14px] font-semibold text-ink">{title}</span>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="jw-card p-8 max-w-[480px] mx-auto my-8 text-center text-[14px] text-ink-mute">
            กำลังตรวจสอบสถานะการเข้าสู่ระบบ...
          </div>
        ) : !account ? (
          <div className="jw-card p-6 max-w-[520px] mx-auto my-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-mint text-brand flex items-center justify-center">
              <Icon name="lock" className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <b className="text-[18px] text-ink">กรุณาเข้าสู่ระบบก่อนใช้งาน</b>
              <span className="text-[13.5px] text-ink-mute">
                เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านตามบทบาทที่ต้องการใช้งาน
              </span>
            </div>
            <Link href="/login" className="jw-btn w-full sm:w-56">
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : !access.allowed ? (
          <div className="jw-card p-6 max-w-[620px] mx-auto my-4 border-[#F5B7B1] bg-[#FFFDFD] flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-[12px] bg-[#FDE8E8] text-status-crit flex items-center justify-center shrink-0">
                <Icon name="shield-check" className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[17px] text-ink">จำกัดสิทธิ์การเข้าถึงหน้านี้</b>
                  <Chip tone="red">ไม่มีสิทธิ์เข้าถึง (403)</Chip>
                </div>
                <span className="text-[13.5px] text-ink-mute">
                  หน้า <b>{access.title}</b> ({pathname}) สงวนสิทธิ์เฉพาะผู้ที่ได้รับมอบหมายเท่านั้น
                </span>
              </div>
            </div>

            <div className="rounded-[10px] bg-soft border border-line p-4 flex flex-col gap-2 text-[13.5px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-mute">บัญชีของคุณขณะนี้:</span>
                <span className="font-semibold text-ink">
                  {account ? `${account.name} (${ROLE_LABEL[account.role]})` : 'ยังไม่ได้เข้าสู่ระบบ'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-mute">บทบาทที่เข้าใช้งานได้:</span>
                <span className="font-semibold text-brand">
                  {access.requiredRoles.map((r) => ROLE_LABEL[r]).join(' / ')}
                </span>
              </div>
              {access.requiredPermission && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-mute">สิทธิ์ย่อยที่ต้องเปิด:</span>
                  <span className="font-semibold text-[#7A4B0A]">
                    {PERMISSION_LABEL[access.requiredPermission]}
                  </span>
                </div>
              )}
              {access.reason && (
                <div className="pt-2 mt-1 border-t border-line text-[13px] text-status-crit font-medium">
                  สาเหตุ: {access.reason}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleLogoutAndLogin}
                className="jw-btn flex-1"
              >
                ออกจากระบบเพื่อเข้าสู่ระบบด้วยบัญชีอื่น
              </button>
              <Link href={roleHomePath(account?.role)} className="jw-btn-sec sm:w-52">
                กลับหน้าหลักของฉัน
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Sticky Footer Action Bar (แสดงเฉพาะเมื่อเข้าสู่ระบบและมีสิทธิ์เข้าถึงหน้านี้ · ซ่อนเวลาพิมพ์ PDF) */}
      {footer && account && access.allowed && (
        <div className="no-print print:hidden sticky bottom-16 lg:bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-line py-3 px-4 z-20">
          <div className={`w-full ${maxWidth} mx-auto flex items-center justify-end gap-3`}>{footer}</div>
        </div>
      )}

      {/* Bottom Tabbar สำหรับมือถือ/แท็บเล็ต · ซ่อนเวลาพิมพ์ PDF */}
      <nav className="no-print print:hidden lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-line flex z-30">
        {navItems.slice(0, 5).map((item) => {
          if (item.action === 'notifications') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setShowNotif((v) => !v)}
                className={`flex-1 relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  showNotif ? 'text-ink shadow-[inset_0_3px_0_#0F6E56]' : 'text-ink-mute'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5" strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-[18px] h-[18px] rounded-full bg-status-crit text-white text-[11px] font-bold flex items-center justify-center px-1">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          }

          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href)) ||
            (item.href === '/borrow/my' && pathname.startsWith('/borrow'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                active ? 'text-ink shadow-[inset_0_3px_0_#0F6E56]' : 'text-ink-mute'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5" strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-[18px] h-[18px] rounded-full bg-status-crit text-white text-[11px] font-bold flex items-center justify-center px-1">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
