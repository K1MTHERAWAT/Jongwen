'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookingRequest, DayAvailability, Period, RequestWithTimeline, periodDurationText } from '@jongwen/shared';
import { AppShell } from '@/components/shell';
import { Icon } from '@/components/icons';
import { CalendarC4, Chip, StatusChip, Tabs } from '@/components/ui';
import { api, formatPeriodRange } from '@/lib/api';

type Mode = 'reschedule' | 'cancel';

export default function RescheduleOrCancelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<(RequestWithTimeline & BookingRequest) | null>(null);
  const [mode, setMode] = useState<Mode>('reschedule');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [newPeriod, setNewPeriod] = useState<Period>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      start: `${dateStr}T13:00:00+07:00`,
      end: `${dateStr}T17:00:00+07:00`,
    };
  });
  const [cancelReason, setCancelReason] = useState('ติดภารกิจเร่งด่วน ขอเลื่อน/ยกเลิกการใช้สถานที่');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('mode') === 'cancel') setMode('cancel');
      if (sp.get('mode') === 'reschedule') setMode('reschedule');
    }
  }, []);

  useEffect(() => {
    if (!params.id) return;
    api
      .getRequest(params.id)
      .then((r) => {
        if (r.type === 'booking') {
          setReq(r as RequestWithTimeline & BookingRequest);
          api.availability(r.venueIds, month).then(setAvailability).catch(() => {});
        }
      })
      .catch(() => {});
  }, [params.id, month]);

  const handleSubmit = async () => {
    if (!req) return;
    setSubmitting(true);
    try {
      if (mode === 'reschedule') {
        await api.reschedule(req.id, [newPeriod]);
      } else {
        await api.cancelRequest(req.id, cancelReason);
      }
      router.push(`/requests/${req.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="ขอเลื่อนวัน / ยกเลิก"
      backHref={`/requests/${params.id}`}
      maxWidth="max-w-[680px]"
      footer={
        <div className="flex w-full sm:w-auto gap-2.5">
          <button
            type="button"
            onClick={() => router.push(`/requests/${params.id}`)}
            className="jw-btn-sec flex-1 sm:w-36"
          >
            ย้อนกลับ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className={mode === 'reschedule' ? 'jw-btn flex-[1.5] sm:w-56' : 'jw-btn-red flex-[1.5] sm:w-56'}
          >
            {mode === 'reschedule' ? 'ส่งคำขอเลื่อนวัน' : 'ยืนยันยกเลิกการจอง'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {req && (
          <div className="jw-card p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <b className="text-[15px]">{req.code}</b>
              <StatusChip status={req.status} />
            </div>
            <span className="text-[14px] text-ink">
              {req.title} {req.subtitle ? `· ${req.subtitle}` : ''}
            </span>
            <span className="text-[13px] text-ink-mute">เดิม: {formatPeriodRange(req.periods[0])}</span>
          </div>
        )}

        <Tabs<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'reschedule', label: 'เลื่อนวัน' },
            { value: 'cancel', label: 'ยกเลิกการจอง' },
          ]}
        />

        {mode === 'reschedule' ? (
          <>
            <CalendarC4
              month={month}
              onMonthChange={setMonth}
              availability={availability}
              periods={[newPeriod]}
              showDots={false}
              onPickDate={(dateStr) =>
                setNewPeriod({
                  start: `${dateStr}T13:00:00+07:00`,
                  end: `${dateStr}T17:00:00+07:00`,
                })
              }
            />

            <div className="jw-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <b className="text-[14px]">ช่วงเวลาใหม่</b>
                <Chip tone="green">{periodDurationText(newPeriod)}</Chip>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="border border-line rounded-[8px] p-2.5 bg-white flex flex-col">
                  <span className="text-[11px] text-ink-mute">เริ่มต้น</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="date"
                      value={newPeriod.start.slice(0, 10)}
                      onChange={(e) =>
                        setNewPeriod((p) => ({
                          start: `${e.target.value}T${p.start.slice(11, 16)}:00+07:00`,
                          end: `${e.target.value}T${p.end.slice(11, 16)}:00+07:00`,
                        }))
                      }
                      className="text-[13px] font-bold bg-transparent focus:outline-none"
                    />
                    <input
                      type="time"
                      value={newPeriod.start.slice(11, 16)}
                      onChange={(e) =>
                        setNewPeriod((p) => ({
                          ...p,
                          start: `${p.start.slice(0, 10)}T${e.target.value}:00+07:00`,
                        }))
                      }
                      className="text-[13px] font-bold bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <span className="hidden sm:inline text-ink-mute">
                  <Icon name="arrow-right" className="w-4 h-4" />
                </span>
                <div className="border border-line rounded-[8px] p-2.5 bg-white flex flex-col">
                  <span className="text-[11px] text-ink-mute">สิ้นสุด</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="date"
                      value={newPeriod.end.slice(0, 10)}
                      onChange={(e) =>
                        setNewPeriod((p) => ({
                          ...p,
                          end: `${e.target.value}T${p.end.slice(11, 16)}:00+07:00`,
                        }))
                      }
                      className="text-[13px] font-bold bg-transparent focus:outline-none"
                    />
                    <input
                      type="time"
                      value={newPeriod.end.slice(11, 16)}
                      onChange={(e) =>
                        setNewPeriod((p) => ({
                          ...p,
                          end: `${p.end.slice(0, 10)}T${e.target.value}:00+07:00`,
                        }))
                      }
                      className="text-[13px] font-bold bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[13px] text-ink-mute">
              ช่วงเวลาเดิมจะถูกปล่อยเมื่อคำขอใหม่ได้รับอนุมัติ
            </p>
          </>
        ) : (
          <div className="jw-card p-5 flex flex-col gap-3">
            <label className="jw-lbl">เหตุผลในการยกเลิกการจอง</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="jw-in h-24 py-2.5"
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
