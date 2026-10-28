'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DemoAccountSummary, ROLE_LABEL, ROLE_TONE } from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { roleHomePath } from '@/components/shell';
import { Icon } from '@/components/icons';
import { Chip } from '@/components/ui';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, loginWithDemo } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pdpa, setPdpa] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountSummary[]>([]);
  const isDemo = process.env.NEXT_PUBLIC_DEMO === 'true';

  useEffect(() => {
    if (!isDemo) return;
    let active = true;
    api
      .demoAccounts()
      .then((data) => {
        if (active) setDemoAccounts(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isDemo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    if (!pdpa) {
      setError('กรุณายินยอมนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนเข้าสู่ระบบ');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const acc = await loginWithCredentials(username.trim(), password);
      router.push(roleHomePath(acc.role));
    } catch (err) {
      setError((err as Error).message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLoginClick = async (accountId: string) => {
    setError('');
    setSubmitting(true);
    try {
      const acc = await loginWithDemo(accountId);
      router.push(roleHomePath(acc.role));
    } catch (err) {
      setError((err as Error).message || 'เข้าสู่ระบบโหมดทดสอบไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLineLogin = () => {
    if (!pdpa) {
      setError('กรุณายินยอมนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนเข้าสู่ระบบ');
      return;
    }
    setError('ระบบเชื่อมต่อ LINE Login กำลังอยู่ระหว่างการตั้งค่า กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[960px] grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* การ์ดเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน */}
          <form onSubmit={handleLogin} className="jw-card p-6 sm:p-8 flex flex-col justify-center gap-4">
            <div className="flex flex-col items-center text-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Jongwen Logo"
                className="w-20 h-20 rounded-[20px] bg-white p-1.5 object-contain shadow-low border border-line"
              />
              <h1 className="text-[28px] font-bold text-ink">Jongwen</h1>
              <p className="text-[13px] text-ink-mute leading-relaxed">
                ระบบบริหารจัดการสถานที่และทรัพยากร
                <br />
                ของหน่วยงานราชการ
              </p>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleLineLogin}
              className="h-[52px] rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold text-[16px] flex items-center justify-center gap-2.5 shadow-low transition disabled:opacity-50"
            >
              <Icon name="user-circle" className="w-5 h-5" />
              <span>เข้าสู่ระบบด้วย LINE</span>
            </button>

            <div className="flex items-center gap-3 text-[12px] text-ink-mute">
              <span className="flex-1 h-px bg-line" />
              <span>หรือเข้าด้วยชื่อผู้ใช้ / รหัสผ่าน</span>
              <span className="flex-1 h-px bg-line" />
            </div>

            <div>
              <label className="jw-lbl">ชื่อผู้ใช้ หรือ เบอร์โทรศัพท์</label>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้ เช่น somchai, suda, wichai, prasert, admin"
                className="jw-in"
              />
            </div>

            <div>
              <label className="jw-lbl">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="jw-in"
              />
            </div>

            <div
              onClick={() => setPdpa((v) => !v)}
              className="jw-card p-3.5 border border-line flex items-start gap-2.5 cursor-pointer select-none"
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
              <div className="rounded-[10px] bg-[#FDE8E8] border border-[#f9b4b4] px-3.5 py-2.5 text-[13px] text-[#7a1010] flex items-center gap-2">
                <Icon name="x" className="w-4 h-4 text-status-crit shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className="jw-btn w-full">
              {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>

            <div className="text-[13px] text-ink-mute text-center">
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="font-bold text-ink hover:underline">
                ลงทะเบียน
              </Link>{' '}
              · ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ
            </div>
          </form>

          {/* โหมดเดโม: แสดงเฉพาะเมื่อเปิด NEXT_PUBLIC_DEMO=true และดึงจาก /auth/demo-accounts */}
          {isDemo && (
            <div className="jw-card p-6 sm:p-7 flex flex-col gap-3.5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-bold text-ink">เข้าสู่ระบบแบบคลิกเดียว (Demo)</h2>
                  <Chip tone="green">One-Click Demo</Chip>
                </div>
                <p className="text-[13px] text-ink-mute mt-1">
                  เลือกบทบาทที่ต้องการเพื่อเข้าใช้งานทันทีโดยไม่ต้องใส่รหัสผ่าน
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {demoAccounts.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-ink-mute">
                    กำลังโหลดรายชื่อบัญชีสาธิต...
                  </div>
                ) : (
                  demoAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDemoLoginClick(acc.id)}
                      className="w-full text-left border border-line hover:border-brand hover:bg-brand-mint/30 rounded-[12px] p-3 bg-white flex items-center justify-between gap-3 cursor-pointer transition group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand-mint text-brand font-bold flex items-center justify-center shrink-0">
                          {acc.initial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <b className="text-[14px] text-ink truncate">{acc.name}</b>
                            <Chip tone={ROLE_TONE[acc.role]}>{ROLE_LABEL[acc.role]}</Chip>
                          </div>
                          <div className="text-[12px] text-ink-mute truncate">
                            {acc.position} · {acc.department}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-[12.5px] font-semibold text-brand inline-flex items-center gap-1 group-hover:translate-x-0.5 transition">
                        เข้าใช้งาน <Icon name="chevron-right" className="w-4 h-4" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
