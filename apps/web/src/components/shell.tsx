'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronLeft,
  Lock,
  LogOut,
  ShieldAlert,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  PERMISSION_KEYS,
  PERMISSION_LABEL,
  ROLE_LABEL,
  ROLE_META,
  Role,
  canAccessRoute,
} from '@jongwen/shared';
import { useAuth } from './auth-context';
import { Sidebar } from './Sidebar';
import { getVisibleNav } from './nav';
import { Button, Card, Chip } from './ui';
import { formatThaiDateTime } from '@/lib/api';

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

export interface AppShellProps {
  title?: string;
  rightLabel?: string;
  maxWidth?: string;
  footer?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
  children: React.ReactNode;
}

export function AppShell({
  title,
  rightLabel,
  maxWidth = 'max-w-[1200px]',
  footer,
  onBack,
  backHref,
  children,
}: AppShellProps) {
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
  const [showProfile, setShowProfile] = useState(false);

  const visibleNav = getVisibleNav(account);
  const access = canAccessRoute(account, pathname);
  const grantedPerms = PERMISSION_KEYS.filter((k) => account?.permissions?.[k]);

  const handleLogoutAndLogin = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-dvh bg-ground text-ink font-sans selection:bg-brand-tint selection:text-brand-ink print:bg-white print:block">
      {/* Responsive Floating Sidebar (Desktop lg+) & Drawer (Mobile <lg) */}
      <Sidebar items={visibleNav} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar: Minimal Clean */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 md:px-8 lg:px-10 backdrop-blur-md select-none print:hidden">
          {/* Left: Mobile hamburger space + back button + Title */}
          <div className="flex items-center gap-2.5 pl-12 lg:pl-0 min-w-0">
            {onBack || backHref ? (
              <button
                type="button"
                onClick={() => (onBack ? onBack() : backHref && router.push(backHref))}
                className="grid size-9 place-items-center rounded-control hover:bg-hover text-ink-soft transition shrink-0"
                aria-label="ย้อนกลับ"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : (
              <Link href="/" className="size-7 rounded-control overflow-hidden shrink-0 flex items-center justify-center lg:hidden" title="Jongwen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Jongwen Logo" className="size-full object-contain" />
              </Link>
            )}

            <div className="min-w-0">
              {title ? (
                <h1 className="text-heading font-bold text-ink truncate">{title}</h1>
              ) : (
                <span className="text-body font-medium text-muted truncate">
                  ระบบจองสถานที่ ยืม–คืนครุภัณฑ์ และแจ้งซ่อม
                </span>
              )}
            </div>
          </div>

          {/* Right: Notification Popover + User Profile Chip */}
          <div className="flex items-center gap-3 shrink-0">
            {rightLabel && (
              <span className="text-caption text-muted hidden xl:inline">{rightLabel}</span>
            )}

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotif((v) => !v)}
                className="relative grid size-10 place-items-center rounded-control text-ink-soft hover:bg-hover hover:text-ink transition"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-fg text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-card border border-line bg-surface p-4 shadow-pop z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-line-soft">
                    <b className="text-body font-semibold text-ink">
                      การแจ้งเตือน ({notifications.length})
                    </b>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllNotificationsRead()}
                          className="text-caption text-brand font-semibold hover:underline"
                        >
                          อ่านทั้งหมด
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotif(false)}
                        className="text-ink-soft hover:text-ink"
                        aria-label="ปิดกล่องแจ้งเตือน"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-line-soft mt-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-body text-muted">
                        ไม่มีการแจ้งเตือน
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotif(false);
                            if (n.link) router.push(n.link);
                          }}
                          className={`py-3 px-2 rounded-xl cursor-pointer hover:bg-hover transition-colors ${
                            !n.read ? 'bg-brand-tint/40 font-medium' : ''
                          }`}
                        >
                          <div className="text-body font-semibold text-ink leading-snug">{n.title}</div>
                          <div className="text-caption text-muted mt-0.5 line-clamp-2">{n.body}</div>
                          <div className="text-[11px] text-muted mt-1">
                            {formatThaiDateTime(n.at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Chip */}
            {account ? (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                title="ดูข้อมูลส่วนตัว"
                className="flex items-center gap-2 rounded-control bg-surface-muted border border-line px-2.5 py-1.5 hover:bg-hover transition-colors text-left"
              >
                <div className="size-7 rounded-full bg-brand-tint text-brand-ink text-caption font-bold grid place-items-center shrink-0">
                  {account.initial || account.name.charAt(0) || 'ผ'}
                </div>
                <div className="hidden sm:flex flex-col leading-tight min-w-0">
                  <span className="text-caption font-semibold text-ink truncate max-w-[120px]">
                    {account.name}
                  </span>
                  <span className="text-[11px] text-muted truncate">
                    {ROLE_META[account.role]?.shortLabel || 'ผู้ใช้'}
                  </span>
                </div>
              </button>
            ) : (
              <Link href="/login">
                <Button variant="secondary" className="h-9 px-3 text-caption">
                  เข้าสู่ระบบ
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className={`flex-1 w-full ${maxWidth} mx-auto p-4 md:p-6 lg:p-8 min-w-0 print:p-0 print:max-w-none`}
        >
          {loading ? (
            <Card className="p-8 max-w-[480px] mx-auto my-8 text-center text-body text-muted flex flex-col items-center justify-center gap-3">
              <div className="size-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <span>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</span>
            </Card>
          ) : !account ? (
            <Card className="p-8 max-w-[500px] mx-auto my-8 flex flex-col items-center text-center gap-4">
              <div className="size-12 rounded-full bg-brand-tint text-brand-ink flex items-center justify-center">
                <Lock className="size-6" />
              </div>
              <div>
                <h2 className="text-heading font-bold text-ink">กรุณาเข้าสู่ระบบก่อนใช้งาน</h2>
                <p className="text-body text-muted mt-1">
                  เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านตามบทบาทที่ต้องการใช้งาน
                </p>
              </div>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full sm:w-56">
                  ไปหน้าเข้าสู่ระบบ
                </Button>
              </Link>
            </Card>
          ) : !access.allowed ? (
            <Card className="p-6 max-w-[620px] mx-auto my-6 border-danger-fg/30 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="size-11 rounded-2xl bg-danger-bg text-danger-fg flex items-center justify-center shrink-0">
                  <ShieldAlert className="size-6" />
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-heading font-bold text-ink">จำกัดสิทธิ์การเข้าถึงหน้านี้</h2>
                    <Chip tone="danger">ไม่มีสิทธิ์เข้าถึง (403)</Chip>
                  </div>
                  <p className="text-body text-muted">
                    หน้า <b>{access.title}</b> ({pathname}) สงวนสิทธิ์เฉพาะผู้ที่ได้รับมอบหมายเท่านั้น
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-muted border border-line p-4 flex flex-col gap-2 text-caption">
                <div className="flex justify-between gap-2">
                  <span className="text-muted">บัญชีของคุณขณะนี้:</span>
                  <span className="font-semibold text-ink">
                    {account.name} ({ROLE_LABEL[account.role]})
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">บทบาทที่เข้าใช้งานได้:</span>
                  <span className="font-semibold text-brand">
                    {access.requiredRoles.map((r) => ROLE_LABEL[r]).join(' / ')}
                  </span>
                </div>
                {access.requiredPermission && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">สิทธิ์ย่อยที่ต้องเปิด:</span>
                    <span className="font-semibold text-warn-fg">
                      {PERMISSION_LABEL[access.requiredPermission]}
                    </span>
                  </div>
                )}
                {access.reason && (
                  <div className="pt-2 mt-1 border-t border-line text-danger-fg font-medium">
                    สาเหตุ: {access.reason}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Button
                  variant="primary"
                  onClick={handleLogoutAndLogin}
                  className="flex-1"
                >
                  ออกจากระบบเพื่อสลับบัญชี
                </Button>
                <Link href={roleHomePath(account.role)}>
                  <Button variant="secondary" className="w-full sm:w-auto">
                    กลับหน้าหลักของฉัน
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            children
          )}
        </main>

        {/* Optional Sticky Footer Bar */}
        {footer && account && access.allowed && (
          <div className="print:hidden sticky bottom-0 inset-x-0 bg-surface/95 backdrop-blur border-t border-line py-3 px-4 md:px-8 lg:px-10 z-20">
            <div className={`w-full ${maxWidth} mx-auto flex items-center justify-end gap-3`}>
              {footer}
            </div>
          </div>
        )}
      </div>

      {/* Modal: ข้อมูลส่วนตัว (User Profile) */}
      {showProfile && account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="max-w-md w-full p-6 shadow-pop flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line-soft">
              <h3 className="text-heading font-bold text-ink">ข้อมูลส่วนตัว</h3>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="text-ink-soft hover:text-ink"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-brand-tint text-brand-ink font-bold text-display grid place-items-center shrink-0 border border-line">
                {account.initial || account.name.charAt(0) || 'ผ'}
              </div>
              <div className="min-w-0">
                <b className="text-heading font-bold text-ink block truncate">{account.name}</b>
                <span className="text-caption text-muted block truncate">
                  @{account.username} · {ROLE_LABEL[account.role]}
                </span>
                <div className="mt-1">
                  <Chip tone="ok">{ROLE_META[account.role]?.shortLabel}</Chip>
                </div>
              </div>
            </div>

            <div className="bg-surface-muted rounded-2xl p-4 flex flex-col gap-2.5 text-body">
              <div className="flex justify-between gap-2">
                <span className="text-muted">หน่วยงาน:</span>
                <span className="font-semibold text-ink text-right">{account.department || '-'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">ตำแหน่ง:</span>
                <span className="font-semibold text-ink text-right">{account.position || '-'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">เบอร์โทรศัพท์:</span>
                <span className="font-semibold text-ink text-right">{account.phone || '-'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">LINE ID:</span>
                <span className="font-semibold text-ink text-right">{account.lineName || '-'}</span>
              </div>
            </div>

            {grantedPerms.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-muted">
                  สิทธิ์ย่อยที่ได้รับมอบหมาย:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {grantedPerms.map((k) => (
                    <Chip key={k} tone="ok">
                      {PERMISSION_LABEL[k]}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                onClick={handleLogoutAndLogin}
                className="text-danger-fg hover:text-danger-fg hover:bg-danger-bg"
              >
                <LogOut className="size-4" />
                ออกจากระบบ
              </Button>
              <Button variant="secondary" onClick={() => setShowProfile(false)}>
                ปิดหน้าต่าง
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
