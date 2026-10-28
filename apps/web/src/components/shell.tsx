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
import { Icon } from './icons';
import { Chip } from './ui';
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

interface SidebarContentProps {
  account: PublicAccount | null;
  pathname: string;
  onNavigate: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onClose: () => void;
}

function SidebarContent({
  account,
  pathname,
  onNavigate,
  onOpenProfile,
  onLogout,
  onClose,
}: SidebarContentProps) {
  const isStaff = account?.role === 'STAFF';
  const isApprover = account?.role === 'APPROVER_L1' || account?.role === 'APPROVER_L2';
  const isAdmin = account?.role === 'ADMIN';

  return (
    <div className="flex flex-col h-full select-none text-[#334155] bg-white">
      {/* 1. ส่วนหัวโปรไฟล์ใน Sidebar: Avatar + ชื่อบัญชี + จุดสถานะสีเหลือง + ป้ายบทบาท + ปุ่มปิด */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[#E2E8F0] bg-soft shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/avatar-demo.png"
              alt={account?.name || 'User Avatar'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="w-full h-full rounded-full bg-brand-mint text-brand font-bold text-[17px] flex items-center justify-center">
              {account?.initial || 'บ'}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-bold text-[16px] text-[#1E293B] truncate leading-tight">
              {account?.name || 'บังคิม'}
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-[#64748B] mt-1 leading-none">
              <span className="w-2 h-2 rounded-full bg-[#EAB308] shrink-0" />
              <span className="truncate">
                {account ? ROLE_META[account.role]?.shortLabel || 'ผู้ใช้งานทั่วไป' : 'ผู้ใช้งานทั่วไป'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-soft transition shrink-0"
          aria-label="ปิดเมนู"
        >
          <Icon name="x" className="w-5 h-5" />
        </button>
      </div>

      {/* เส้นคั่น 1 */}
      <hr className="border-t border-[#E2E8F0] my-2" />

      {/* 2. เมนูการใช้งานหลัก */}
      <nav className="flex flex-col gap-0.5 px-3 overflow-y-auto flex-1">
        {/* หน้าแรก */}
        <Link
          href={roleHomePath(account?.role)}
          onClick={onNavigate}
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
            pathname === '/' || pathname === roleHomePath(account?.role)
              ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
              : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icon
            name="home"
            className={`w-5 h-5 ${
              pathname === '/' || pathname === roleHomePath(account?.role)
                ? 'text-[#0F6E56]'
                : 'text-[#475569]'
            }`}
          />
          <span>หน้าแรก</span>
        </Link>

        {/* ขอใช้สถานที่ */}
        <Link
          href="/booking"
          onClick={onNavigate}
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
            pathname.startsWith('/booking')
              ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
              : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icon
            name="calendar"
            className={`w-5 h-5 ${pathname.startsWith('/booking') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
          />
          <span>ขอใช้สถานที่</span>
        </Link>

        {/* ขอยืมอุปกรณ์ */}
        <Link
          href="/borrow/my"
          onClick={onNavigate}
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
            pathname.startsWith('/borrow')
              ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
              : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icon
            name="package"
            className={`w-5 h-5 ${pathname.startsWith('/borrow') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
          />
          <span>ขอยืมอุปกรณ์</span>
        </Link>

        {/* แจ้งซ่อม */}
        <Link
          href="/repair"
          onClick={onNavigate}
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
            pathname.startsWith('/repair')
              ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
              : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icon
            name="tool"
            className={`w-5 h-5 ${pathname.startsWith('/repair') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
          />
          <span>แจ้งซ่อม</span>
        </Link>

        {/* ประวัติคำขอ */}
        <Link
          href="/history"
          onClick={onNavigate}
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
            pathname === '/history'
              ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
              : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icon
            name="clock"
            className={`w-5 h-5 ${pathname === '/history' ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
          />
          <span>ประวัติคำขอ</span>
        </Link>

        {/* เมนูเฉพาะเจ้าหน้าที่ (Staff) */}
        {isStaff && (
          <>
            <div className="pt-3 pb-1 px-4 text-[11px] font-bold text-ink-mute uppercase tracking-wider">
              งานเจ้าหน้าที่
            </div>
            {hasPermission(account, 'review') && (
              <Link
                href="/staff/review"
                onClick={onNavigate}
                className={`flex items-center gap-3.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition ${
                  pathname.startsWith('/staff/review')
                    ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
                    : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <Icon
                  name="list-details"
                  className={`w-4 h-4 ${pathname.startsWith('/staff/review') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
                />
                <span>ตรวจสอบคำขอ</span>
              </Link>
            )}
            {hasPermission(account, 'handover') && (
              <Link
                href="/staff/handover"
                onClick={onNavigate}
                className={`flex items-center gap-3.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition ${
                  pathname.startsWith('/staff/handover')
                    ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
                    : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <Icon
                  name="package"
                  className={`w-4 h-4 ${pathname.startsWith('/staff/handover') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
                />
                <span>รับมอบ-คืน</span>
              </Link>
            )}
            {hasPermission(account, 'walkIn') && (
              <Link
                href="/staff/walk-in"
                onClick={onNavigate}
                className={`flex items-center gap-3.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition ${
                  pathname.startsWith('/staff/walk-in')
                    ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
                    : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <Icon
                  name="users"
                  className={`w-4 h-4 ${pathname.startsWith('/staff/walk-in') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
                />
                <span>บริการ Walk-in</span>
              </Link>
            )}
          </>
        )}

        {/* เมนูเฉพาะผู้อนุมัติ (Approver) */}
        {isApprover && (
          <>
            <div className="pt-3 pb-1 px-4 text-[11px] font-bold text-ink-mute uppercase tracking-wider">
              งานพิจารณาอนุมัติ
            </div>
            <Link
              href="/approver"
              onClick={onNavigate}
              className={`flex items-center gap-3.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition ${
                pathname === '/approver'
                  ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
                  : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}
            >
              <Icon
                name="shield-check"
                className={`w-4 h-4 ${pathname === '/approver' ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
              />
              <span>คำขอรออนุมัติ</span>
            </Link>
          </>
        )}

        {/* เมนูเฉพาะแอดมิน (Admin) */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-4 text-[11px] font-bold text-ink-mute uppercase tracking-wider">
              การจัดการระบบ
            </div>
            <Link
              href="/admin/resources"
              onClick={onNavigate}
              className={`flex items-center gap-3.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition ${
                pathname.startsWith('/admin/resources')
                  ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
                  : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}
            >
              <Icon
                name="building"
                className={`w-4 h-4 ${pathname.startsWith('/admin/resources') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
              />
              <span>จัดการทรัพยากร</span>
            </Link>
            <Link
              href="/admin/permissions"
              onClick={onNavigate}
              className={`flex items-center gap-3.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition ${
                pathname.startsWith('/admin/permissions')
                  ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
                  : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}
            >
              <Icon
                name="shield"
                className={`w-4 h-4 ${pathname.startsWith('/admin/permissions') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
              />
              <span>สิทธิ์และผู้ใช้งาน</span>
            </Link>
          </>
        )}

        {/* เส้นคั่น 2 */}
        <hr className="border-t border-[#E2E8F0] my-2" />

        {/* 3. ข้อมูลส่วนตัว และการตั้งค่า */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium hover:bg-[#F8FAFC] hover:text-[#0F172A] transition text-left"
        >
          <Icon name="user" className="w-5 h-5 text-[#475569]" />
          <span>ข้อมูลส่วนตัว</span>
        </button>

        <Link
          href={isAdmin ? '/admin/permissions' : '/approver/settings'}
          onClick={onNavigate}
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
            pathname.startsWith('/approver/settings')
              ? 'bg-[#E6F4EA] text-[#0F6E56] font-semibold'
              : 'hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icon
            name="settings"
            className={`w-5 h-5 ${pathname.startsWith('/approver/settings') ? 'text-[#0F6E56]' : 'text-[#475569]'}`}
          />
          <span>ตั้งค่าระบบ</span>
        </Link>
      </nav>

      {/* เส้นคั่น 3 (ดันลงล่างสุด) */}
      <hr className="border-t border-[#E2E8F0] my-2" />

      {/* 4. ออกจากระบบ (สีแดง) */}
      <div className="px-3 pb-4">
        {account ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium text-[#E02424] hover:bg-red-50 transition text-left"
          >
            <Icon name="logout" className="w-5 h-5 text-[#E02424]" />
            <span>ออกจากระบบ</span>
          </button>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-[14.5px] font-medium text-brand hover:bg-brand-mint transition text-left"
          >
            <Icon name="shield" className="w-5 h-5 text-brand" />
            <span>เข้าสู่ระบบ</span>
          </Link>
        )}
      </div>
    </div>
  );
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const access = canAccessRoute(account, pathname);
  const grantedPerms = PERMISSION_KEYS.filter((k) => account?.permissions?.[k]);

  const handleLogoutAndLogin = () => {
    logout();
    setSidebarOpen(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas print:bg-white print:block">
      {/* ======================================================== */}
      {/* แถบด้านบนสีเขียว (Green Header) ตรงตามแบบในตัวอย่างรูปภาพ */}
      {/* ซ้าย: Avatar + สวัสดี, บังคิม / ผู้ใช้งานทั่วไป           */}
      {/* ขวา: กระดิ่งแจ้งเตือน + ไอคอนแฮมเบอร์เกอร์ (≡)             */}
      {/* ======================================================== */}
      <header className="no-print print:hidden bg-gradient-to-r from-[#175C4C] via-[#1E6B56] to-[#2B7D66] text-white h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm select-none">
        {/* ด้านซ้าย: Avatar + สวัสดี, บังคิม + บทบาท (หรือปุ่มย้อนกลับ) */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack || backHref ? (
            <button
              type="button"
              onClick={() => (onBack ? onBack() : backHref && router.push(backHref))}
              className="p-1 -ml-1.5 rounded-full hover:bg-white/15 transition shrink-0"
              aria-label="ย้อนกลับ"
            >
              <Icon name="chevron-left" className="w-5 h-5 text-white" />
            </button>
          ) : null}

          {/* รูป Avatar วงกลม */}
          <div
            onClick={() => setSidebarOpen(true)}
            className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/40 cursor-pointer bg-white/20 hover:opacity-90 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/avatar-demo.png"
              alt={account?.name || 'User Avatar'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="w-full h-full rounded-full bg-white text-brand font-bold text-[14px] flex items-center justify-center">
              {account?.initial || 'บ'}
            </div>
          </div>

          {/* ข้อความ: สวัสดี, บังคิม / ผู้ใช้งานทั่วไป */}
          <div className="flex flex-col leading-tight min-w-0 cursor-pointer" onClick={() => setSidebarOpen(true)}>
            <div className="font-bold text-[14px] text-white truncate">
              สวัสดี, {account?.name || 'บังคิม'}
            </div>
            <div className="text-[11.5px] text-[#DDF1E8] truncate font-normal">
              {account ? ROLE_META[account.role]?.shortLabel || 'ผู้ใช้งานทั่วไป' : 'ผู้ใช้งานทั่วไป'}
            </div>
          </div>

          {title && (
            <div className="hidden md:flex items-center gap-2 pl-3 ml-2 border-l border-white/20">
              <span className="font-semibold text-[13.5px] text-white/90 truncate">{title}</span>
            </div>
          )}
        </div>

        {/* ด้านขวา: กระดิ่งแจ้งเตือน + แฮมเบอร์เกอร์เมนู (≡) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {rightLabel && (
            <span className="text-[12.5px] text-white/85 hidden lg:inline mr-1">{rightLabel}</span>
          )}

          {/* กล่องแจ้งเตือน */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif((v) => !v)}
              className="relative p-2 rounded-full hover:bg-white/15 text-white transition"
              aria-label="การแจ้งเตือน"
            >
              <Icon name="bell" className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E02424] text-white text-[10px] font-bold flex items-center justify-center border border-[#175C4C]">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white text-ink rounded-hard shadow-high border border-line p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                    <button
                      type="button"
                      onClick={() => setShowNotif(false)}
                      className="text-ink-mute hover:text-ink"
                    >
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
                        <div className="text-[11px] text-ink-ph mt-0.5">
                          {formatThaiDateTime(n.at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ปุ่มแฮมเบอร์เกอร์เมนู (≡) */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white transition flex items-center justify-center"
            aria-label="เปิดเมนู Sidebar"
          >
            <Icon name="menu-2" className="w-6 h-6 text-white" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* พื้นที่เนื้อหาหลัก (Main Content Container)               */}
      {/* ======================================================== */}
      <main
        className={`flex-1 w-full ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10 print:p-0 print:max-w-none`}
      >
        {loading ? (
          <div className="jw-card p-8 max-w-[480px] mx-auto my-8 text-center text-[14px] text-ink-mute flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</span>
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

      {/* Sticky Footer Bar */}
      {footer && account && access.allowed && (
        <div className="no-print print:hidden sticky bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-line py-3 px-4 z-20">
          <div className={`w-full ${maxWidth} mx-auto flex items-center justify-end gap-3`}>
            {footer}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Sidebar Drawer (เปิดเมื่อกดปุ่มแฮมเบอร์เกอร์ ≡ หรือกดที่ชื่อ) */}
      {/* สไลด์ออกมาจากฝั่งซ้าย (Left Sidebar Drawer)                 */}
      {/* ======================================================== */}
      {sidebarOpen && (
        <div className="no-print print:hidden fixed inset-0 z-50 flex">
          {/* Backdrop ดำโปร่งใส */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          {/* กล่อง Sidebar สีขาว เลื่อนออกมาจากฝั่งซ้าย */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.12)] z-10 animate-in slide-in-from-left duration-200">
            <SidebarContent
              account={account}
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
              onOpenProfile={() => {
                setSidebarOpen(false);
                setShowProfile(true);
              }}
              onLogout={handleLogoutAndLogin}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: ข้อมูลส่วนตัว (User Profile) */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-hard shadow-high max-w-md w-full p-6 border border-line flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <b className="text-[17px] text-ink">ข้อมูลส่วนตัว</b>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="text-ink-mute hover:text-ink"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-line bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/avatar-demo.png"
                  alt={account?.name || 'User Avatar'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <b className="text-[17px] text-ink block">{account?.name || 'บังคิม'}</b>
                <span className="text-[13px] text-ink-mute">
                  @{account?.username || 'user'} · {ROLE_LABEL[account?.role ?? 'USER']}
                </span>
                <div className="mt-1">
                  <Chip tone={ROLE_TONE[account?.role ?? 'USER']}>
                    {ROLE_META[account?.role ?? 'USER']?.shortLabel}
                  </Chip>
                </div>
              </div>
            </div>

            <div className="bg-soft rounded-sq p-3.5 flex flex-col gap-2 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-ink-mute">หน่วยงาน:</span>
                <span className="font-semibold text-ink">{account?.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">ตำแหน่ง:</span>
                <span className="font-semibold text-ink">{account?.position || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">เบอร์โทรศัพท์:</span>
                <span className="font-semibold text-ink">{account?.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">LINE ID / ชื่อ LINE:</span>
                <span className="font-semibold text-ink">{account?.lineName || '-'}</span>
              </div>
            </div>

            {grantedPerms.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-ink-mute">สิทธิ์ย่อยที่ได้รับมอบหมาย:</span>
                <div className="flex flex-wrap gap-1.5">
                  {grantedPerms.map((k) => (
                    <Chip key={k} tone="green">
                      {PERMISSION_LABEL[k]}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="jw-btn"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
