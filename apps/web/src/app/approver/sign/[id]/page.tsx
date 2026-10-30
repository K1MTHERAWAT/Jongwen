'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ROLE_LABEL, RequestWithTimeline, SIGN_LEVEL_TITLE, canSignRequest } from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { AppShell } from '@/components/shell';
import { Icon } from '@/components/icons';
import { Chip, OfficialGovFormDocument, PinKeypad, SignatureBox, SignaturePreviewCard } from '@/components/ui';
import { api, formatPeriodRange, formatThaiDate, formatThaiDateTime } from '@/lib/api';

export default function ApproverSignDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { account, logout } = useAuth();
  const [req, setReq] = useState<RequestWithTimeline | null>(null);
  const [showOfficialForm, setShowOfficialForm] = useState(true);
  const [signature, setSignature] = useState('');
  const [confirmed, setConfirmed] = useState(true);
  const [pinStep, setPinStep] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject'>('approve');
  const [completedL2, setCompletedL2] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSignature(account?.signature || '');
  }, [account?.id, account?.signature]);

  useEffect(() => {
    if (!params.id) return;
    api
      .getRequest(params.id)
      .then(setReq)
      .catch(() => {});
  }, [params.id]);

  const submitDecision = async (decision: 'approve' | 'reject', pinVal?: string) => {
    if (!req) return;
    setError('');
    setSubmitting(true);
    try {
      const updated = await api.signRequest(req.id, {
        decision,
        pin: pinVal,
        signature,
      });
      setReq(updated);
      setPinStep(false);
      setPin('');

      if (decision === 'reject') {
        router.push('/approver');
      } else if (updated.status === 'approved' || updated.status === 'borrowing') {
        // ลงนามครบ 4 ฝ่าย → ไปหน้าใบอนุญาต (PDF)
        router.push(`/approver/permit/${updated.id}`);
      } else {
        // ลงนามระดับ 2 เสร็จ → แสดงหน้าส่งต่อให้ระดับ 1 (นายก อบต.)
        setCompletedL2(true);
      }
    } catch (err) {
      setError((err as Error).message || 'รหัส PIN ไม่ถูกต้อง');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoutToLogin = () => {
    logout();
    router.push('/login');
  };

  if (!req) {
    return (
      <AppShell title="ลงนามเอกสาร" backHref="/approver">
        <div className="jw-card p-8 text-center text-[14px] text-ink-mute">กำลังโหลดเอกสาร...</div>
      </AppShell>
    );
  }

  const signCheck = canSignRequest(account, req);

  const signedCount = req.type !== 'repair' ? req.signatures.length : 0;
  const currentStepNum = Math.min(3, signedCount + 1);
  const stepDesc =
    currentStepNum === 1
      ? `ลงนามฝ่ายที่ 2 จาก 4 · ${SIGN_LEVEL_TITLE.staff}`
      : currentStepNum === 2
      ? `ลงนามฝ่ายที่ 3 จาก 4 · ${SIGN_LEVEL_TITLE.l2}`
      : `ลงนามฝ่ายที่ 4 จาก 4 · ${SIGN_LEVEL_TITLE.l1}`;

  const sigStaff = req.type !== 'repair' ? req.signatures.find((s) => s.level === 'staff') : undefined;
  const sigL2 = req.type !== 'repair' ? req.signatures.find((s) => s.level === 'l2') : undefined;
  const sigL1 = req.type !== 'repair' ? req.signatures.find((s) => s.level === 'l1') : undefined;

  return (
    <AppShell
      title={pinStep ? 'ยืนยัน PIN' : 'ลงนามเอกสาร'}
      backHref="/approver"
      onBack={pinStep ? () => setPinStep(false) : undefined}
      rightLabel={account?.position || 'ปลัด อบต.'}
      maxWidth="max-w-[960px]"
      footer={
        !pinStep && !completedL2 && signCheck.allowed ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button
              type="button"
              disabled={submitting || !signature.trim()}
              onClick={() => {
                setError('');
                setPin('');
                setPendingDecision('reject');
                setPinStep(true);
              }}
              className="jw-btn-red flex-1 sm:w-40"
            >
              ลงนามไม่เห็นชอบ
            </button>
            <button
              type="button"
              disabled={!confirmed || !signature.trim() || submitting}
              onClick={() => {
                setError('');
                setPin('');
                setPendingDecision('approve');
                setPinStep(true);
              }}
              className="jw-btn flex-[1.5] sm:w-56"
            >
              ลงนามและยืนยัน PIN
            </button>
          </div>
        ) : undefined
      }
    >
      {completedL2 ? (
        <div className="jw-card p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-mint text-brand flex items-center justify-center">
            <Icon name="check" className="w-7 h-7" strokeWidth={3} />
          </div>
          <div>
            <b className="text-[18px] text-ink block">ลงนามเห็นชอบ (ฝ่ายที่ 3 · ปลัด อบต.) เรียบร้อยแล้ว</b>
            <span className="text-[13px] text-ink-mute">
              เอกสาร {req.code} ถูกส่งต่อให้ <b>นายก อบต. (ฝ่ายที่ 4 · ผู้อนุมัติระดับ 1)</b> ลงนามขั้นสุดท้าย
            </span>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link href="/approver" className="jw-btn-sec flex-1">
              กลับหน้าหลักผู้มีอำนาจ
            </Link>
            <button type="button" onClick={handleLogoutToLogin} className="jw-btn flex-1">
              ออกจากระบบ
            </button>
          </div>
        </div>
      ) : !pinStep ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <b className="text-[16px]">{req.code}</b>
            <Chip tone="amber">รอคุณเขียนลายเซ็นลงนาม</Chip>
          </div>

          <div className="jw-card p-4 flex flex-col gap-2 text-[14px]">
            <div className="flex gap-2">
              <b className="w-20 shrink-0 text-ink-mute">ผู้ขอ</b>
              <span>
                {req.requesterName} · {req.organization}
              </span>
            </div>
            <div className="flex gap-2">
              <b className="w-20 shrink-0 text-ink-mute">รายการ</b>
              <span>
                {req.title} {req.subtitle ? `(${req.subtitle})` : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <b className="w-20 shrink-0 text-ink-mute">วัน-เวลา</b>
              <span>
                {req.type === 'booking'
                  ? req.periods.map((p) => formatPeriodRange(p)).join(', ')
                  : req.type === 'borrow'
                  ? `${formatThaiDate(req.pickupDate, false)}–${formatThaiDate(req.returnDate, true)}`
                  : '-'}
              </span>
            </div>
            {req.type !== 'repair' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOfficialForm((v) => !v)}
                  className="text-[12.5px] font-semibold text-brand hover:underline"
                >
                  {showOfficialForm ? 'ซ่อนแบบขอใช้สถานที่ราชการ' : 'ดูแบบขอใช้สถานที่ราชการเต็มใบ'}
                </button>
              </div>
            )}
          </div>

          {req.type !== 'repair' && showOfficialForm && <OfficialGovFormDocument req={req} />}

          {/* ลายเซ็นของฝ่ายที่ลงนามมาแล้ว */}
          <div className="jw-card p-4 flex flex-col gap-2.5">
            <b className="text-[14px] text-ink">สถานะลายมือชื่อทั้ง 4 ฝ่ายบนเอกสารนี้</b>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4 gap-2">
              <SignaturePreviewCard
                roleLabel="1. ผู้ยื่นคำขอ"
                signerName={req.requesterName}
                signature={req.requesterSignature}
                signedAt={formatThaiDateTime(req.createdAt)}
                status="signed"
              />
              <SignaturePreviewCard
                roleLabel={`2. ${sigStaff?.title || SIGN_LEVEL_TITLE.staff}`}
                signerName={sigStaff?.signerName}
                signature={sigStaff?.signature}
                signedAt={sigStaff ? formatThaiDateTime(sigStaff.at) : undefined}
                status={sigStaff ? (sigStaff.decision === 'approve' ? 'signed' : 'rejected') : 'pending'}
              />
              <SignaturePreviewCard
                roleLabel={`3. ${sigL2?.title || SIGN_LEVEL_TITLE.l2}`}
                signerName={sigL2?.signerName}
                signature={sigL2?.signature}
                signedAt={sigL2 ? formatThaiDateTime(sigL2.at) : undefined}
                status={sigL2 ? (sigL2.decision === 'approve' ? 'signed' : 'rejected') : 'pending'}
              />
              <SignaturePreviewCard
                roleLabel={`4. ${sigL1?.title || SIGN_LEVEL_TITLE.l1}`}
                signerName={sigL1?.signerName}
                signature={sigL1?.signature}
                signedAt={sigL1 ? formatThaiDateTime(sigL1.at) : undefined}
                status={sigL1 ? (sigL1.decision === 'approve' ? 'signed' : 'rejected') : 'pending'}
              />
            </div>
          </div>

          {/* แถบขั้นตอน */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <i
                  key={n}
                  className={`flex-1 h-1.5 rounded-full block ${
                    n < currentStepNum
                      ? 'bg-brand'
                      : n === currentStepNum
                      ? 'bg-brand-hover'
                      : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <span className="text-[13px] text-ink-mute">{stepDesc}</span>
          </div>

          {!signCheck.allowed ? (
            <div className="jw-card p-5 border-[#F5B7B1] bg-[#FFFDFD] flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <b className="text-[15px] text-status-crit">ระดับอำนาจการลงนามไม่ตรงกับขั้นตอนปัจจุบัน</b>
                <Chip tone="red">ต้องลงนามตามลำดับ</Chip>
              </div>
              <p className="text-[13.5px] text-ink leading-relaxed">{signCheck.reason}</p>
              <div className="text-[12.5px] text-ink-mute">
                บัญชีของคุณขณะนี้: <b>{account ? `${account.name} (${ROLE_LABEL[account.role]})` : '-'}</b>
              </div>
              <button
                type="button"
                onClick={handleLogoutToLogin}
                className="jw-btn w-full mt-1"
              >
                ออกจากระบบเพื่อเข้าสู่ระบบด้วยบัญชีผู้มีอำนาจขั้นตอนนี้
              </button>
            </div>
          ) : (
            <div className="jw-card p-4 flex flex-col gap-3">
              <label className="jw-lbl">
                เขียนลายเซ็นของคุณบนหน้าจอ ({account?.name} · {account?.position})
              </label>
              <SignatureBox
                value={signature}
                onChange={setSignature}
                savedSignature={account?.signature}
                signerLabel={`${account?.name || ''} · ${account?.position || ''}`}
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
                  ข้าพเจ้ายืนยันว่าได้ตรวจเอกสารแล้วและเขียนลายมือชื่อลงนามด้วยตนเอง
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="jw-card p-6 flex flex-col items-center gap-4">
          <div>
            <b className="text-[17px] text-ink block text-center">ใส่ PIN 6 หลัก</b>
            <span className="text-[13px] text-ink-mute block text-center">
              {stepDesc} · เอกสาร {req.code}
            </span>
          </div>

          <PinKeypad
            pin={pin}
            onChange={setPin}
            subtitle={
              pendingDecision === 'approve'
                ? 'กดรหัส PIN 6 หลักเพื่อยืนยันการลงนามเห็นชอบ/อนุมัติ'
                : 'กดรหัส PIN 6 หลักเพื่อยืนยันการลงนามไม่เห็นชอบ'
            }
            onComplete={(full) => submitDecision(pendingDecision, full)}
          />

          {error && (
            <div className="rounded-2xl bg-[#FDE8E8] border border-[#f9b4b4] px-3.5 py-2 text-[13px] text-[#7a1010]">
              {error}
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
      )}
    </AppShell>
  );
}
