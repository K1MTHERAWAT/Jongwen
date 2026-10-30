'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  KeyRound,
  PenTool,
  Phone,
  UserCircle,
  AlertCircle,
} from 'lucide-react';
import {
  ROLE_LABEL,
  ROLE_TONE,
} from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { AppShell } from '@/components/shell';
import {
  Button,
  Card,
  Chip,
  Input,
  PinKeypad,
  SignatureBox,
  Tabs,
} from '@/components/ui';
import { api, formatThaiDate } from '@/lib/api';

type AccountTab = 'profile' | 'password' | 'signature';

export default function AccountPage() {
  const { account, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  // Profile state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [addressHouseNo, setAddressHouseNo] = useState('');
  const [addressMoo, setAddressMoo] = useState('');
  const [addressSubdistrict, setAddressSubdistrict] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressProvince, setAddressProvince] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  // Signature & PIN state
  const [signature, setSignature] = useState('');
  const [pin, setPin] = useState('');
  const [savingSig, setSavingSig] = useState(false);
  const [sigMsg, setSigMsg] = useState('');
  const [sigErr, setSigErr] = useState('');

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setNickname(account.nickname || '');
      setDepartment(account.department || '');
      setPhone(account.phone || '');
      setAddressHouseNo(account.addressHouseNo || '');
      setAddressMoo(account.addressMoo || '');
      setAddressSubdistrict(account.addressSubdistrict || '');
      setAddressDistrict(account.addressDistrict || '');
      setAddressProvince(account.addressProvince || '');
      setSignature(account.signature || '');
    }
  }, [account]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    if (!name.trim()) {
      setProfileErr('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!department.trim()) {
      setProfileErr('กรุณาระบุหน่วยงาน / ชุมชน / สังกัด');
      return;
    }
    if (!phone.trim()) {
      setProfileErr('กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    setSavingProfile(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        department: department.trim(),
        phone: phone.trim(),
        addressHouseNo: addressHouseNo.trim(),
        addressMoo: addressMoo.trim(),
        addressSubdistrict: addressSubdistrict.trim(),
        addressDistrict: addressDistrict.trim(),
        addressProvince: addressProvince.trim(),
      });
      await refreshMe();
      setProfileMsg('บันทึกข้อมูลบัญชีและโปรไฟล์เรียบร้อยแล้ว');
      setTimeout(() => setProfileMsg(''), 3500);
    } catch (err) {
      setProfileErr((err as Error).message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetProfileForm = () => {
    if (!account) return;
    setName(account.name || '');
    setNickname(account.nickname || '');
    setDepartment(account.department || '');
    setPhone(account.phone || '');
    setAddressHouseNo(account.addressHouseNo || '');
    setAddressMoo(account.addressMoo || '');
    setAddressSubdistrict(account.addressSubdistrict || '');
    setAddressDistrict(account.addressDistrict || '');
    setAddressProvince(account.addressProvince || '');
    setProfileErr('');
    setProfileMsg('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    if (!currentPassword) {
      setPwdErr('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (!newPassword) {
      setPwdErr('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 4) {
      setPwdErr('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSavingPwd(true);
    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setTimeout(() => setPwdMsg(''), 3500);
    } catch (err) {
      setPwdErr((err as Error).message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleSaveSignature = async () => {
    setSigMsg('');
    setSigErr('');
    if (!signature.trim()) {
      setSigErr('กรุณาเขียนลายมือชื่อบนกรอบด้านล่างก่อนบันทึก');
      return;
    }
    setSavingSig(true);
    try {
      await api.saveSignature(signature);
      await refreshMe();
      setSigMsg('บันทึกลายมือชื่อประจำตัวเรียบร้อยแล้ว');
      setTimeout(() => setSigMsg(''), 3500);
    } catch (err) {
      setSigErr((err as Error).message || 'ไม่สามารถบันทึกลายมือชื่อได้');
    } finally {
      setSavingSig(false);
    }
  };

  const handleSavePin = async (fullPin: string) => {
    setSigMsg('');
    setSigErr('');
    try {
      await api.savePin(fullPin);
      await refreshMe();
      setPin('');
      setSigMsg('ตั้งรหัส PIN 6 หลักสำหรับยืนยันการลงนามเรียบร้อยแล้ว');
      setTimeout(() => setSigMsg(''), 3500);
    } catch (err) {
      setPin('');
      setSigErr((err as Error).message || 'ไม่สามารถบันทึกรหัส PIN ได้');
    }
  };

  return (
    <AppShell title="จัดการบัญชีผู้ใช้งาน" maxWidth="max-w-[920px]">
      {account && (
        <div className="flex flex-col gap-5">
          {/* Header Card Summary */}
          <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="size-16 rounded-full bg-brand-tint text-brand-ink font-bold text-title flex items-center justify-center shrink-0 border border-brand/20">
                {account.initial || account.name.charAt(0) || 'ผ'}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-heading sm:text-title font-bold text-ink truncate">
                    {account.name}
                  </h1>
                  <Chip tone={ROLE_TONE[account.role]}>
                    {ROLE_LABEL[account.role]}
                  </Chip>
                </div>
                <div className="text-body text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <UserCircle className="size-4 shrink-0" />
                    ชื่อผู้ใช้: <b className="text-ink">{account.username}</b>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-4 shrink-0" />
                    {account.position} · {account.department}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-4 shrink-0" />
                    {account.phone}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 text-caption text-muted shrink-0">
              <span>วันที่สร้างบัญชี: {formatThaiDate(account.createdAt)}</span>
              <div className="flex items-center gap-1.5">
                <Chip tone={account.signature ? 'green' : 'gray'}>
                  {account.signature ? 'มีลายเซ็นแล้ว' : 'ยังไม่ตั้งลายเซ็น'}
                </Chip>
                <Chip tone={account.hasPin ? 'green' : 'gray'}>
                  {account.hasPin ? 'ตั้ง PIN 6 หลักแล้ว' : 'ยังไม่ตั้ง PIN'}
                </Chip>
              </div>
            </div>
          </Card>

          {/* Navigation Tabs */}
          <Tabs<AccountTab>
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'profile', label: 'ข้อมูลโปรไฟล์ & หน่วยงาน' },
              { value: 'password', label: 'เปลี่ยนรหัสผ่าน (Password)' },
              { value: 'signature', label: 'ลายมือชื่อ & รหัส PIN' },
            ]}
          />

          {/* TAB 1: Profile & Department */}
          {activeTab === 'profile' && (
            <Card className="p-5 sm:p-6">
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
                  <UserCircle className="size-5 text-brand" />
                  <div>
                    <h2 className="text-heading font-bold text-ink">
                      แก้ไขข้อมูลส่วนตัวและหน่วยงาน
                    </h2>
                    <p className="text-caption text-muted">
                      ข้อมูลนี้จะใช้แสดงผลในระบบและกรอกลงในแบบฟอร์มคำขออัตโนมัติ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="ชื่อ-นามสกุล *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    required
                  />
                  <Input
                    label="ชื่อเล่น / ชื่อเรียก"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="เช่น สมชาย"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="หน่วยงาน / ชุมชน / สังกัด *"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="ระบุหน่วยงาน ชุมชน หรือกลุ่มของคุณ"
                    required
                  />
                  <Input
                    label="เบอร์โทรศัพท์ *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    required
                  />
                </div>

                {/* ที่อยู่สำหรับดึงไปกรอกคำขออัตโนมัติ */}
                <div className="pt-2 border-t border-line-soft flex flex-col gap-3">
                  <div>
                    <b className="text-body font-bold text-ink block">ที่อยู่ (สำหรับแบบคำขอราชการ)</b>
                    <span className="text-caption text-muted">
                      ข้อมูลที่อยู่นี้จะถูกดึงไปกรอกในแบบขอใช้สถานที่ราชการอัตโนมัติ
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Input
                      label="อยู่บ้านเลขที่"
                      value={addressHouseNo}
                      onChange={(e) => setAddressHouseNo(e.target.value)}
                      placeholder="เลขที่"
                    />
                    <Input
                      label="หมู่ที่"
                      value={addressMoo}
                      onChange={(e) => setAddressMoo(e.target.value)}
                      placeholder="หมู่ที่"
                    />
                    <Input
                      label="ตำบล / แขวง"
                      value={addressSubdistrict}
                      onChange={(e) => setAddressSubdistrict(e.target.value)}
                      placeholder="ตำบล / แขวง"
                    />
                    <Input
                      label="อำเภอ / เขต"
                      value={addressDistrict}
                      onChange={(e) => setAddressDistrict(e.target.value)}
                      placeholder="อำเภอ / เขต"
                    />
                    <div className="col-span-2 sm:col-span-1">
                      <Input
                        label="จังหวัด"
                        value={addressProvince}
                        onChange={(e) => setAddressProvince(e.target.value)}
                        placeholder="ระบุจังหวัด"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Input
                    label="ชื่อผู้ใช้งาน (Username)"
                    value={account.username}
                    disabled
                    helperText="ใช้สำหรับเข้าสู่ระบบ (ไม่สามารถเปลี่ยนได้)"
                  />
                  <Input
                    label="บทบาทในระบบ (Role)"
                    value={ROLE_LABEL[account.role]}
                    disabled
                    helperText="กำหนดโดยผู้ดูแลระบบ (แอดมิน)"
                  />
                </div>

                {profileErr && (
                  <div className="rounded-control bg-danger-bg border border-danger-fg/30 px-4 py-3 text-body text-danger-fg flex items-center gap-2">
                    <AlertCircle className="size-5 shrink-0" />
                    <span>{profileErr}</span>
                  </div>
                )}

                {profileMsg && (
                  <div className="rounded-control bg-brand-tint border border-brand px-4 py-3 text-body text-brand-ink font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span>{profileMsg}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2 border-t border-line-soft">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetProfileForm}
                    disabled={savingProfile}
                  >
                    คืนค่าเดิม
                  </Button>
                  <Button type="submit" variant="primary" disabled={savingProfile}>
                    {savingProfile ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: Change Password */}
          {activeTab === 'password' && (
            <Card className="p-5 sm:p-6 max-w-[560px]">
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
                  <KeyRound className="size-5 text-brand" />
                  <div>
                    <h2 className="text-heading font-bold text-ink">เปลี่ยนรหัสผ่าน (Password)</h2>
                    <p className="text-caption text-muted">
                      กรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตนก่อนตั้งรหัสผ่านใหม่
                    </p>
                  </div>
                </div>

                <Input
                  type="password"
                  label="รหัสผ่านปัจจุบัน *"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านปัจจุบันของคุณ"
                  required
                />

                <Input
                  type="password"
                  label="รหัสผ่านใหม่ *"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ตั้งรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                  helperText="แนะนำให้ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข"
                  required
                />

                <Input
                  type="password"
                  label="ยืนยันรหัสผ่านใหม่ *"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  required
                />

                {pwdErr && (
                  <div className="rounded-control bg-danger-bg border border-danger-fg/30 px-4 py-3 text-body text-danger-fg flex items-center gap-2">
                    <AlertCircle className="size-5 shrink-0" />
                    <span>{pwdErr}</span>
                  </div>
                )}

                {pwdMsg && (
                  <div className="rounded-control bg-brand-tint border border-brand px-4 py-3 text-body text-brand-ink font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span>{pwdMsg}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t border-line-soft">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPwdErr('');
                      setPwdMsg('');
                    }}
                    disabled={savingPwd}
                  >
                    ล้างข้อมูล
                  </Button>
                  <Button type="submit" variant="primary" disabled={savingPwd}>
                    {savingPwd ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 3: Signature & PIN */}
          {activeTab === 'signature' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Signature Card */}
              <Card className="p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
                  <PenTool className="size-5 text-brand" />
                  <div>
                    <h2 className="text-heading font-bold text-ink">
                      ลายมือชื่อดิจิทัลประจำตัว
                    </h2>
                    <p className="text-caption text-muted">
                      วาดลายเซ็นเก็บไว้เพื่อนำมาใช้ประกอบการยื่นคำขอหรือลงนามอนุมัติเอกสาร
                    </p>
                  </div>
                </div>

                <SignatureBox
                  value={signature}
                  onChange={setSignature}
                  signerLabel={`${account.name} · ${account.position}`}
                  height={200}
                  skipPinPrompt
                />

                <Button
                  type="button"
                  variant="primary"
                  disabled={!signature.trim() || savingSig}
                  onClick={handleSaveSignature}
                  className="w-full"
                >
                  {savingSig ? 'กำลังบันทึกลายเซ็น...' : 'บันทึกลายมือชื่อประจำตัว'}
                </Button>
              </Card>

              {/* PIN Card */}
              <Card className="p-5 sm:p-6 flex flex-col items-center gap-4">
                <div className="w-full text-center border-b border-line-soft pb-3">
                  <h2 className="text-heading font-bold text-ink">
                    ตั้งค่า / เปลี่ยนรหัส PIN 6 หลัก
                  </h2>
                  <p className="text-caption text-muted mt-0.5">
                    ใช้ยืนยันตัวตนทุกครั้งเมื่อดึงลายเซ็นที่บันทึกไว้มาลงนามในเอกสาร
                  </p>
                </div>

                {!account.signature ? (
                  <div className="rounded-control bg-warn-bg border border-warn-fg/30 p-4 text-center text-body text-warn-fg">
                    กรุณาเขียนและบันทึกลายมือชื่อด้านซ้ายมือก่อน จึงจะสามารถตั้งรหัส PIN 6 หลักได้
                  </div>
                ) : (
                  <PinKeypad
                    pin={pin}
                    onChange={setPin}
                    subtitle={
                      account.hasPin
                        ? 'กดตัวเลข 6 หลักเพื่อเปลี่ยนรหัส PIN ใหม่'
                        : 'กดตัวเลข 6 หลักเพื่อตั้งรหัส PIN ประจำตัว'
                    }
                    onComplete={handleSavePin}
                  />
                )}

                {sigErr && (
                  <div className="w-full rounded-control bg-danger-bg border border-danger-fg/30 px-4 py-2.5 text-caption text-danger-fg text-center">
                    {sigErr}
                  </div>
                )}

                {sigMsg && (
                  <div className="w-full rounded-control bg-brand-tint border border-brand px-4 py-2.5 text-caption text-brand-ink font-semibold text-center">
                    {sigMsg}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

