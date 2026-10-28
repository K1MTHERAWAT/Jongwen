'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roleHomePath, useAuth } from '@/components/auth-context';
import { AppShell } from '@/components/shell';
import { PinKeypad, SignatureBox } from '@/components/ui';
import { api } from '@/lib/api';

type StepMode = 'signature' | 'pin';

export default function ApproverSignaturePinSettingsPage() {
  const router = useRouter();
  const { account, refreshMe } = useAuth();
  const [step, setStep] = useState<StepMode>('signature');
  const [signature, setSignature] = useState(account?.signature || '');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (account) {
      setSignature(account.signature || '');
    }
  }, [account]);

  const homeHref = roleHomePath(account?.role);

  const handleSaveSignature = async () => {
    await api.saveSignature(signature);
    await refreshMe();
    setStep('pin');
  };

  const handleSavePin = async (finalPin: string) => {
    await api.savePin(finalPin);
    await refreshMe();
    setMessage('บันทึกลายเซ็นที่วาดและรหัส PIN 6 หลักเรียบร้อยแล้ว');
    setTimeout(() => router.push(homeHref), 1000);
  };

  return (
    <AppShell
      title={step === 'signature' ? 'เขียนลายเซ็นและตั้ง PIN' : 'ตั้ง PIN'}
      backHref={homeHref}
      onBack={step === 'pin' ? () => setStep('signature') : undefined}
      rightLabel={account?.position || 'นายก'}
      maxWidth="max-w-[540px]"
      footer={
        step === 'signature' ? (
          <button
            type="button"
            disabled={!signature.trim()}
            onClick={handleSaveSignature}
            className="jw-btn w-full"
          >
            บันทึกลายเซ็นที่เขียน · ถัดไปตั้ง PIN
          </button>
        ) : undefined
      }
    >
      {step === 'signature' ? (
        <div className="jw-card p-5 flex flex-col gap-4">
          <div>
            <b className="text-[16px] text-ink block">เขียนลายมือชื่อประจำตัวของคุณบนหน้าจอ</b>
            <span className="text-[13px] text-ink-mute">
              ใช้นิ้ว เมาส์ หรือปากกาวาดลายเซ็นจริงบนกรอบด้านล่าง (ไม่อนุญาตให้พิมพ์ตัวอักษร)
            </span>
          </div>

          <SignatureBox
            value={signature}
            onChange={setSignature}
            signerLabel={account ? `${account.name} · ${account.position}` : undefined}
            height={220}
          />
        </div>
      ) : (
        <div className="jw-card p-6 flex flex-col items-center gap-4">
          <div className="text-center">
            <b className="text-[17px] text-ink block">ตั้ง PIN 6 หลัก</b>
            <span className="text-[13px] text-ink-mute">ใช้ยืนยันทุกครั้งที่ลงนาม</span>
          </div>

          <PinKeypad
            pin={pin}
            onChange={setPin}
            onComplete={(full) => handleSavePin(full)}
          />

          {message && (
            <div className="rounded-2xl bg-brand-mint text-brand px-4 py-2 text-[13px] font-semibold">
              {message}
            </div>
          )}

          <p className="text-[12px] text-ink-mute text-center max-w-[300px]">
            PIN เป็นความลับส่วนตัว ระบบเก็บแบบเข้ารหัส ผู้ดูแลระบบไม่เห็น PIN
          </p>

          <button
            type="button"
            onClick={() => setStep('signature')}
            className="text-[12.5px] text-ink-mute underline"
          >
            ← ย้อนกลับไปแก้ไขลายเซ็น
          </button>
        </div>
      )}
    </AppShell>
  );
}
