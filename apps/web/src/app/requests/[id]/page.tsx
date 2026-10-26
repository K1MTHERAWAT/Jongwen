'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { REQUEST_TYPE_LABEL, RequestWithTimeline, SIGN_LEVEL_TITLE } from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { AppShell, roleHomePath } from '@/components/shell';
import { OfficialGovFormDocument, SignaturePreviewCard, StatusChip, Timeline } from '@/components/ui';
import { api, formatPeriodRange, formatThaiDate, formatThaiDateTime } from '@/lib/api';

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const { account } = useAuth();
  const [req, setReq] = useState<RequestWithTimeline | null>(null);
  const [showOfficialForm, setShowOfficialForm] = useState(true);

  const load = useCallback(() => {
    if (!params.id) return;
    api
      .getRequest(params.id)
      .then(setReq)
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const backHref = roleHomePath(account?.role);

  if (!req) {
    return (
      <AppShell title="รายละเอียดคำขอ" backHref={backHref}>
        <div className="jw-card p-8 text-center text-[14px] text-ink-mute">กำลังโหลดข้อมูลคำขอ...</div>
      </AppShell>
    );
  }

  const isFullyApproved = req.status === 'approved' || req.status === 'borrowing' || req.status === 'returned';
  const canStaffReview = account?.role === 'STAFF' && req.status === 'pending_staff';
  const canApproverSign =
    (account?.role === 'APPROVER_L2' && req.status === 'pending_l2') ||
    (account?.role === 'APPROVER_L1' && req.status === 'pending_l1');

  const sigStaff = req.type !== 'repair' ? req.signatures.find((s) => s.level === 'staff') : undefined;
  const sigL2 = req.type !== 'repair' ? req.signatures.find((s) => s.level === 'l2') : undefined;
  const sigL1 = req.type !== 'repair' ? req.signatures.find((s) => s.level === 'l1') : undefined;

  return (
    <AppShell
      title={`คำขอ ${req.code}`}
      backHref={backHref}
      maxWidth="max-w-[720px]"
      footer={
        canStaffReview ? (
          <Link href={`/staff/review?id=${req.id}`} className="jw-btn w-full sm:w-64">
            ไปหน้าตรวจและลงนามคำขอนี้ →
          </Link>
        ) : canApproverSign ? (
          <Link href={`/approver/sign/${req.id}`} className="jw-btn w-full sm:w-64">
            ไปหน้าลงนามเอกสาร 3 ระดับ →
          </Link>
        ) : req.status !== 'cancelled' && req.status !== 'rejected' ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            {req.type === 'booking' && (
              <>
                <Link
                  href={`/requests/${req.id}/reschedule?mode=cancel`}
                  className="jw-btn-red flex-1 sm:w-40"
                >
                  ยกเลิกคำขอ
                </Link>
                <Link
                  href={`/requests/${req.id}/reschedule?mode=reschedule`}
                  className="jw-btn flex-[1.4] sm:w-48"
                >
                  ขอเลื่อนวัน / แก้ไข
                </Link>
              </>
            )}
            {req.type === 'borrow' && req.status === 'borrowing' && (
              <Link href="/borrow/my" className="jw-btn flex-1 sm:w-48">
                ไปหน้าแจ้งคืนอุปกรณ์
              </Link>
            )}
            {isFullyApproved && (
              <Link href={`/approver/permit/${req.id}`} className="jw-btn-sec flex-1 sm:w-48">
                ดูใบอนุญาต (PDF)
              </Link>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <b className="text-[17px] text-ink">สถานะคำขอ</b>
          <StatusChip status={req.status} />
        </div>

        <div className="jw-card p-5 flex flex-col gap-2 text-[14px]">
          <div className="flex gap-2">
            <b className="w-24 shrink-0 text-ink-mute">เลขคำขอ</b>
            <span className="font-semibold">{req.code}</span>
          </div>
          <div className="flex gap-2">
            <b className="w-24 shrink-0 text-ink-mute">ประเภท</b>
            <span>{REQUEST_TYPE_LABEL[req.type]}</span>
          </div>
          <div className="flex gap-2">
            <b className="w-24 shrink-0 text-ink-mute">รายการ</b>
            <span className="font-semibold">{req.title}</span>
          </div>
          {req.type === 'booking' && (
            <div className="flex gap-2">
              <b className="w-24 shrink-0 text-ink-mute">วันเวลา</b>
              <div className="flex flex-col">
                {req.periods.map((p, i) => (
                  <span key={i}>{formatPeriodRange(p)}</span>
                ))}
              </div>
            </div>
          )}
          {req.type === 'borrow' && (
            <div className="flex gap-2">
              <b className="w-24 shrink-0 text-ink-mute">ช่วงขอใช้</b>
              <span>
                {formatThaiDate(req.pickupDate, false)}–{formatThaiDate(req.returnDate, true)}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <b className="w-24 shrink-0 text-ink-mute">ผู้ขอ</b>
            <span>
              {req.requesterName} · {req.organization}
            </span>
          </div>
          <div className="flex gap-2">
            <b className="w-24 shrink-0 text-ink-mute">เอกสาร</b>
            <span>
              คำขอ_{req.code}.pdf{' '}
              {isFullyApproved ? (
                <Link href={`/approver/permit/${req.id}`} className="underline text-brand font-semibold ml-1">
                  เปิดดูใบอนุญาต (PDF)
                </Link>
              ) : (
                <span className="text-ink-mute text-[12px] ml-1">(ออกใบอนุญาตเมื่อลงนามครบทั้ง 4 ฝ่าย)</span>
              )}
            </span>
          </div>
          {req.rejectReason && (
            <div className="mt-2 rounded-[10px] bg-[#FDE8E8] border border-[#f9b4b4] px-3 py-2 text-[13px] text-[#7a1010]">
              <b>หมายเหตุ:</b> {req.rejectReason}
            </div>
          )}
        </div>

        {/* เอกสารราชการจริง: แบบขอใช้สถานที่ราชการ / แบบคำขอยืมครุภัณฑ์ราชการ */}
        {req.type !== 'repair' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <b className="text-[16px] text-ink">
                {req.type === 'booking'
                  ? 'เอกสารราชการ: แบบขอใช้สถานที่ราชการ (อบต.น้ำชำ)'
                  : 'เอกสารราชการ: แบบคำขอใช้อุปกรณ์ราชการ (อบต.น้ำชำ)'}
              </b>
              <button
                type="button"
                onClick={() => setShowOfficialForm((v) => !v)}
                className="text-[12.5px] font-semibold text-brand hover:underline"
              >
                {showOfficialForm ? 'ซ่อนแบบฟอร์มราชการ' : 'แสดงแบบฟอร์มราชการเต็มใบ'}
              </button>
            </div>
            {showOfficialForm && <OfficialGovFormDocument req={req} />}
          </div>
        )}

        {/* ส่วนแสดงลายมือชื่อของทุกฝ่าย */}
        <div className="jw-card p-5 flex flex-col gap-3">
          <div>
            <b className="text-[16px] text-ink block">
              ลายมือชื่อผู้เกี่ยวข้องทุกฝ่าย ({req.type === 'repair' ? '3 ขั้นตอน' : '4 ฝ่าย'})
            </b>
            <span className="text-[12.5px] text-ink-mute">
              ทุกฝ่ายต้องเขียนลายมือชื่อจริงบนหน้าจอเพื่อยืนยันความรับผิดชอบในแต่ละขั้นตอน
            </span>
          </div>

          {req.type === 'repair' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <SignaturePreviewCard
                roleLabel="1. ผู้แจ้งซ่อม"
                signerName={req.requesterName}
                signature={req.requesterSignature}
                signedAt={formatThaiDateTime(req.createdAt)}
                status="signed"
              />
              <SignaturePreviewCard
                roleLabel="2. เจ้าหน้าที่ผู้รับเรื่อง/ซ่อม"
                signerName={req.staffSignerName || 'นางสาวสุดา รอบคอบ'}
                signature={req.staffSignature}
                signedAt={
                  req.finishedAt || req.acceptedAt
                    ? formatThaiDateTime((req.finishedAt || req.acceptedAt)!)
                    : undefined
                }
                status={req.staffSignature ? 'signed' : 'pending'}
              />
              <SignaturePreviewCard
                roleLabel="3. ผู้แจ้งตรวจรับงานซ่อม"
                signerName={req.requesterName}
                signature={req.acceptanceSignature}
                signedAt={req.acceptedByRequesterAt ? formatThaiDateTime(req.acceptedByRequesterAt) : undefined}
                status={req.acceptanceSignature ? 'signed' : 'pending'}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <SignaturePreviewCard
                roleLabel="1. ผู้ยื่นคำขอ"
                signerName={req.requesterName}
                signature={req.requesterSignature}
                signedAt={formatThaiDateTime(req.createdAt)}
                status="signed"
              />
              <SignaturePreviewCard
                roleLabel={`2. ${SIGN_LEVEL_TITLE.staff} (ระดับ 1)`}
                signerName={sigStaff?.signerName || 'นางสาวสุดา รอบคอบ'}
                signature={sigStaff?.signature}
                signedAt={sigStaff ? formatThaiDateTime(sigStaff.at) : undefined}
                status={sigStaff ? (sigStaff.decision === 'approve' ? 'signed' : 'rejected') : 'pending'}
              />
              <SignaturePreviewCard
                roleLabel={`3. ${SIGN_LEVEL_TITLE.l2} (ระดับ 2)`}
                signerName={sigL2?.signerName || 'นายวิชัย บริหาร'}
                signature={sigL2?.signature}
                signedAt={sigL2 ? formatThaiDateTime(sigL2.at) : undefined}
                status={sigL2 ? (sigL2.decision === 'approve' ? 'signed' : 'rejected') : 'pending'}
              />
              <SignaturePreviewCard
                roleLabel={`4. ${SIGN_LEVEL_TITLE.l1} (ระดับ 3)`}
                signerName={sigL1?.signerName || 'นายประเสริฐ ศรีนคร'}
                signature={sigL1?.signature}
                signedAt={sigL1 ? formatThaiDateTime(sigL1.at) : undefined}
                status={sigL1 ? (sigL1.decision === 'approve' ? 'signed' : 'rejected') : 'pending'}
              />
            </div>
          )}

          {(req.createdByStaffId || req.createdByStaffSignature) && (
            <div className="pt-2 border-t border-line">
              <span className="text-[12px] font-semibold text-ink-mute block mb-1.5">
                การลงนามเพิ่มเติม (กรอกแทนที่เคาน์เตอร์)
              </span>
              <div className="max-w-[260px]">
                <SignaturePreviewCard
                  roleLabel="เจ้าหน้าที่ผู้รับเรื่องหน้าเคาน์เตอร์"
                  signerName="นางสาวสุดา รอบคอบ"
                  signature={req.createdByStaffSignature}
                  signedAt={formatThaiDateTime(req.createdAt)}
                  status={req.createdByStaffSignature ? 'signed' : 'pending'}
                />
              </div>
            </div>
          )}

          {req.type !== 'repair' && (req.handoverBefore || req.handoverAfter) && (
            <div className="pt-2 border-t border-line flex flex-col gap-2">
              <span className="text-[12px] font-semibold text-ink-mute">
                ลายมือชื่อการส่งมอบและตรวจรับคืน (2 ฝ่าย)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {req.handoverBefore && (
                  <>
                    <SignaturePreviewCard
                      roleLabel="รับมอบก่อนใช้ · 1. ผู้รับมอบ"
                      signerName={req.requesterName}
                      signature={req.handoverBefore.citizenSignature}
                      signedAt={formatThaiDateTime(req.handoverBefore.at)}
                      status="signed"
                    />
                    <SignaturePreviewCard
                      roleLabel="รับมอบก่อนใช้ · 2. เจ้าหน้าที่ผู้ส่งมอบ"
                      signerName={req.handoverBefore.staffName || 'นางสาวสุดา รอบคอบ'}
                      signature={req.handoverBefore.staffSignature}
                      signedAt={formatThaiDateTime(req.handoverBefore.at)}
                      status="signed"
                    />
                  </>
                )}
                {req.handoverAfter && (
                  <>
                    <SignaturePreviewCard
                      roleLabel="ตรวจรับคืน · 1. ผู้ส่งคืน"
                      signerName={req.requesterName}
                      signature={req.handoverAfter.citizenSignature}
                      signedAt={formatThaiDateTime(req.handoverAfter.at)}
                      status="signed"
                    />
                    <SignaturePreviewCard
                      roleLabel="ตรวจรับคืน · 2. เจ้าหน้าที่ผู้ตรวจรับคืน"
                      signerName={req.handoverAfter.staffName || 'นางสาวสุดา รอบคอบ'}
                      signature={req.handoverAfter.staffSignature}
                      signedAt={formatThaiDateTime(req.handoverAfter.at)}
                      status="signed"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="jw-card p-5 flex flex-col gap-3">
          <b className="text-[16px]">ความคืบหน้า</b>
          <Timeline steps={req.timeline} />
        </div>
      </div>
    </AppShell>
  );
}
