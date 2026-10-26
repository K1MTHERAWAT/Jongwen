'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RequestWithTimeline } from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { AppShell } from '@/components/shell';
import { Icon } from '@/components/icons';
import {
  Chip,
  OfficialGovFormDocument,
  PinKeypad,
  SignatureBox,
  SignaturePreviewCard,
  StatusChip,
} from '@/components/ui';
import { api, formatPeriodRange, formatThaiDate, formatThaiDateTime } from '@/lib/api';

const DEFAULT_CHECKS = [
  'เบอร์โทรยืนยัน OTP แล้ว (081-xxx-5678)',
  'ไม่มีช่วงเวลาซ้อนทับ',
  'วัตถุประสงค์ชัดเจน',
  'ไฟล์แนบ: แบบฟอร์มกรอกแล้ว.pdf',
];

export default function StaffReviewPage() {
  const { account } = useAuth();
  const [queue, setQueue] = useState<RequestWithTimeline[]>([]);
  const [index, setIndex] = useState(0);
  const [showOfficialForm, setShowOfficialForm] = useState(true);
  const [checks, setChecks] = useState<boolean[]>([true, true, true, true]);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('เปลี่ยนอะไหล่และทดสอบระบบเรียบร้อย · มีรูปหลังซ่อม');
  const [afterPhotos, setAfterPhotos] = useState(2);
  const [staffSignature, setStaffSignature] = useState('');
  const [confirmed, setConfirmed] = useState(true);
  const [pinStep, setPinStep] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject'>('approve');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [lastCompleted, setLastCompleted] = useState<RequestWithTimeline | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((preferId?: string | null) => {
    api
      .listRequests({ queue: 'staff' })
      .then((list) => {
        setQueue(list);
        if (preferId) {
          const foundIdx = list.findIndex((r) => r.id === preferId || r.code === preferId);
          setIndex(foundIdx >= 0 ? foundIdx : 0);
        } else {
          setIndex(0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    load(sp?.get('id'));
  }, [load]);

  const current = queue[index];

  useEffect(() => {
    setStaffSignature(account?.signature || '');
    setPinStep(false);
    setPin('');
    setPinError('');
  }, [account?.id, account?.signature, current?.id]);

  const handleDecision = async (decision: 'approve' | 'reject', pinVal?: string) => {
    if (!current || !staffSignature.trim()) return;
    setPinError('');
    setSubmitting(true);
    try {
      let updated: RequestWithTimeline;
      if (current.type === 'repair') {
        if (current.status === 'repair_submitted') {
          updated = await api.updateRepairStatus(current.id, {
            action: decision === 'approve' ? 'accept' : 'reopen',
            signature: staffSignature,
            pin: pinVal,
          });
        } else {
          updated = await api.updateRepairStatus(current.id, {
            action: 'finish',
            resolution,
            signature: staffSignature,
            pin: pinVal,
          });
        }
      } else {
        updated = await api.signRequest(current.id, {
          decision,
          note: note || undefined,
          signature: staffSignature,
          pin: pinVal,
        });
      }
      setNote('');
      setPinStep(false);
      setPin('');
      setLastCompleted(updated);
      load();
    } catch (err) {
      setPinError((err as Error).message || 'รหัส PIN ไม่ถูกต้อง');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={pinStep ? 'ยืนยัน PIN' : 'คำขอรอตรวจ'}
      backHref="/staff"
      onBack={pinStep ? () => setPinStep(false) : undefined}
      rightLabel={account?.nickname || 'สุดา'}
      maxWidth="max-w-[720px]"
      footer={
        current && !pinStep ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            {current.type === 'repair' && current.status === 'repair_in_progress' ? (
              <button
                type="button"
                disabled={submitting || !confirmed || !staffSignature.trim()}
                onClick={() => {
                  setPinError('');
                  setPin('');
                  setPendingDecision('approve');
                  setPinStep(true);
                }}
                className="jw-btn w-full sm:w-72"
              >
                ลงนามซ่อมเสร็จและยืนยัน PIN
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submitting || !staffSignature.trim()}
                  onClick={() => {
                    setPinError('');
                    setPin('');
                    setPendingDecision('reject');
                    setPinStep(true);
                  }}
                  className="jw-btn-red flex-1 sm:w-44"
                >
                  ลงนามไม่ผ่าน
                </button>
                <button
                  type="button"
                  disabled={submitting || !confirmed || !staffSignature.trim()}
                  onClick={() => {
                    setPinError('');
                    setPin('');
                    setPendingDecision('approve');
                    setPinStep(true);
                  }}
                  className="jw-btn flex-[1.5] sm:w-64"
                >
                  {current.type === 'repair'
                    ? 'ลงนามรับเรื่องและยืนยัน PIN'
                    : 'ลงนามและยืนยัน PIN'}
                </button>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      {/* แบนเนอร์แจ้งผลการดำเนินการล่าสุด */}
      {lastCompleted && (
        <div className="mb-4 jw-card p-4 bg-brand-mint border border-brand flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <b className="text-[14px] text-ink block">
              ดำเนินการ {lastCompleted.code} เรียบร้อยแล้ว ({lastCompleted.status === 'pending_l2' ? 'ส่งต่อปลัด อบต. ระดับ 2' : 'อัปเดตสถานะแล้ว'})
            </b>
            <span className="text-[12px] text-ink-mute">
              ลงนามระดับที่ 1 (เจ้าหน้าที่) สำเร็จ เอกสารถูกส่งต่อไปยังคิวของปลัด อบต. (ระดับ 2) แล้ว
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLastCompleted(null)}
              className="jw-btn-sec jw-btn-sm"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {!current ? (
        <div className="jw-card p-8 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-mint text-brand flex items-center justify-center">
            <Icon name="check" className="w-6 h-6" strokeWidth={3} />
          </div>
          <b className="text-[16px]">ตรวจคำขอครบทุกรายการแล้ว</b>
          <Link href="/staff" className="jw-btn jw-btn-sm">
            กลับหน้าหลักเจ้าหน้าที่
          </Link>
        </div>
      ) : pinStep ? (
        <div className="jw-card p-6 flex flex-col items-center gap-4">
          <div>
            <b className="text-[17px] text-ink block text-center">ใส่ PIN 6 หลัก</b>
            <span className="text-[13px] text-ink-mute block text-center">
              ลงนามฝ่ายที่ 2 จาก 4 · เจ้าหน้าที่ตรวจสอบ (ระดับ 1) · เอกสาร {current.code}
            </span>
          </div>

          <PinKeypad
            pin={pin}
            onChange={setPin}
            subtitle={
              pendingDecision === 'approve'
                ? 'กดรหัส PIN 6 หลักเพื่อยืนยันการลงนามผ่าน (ระดับ 1)'
                : 'กดรหัส PIN 6 หลักเพื่อยืนยันการลงนามไม่ผ่าน'
            }
            onComplete={(full) => handleDecision(pendingDecision, full)}
          />

          {pinError && (
            <div className="rounded-[10px] bg-[#FDE8E8] border border-[#f9b4b4] px-3.5 py-2 text-[13px] text-[#7a1010]">
              {pinError}
            </div>
          )}

          <div className="flex items-center gap-4 text-[13px]">
            <button
              type="button"
              onClick={() => setPinStep(false)}
              className="text-ink-mute hover:underline"
            >
              ← ย้อนกลับไปแก้ไขลายเซ็น
            </button>
            <Link href="/approver/settings" className="text-brand font-semibold hover:underline">
              ลืม PIN / ตั้งค่าใหม่?
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <Chip tone="amber">
              รอตรวจ {queue.length} · รายการที่ {index + 1}
            </Chip>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="w-8 h-8 rounded-full border-[1.5px] border-ink flex items-center justify-center disabled:opacity-40"
              >
                <Icon name="chevron-left" className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={index >= queue.length - 1}
                onClick={() => setIndex((i) => Math.min(queue.length - 1, i + 1))}
                className="w-8 h-8 rounded-full border-[1.5px] border-ink flex items-center justify-center disabled:opacity-40"
              >
                <Icon name="chevron-right" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-ink">{current.code}</h1>
            <StatusChip status={current.status} />
          </div>

          <div className="jw-card p-4 flex flex-col gap-2 text-[14px]">
            <div className="flex items-start gap-2">
              <b className="w-24 shrink-0 text-ink">ผู้ยืม/ผู้ขอ</b>
              <span>
                {current.requesterName} · {current.organization}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <b className="w-24 shrink-0 text-ink">วัตถุประสงค์</b>
              <span>
                {current.type === 'booking'
                  ? `${current.purpose} · ${current.attendees} คน`
                  : current.type === 'borrow'
                  ? current.purpose
                  : current.detail}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <b className="w-24 shrink-0 text-ink">รายการ</b>
              <span>
                {current.title} {current.subtitle ? `(${current.subtitle})` : ''}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <b className="w-24 shrink-0 text-ink">วัน-เวลา</b>
              <span>
                {current.type === 'booking'
                  ? current.periods.map((p) => formatPeriodRange(p)).join(', ')
                  : current.type === 'borrow'
                  ? `${formatThaiDate(current.pickupDate, false)}–${formatThaiDate(current.returnDate, true)}`
                  : `${current.building} · ${current.floor}`}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <b className="w-24 shrink-0 text-ink">ไฟล์และเอกสาร</b>
              <span className="flex flex-wrap items-center gap-2">
                <span>แบบขอใช้สถานที่ราชการ.pdf</span>
                <button
                  type="button"
                  onClick={() => setShowOfficialForm((v) => !v)}
                  className="text-brand font-semibold underline text-[13px]"
                >
                  {showOfficialForm ? 'ซ่อนแบบฟอร์มราชการ' : 'ดูแบบขอใช้สถานที่ราชการ'}
                </button>
                <Link
                  href={`/requests/${current.id}`}
                  className="text-brand font-semibold underline text-[13px]"
                >
                  เปิดดูรายละเอียด / เอกสาร PDF ใบอนุญาต
                </Link>
              </span>
            </div>
          </div>

          {current.type !== 'repair' && showOfficialForm && <OfficialGovFormDocument req={current} />}

          {/* สถานะลายมือชื่อทั้ง 4 ฝ่าย + แถบความคืบหน้า 3 ระดับ (เหมือนหน้าผู้อนุมัติ L2 / L1) */}
          <div className="jw-card p-4 flex flex-col gap-2.5">
            <b className="text-[14px] text-ink">สถานะลายมือชื่อบนเอกสารนี้</b>
            {current.type === 'repair' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <SignaturePreviewCard
                  roleLabel="1. ผู้แจ้งซ่อม"
                  signerName={current.requesterName}
                  signature={current.requesterSignature}
                  signedAt={formatThaiDateTime(current.createdAt)}
                  status="signed"
                />
                <SignaturePreviewCard
                  roleLabel="2. เจ้าหน้าที่ผู้รับเรื่อง/ซ่อม"
                  signerName={current.staffSignerName || account?.name || 'สุดา มีสุข'}
                  signature={current.staffSignature}
                  signedAt={current.acceptedAt ? formatThaiDateTime(current.acceptedAt) : undefined}
                  status={current.staffSignature ? 'signed' : 'pending'}
                />
                <SignaturePreviewCard
                  roleLabel="3. ผู้แจ้งตรวจรับงานซ่อม"
                  signerName={current.requesterName}
                  signature={current.acceptanceSignature}
                  signedAt={current.acceptedByRequesterAt ? formatThaiDateTime(current.acceptedByRequesterAt) : undefined}
                  status={current.acceptanceSignature ? 'signed' : 'pending'}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <SignaturePreviewCard
                  roleLabel="1. ผู้ยื่นคำขอ"
                  signerName={current.requesterName}
                  signature={current.requesterSignature}
                  signedAt={formatThaiDateTime(current.createdAt)}
                  status="signed"
                />
                <SignaturePreviewCard
                  roleLabel="2. เจ้าหน้าที่ (ระดับ 1)"
                  signerName={account?.name || 'สุดา มีสุข'}
                  signature={undefined}
                  status="pending"
                />
                <SignaturePreviewCard
                  roleLabel="3. ปลัด อบต. (ระดับ 2)"
                  signerName="วิชัย รักถิ่น"
                  signature={undefined}
                  status="pending"
                />
                <SignaturePreviewCard
                  roleLabel="4. นายก อบต. (ระดับ 3)"
                  signerName="ประเสริฐ ศรีสุข"
                  signature={undefined}
                  status="pending"
                />
              </div>
            )}
          </div>

          {/* แถบขั้นตอนเหมือนผู้อนุมัติ L2/L1 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <i
                  key={n}
                  className={`flex-1 h-1.5 rounded-full block ${
                    n === 1 ? 'bg-brand-hover' : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <span className="text-[13px] text-ink-mute">
              ลงนามฝ่ายที่ 2 จาก 4 · เจ้าหน้าที่ตรวจสอบ (ระดับ 1)
            </span>
          </div>

          {current.type === 'repair' && current.status === 'repair_in_progress' ? (
            <div className="jw-card p-4 flex flex-col gap-3">
              <div>
                <label className="jw-lbl">บันทึกผลการซ่อม (ก่อนส่งให้ผู้แจ้งตรวจรับงาน)</label>
                <textarea
                  rows={2}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="jw-in h-20 py-2.5"
                />
              </div>
              <div>
                <label className="jw-lbl">แนบรูปหลังซ่อม (ไม่เกิน 3 รูป)</label>
                <div className="flex gap-3">
                  {Array.from({ length: afterPhotos }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-16 h-16 rounded-[10px] bg-brand-mint text-brand flex items-center justify-center relative"
                    >
                      <Icon name="photo" className="w-6 h-6" strokeWidth={1.6} />
                      <button
                        type="button"
                        onClick={() => setAfterPhotos((p) => Math.max(0, p - 1))}
                        className="w-5 h-5 rounded-full bg-ink text-white absolute -top-1.5 -right-1.5 flex items-center justify-center"
                      >
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {afterPhotos < 3 && (
                    <button
                      type="button"
                      onClick={() => setAfterPhotos((p) => Math.min(3, p + 1))}
                      className="w-16 h-16 rounded-[10px] bg-white border-[1.5px] border-dashed border-[#7A7A7A] text-ink-mute text-[12px] flex flex-col items-center justify-center gap-0.5 hover:border-brand"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      <span>+ รูป</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* เช็คลิสต์ 4 ข้อ */}
              <div className="jw-card px-4 divide-y divide-line">
                {DEFAULT_CHECKS.map((label, i) => {
                  const checked = checks[i];
                  return (
                    <div
                      key={label}
                      onClick={() => setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                      className="py-3 flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <div
                        className={`w-[22px] h-[22px] rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 ${
                          checked ? 'bg-brand border-brand text-white' : 'bg-white border-[#7A7A7A]'
                        }`}
                      >
                        {checked && <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} /> }
                      </div>
                      <span className="text-[14px] flex-1">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="jw-lbl">เหตุผล / วันที่เสนอแทน (กรณีไม่ผ่าน)</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="พิมพ์ข้อความที่จะส่งให้ผู้จองทาง LINE"
                  className="jw-in h-20 py-2.5"
                />
              </div>
            </>
          )}

          {/* กล่องลายเซ็นของเจ้าหน้าที่ผู้ตรวจ (ระดับ 1) เหมือนผู้อนุมัติระดับ 2 และ 1 */}
          <div className="jw-card p-4 flex flex-col gap-3">
            <label className="jw-lbl">
              ลายเซ็นของคุณ ({account?.name || 'สุดา มีสุข'} · {account?.position || 'เจ้าหน้าที่ธุรการ'})
            </label>
            <SignatureBox
              value={staffSignature}
              onChange={setStaffSignature}
              savedSignature={account?.signature}
              signerLabel={`${account?.name || 'สุดา มีสุข'} · ${account?.position || 'เจ้าหน้าที่ธุรการ'}`}
              height={155}
              skipPinPrompt
            />

            <div
              onClick={() => setConfirmed((v) => !v)}
              className="flex items-start gap-2.5 cursor-pointer select-none pt-1"
            >
              <div
                className={`w-[22px] h-[22px] rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 ${
                  confirmed ? 'bg-brand border-brand text-white' : 'bg-white border-[#7A7A7A]'
                }`}
              >
                {confirmed && <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
              <span className="text-[13px] text-ink-mute leading-relaxed">
                ข้าพเจ้ายืนยันว่าได้ตรวจเอกสารแล้วและลงลายมือชื่อด้วยตนเอง
              </span>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
