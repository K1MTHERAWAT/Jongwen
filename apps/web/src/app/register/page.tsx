'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { Icon } from '@/components/icons';
import { Chip } from '@/components/ui';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { registerAccount } = useAuth();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [pdpa, setPdpa] = useState(true);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [otpMsg, setOtpMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isRegistrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== 'false';

  const handleRequestOtp = async () => {
    if (!phone.trim()) return;
    setError('');
    setOtpMsg('');
    try {
      const res = await api.requestOtp(phone.trim());
      setTimer(60);
      if (res.message) setOtpMsg(res.message);
    } catch (err) {
      setError((err as Error).message || 'ไม่สามารถขอรหัส OTP ได้');
    }
  };

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`);
      el?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegistrationOpen) {
      setError('ปิดรับการลงทะเบียนด้วยตนเองชั่วคราว กรุณาติดต่อเจ้าหน้าที่เพื่อสร้างบัญชี (Walk-in)');
      return;
    }
    if (!pdpa) {
      setError('กรุณายินยอมนโยบาย PDPA');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await registerAccount({
        name,
        department,
        phone,
        password,
        otp: otp.join(''),
        lineName: name.split(' ')[0],
      });
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-[440px] jw-card overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="jw-header text-white h-14 px-4 flex items-center gap-3 font-bold text-[16px]">
          <Link href="/login" className="p-1 -ml-1 rounded-full hover:bg-white/15">
            <Icon name="chevron-left" className="w-5 h-5" />
          </Link>
          <span>ลงทะเบียน</span>
        </div>

        <div className="p-5 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-mint text-brand flex items-center justify-center shrink-0">
              <Icon name="user-circle" className="w-6 h-6" />
            </div>
            <div>
              <b className="text-[16px] text-ink">สร้างบัญชีผู้ใช้ใหม่</b>
              <div className="text-[13px] text-ink-mute">เชื่อมกับบัญชี LINE ของคุณ ใช้เวลาไม่ถึง 1 นาที</div>
            </div>
          </div>

          {!isRegistrationOpen && (
            <div className="rounded-[10px] bg-amber-50 border border-amber-200 px-3.5 py-3 text-[13px] text-amber-900 flex items-start gap-2">
              <Icon name="shield-check" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <b>ปิดรับการลงทะเบียนด้วยตนเองชั่วคราว</b>
                <p className="text-[12px] text-amber-800 mt-0.5">
                  กรุณาติดต่อเจ้าหน้าที่เพื่อสร้างบัญชีผ่านจุดบริการ (Walk-in)
                </p>
              </div>
            </div>
          )}

          <div className="border border-line rounded-[12px] p-3 flex items-center gap-3 bg-white">
            <div className="w-10 h-10 rounded-full bg-brand-mint text-brand font-bold flex items-center justify-center shrink-0">
              {name.trim().charAt(0) || 'ส'}
            </div>
            <div className="flex-1 min-w-0">
              <b className="block text-[14px]">Somchai (LINE)</b>
              <span className="text-[12px] text-ink-mute">เชื่อมบัญชี LINE แล้ว</span>
            </div>
            <Chip tone="green">
              <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} /> เชื่อมแล้ว
            </Chip>
          </div>

          <div>
            <label className="jw-lbl">ชื่อ-นามสกุล</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="jw-in" />
          </div>

          <div>
            <label className="jw-lbl">หน่วยงาน / ชุมชน / กลุ่ม</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="ระบุหน่วยงาน ชุมชน หรือกลุ่มของคุณ"
              className="jw-in"
            />
          </div>

          <div>
            <label className="jw-lbl">เบอร์โทรศัพท์</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="jw-in flex-1"
              />
              <button
                type="button"
                disabled={!phone.trim() || timer > 0}
                onClick={handleRequestOtp}
                className="jw-btn jw-btn-sm shrink-0 disabled:opacity-50"
              >
                {timer > 0 ? `รอ ${timer} วิ` : 'ขอรหัส OTP'}
              </button>
            </div>
            {otpMsg && (
              <div className="text-[12px] text-brand font-medium mt-1">
                {otpMsg}
              </div>
            )}
          </div>

          <div>
            <label className="jw-lbl">
              รหัส OTP 6 หลัก{' '}
              <span className="font-normal text-ink-mute">· ส่งแล้ว ขอใหม่ได้ใน {timer} วิ</span>
            </label>
            <div className="flex gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className={`flex-1 h-[52px] w-full bg-white border-[1.5px] rounded-[10px] text-center text-[22px] font-bold focus:outline-none ${
                    idx === otp.findIndex((d) => !d) ? 'border-brand border-2' : 'border-line focus:border-brand'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="jw-lbl">รหัสผ่าน</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="jw-in pr-10"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-mute">
                <Icon name="lock" className="w-4 h-4" />
              </span>
            </div>
            <div className="text-[12px] text-ink-mute mt-1">
              อย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข
            </div>
          </div>

          <div
            onClick={() => setPdpa((v) => !v)}
            className="border border-line rounded-[12px] p-3 flex items-start gap-2.5 cursor-pointer select-none bg-white"
          >
            <div
              className={`w-[22px] h-[22px] rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 ${
                pdpa ? 'bg-brand border-brand text-white' : 'bg-white border-[#7A7A7A]'
              }`}
            >
              {pdpa && <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />}
            </div>
            <div className="text-[13px] text-ink-mute leading-relaxed">
              ยินยอมให้เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามนโยบาย PDPA{' '}
              <u className="text-ink font-medium">อ่านประกาศความเป็นส่วนตัว</u>
            </div>
          </div>

          {error && (
            <div className="rounded-[10px] bg-[#FDE8E8] border border-[#f9b4b4] px-3 py-2 text-[13px] text-[#7a1010]">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-line flex gap-2.5">
          <Link href="/login" className="jw-btn-sec flex-1">
            ยกเลิก
          </Link>
          <button type="submit" disabled={submitting} className="jw-btn flex-[1.5]">
            ลงทะเบียน
          </button>
        </div>
      </form>
    </div>
  );
}
