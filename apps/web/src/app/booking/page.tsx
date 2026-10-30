'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ConflictInfo,
  DayAvailability,
  EQUIPMENT_CATEGORY_LABEL,
  Equipment,
  EquipmentCategory,
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
import {
  CalendarC4,
  Chip,
  OfficialGovFormDocument,
  SignatureBox,
  Stepper,
  equipmentIconName,
  venueIconName,
} from '@/components/ui';
import { api, formatPeriodRange, formatThaiDate, formatThaiDateTime } from '@/lib/api';

const STEPS = ['เลือกสถานที่', 'วัน-เวลา', 'อุปกรณ์เสริม', 'กรอกคำขอ', 'ลงนามและส่ง'];

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

  // Step 2 state (ค่าเริ่มต้น 1 ช่วงเวลา)
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [periods, setPeriods] = useState<Period[]>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [{ start: `${dateStr}T09:00:00+07:00`, end: `${dateStr}T16:00:00+07:00` }];
  });
  const [activePeriodIdx, setActivePeriodIdx] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  // Step 3 state (เลือกอุปกรณ์เสริม)
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentQuantities, setEquipmentQuantities] = useState<Record<string, number>>({});
  const [equipmentCat, setEquipmentCat] = useState<'all' | EquipmentCategory>('all');
  const [equipmentSearch, setEquipmentSearch] = useState('');

  // Step 4 state (ตามแบบขอใช้สถานที่ราชการ)
  const [writtenAt, setWrittenAt] = useState('');
  const [requesterName, setRequesterName] = useState(account?.name || '');
  const [requesterPosition, setRequesterPosition] = useState(
    account?.position && account.position !== 'ประชาชน'
      ? account.position
      : '',
  );
  const [addressHouseNo, setAddressHouseNo] = useState(account?.addressHouseNo || '');
  const [addressMoo, setAddressMoo] = useState(account?.addressMoo || '');
  const [addressSubdistrict, setAddressSubdistrict] = useState(account?.addressSubdistrict || '');
  const [addressDistrict, setAddressDistrict] = useState(account?.addressDistrict || '');
  const [addressProvince, setAddressProvince] = useState(account?.addressProvince || '');
  const [organization, setOrganization] = useState(
    account?.department || '',
  );
  const [attendees, setAttendees] = useState(30);
  const [activity, setActivity] = useState('');
  const [purpose, setPurpose] = useState('');
  const [purposeItems, setPurposeItems] = useState<OfficialFormPurposeItem[]>([
    { item: '', forWhat: '' },
  ]);
  const [attachmentName, setAttachmentName] = useState('');

  // Step 5 state (ต้องวาดลายเซ็นบนหน้าจอ ไม่ใช้การพิมพ์)
  const [signature, setSignature] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setRequesterName(account.name);
      setOrganization(account.department);
      if (account.addressHouseNo) setAddressHouseNo(account.addressHouseNo);
      if (account.addressMoo) setAddressMoo(account.addressMoo);
      if (account.addressSubdistrict) setAddressSubdistrict(account.addressSubdistrict);
      if (account.addressDistrict) setAddressDistrict(account.addressDistrict);
      if (account.addressProvince) setAddressProvince(account.addressProvince);
    }
  }, [account]);

  useEffect(() => {
    api.venues().then(setVenues).catch(() => {});
    api.equipment().then(setEquipmentList).catch(() => {});
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
      .catch(() => setConflicts([]));
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

  // การจัดการจำนวนอุปกรณ์เสริม
  const setEquipmentQty = (id: string, max: number, next: number) => {
    const clamped = Math.max(0, Math.min(max, next));
    setEquipmentQuantities((prev) => ({ ...prev, [id]: clamped }));
  };

  const selectedExtraItems = equipmentList
    .map((eq) => ({ eq, qty: equipmentQuantities[eq.id] ?? 0 }))
    .filter((x) => x.qty > 0);

  const filteredEquipment = equipmentList.filter((e) => {
    if (equipmentCat !== 'all' && e.category !== equipmentCat) return false;
    if (equipmentSearch.trim() && !e.name.toLowerCase().includes(equipmentSearch.toLowerCase())) return false;
    return true;
  });

  // ซิงค์ชื่อสถานที่และอุปกรณ์เสริมที่เลือกมาใส่ในแบบฟอร์ม
  const syncFormPurposeItems = (
    venueList = selectedVenues,
    extraList = selectedExtraItems,
  ) => {
    if (!venueList.length) return;
    setPurposeItems((prev) => {
      const generated: OfficialFormPurposeItem[] = [];

      // ใส่สถานที่ทั้งหมดที่เลือก
      venueList.forEach((v, idx) => {
        generated.push({
          item: v.name,
          forWhat: prev[idx]?.forWhat || activity || purpose || 'ใช้จัดกิจกรรมและประชุม',
        });
      });

      // ใส่อุปกรณ์เสริมทั้งหมดที่เลือก
      extraList.forEach((ex, idx) => {
        const offset = venueList.length + idx;
        generated.push({
          item: `${ex.eq.name} จำนวน ${ex.qty} ชุด/รายการ`,
          forWhat: prev[offset]?.forWhat || 'ใช้ประกอบการจัดกิจกรรมและประชุม',
        });
      });

      return generated.length > 0 ? generated : [{ item: '', forWhat: '' }];
    });
  };

  // ซิงค์รายการลงแบบฟอร์มอัตโนมัติทุกครั้งที่สถานที่หรืออุปกรณ์เสริมเปลี่ยน
  useEffect(() => {
    if (selectedVenues.length > 0) {
      syncFormPurposeItems(selectedVenues, selectedExtraItems);
    }
  }, [selectedIds, venues, equipmentQuantities, equipmentList]);

  const effectiveConflicts: ConflictInfo[] = conflicts;

  const handlePickCalendarDate = (dateStr: string) => {
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
        extraItems: selectedExtraItems.map((s) => ({ equipmentId: s.eq.id, qty: s.qty })),
        requesterName,
        requesterSignature: signature,
        writtenAt,
        requesterPosition,
        addressHouseNo,
        addressMoo,
        addressSubdistrict,
        addressDistrict,
        addressProvince,
        purposeItems: purposeItems.filter((pi) => pi.item.trim() || pi.forWhat.trim()),
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
          ? 'สถานที่'
          : step === 2
          ? 'เลือกวัน-เวลา'
          : step === 3
          ? 'เลือกอุปกรณ์เสริม'
          : step === 4
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
              ถัดไป · เลือกอุปกรณ์เสริม
            </button>
          </div>
        ) : step === 3 ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button type="button" onClick={() => setStep(2)} className="jw-btn-sec flex-1 sm:w-36">
              ย้อนกลับ
            </button>
            <button
              type="button"
              onClick={() => {
                syncFormPurposeItems(selectedVenues, selectedExtraItems);
                setStep(4);
              }}
              className="jw-btn flex-[1.5] sm:w-56"
            >
              {selectedExtraItems.length > 0
                ? `ถัดไป · กรอกคำขอ (${selectedExtraItems.length} รายการ)`
                : 'ถัดไป · กรอกคำขอ'}
            </button>
          </div>
        ) : step === 4 ? (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button type="button" onClick={() => setStep(3)} className="jw-btn-sec flex-1 sm:w-36">
              ย้อนกลับ
            </button>
            <button type="button" onClick={() => setStep(5)} className="jw-btn flex-[1.5] sm:w-56">
              ถัดไป · ลงนามและส่ง
            </button>
          </div>
        ) : (
          <div className="flex w-full sm:w-auto gap-2.5">
            <button type="button" onClick={() => setStep(4)} className="jw-btn-sec flex-1 sm:w-28">
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
                <div key={v.id} className="border border-line rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-mint text-brand flex items-center justify-center shrink-0">
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

            <div className="text-[13px] text-ink-mute flex items-center gap-1.5 px-1">
              <Icon name="calendar" className="w-4 h-4 text-brand" />
              <span>แตะเลือกวันที่ในปฏิทินเพื่อเปลี่ยนวันของ <b>ช่วงที่ {activePeriodIdx + 1}</b></span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <b className="text-[17px]">ช่วงเวลาที่ขอใช้</b>
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
                    <div className="border border-line rounded-xl p-2 bg-white flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-mute">เริ่มต้น</span>
                        <span className="text-[11px] text-brand font-semibold">{formatThaiDate(sd, false)}</span>
                      </div>
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

                    <div className="border border-line rounded-xl p-2 bg-white flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-mute">สิ้นสุด</span>
                        <span className="text-[11px] text-brand font-semibold">{formatThaiDate(ed, false)}</span>
                      </div>
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
                setPeriods((prev) => {
                  const last = prev[prev.length - 1];
                  const nextDate = last
                    ? last.end.slice(0, 10)
                    : new Date().toISOString().slice(0, 10);
                  const next = [
                    ...prev,
                    { start: `${nextDate}T09:00:00+07:00`, end: `${nextDate}T12:00:00+07:00` },
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
              <div className="rounded-2xl bg-[#FDE8E8] border border-[#f9b4b4] p-3.5 flex items-start gap-2.5 text-[13px] text-[#7a1010]">
                <Icon name="x" className="w-5 h-5 text-status-crit shrink-0 mt-0.5" />
                <div>
                  <b>{effectiveConflicts[0].venueName} ไม่ว่างในช่วงนี้</b>
                  <br />
                  วันที่ {formatThaiDateTime(effectiveConflicts[0].start)}–
                  {new Date(effectiveConflicts[0].end).toTimeString().slice(0, 5)} มีผู้ขอใช้แล้ว กรุณาปรับวัน-เวลาใหม่
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

      {/* ================= STEP 3: เลือกอุปกรณ์เสริม ================= */}
      {step === 3 && (
        <div className="max-w-[720px] mx-auto flex flex-col gap-4">
          <div className="jw-card p-4 sm:p-5 flex flex-col gap-2 bg-gradient-to-r from-soft to-white">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-[16px] text-ink block">อุปกรณ์เสริมและสิ่งอำนวยความสะดวก</b>
                <span className="text-[13px] text-ink-mute">
                  เลือกอุปกรณ์ที่ต้องการใช้ร่วมกับสถานที่ เช่น เครื่องเสียง ไมโครโฟน โปรเจกเตอร์ เต็นท์ หรือโต๊ะ-เก้าอี้
                </span>
              </div>
              {selectedExtraItems.length > 0 && (
                <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-brand text-white shrink-0">
                  เลือก {selectedExtraItems.reduce((acc, x) => acc + x.qty, 0)} ชิ้น
                </span>
              )}
            </div>

            {selectedVenues.length > 0 && (
              <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-mute">
                <span>สำหรับสถานที่:</span>
                {selectedVenues.map((v) => (
                  <span key={v.id} className="font-semibold text-brand bg-brand-mint px-2 py-0.5 rounded-full">
                    {v.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ค้นหาและตัวกรอง */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              placeholder="ค้นหาอุปกรณ์เสริม..."
              className="jw-in flex-1"
            />
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {(
                [
                  ['all', 'ทั้งหมด'],
                  ['audio', 'เครื่องเสียง'],
                  ['tent', 'เต็นท์ / โต๊ะ-เก้าอี้'],
                  ['it', 'อุปกรณ์ IT'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEquipmentCat(val)}
                  className={`h-[38px] px-3.5 rounded-full border-[1.5px] text-[13px] font-semibold transition ${
                    equipmentCat === val
                      ? 'bg-brand border-brand text-white'
                      : 'bg-white border-line text-ink hover:border-brand'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* รายการอุปกรณ์ */}
          <div className="flex flex-col gap-2.5">
            {filteredEquipment.length === 0 ? (
              <div className="jw-card p-8 text-center text-ink-mute text-[14px]">
                ไม่พบอุปกรณ์ในหมวดหมู่นี้
              </div>
            ) : (
              filteredEquipment.map((eq) => {
                const qty = equipmentQuantities[eq.id] ?? 0;
                const isSelected = qty > 0;
                return (
                  <div
                    key={eq.id}
                    className={`jw-card p-3.5 sm:p-4 flex items-center gap-3.5 transition ${
                      isSelected ? 'ring-2 ring-brand bg-brand-mint/10' : ''
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand text-white' : 'bg-brand-mint text-brand'
                      }`}
                    >
                      <Icon name={equipmentIconName(eq.category)} className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <b className="block text-[15px] text-ink truncate">{eq.name}</b>
                      <span className="text-[12.5px] text-ink-mute">
                        {EQUIPMENT_CATEGORY_LABEL[eq.category]} · พร้อมให้บริการ {eq.stock} รายการ
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => setEquipmentQty(eq.id, eq.stock, qty - 1)}
                        className="w-[34px] h-[34px] rounded-full border-[1.5px] border-line hover:border-ink flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <Icon name="minus" className="w-4 h-4" />
                      </button>
                      <b className={`min-w-[24px] text-center text-[15px] ${isSelected ? 'text-brand font-bold' : ''}`}>
                        {qty}
                      </b>
                      <button
                        type="button"
                        disabled={qty >= eq.stock}
                        onClick={() => setEquipmentQty(eq.id, eq.stock, qty + 1)}
                        className="w-[34px] h-[34px] rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-deep disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* สรุปรายการอุปกรณ์ที่เลือก (ถ้ามี) */}
          {selectedExtraItems.length > 0 && (
            <div className="rounded-2xl bg-brand-mint/30 border border-brand/20 p-3.5 flex flex-col gap-2">
              <b className="text-[13px] text-brand block">รายการอุปกรณ์เสริมที่เลือกไว้:</b>
              <div className="flex flex-wrap gap-2">
                {selectedExtraItems.map((item) => (
                  <span
                    key={item.eq.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-line text-[12.5px] font-medium text-ink shadow-sm"
                  >
                    <span>{item.eq.name}</span>
                    <b className="text-brand font-bold">x{item.qty}</b>
                    <button
                      type="button"
                      onClick={() => setEquipmentQty(item.eq.id, item.eq.stock, 0)}
                      className="ml-1 text-ink-mute hover:text-ink font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= STEP 4: กรอกคำขอ (แบบขอใช้สถานที่ราชการ) ================= */}
      {step === 4 && (
        <div className="max-w-[760px] mx-auto jw-card p-5 sm:p-7 flex flex-col gap-4">
          <div className="pb-3 border-b border-line">
            <b className="text-[17px] text-ink block">แบบขอใช้สถานที่ราชการ</b>
            <span className="text-[12.5px] text-ink-mute">
              เรื่อง ขออนุญาตใช้สถานที่ราชการ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="jw-lbl">เขียนที่</label>
              <input
                type="text"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                className="jw-in"
                placeholder="ระบุสถานที่เขียนคำขอ"
              />
            </div>
            <div>
              <label className="jw-lbl">ข้าพเจ้า (นาย/นาง/นางสาว)</label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="jw-in"
                placeholder="ระบุชื่อ-นามสกุล"
              />
            </div>
            <div>
              <label className="jw-lbl">ตำแหน่ง</label>
              <input
                type="text"
                value={requesterPosition}
                onChange={(e) => setRequesterPosition(e.target.value)}
                className="jw-in"
                placeholder="เช่น ประชาชน / ประธานชุมชน"
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
                placeholder="เลขที่"
              />
            </div>
            <div>
              <label className="jw-lbl">หมู่ที่</label>
              <input
                type="text"
                value={addressMoo}
                onChange={(e) => setAddressMoo(e.target.value)}
                className="jw-in"
                placeholder="หมู่ที่"
              />
            </div>
            <div>
              <label className="jw-lbl">ตำบล / แขวง</label>
              <input
                type="text"
                value={addressSubdistrict}
                onChange={(e) => setAddressSubdistrict(e.target.value)}
                className="jw-in"
                placeholder="ตำบล / แขวง"
              />
            </div>
            <div>
              <label className="jw-lbl">อำเภอ / เขต</label>
              <input
                type="text"
                value={addressDistrict}
                onChange={(e) => setAddressDistrict(e.target.value)}
                className="jw-in"
                placeholder="อำเภอ / เขต"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="jw-lbl">จังหวัด</label>
              <input
                type="text"
                value={addressProvince}
                onChange={(e) => setAddressProvince(e.target.value)}
                className="jw-in"
                placeholder="ระบุจังหวัด"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="jw-lbl">หน่วยงาน / ชุมชน</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="jw-in"
                placeholder="ระบุหน่วยงานหรือกลุ่มชุมชน"
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

          {/* มีความประสงค์ขอใช้สถานที่ราชการ ดังนี้ (ล็อกรายการตามที่เลือกไว้) */}
          <div className="rounded-2xl bg-soft/60 border border-line p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <b className="text-[14px] text-ink">มีความประสงค์ขอใช้สถานที่ราชการ ดังนี้</b>
            </div>
            {purposeItems.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1.15fr_1fr] gap-2.5 items-center">
                <div className="flex items-center gap-2">
                  <b className="text-[14px] text-ink shrink-0 w-5">{idx + 1}.</b>
                  <input
                    type="text"
                    value={row.item}
                    readOnly
                    disabled
                    className="jw-in h-10 text-[13.5px] bg-soft/80 text-ink-mute cursor-not-allowed select-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink-mute shrink-0">เพื่อ</span>
                  <input
                    type="text"
                    value={row.forWhat}
                    readOnly
                    disabled
                    className="jw-in h-10 text-[13.5px] bg-soft/80 text-ink-mute cursor-not-allowed select-none"
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
            <label className="border-[1.5px] border-dashed border-[#7A7A7A] rounded-2xl p-4 text-center text-ink-mute bg-white cursor-pointer block hover:border-brand">
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

      {/* ================= STEP 5: ลงนามและส่ง ================= */}
      {step === 5 && (
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
              ต้องลงนามทุกฝ่าย (4 ฝ่าย): (1) ผู้ขออนุญาตใช้สถานที่ราชการ → (2) ความเห็นของเจ้าหน้าที่ → (3) ความเห็นของปลัด → (4) คำสั่งของผู้มีอำนาจอนุมัติ
            </p>
            {draftSaved && (
              <div className="rounded-2xl bg-brand-mint text-brand px-3.5 py-2 text-[13px] font-semibold">
                บันทึกร่างคำขอเรียบร้อยแล้ว
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
