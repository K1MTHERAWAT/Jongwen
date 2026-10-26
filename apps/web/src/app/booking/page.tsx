'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ConflictInfo,
  DayAvailability,
  OfficialFormPurposeItem,
  Period,
  VENUE_TYPE_LABEL,
  Venue,
  VenueType,
  periodDurationText,
} from '@jongwen/shared';
import { useAuth } from '@/components/auth-context';
import { AppShell } from '@/components/shell';
import { Icon } from '@/components/icons';
import { CalendarC4, Chip, OfficialGovFormDocument, SignatureBox, Stepper, venueIconName } from '@/components/ui';
import { api, formatPeriodRange, formatThaiDateTime } from '@/lib/api';

const STEPS = ['เลือกสถานที่', 'วัน-เวลา', 'กรอกคำขอ', 'ลงนามและส่ง'];

export default function BookingWizardPage() {
  const router = useRouter();
  const { account } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['v-main-hall']);
  const [catFilter, setCatFilter] = useState<'all' | VenueType>('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [search, setSearch] = useState('');

  // Step 2 state (ตรงตามต้นฉบับ: ช่วงที่ 1 = 22–24 ต.ค. 13:00–17:00, ช่วงที่ 2 = 28 ต.ค. 09:00–12:00)
  const [month, setMonth] = useState('2026-10');
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [periods, setPeriods] = useState<Period[]>([
    { start: '2026-10-22T13:00:00+07:00', end: '2026-10-24T17:00:00+07:00' },
    { start: '2026-10-28T09:00:00+07:00', end: '2026-10-28T12:00:00+07:00' },
  ]);
  const [activePeriodIdx, setActivePeriodIdx] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [simulateOverlap, setSimulateOverlap] = useState(false);

  // Step 3 state (ตามแบบขอใช้สถานที่ราชการ อบต.น้ำชำ)
  const [writtenAt, setWrittenAt] = useState('อบต. น้ำชำ');
  const [requesterName, setRequesterName] = useState(account?.name || 'นายสุข แสนสบาย');
  const [requesterPosition, setRequesterPosition] = useState(
    account?.position && account.position !== 'ประชาชน'
      ? account.position
      : 'ประธานกองทุนหมู่บ้าน ม.1',
  );
  const [addressHouseNo, setAddressHouseNo] = useState('111');
  const [addressMoo, setAddressMoo] = useState('1');
  const [addressSubdistrict, setAddressSubdistrict] = useState('น้ำชำ');
  const [addressDistrict, setAddressDistrict] = useState('สูงเม่น');
  const [addressProvince, setAddressProvince] = useState('แพร่');
  const [organization, setOrganization] = useState(
    account?.department || 'กองทุนหมู่บ้าน หมู่ที่ 1 ตำบลน้ำชำ',
  );
  const [attendees, setAttendees] = useState(80);
  const [activity, setActivity] = useState('ประชุมคณะกรรมการกองทุนหมู่บ้าน');
  const [purpose, setPurpose] = useState('ประชุมคณะกรรมการกองทุนหมู่บ้าน และจัดอบรมอาสาสมัครประจำหมู่บ้าน');
  const [purposeItems, setPurposeItems] = useState<OfficialFormPurposeItem[]>([
    { item: 'อาคารหอประชุมสภา อบต.น้ำชำ', forWhat: 'ประชุมคณะกรรมการกองทุนหมู่บ้าน' },
    { item: 'เครื่องเสียงพร้อมไมโครโฟน 1 ชุด', forWhat: 'ใช้ประกอบการประชุมและชี้แจงสมาชิก' },
    { item: '', forWhat: '' },
  ]);
  const [attachmentName, setAttachmentName] = useState('โครงการอบรม_ไตรมาส4.pdf');

  // Step 4 state (ต้องวาดลายเซ็นบนหน้าจอ ไม่ใช้การพิมพ์)
  const [signature, setSignature] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setRequesterName(account.name);
      setOrganization(account.department);
    }
  }, [account]);

  useEffect(() => {
    api.venues().then(setVenues).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedIds.length) return;
    api
      .availability(selectedIds, month)
      .then(setAvailability)
      .catch(() => {});
  }, [selectedIds, month]);

  useEffect(() => {
    if (!selectedIds.length || !periods.length) {
      setConflicts([]);
      return;
    }
    api
      .checkConflicts(selectedIds, periods)
      .then((res) => setConflicts(res.conflicts))
      .catch(() => {});
  }, [selectedIds, periods]);

  const toggleVenue = (v: Venue) => {
    if (v.status !== 'available' || !v.enabled) return;
    setSelectedIds((prev) => (prev.includes(v.id) ? prev.filter((id) => id !== v.id) : [...prev, v.id]));
  };

  const filteredVenues = venues.filter((v) => {
    if (catFilter !== 'all' && v.type !== catFilter) return false;
    if (buildingFilter !== 'all' && v.building !== buildingFilter) return false;
    if (onlyAvailable && (v.status !== 'available' || !v.enabled)) return false;
    if (search.trim() && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedVenues = venues.filter((v) => selectedIds.includes(v.id));
  const buildings = Array.from(new Set(venues.map((v) => v.building)));

  const effectiveConflicts: ConflictInfo[] = simulateOverlap
    ? [
        {
          periodIndex: 0,
          venueId: selectedIds[0] || 'v-main-hall',
          venueName: selectedVenues[0]?.name || 'ห้องประชุมใหญ่ อบต.',
          start: '2026-10-23T09:00:00+07:00',
          end: '2026-10-23T12:00:00+07:00',
          code: 'BK-2569-0120',
        },
      ]
    : conflicts;

  const handlePickCalendarDate = (dateStr: string) => {
    setSimulateOverlap(false);
    setPeriods((prev) => {
      const idx = Math.min(activePeriodIdx, Math.max(0, prev.length - 1));
      return prev.map((p, i) => {
        if (i !== idx) return p;
        const sd = p.start.slice(0, 10);
        const st = p.start.slice(11, 16);
        const ed = p.end.slice(0, 10);
        const et = p.end.slice(11, 16);
        // ถ้าเดิมเป็นวันเดียว และแตะวันที่มากกว่าเดิม → ขยายเป็นช่วงวันที่ (Start → End)
        if (sd === ed && dateStr > sd) {
          return {
            start: `${sd}T${st}:00+07:00`,
            end: `${dateStr}T${et}:00+07:00`,
          };
        }
        return {
          start: `${dateStr}T${st}:00+07:00`,
          end: `${dateStr}T${et}:00+07:00`,
        };
      });
    });
  };

  const updatePeriodPart = (idx: number, field: 'startDate' | 'startTime' | 'endDate' | 'endTime', val: string) => {
    setSimulateOverlap(false);
    setPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const sd = p.start.slice(0, 10);
        const st = p.start.slice(11, 16);
        const ed = p.end.slice(0, 10);
        const et = p.end.slice(11, 16);
        const nextSd = field === 'startDate' ? val : sd;
        const nextSt = field === 'startTime' ? val : st;
        const nextEd = field === 'endDate' ? val : field === 'startDate' && val > ed ? val : ed;
        const nextEt = field === 'endTime' ? val : et;
        return {
          start: `${nextSd}T${nextSt}:00+07:00`,
          end: `${nextEd}T${nextEt}:00+07:00`,
        };
      }),
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const created = await api.createBooking({
        venueIds: selectedIds,
        periods,
        attendees,
        activity: purposeItems[0]?.forWhat || activity,
        purpose,
        organization,
        attachments: attachmentName ? [attachmentName] : [],
        requesterName,
        requesterSignature: signature,
        writtenAt,
        requesterPosition,
        addressHouseNo,
        addressMoo,
        addressSubdistrict,
        addressDistrict,
        addressProvince,
        purposeItems,
      });
      router.push(`/requests/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={
        step === 1
          ? 'จองสถานที่'
          : step === 2
          ? 'เลือกวัน-เวลา'
          : step === 3
          ? 'แบบคำขอใช้สถานที่'
          : 'ลงนามและส่งคำขอ'
      }
      backHref={step === 1 ? '/' : undefined}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      rightLabel={account?.name}
      footer={
        step === 1 ? (
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setStep(2)}
            className="jw-btn w-full sm:w-auto min-w-[260px]"
          >
            ถัดไป · เลือกวัน-เวลา ({selectedIds.length} รายการ)
          </button>
        ) : step === 2 ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button type="button" onClick={() => setStep(1)} className="jw-btn-sec flex-1 sm:w-36">
              ย้อนกลับ
            </button>
            <button
              type="button"
              disabled={effectiveConflicts.length > 0 || periods.length === 0}
              onClick={() => setStep(3)}
              className="jw-btn flex-[1.5] sm:w-56"
            >
              ถัดไป · กรอกคำขอ
            </button>
          </div>
        ) : step === 3 ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button type="button" onClick={() => setStep(2)} className="jw-btn-sec flex-1 sm:w-36">
              ย้อนกลับ
            </button>
            <button type="button" onClick={() => setStep(4)} className="jw-btn flex-[1.5] sm:w-56">
              ถัดไป · ลงนามและส่ง
            </button>
          </div>
        ) : (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button type="button" onClick={() => setStep(3)} className="jw-btn-sec flex-1 sm:w-28">
              ย้อนกลับ
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftSaved(true);
                setTimeout(() => setDraftSaved(false), 2500);
              }}
              className="jw-btn-sec flex-1 sm:w-32"
            >
              บันทึกร่าง
            </button>
            <button
              type="button"
              disabled={submitting || !signature.trim()}
              onClick={handleSubmit}
              className="jw-btn flex-[1.5] sm:w-48"
            >
              {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอ'}
            </button>
          </div>
        )
      }
    >
      <div className="max-w-[760px] mx-auto mb-5">
        <Stepper steps={STEPS} current={step} onSelect={setStep} />
      </div>

      {/* ================= STEP 1: เลือกสถานที่ ================= */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-5 items-start">
          {/* ตัวกรองด้านซ้าย (Desktop) */}
          <aside className="hidden lg:flex jw-card p-5 flex-col gap-4">
            <b className="text-[16px] flex items-center gap-2">
              <Icon name="filter" className="w-4 h-4 text-brand" /> ตัวกรอง
            </b>
            <div>
              <label className="jw-lbl">ประเภท</label>
              <div className="flex flex-col gap-2 text-[14px]">
                {(
                  [
                    ['all', 'ทั้งหมด'],
                    ['meeting', 'ห้องประชุม'],
                    ['pavilion', 'ศาลา'],
                    ['field', 'สนามกีฬา'],
                    ['yard', 'ลานกิจกรรม'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCatFilter(val)}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <i
                      className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center ${
                        catFilter === val ? 'bg-brand border-brand text-white' : 'border-line bg-white'
                      }`}
                    >
                      {catFilter === val && <Icon name="check" className="w-3 h-3" strokeWidth={3} />}
                    </i>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="jw-lbl">อาคาร</label>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="jw-in"
              >
                <option value="all">ทั้งหมด</option>
                {buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setOnlyAvailable((v) => !v)}
              className="flex items-center gap-2.5 text-[14px]"
            >
              <i
                className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center ${
                  onlyAvailable ? 'bg-brand border-brand text-white' : 'border-line bg-white'
                }`}
              >
                {onlyAvailable && <Icon name="check" className="w-3 h-3" strokeWidth={3} />}
              </i>
              <span>เฉพาะที่พร้อมใช้งาน</span>
            </button>
          </aside>

          {/* กลาง: ค้นหา + หมวดหมู่ + การ์ดสถานที่ */}
          <div className="flex flex-col gap-3.5">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-ph">
                <Icon name="search" className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสถานที่"
                className="jw-in rounded-full pl-11 h-[42px]"
              />
            </div>

            {/* ปุ่มหมวดหมู่ (Mobile/Tablet) */}
            <div className="grid grid-cols-4 gap-2 text-center text-[12px] font-semibold lg:hidden">
              {(
                [
                  ['all', 'ทั้งหมด', 'layout-grid'],
                  ['meeting', 'ห้องประชุม', 'building-community'],
                  ['pavilion', 'ศาลา', 'building-pavilion'],
                  ['field', 'สนาม', 'ball-football'],
                ] as const
              ).map(([val, label, ic]) => (
                <button key={val} type="button" onClick={() => setCatFilter(val)}>
                  <div
                    className={`w-11 h-11 rounded-full mx-auto mb-1 flex items-center justify-center transition ${
                      catFilter === val ? 'bg-brand text-white' : 'bg-brand-mint text-brand'
                    }`}
                  >
                    <Icon name={ic} className="w-5 h-5" />
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <b className="text-[16px] sm:text-[18px]">สถานที่ทั้งหมด</b>
              <span className="text-[13px] text-ink-mute">{filteredVenues.length} แห่ง</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredVenues.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                const disabled = v.status !== 'available' || !v.enabled;
                return (
                  <div
                    key={v.id}
                    onClick={() => toggleVenue(v)}
                    className={`bg-white rounded-hard shadow-low overflow-hidden relative transition ${
                      disabled
                        ? 'opacity-55 cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-card'
                    } ${isSelected ? 'ring-2 ring-brand' : 'border border-line/60'}`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-[22px] h-[22px] rounded-full bg-brand text-white flex items-center justify-center">
                        <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                    )}
                    <div className="h-20 sm:h-28 bg-brand-mint text-brand flex items-center justify-center">
                      <Icon name={venueIconName(v.type)} className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.6} />
                    </div>
                    <div className="p-3 flex flex-col gap-1">
                      <b className="text-[14px] sm:text-[15px] text-ink truncate">{v.name}</b>
                      <span className="text-[12px] text-ink-mute inline-flex items-center gap-1">
                        <Icon name="users" className="w-3.5 h-3.5" /> {v.capacity} คน · {VENUE_TYPE_LABEL[v.type]}
                      </span>
                      <div className="pt-0.5">
                        {disabled ? (
                          <Chip tone="red">ปิดปรับปรุง</Chip>
                        ) : (
                          <Chip tone="green">พร้อมใช้งาน</Chip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ขวา: รายการที่เลือก (Desktop) */}
          <aside className="jw-card p-5 flex flex-col gap-3.5">
            <b className="text-[17px]">รายการที่เลือก ({selectedVenues.length})</b>
            {selectedVenues.length === 0 ? (
              <div className="text-[13px] text-ink-mute py-4">กรุณาแตะเลือกสถานที่อย่างน้อย 1 แห่ง</div>
            ) : (
              selectedVenues.map((v) => (
                <div key={v.id} className="border border-line rounded-[12px] p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[10px] bg-brand-mint text-brand flex items-center justify-center shrink-0">
                    <Icon name={venueIconName(v.type)} className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[14px] truncate">{v.name}</b>
                    <span className="text-[12px] text-ink-mute">
                      {v.building} {v.floor !== '-' ? v.floor : ''} · {v.capacity} คน
                    </span>
                  </div>
                </div>
              ))
            )}
            <span className="text-[12px] text-ink-mute">เลือกได้หลายรายการต่อหนึ่งคำขอ</span>
          </aside>
        </div>
      )}

      {/* ================= STEP 2: เลือกวัน-เวลา ================= */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6 items-start">
          <div className="flex flex-col gap-3">
            <CalendarC4
              month={month}
              onMonthChange={setMonth}
              availability={availability}
              periods={periods}
              conflictPeriodIndexes={effectiveConflicts.map((c) => c.periodIndex)}
              onPickDate={handlePickCalendarDate}
            />

            {/* ปุ่มสลับสถานะตัวอย่าง: กรณีว่าง vs กรณีไม่ว่าง (ซ้อนทับ) */}
            <div className="jw-card p-3.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="font-semibold text-ink-mute">
                แตะวันที่ในปฏิทินเพื่อเปลี่ยนวันของ <b>ช่วงที่ {activePeriodIdx + 1}</b>:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimulateOverlap(false);
                    setPeriods([
                      { start: '2026-10-22T13:00:00+07:00', end: '2026-10-24T17:00:00+07:00' },
                      { start: '2026-10-28T09:00:00+07:00', end: '2026-10-28T12:00:00+07:00' },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-full font-semibold transition ${
                    !simulateOverlap
                      ? 'bg-brand text-white'
                      : 'bg-brand-mint text-brand hover:bg-brand hover:text-white'
                  }`}
                >
                  กรณีว่างปกติ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimulateOverlap(true);
                    setPeriods([{ start: '2026-10-22T13:00:00+07:00', end: '2026-10-24T17:00:00+07:00' }]);
                    setActivePeriodIdx(0);
                  }}
                  className={`px-3 py-1.5 rounded-full font-semibold transition ${
                    simulateOverlap
                      ? 'bg-status-crit text-white'
                      : 'bg-[#FDE8E8] text-status-crit hover:bg-status-crit hover:text-white'
                  }`}
                >
                  กรณีไม่ว่าง (ซ้อนทับ)
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <b className="text-[17px]">ช่วงเวลาที่จอง</b>
            {periods.map((p, idx) => {
              const hasConflict = effectiveConflicts.some((c) => c.periodIndex === idx);
              const isEditing = activePeriodIdx === idx;
              const sd = p.start.slice(0, 10);
              const st = p.start.slice(11, 16);
              const ed = p.end.slice(0, 10);
              const et = p.end.slice(11, 16);

              return (
                <div
                  key={idx}
                  onClick={() => setActivePeriodIdx(idx)}
                  className={`jw-card p-3.5 flex flex-col gap-2.5 cursor-pointer transition ${
                    hasConflict
                      ? 'border-[1.5px] border-status-crit'
                      : isEditing
                      ? 'ring-2 ring-brand'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <b className="flex-1 text-[14px]">ช่วงที่ {idx + 1}</b>
                    {hasConflict ? (
                      <Chip tone="red">ไม่ว่าง</Chip>
                    ) : (
                      <Chip tone="green">{periodDurationText(p)}</Chip>
                    )}
                    {periods.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPeriods((prev) => prev.filter((_, i) => i !== idx));
                          setActivePeriodIdx(0);
                        }}
                        className="w-7 h-7 rounded-full bg-soft text-ink-mute flex items-center justify-center hover:text-status-crit"
                      >
                        <Icon name="x" className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="border border-line rounded-[8px] p-2 bg-white flex flex-col gap-1">
                      <span className="text-[11px] text-ink-mute">เริ่มต้น</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={sd}
                          onChange={(e) => updatePeriodPart(idx, 'startDate', e.target.value)}
                          className="text-[13px] font-bold bg-transparent focus:outline-none"
                        />
                        <input
                          type="time"
                          value={st}
                          onChange={(e) => updatePeriodPart(idx, 'startTime', e.target.value)}
                          className="text-[13px] font-bold bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    <span className="hidden sm:inline text-ink-mute">
                      <Icon name="arrow-right" className="w-4 h-4" />
                    </span>

                    <div className="border border-line rounded-[8px] p-2 bg-white flex flex-col gap-1">
                      <span className="text-[11px] text-ink-mute">สิ้นสุด</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={ed}
                          onChange={(e) => updatePeriodPart(idx, 'endDate', e.target.value)}
                          className="text-[13px] font-bold bg-transparent focus:outline-none"
                        />
                        <input
                          type="time"
                          value={et}
                          onChange={(e) => updatePeriodPart(idx, 'endTime', e.target.value)}
                          className="text-[13px] font-bold bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setSimulateOverlap(false);
                setPeriods((prev) => {
                  const next = [
                    ...prev,
                    { start: '2026-10-29T09:00:00+07:00', end: '2026-10-29T12:00:00+07:00' },
                  ];
                  setActivePeriodIdx(next.length - 1);
                  return next;
                });
              }}
              className="h-11 border-[1.5px] border-dashed border-brand rounded-sq text-brand font-semibold flex items-center justify-center gap-1.5 hover:bg-brand-mint/50"
            >
              <Icon name="plus" className="w-4 h-4" /> เพิ่มช่วงเวลา
            </button>

            {effectiveConflicts.length > 0 ? (
              <div className="rounded-[12px] bg-[#FDE8E8] border border-[#f9b4b4] p-3.5 flex items-start gap-2.5 text-[13px] text-[#7a1010]">
                <Icon name="x" className="w-5 h-5 text-status-crit shrink-0 mt-0.5" />
                <div>
                  <b>{effectiveConflicts[0].venueName} ไม่ว่างในช่วงนี้</b>
                  <br />
                  วันที่ {formatThaiDateTime(effectiveConflicts[0].start)}–
                  {new Date(effectiveConflicts[0].end).toTimeString().slice(0, 5)} มีผู้จองแล้ว กรุณาปรับวัน-เวลาใหม่
                </div>
              </div>
            ) : (
              <div className="jw-card p-3.5 bg-brand-mint flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <b className="text-[14px]">{selectedVenues.map((v) => v.name).join(', ')}</b>
                  <Chip tone="green">
                    <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} /> ว่าง
                  </Chip>
                </div>
                <span className="text-[13px] text-ink-mute">
                  รวม {periods.length} ช่วง · ไม่ซ้ำกับรายการอื่นทุกช่วง
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STEP 3: กรอกคำขอ (แบบขอใช้สถานที่ราชการ) ================= */}
      {step === 3 && (
        <div className="max-w-[760px] mx-auto jw-card p-5 sm:p-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
            <div>
              <b className="text-[17px] text-ink block">แบบขอใช้สถานที่ราชการ (อบต.น้ำชำ)</b>
              <span className="text-[12.5px] text-ink-mute">
                เรื่อง ขออนุญาตใช้สถานที่ราชการ · เรียน นายกองค์การบริหารส่วนตำบลน้ำชำ
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setWrittenAt('อบต. น้ำชำ');
                setRequesterName('นายสุข แสนสบาย');
                setRequesterPosition('ประธานกองทุนหมู่บ้าน ม.1');
                setAddressHouseNo('111');
                setAddressMoo('1');
                setAddressSubdistrict('น้ำชำ');
                setAddressDistrict('สูงเม่น');
                setAddressProvince('แพร่');
                setOrganization('กองทุนหมู่บ้าน หมู่ที่ 1 ตำบลน้ำชำ');
                setAttendees(80);
                setActivity('ประชุมคณะกรรมการกองทุนหมู่บ้าน');
                setPurpose('ประชุมคณะกรรมการกองทุนหมู่บ้าน หมู่ที่ 1 ตำบลน้ำชำ');
                setPurposeItems([
                  { item: 'อาคารหอประชุมสภา อบต.น้ำชำ', forWhat: 'ประชุมคณะกรรมการกองทุนหมู่บ้าน' },
                  { item: '', forWhat: '' },
                  { item: '', forWhat: '' },
                ]);
              }}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-brand-mint text-brand hover:bg-brand hover:text-white transition"
            >
              กรอกข้อมูลตัวอย่างตามไฟล์ .doc (นายสุข แสนสบาย)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="jw-lbl">เขียนที่</label>
              <input
                type="text"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                className="jw-in"
                placeholder="เช่น อบต. น้ำชำ"
              />
            </div>
            <div>
              <label className="jw-lbl">ข้าพเจ้า (นาย/นาง/นางสาว)</label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="jw-in"
              />
            </div>
            <div>
              <label className="jw-lbl">ตำแหน่ง</label>
              <input
                type="text"
                value={requesterPosition}
                onChange={(e) => setRequesterPosition(e.target.value)}
                className="jw-in"
                placeholder="เช่น ประธานกองทุนหมู่บ้าน ม.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="jw-lbl">อยู่บ้านเลขที่</label>
              <input
                type="text"
                value={addressHouseNo}
                onChange={(e) => setAddressHouseNo(e.target.value)}
                className="jw-in"
              />
            </div>
            <div>
              <label className="jw-lbl">หมู่ที่</label>
              <input
                type="text"
                value={addressMoo}
                onChange={(e) => setAddressMoo(e.target.value)}
                className="jw-in"
              />
            </div>
            <div>
              <label className="jw-lbl">ตำบล</label>
              <input
                type="text"
                value={addressSubdistrict}
                onChange={(e) => setAddressSubdistrict(e.target.value)}
                className="jw-in"
              />
            </div>
            <div>
              <label className="jw-lbl">อำเภอ</label>
              <input
                type="text"
                value={addressDistrict}
                onChange={(e) => setAddressDistrict(e.target.value)}
                className="jw-in"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="jw-lbl">จังหวัด</label>
              <input
                type="text"
                value={addressProvince}
                onChange={(e) => setAddressProvince(e.target.value)}
                className="jw-in"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="jw-lbl">หน่วยงาน</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="jw-in"
              />
            </div>
            <div>
              <label className="jw-lbl">จำนวนผู้เข้าร่วม (คน)</label>
              <input
                type="number"
                value={attendees}
                onChange={(e) => setAttendees(Number(e.target.value))}
                className="jw-in"
              />
            </div>
          </div>

          {/* มีความประสงค์ขอใช้สถานที่ราชการ ดังนี้ (ข้อ 1..3 เพื่อ...) */}
          <div className="rounded-[12px] bg-soft/60 border border-line p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <b className="text-[14px] text-ink">มีความประสงค์ขอใช้สถานที่ราชการ ดังนี้ (ข้อ 1–3)</b>
              <button
                type="button"
                onClick={() => {
                  const venueText = selectedVenues.map((v) => v.name).join(', ') || 'อาคารหอประชุมสภา อบต.น้ำชำ';
                  setPurposeItems((prev) => [
                    { item: venueText, forWhat: prev[0]?.forWhat || activity },
                    prev[1] || { item: '', forWhat: '' },
                    prev[2] || { item: '', forWhat: '' },
                  ]);
                }}
                className="text-[12px] font-semibold text-brand hover:underline"
              >
                ดึงชื่อสถานที่ที่เลือกมาใส่ข้อ 1
              </button>
            </div>
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-2.5 items-center">
                <div className="flex items-center gap-2">
                  <b className="text-[14px] text-ink shrink-0 w-5">{idx + 1}.</b>
                  <input
                    type="text"
                    value={purposeItems[idx]?.item || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPurposeItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, item: val } : row)),
                      );
                    }}
                    placeholder={idx === 0 ? 'เช่น อาคารหอประชุมสภา อบต.น้ำชำ' : 'ระบุสถานที่/อุปกรณ์เพิ่มเติม (ถ้ามี)'}
                    className="jw-in h-10 text-[13.5px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink-mute shrink-0">เพื่อ</span>
                  <input
                    type="text"
                    value={purposeItems[idx]?.forWhat || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPurposeItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, forWhat: val } : row)),
                      );
                      if (idx === 0 && val) setActivity(val);
                    }}
                    placeholder={idx === 0 ? 'เช่น ประชุมคณะกรรมการกองทุนหมู่บ้าน' : 'ระบุวัตถุประสงค์'}
                    className="jw-in h-10 text-[13.5px]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="jw-lbl">รายละเอียด / วัตถุประสงค์เพิ่มเติม</label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="jw-in h-20 py-2.5"
            />
          </div>

          <div>
            <label className="jw-lbl">แนบเอกสารประกอบคำขอ</label>
            <label className="border-[1.5px] border-dashed border-[#7A7A7A] rounded-[12px] p-4 text-center text-ink-mute bg-white cursor-pointer block hover:border-brand">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAttachmentName(f.name);
                }}
              />
              <div className="font-medium text-ink">
                {attachmentName ? `ไฟล์ที่แนบ: ${attachmentName}` : 'ลากไฟล์มาวางหรือเลือกไฟล์'}
              </div>
              <div className="text-[12px] text-ink-mute mt-0.5">PDF / JPG ไม่เกิน 10 MB</div>
            </label>
          </div>
        </div>
      )}

      {/* ================= STEP 4: ลงนามและส่ง ================= */}
      {step === 4 && (
        <div className="max-w-[760px] mx-auto flex flex-col gap-4">
          {/* แสดงเอกสารจริงตามแบบขอใช้สถานที่ราชการ */}
          <OfficialGovFormDocument
            customFields={{
              writtenAt,
              requesterName,
              requesterPosition,
              addressHouseNo,
              addressMoo,
              addressSubdistrict,
              addressDistrict,
              addressProvince,
              organization,
              purposeItems,
              requesterSignature: signature,
            }}
          />

          <div className="jw-card p-5 flex flex-col gap-2">
            <label className="jw-lbl">
              ลงลายมือชื่อผู้ขออนุญาตใช้สถานที่ราชการ ({requesterName})
            </label>
            <SignatureBox
              value={signature}
              onChange={setSignature}
              savedSignature={account?.signature}
              signerLabel={`${requesterName} · ผู้ขออนุญาตใช้สถานที่ราชการ`}
            />
            <p className="text-[13px] text-ink-mute mt-1">
              ต้องลงนามทุกฝ่าย (4 ฝ่าย): (1) ผู้ขออนุญาตใช้สถานที่ราชการ → (2) ความเห็นของเจ้าหน้าที่ / รองปลัด อบต. → (3) ปลัด อบต. น้ำชำ → (4) คำสั่งของนายกองค์การบริหารส่วนตำบลน้ำชำ
            </p>
            {draftSaved && (
              <div className="rounded-[10px] bg-brand-mint text-brand px-3.5 py-2 text-[13px] font-semibold">
                บันทึกร่างคำขอเรียบร้อยแล้ว
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
