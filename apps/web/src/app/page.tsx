'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BorrowRequest,
  REQUEST_TYPE_LABEL,
  ROLE_LABEL,
  RequestType,
  RequestWithTimeline,
} from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { AppShell, roleHomePath } from '@/components/shell';
import { Icon } from '@/components/icons';
import { StatusChip, Tabs } from '@/components/ui';
import { api, formatPeriodRange, formatThaiDate } from '@/lib/api';

type TabFilter = 'all' | RequestType;

export default function HomePage() {
  const router = useRouter();
  const { account, notifications } = useAuth();
  const [requests, setRequests] = useState<RequestWithTimeline[]>([]);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .listRequests({ mine: true })
      .then(setRequests)
      .catch(() => {});
  }, [account?.id]);

  const filtered = requests.filter((r) => {
    if (tab !== 'all' && r.type !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const dueBorrow = requests.find(
    (r): r is RequestWithTimeline & BorrowRequest => r.type === 'borrow' && r.status === 'borrowing',
  );

  return (
    <AppShell>
      {/* แบนเนอร์นำทางหากผู้ใช้ปัจจุบันเป็น เจ้าหน้าที่ / ผู้อนุมัติ / แอดมิน แต่เปิดมาที่หน้าประชาชน */}
      {account && account.role !== 'USER' && (
        <div className="mb-5 jw-card p-4 bg-brand-mint border border-brand flex flex-wrap items-center justify-between gap-3">
          <div>
            <b className="text-[15px] text-ink block">
              คุณกำลังเข้าใช้งานในบทบาท: {account.name} ({ROLE_LABEL[account.role]})
            </b>
            <span className="text-[13px] text-ink-mute">
              หน้านี้คือหน้าแรกสำหรับผู้ใช้งานทั่วไป (ประชาชน) คุณสามารถไปยังหน้าหลักตามบทบาทของคุณได้ทันที
            </span>
          </div>
          <Link href={roleHomePath(account.role)} className="jw-btn jw-btn-sm">
            ไปหน้าหลัก {ROLE_LABEL[account.role]} →
          </Link>
        </div>
      )}

      {/* Header ทักทาย + ค้นหา (Desktop & Mobile/Tablet) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ink">
            สวัสดี, คุณ{account?.nickname || 'สมชาย'}
          </h1>
          <p className="text-[14px] text-ink-mute">เลือกบริการที่ต้องการใช้งาน</p>
        </div>
        <div className="relative w-full lg:w-[420px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-ph">
            <Icon name="search" className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสถานที่ อุปกรณ์"
            className="jw-in rounded-full pl-11 h-[42px]"
          />
        </div>
      </div>

      {/* 3 บริการหลัก */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Link
          href="/booking"
          className="jw-card p-3.5 sm:p-5 border-[1.5px] border-brand flex flex-col sm:flex-row items-center text-center sm:text-left gap-2.5 sm:gap-4 hover:shadow-high transition"
        >
          <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
            <Icon name="building-community" className="w-6 h-6" />
          </div>
          <div>
            <b className="block text-[14px] sm:text-[17px] text-ink">จองสถานที่</b>
            <span className="text-[12px] sm:text-[13px] text-ink-mute">เลือกวัน-เวลา</span>
          </div>
        </Link>

        <Link
          href="/repair"
          className="jw-card p-3.5 sm:p-5 border border-line/60 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2.5 sm:gap-4 hover:shadow-high transition"
        >
          <div className="w-12 h-12 rounded-full bg-brand-mint text-brand flex items-center justify-center shrink-0">
            <Icon name="tool" className="w-6 h-6" />
          </div>
          <div>
            <b className="block text-[14px] sm:text-[17px] text-ink">แจ้งซ่อม</b>
            <span className="text-[12px] sm:text-[13px] text-ink-mute">แนบรูปได้</span>
          </div>
        </Link>

        <Link
          href="/borrow"
          className="jw-card p-3.5 sm:p-5 border border-line/60 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2.5 sm:gap-4 hover:shadow-high transition"
        >
          <div className="w-12 h-12 rounded-full bg-brand-mint text-brand flex items-center justify-center shrink-0">
            <Icon name="package" className="w-6 h-6" />
          </div>
          <div>
            <b className="block text-[14px] sm:text-[17px] text-ink">ยืม–คืน</b>
            <span className="text-[12px] sm:text-[13px] text-ink-mute">ติดตามกำหนดคืน</span>
          </div>
        </Link>
      </div>

      {/* Layout 2 คอลัมน์บน Tablet / Desktop */}
      <div id="my-requests" className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
        {/* ซ้าย: คำขอของฉัน */}
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <b className="text-[18px] text-ink">คำขอของฉัน</b>
              <Link
                href="/borrow/my"
                className="text-[13px] font-semibold text-brand inline-flex items-center gap-1 hover:underline"
              >
                รายการยืมของฉัน <Icon name="chevron-right" className="w-4 h-4" />
              </Link>
            </div>
            <Tabs<TabFilter>
              value={tab}
              onChange={setTab}
              className="w-full sm:w-[380px]"
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'booking', label: 'จอง' },
                { value: 'repair', label: 'แจ้งซ่อม' },
                { value: 'borrow', label: 'ยืม–คืน' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {filtered.length === 0 ? (
              <div className="jw-card p-8 text-center text-[14px] text-ink-mute">ไม่พบรายการคำขอ</div>
            ) : (
              filtered.map((req) => {
                const dateText =
                  req.type === 'booking'
                    ? formatPeriodRange(req.periods[0])
                    : req.type === 'borrow'
                    ? `${formatThaiDate(req.pickupDate, false)}–${formatThaiDate(req.returnDate, true)}`
                    : req.subtitle;

                return (
                  <div
                    key={req.id}
                    onClick={() =>
                      router.push(
                        req.type === 'repair'
                          ? `/repair?mode=track&id=${req.id}`
                          : `/requests/${req.id}`,
                      )
                    }
                    className="jw-card p-4 flex items-center justify-between gap-3 cursor-pointer hover:ring-1 hover:ring-brand transition"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <b className="text-[15px] text-ink truncate">{req.title}</b>
                      <span className="text-[13px] text-ink-mute truncate">
                        {REQUEST_TYPE_LABEL[req.type]} · {req.code} · {dateText}
                      </span>
                    </div>
                    <StatusChip status={req.status} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ขวา: ใกล้ถึงกำหนด + แจ้งเตือนล่าสุด */}
        <div className="flex flex-col gap-3.5">
          <b className="text-[18px] text-ink">ใกล้ถึงกำหนด</b>
          {dueBorrow ? (
            <div className="jw-card p-4 bg-brand-mint flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <b className="text-[15px] text-ink inline-flex items-center gap-1.5">
                  <Icon name="clock" className="w-4 h-4 text-brand" /> คืน{dueBorrow.title}
                </b>
                <span className="text-[13px] text-ink-mute">
                  กำหนดคืน {formatThaiDate(dueBorrow.returnDate)} · 16:00
                </span>
              </div>
              <Link href="/borrow/my" className="jw-btn jw-btn-sm shrink-0">
                แจ้งคืน
              </Link>
            </div>
          ) : (
            <div className="jw-card p-4 text-[13px] text-ink-mute">ไม่มีรายการที่ใกล้ครบกำหนดคืน</div>
          )}

          <b className="text-[18px] text-ink mt-2">แจ้งเตือนล่าสุด</b>
          {notifications.slice(0, 3).map((n) => (
            <div
              key={n.id}
              onClick={() => n.link && router.push(n.link)}
              className="jw-card p-4 cursor-pointer hover:ring-1 hover:ring-brand transition"
            >
              <b className="text-[14px] text-ink block">{n.title}</b>
              <span className="text-[13px] text-ink-mute">{n.body}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
