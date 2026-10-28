import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Account,
  AnyRequest,
  BookingRequest,
  BorrowRequest,
  ItemQty,
  Period,
  RepairRequest,
  RequestType,
  SIGN_LEVEL_TITLE,
  SignLevel,
  canSignRequest,
  hasPermission,
  withTimeline,
} from '@jongwen/shared';
import {
  CurrentUser,
  Permissions,
  assertNotLocked,
  clearFailures,
  recordFailure,
  requireDrawnSignature,
} from '../auth/auth.guard';
import { verifySecret } from '../auth/secret';
import { DbService } from '../db/db.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly db: DbService) {}

  private sanitizeItems(items: unknown): ItemQty[] {
    if (!Array.isArray(items)) return [];
    const cleaned: ItemQty[] = [];
    for (const raw of items.slice(0, 30)) {
      if (!raw || typeof raw !== 'object') continue;
      const equipmentId = String((raw as ItemQty).equipmentId ?? '').trim();
      const qty = Math.floor(Number((raw as ItemQty).qty ?? 0));
      const eq = this.db.equipment.find((e) => e.id === equipmentId && e.enabled);
      if (!eq) continue;
      if (!Number.isFinite(qty) || qty < 1 || qty > eq.stock) {
        throw new BadRequestException(`จำนวนอุปกรณ์ "${eq.name}" ต้องอยู่ระหว่าง 1 ถึง ${eq.stock}`);
      }
      cleaned.push({ equipmentId: eq.id, qty });
    }
    return cleaned;
  }

  private enrich(req: AnyRequest) {
    const handovers = this.db.handovers.filter((h) => h.requestId === req.id);
    const handoverBefore = [...handovers].reverse().find((h) => h.phase === 'before');
    const handoverAfter = [...handovers].reverse().find((h) => h.phase === 'after');
    return {
      ...withTimeline(req, this.db.venues, this.db.equipment),
      handovers,
      handoverBefore,
      handoverAfter,
    };
  }

  @Get()
  list(
    @CurrentUser() user: Account,
    @Query('mine') mine?: string,
    @Query('type') type?: RequestType,
    @Query('queue') queue?: 'staff' | 'l2' | 'l1' | 'handover',
  ) {
    let items = [...this.db.requests];

    if (mine === '1') {
      // ของใครของมัน:
      // 1. ถ้าเป็นผู้ยื่นคำขอเอง หรือเป็นเจ้าหน้าที่ที่กรอกแทน
      // 2. ถ้าเป็นเจ้าหน้าที่ / ผู้อนุมัติ L2 / ผู้อนุมัติ L1: ให้รวมคำขอที่ส่งมาถึงตนเองตามสายงาน หรือคำขอที่ตนเองเคยลงนามแล้ว
      items = items.filter((r) => {
        if (r.requesterId === user.id || r.createdByStaffId === user.id) return true;

        if (user.role === 'STAFF') {
          // คำขอที่ส่งมาถึงเจ้าหน้าที่ หรือเจ้าหน้าที่เคยลงนามแล้ว
          const signed = r.type !== 'repair' && r.signatures.some((s) => s.signerId === user.id || s.level === 'staff');
          const isQueue = ['pending_staff', 'repair_submitted', 'repair_in_progress'].includes(r.status);
          const isRepairAssigned = r.type === 'repair' && (r.staffSignature || r.staffSignerName);
          return signed || isQueue || isRepairAssigned;
        }

        if (user.role === 'APPROVER_L2') {
          // คำขอที่ส่งมาถึงปลัด อบต. (pending_l2) หรือปลัดเคยลงนามแล้ว
          const signed = r.type !== 'repair' && r.signatures.some((s) => s.signerId === user.id || s.level === 'l2');
          const isQueue = r.status === 'pending_l2';
          return signed || isQueue;
        }

        if (user.role === 'APPROVER_L1') {
          // คำขอที่ส่งมาถึงนายก อบต. (pending_l1) หรือนายกเคยลงนามแล้ว
          const signed = r.type !== 'repair' && r.signatures.some((s) => s.signerId === user.id || s.level === 'l1');
          const isQueue = r.status === 'pending_l1';
          return signed || isQueue;
        }

        return false;
      });
    } else if (user.role === 'USER') {
      items = items.filter((r) => r.requesterId === user.id);
    }
    if (type) items = items.filter((r) => r.type === type);
    if (queue === 'staff') {
      items = items.filter((r) =>
        ['pending_staff', 'repair_submitted', 'repair_in_progress'].includes(r.status),
      );
    } else if (queue === 'l2') {
      items = items.filter((r) => r.status === 'pending_l2');
    } else if (queue === 'l1') {
      items = items.filter((r) => r.status === 'pending_l1');
    } else if (queue === 'handover') {
      items = items.filter(
        (r) =>
          (r.type === 'booking' && r.status === 'approved') ||
          (r.type === 'borrow' && ['approved', 'borrowing', 'return_inspect'].includes(r.status)),
      );
    }
    return items
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((r) => this.enrich(r));
  }

  @Get(':id')
  getOne(@CurrentUser() user: Account, @Param('id') id: string) {
    const req = this.db.requests.find((r) => r.id === id || r.code === id);
    if (!req) throw new NotFoundException('ไม่พบคำขอ');
    // ป้องกัน IDOR: ผู้ใช้ทั่วไปเห็นได้เฉพาะคำขอของตนเอง
    const isOfficer =
      hasPermission(user, 'review') || hasPermission(user, 'handover') || hasPermission(user, 'sign');
    if (!isOfficer && req.requesterId !== user.id) throw new NotFoundException('ไม่พบคำขอ');
    return this.enrich(req);
  }

  @Post('booking')
  async createBooking(
    @CurrentUser() user: Account,
    @Body()
    body: {
      venueIds: string[];
      periods: Period[];
      attendees?: number;
      activity?: string;
      purpose?: string;
      organization?: string;
      attachments?: string[];
      extraItems?: ItemQty[];
      requesterId?: string;
      requesterName?: string;
      requesterSignature?: string;
      createdByStaffSignature?: string;
      writtenAt?: string;
      requesterPosition?: string;
      addressHouseNo?: string;
      addressMoo?: string;
      addressSubdistrict?: string;
      addressDistrict?: string;
      addressProvince?: string;
      purposeItems?: { item: string; forWhat: string }[];
    },
  ) {
    const venueIds = Array.isArray(body.venueIds) ? body.venueIds.filter((v) => this.db.venues.some((x) => x.id === v && x.enabled)) : [];
    const periods = Array.isArray(body.periods) ? body.periods : [];
    if (!venueIds.length || !periods.length || periods.length > 20) {
      throw new BadRequestException('กรุณาเลือกสถานที่และวันเวลา');
    }
    for (const p of periods) {
      const s = new Date(p?.start).getTime();
      const e = new Date(p?.end).getTime();
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
        throw new BadRequestException('ช่วงวันเวลาไม่ถูกต้อง');
      }
    }
    const requesterSig = requireDrawnSignature(body.requesterSignature, 'ผู้ขอใช้สถานที่');

    const isWalkIn =
      (body.requesterId && body.requesterId !== user.id) ||
      (body.requesterName && body.requesterName.trim() !== user.name);
    if (isWalkIn && !hasPermission(user, 'walkIn')) {
      throw new ForbiddenException(
        'ไม่มีสิทธิ์กรอกคำขอแทนผู้มาติดต่อ (Walk-in): ต้องเปิดสิทธิ์ "กรอกคำขอแทนผู้มาติดต่อหน้าเคาน์เตอร์"',
      );
    }
    if (isWalkIn && body.requesterId && !this.db.accounts.some((a) => a.id === body.requesterId)) {
      throw new BadRequestException('ไม่พบผู้ใช้ที่ระบุ');
    }
    const staffSig = isWalkIn ? requireDrawnSignature(body.createdByStaffSignature, 'เจ้าหน้าที่ผู้กรอกแทน') : undefined;

    const now = new Date().toISOString();
    const code = this.db.nextCode('BK');
    const req: BookingRequest = {
      id: `r-${code.toLowerCase()}`,
      code,
      type: 'booking',
      status: 'pending_staff',
      requesterId: isWalkIn ? body.requesterId ?? user.id : user.id,
      requesterName: (isWalkIn ? body.requesterName?.trim() : '') || user.name,
      requesterSignature: requesterSig,
      organization: String(body.organization ?? '').slice(0, 200) || user.department,
      createdAt: now,
      updatedAt: now,
      createdByStaffId: isWalkIn ? user.id : undefined,
      createdByStaffSignature: staffSig,
      venueIds,
      periods: periods.map((p) => ({ start: p.start, end: p.end })),
      attendees: Math.max(1, Math.min(10000, Math.floor(Number(body.attendees ?? 30)) || 30)),
      activity: String(body.activity ?? '').trim().slice(0, 200) || 'ขอใช้สถานที่',
      purpose: String(body.purpose ?? '').trim().slice(0, 1000) || 'ใช้จัดกิจกรรม',
      attachments: (body.attachments ?? []).slice(0, 10).map((a) => String(a).slice(0, 200)),
      extraItems: this.sanitizeItems(body.extraItems),
      signatures: [],
      writtenAt: body.writtenAt ? String(body.writtenAt).slice(0, 120) : '',
      requesterPosition: body.requesterPosition ? String(body.requesterPosition).slice(0, 120) : (user.position || ''),
      addressHouseNo: body.addressHouseNo ? String(body.addressHouseNo).slice(0, 40) : '',
      addressMoo: body.addressMoo ? String(body.addressMoo).slice(0, 20) : '',
      addressSubdistrict: body.addressSubdistrict ? String(body.addressSubdistrict).slice(0, 80) : '',
      addressDistrict: body.addressDistrict ? String(body.addressDistrict).slice(0, 80) : '',
      addressProvince: body.addressProvince ? String(body.addressProvince).slice(0, 80) : '',
      purposeItems: Array.isArray(body.purposeItems)
        ? body.purposeItems.slice(0, 20).map((pi) => ({
            item: String(pi?.item ?? '').slice(0, 200),
            forWhat: String(pi?.forWhat ?? '').slice(0, 300),
          }))
        : undefined,
    };
    this.db.requests.unshift(req);
    await this.db.persistRequest(req);
    this.db.notifyRole('STAFF', 'มีคำขอจองสถานที่ใหม่', `${req.code} · ${req.requesterName}`, `/staff/review?id=${req.id}`);
    this.db.log('request', `ส่งคำขอจอง ${req.code}`, req.requesterName);
    return this.enrich(req);
  }

  @Post('borrow')
  async createBorrow(
    @CurrentUser() user: Account,
    @Body()
    body: {
      items: ItemQty[];
      pickupDate: string;
      returnDate: string;
      purpose?: string;
      organization?: string;
      attachments?: string[];
      requesterId?: string;
      requesterName?: string;
      requesterSignature?: string;
      createdByStaffSignature?: string;
    },
  ) {
    const items = this.sanitizeItems(body.items);
    if (!items.length) throw new BadRequestException('กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ');
    const pick = new Date(body.pickupDate).getTime();
    const ret = new Date(body.returnDate).getTime();
    if (!Number.isFinite(pick) || !Number.isFinite(ret) || ret < pick) {
      throw new BadRequestException('วันที่รับ/คืนไม่ถูกต้อง');
    }

    const isWalkIn =
      Boolean(body.createdByStaffSignature) ||
      Boolean(body.requesterId && body.requesterId !== user.id) ||
      Boolean(body.requesterName && body.requesterName.trim() !== user.name);

    if (isWalkIn && !hasPermission(user, 'walkIn')) {
      throw new ForbiddenException('ไม่มีสิทธิ์กรอกคำขอแทนที่เคาน์เตอร์');
    }

    const requesterSig = requireDrawnSignature(body.requesterSignature, 'ผู้ขอยืม');
    const staffSig = isWalkIn ? requireDrawnSignature(body.createdByStaffSignature, 'เจ้าหน้าที่ผู้กรอกแทน') : undefined;

    const now = new Date().toISOString();
    const code = this.db.nextCode('BR');
    const req: BorrowRequest = {
      id: `r-${code.toLowerCase()}`,
      code,
      type: 'borrow',
      status: 'pending_staff',
      requesterId: isWalkIn ? body.requesterId ?? user.id : user.id,
      requesterName: (isWalkIn ? body.requesterName?.trim() : '') || user.name,
      requesterSignature: requesterSig,
      organization: String(body.organization ?? '').slice(0, 200) || user.department,
      createdAt: now,
      updatedAt: now,
      createdByStaffId: isWalkIn ? user.id : undefined,
      createdByStaffSignature: staffSig,
      items,
      pickupDate: String(body.pickupDate).slice(0, 10),
      returnDate: String(body.returnDate).slice(0, 10),
      purpose: String(body.purpose ?? '').trim().slice(0, 1000) || 'ใช้งานกิจกรรมในพื้นที่',
      attachments: (body.attachments ?? []).slice(0, 10).map((a) => String(a).slice(0, 200)),
      signatures: [],
    };
    this.db.requests.unshift(req);
    await this.db.persistRequest(req);
    this.db.notifyRole('STAFF', 'มีคำขอยืมครุภัณฑ์ใหม่', `${req.code} · ${req.requesterName}`, `/staff/review?id=${req.id}`);
    this.db.log('request', `ส่งคำขอยืม ${req.code}`, req.requesterName);
    return this.enrich(req);
  }

  @Post('repair')
  async createRepair(
    @CurrentUser() user: Account,
    @Body()
    body: {
      building: string;
      floor: string;
      location: string;
      category: string;
      detail: string;
      photos?: number;
      requesterId?: string;
      requesterName?: string;
      organization?: string;
      requesterSignature?: string;
      createdByStaffSignature?: string;
    },
  ) {
    if (!body.detail?.trim()) throw new BadRequestException('กรุณาระบุรายละเอียดอาการ');

    const isWalkIn =
      Boolean(body.createdByStaffSignature) ||
      Boolean(body.requesterId && body.requesterId !== user.id) ||
      Boolean(body.requesterName && body.requesterName.trim() !== user.name);

    if (isWalkIn && !hasPermission(user, 'walkIn')) {
      throw new ForbiddenException('ไม่มีสิทธิ์กรอกคำขอแทนที่เคาน์เตอร์');
    }

    const requesterSig = requireDrawnSignature(body.requesterSignature, 'ผู้แจ้งซ่อม');
    const staffSig = isWalkIn ? requireDrawnSignature(body.createdByStaffSignature, 'เจ้าหน้าที่ผู้กรอกแทน') : undefined;

    const now = new Date().toISOString();
    const code = this.db.nextCode('RP');
    const req: RepairRequest = {
      id: `r-${code.toLowerCase()}`,
      code,
      type: 'repair',
      status: 'repair_submitted',
      requesterId: isWalkIn ? body.requesterId ?? user.id : user.id,
      requesterName: (isWalkIn ? body.requesterName?.trim() : '') || user.name,
      requesterSignature: requesterSig,
      organization: String(body.organization ?? '').slice(0, 200) || user.department,
      createdAt: now,
      updatedAt: now,
      createdByStaffId: isWalkIn ? user.id : undefined,
      createdByStaffSignature: staffSig,
      building: String(body.building ?? '').slice(0, 100) || 'อาคารสำนักงาน',
      floor: String(body.floor ?? '').slice(0, 50) || 'ชั้น 1',
      location: String(body.location ?? '').slice(0, 200) || 'ทั่วไป',
      category: String(body.category ?? '').slice(0, 50) || 'อื่น ๆ',
      detail: body.detail.trim().slice(0, 2000),
      photos: Math.max(0, Math.min(3, Math.floor(Number(body.photos ?? 0)) || 0)),
    };
    this.db.requests.unshift(req);
    await this.db.persistRequest(req);
    this.db.notifyRole('STAFF', 'แจ้งซ่อมใหม่', `${req.code} · ${req.location}`, `/staff/review?id=${req.id}`);
    this.db.log('request', `แจ้งซ่อม ${req.code}`, req.location);
    return this.enrich(req);
  }

  /** ลงนาม / อนุมัติ 3 ระดับ (เจ้าหน้าที่ → ปลัด L2 → นายก L1) */
  @Permissions('review', 'sign')
  @Post(':id/sign')
  async sign(
    @CurrentUser() user: Account,
    @Param('id') id: string,
    @Body() body: { decision: 'approve' | 'reject'; note?: string; pin?: string; signature?: string },
  ) {
    const req = this.db.requests.find((r) => r.id === id || r.code === id);
    if (!req || req.type === 'repair') throw new NotFoundException('ไม่พบคำขอที่ต้องลงนาม');

    const check = canSignRequest(user, req);
    if (!check.allowed || !check.expectedLevel) {
      throw new ForbiddenException(check.reason || 'ไม่มีสิทธิ์ลงนามคำขอนี้ในระดับปัจจุบัน');
    }
    if (body.decision !== 'approve' && body.decision !== 'reject') {
      throw new BadRequestException('ผลการพิจารณาไม่ถูกต้อง');
    }

    // เจ้าหน้าที่ (ระดับ 1) / ผู้อนุมัติระดับ 2 / ผู้อนุมัติระดับ 1 ต้องยืนยัน PIN 6 หลักทุกครั้งที่ลงนาม
    if (check.expectedLevel === 'staff' || check.expectedLevel === 'l2' || check.expectedLevel === 'l1') {
      if (!user.pin) throw new BadRequestException('กรุณาตั้งค่า PIN 6 หลักก่อนลงนาม');
      const key = `pin:${user.id}`;
      assertNotLocked(key);
      if (!(await verifySecret(user.pin, String(body.pin ?? '')))) {
        recordFailure(key);
        throw new UnauthorizedException('รหัส PIN ไม่ถูกต้อง');
      }
      clearFailures(key);
    }
    const finalSignature = requireDrawnSignature(body.signature, 'ผู้ลงนาม');
    const note = body.note ? String(body.note).slice(0, 1000) : undefined;

    const level: SignLevel = check.expectedLevel;

    const now = new Date().toISOString();
    req.signatures = req.signatures.filter((s) => s.level !== level);
    req.signatures.push({
      level,
      signerId: user.id,
      signerName: user.name,
      title: SIGN_LEVEL_TITLE[level],
      at: now,
      decision: body.decision,
      signature: finalSignature,
      note,
    });
    req.updatedAt = now;

    if (body.decision === 'reject') {
      req.status = 'rejected';
      req.rejectReason = note || 'ไม่ผ่านการพิจารณา';
      this.db.notify(req.requesterId, `คำขอ ${req.code} ไม่ผ่าน`, req.rejectReason, `/requests/${req.id}`);
    } else if (level === 'staff') {
      req.status = 'pending_l2';
      this.db.notifyRole('APPROVER_L2', `รอเห็นชอบ ${req.code}`, req.requesterName, `/approver/sign/${req.id}`);
    } else if (level === 'l2') {
      req.status = 'pending_l1';
      this.db.notifyRole('APPROVER_L1', `รออนุมัติ ${req.code}`, req.requesterName, `/approver/sign/${req.id}`);
    } else {
      req.status = req.type === 'borrow' ? 'borrowing' : 'approved';
      this.db.notify(
        req.requesterId,
        `คำขอ ${req.code} อนุมัติแล้ว`,
        'ดาวน์โหลดเอกสารใบอนุญาต (PDF) ได้แล้ว',
        `/approver/permit/${req.id}`,
      );
    }

    await this.db.persistRequest(req);
    this.db.log('request', `${body.decision === 'approve' ? 'ลงนาม' : 'ไม่ผ่าน'} ${req.code}`, `${user.name} (${SIGN_LEVEL_TITLE[level]})`);
    return this.enrich(req);
  }

  /** ขอเลื่อนวัน หรือ ยกเลิกคำขอ (เฉพาะเจ้าของคำขอ หรือ เจ้าหน้าที่ที่มีสิทธิ์ตรวจคำขอ) */
  @Post(':id/reschedule')
  async reschedule(@CurrentUser() user: Account, @Param('id') id: string, @Body() body: { periods: Period[] }) {
    const req = this.db.requests.find((r): r is BookingRequest => (r.id === id || r.code === id) && r.type === 'booking');
    if (!req) throw new NotFoundException('ไม่พบคำขอจอง');
    if (req.requesterId !== user.id && !hasPermission(user, 'review')) {
      throw new ForbiddenException('เฉพาะเจ้าของคำขอ หรือเจ้าหน้าที่ผู้รับผิดชอบเท่านั้นที่สามารถขอเลื่อนวันได้');
    }
    if (!['pending_staff', 'pending_l2', 'pending_l1', 'approved'].includes(req.status)) {
      throw new BadRequestException('คำขอนี้ไม่อยู่ในสถานะที่ขอเลื่อนวันได้');
    }
    const periods = Array.isArray(body.periods) ? body.periods : [];
    if (!periods.length || periods.some((p) => !(new Date(p?.end).getTime() > new Date(p?.start).getTime()))) {
      throw new BadRequestException('ช่วงวันเวลาไม่ถูกต้อง');
    }
    req.periods = periods.map((p) => ({ start: p.start, end: p.end }));
    req.status = 'pending_staff';
    req.signatures = [];
    req.updatedAt = new Date().toISOString();
    await this.db.persistRequest(req);
    this.db.log('request', `ขอเลื่อนวัน ${req.code}`, user.name);
    return this.enrich(req);
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() user: Account, @Param('id') id: string, @Body() body: { reason?: string }) {
    const req = this.db.requests.find((r) => r.id === id || r.code === id);
    if (!req) throw new NotFoundException('ไม่พบคำขอ');
    if (req.requesterId !== user.id && !hasPermission(user, 'review')) {
      throw new ForbiddenException('เฉพาะเจ้าของคำขอ หรือเจ้าหน้าที่ผู้รับผิดชอบเท่านั้นที่สามารถยกเลิกคำขอได้');
    }
    if (['cancelled', 'rejected', 'returned', 'borrowing', 'repair_done'].includes(req.status)) {
      throw new BadRequestException('คำขอนี้ไม่อยู่ในสถานะที่ยกเลิกได้');
    }
    req.status = 'cancelled';
    req.rejectReason = body.reason ? String(body.reason).slice(0, 1000) : undefined;
    req.updatedAt = new Date().toISOString();
    await this.db.persistRequest(req);
    this.db.log('request', `ยกเลิกคำขอ ${req.code}`, user.name);
    return this.enrich(req);
  }

  /** ผู้ยืมแจ้งคืนอุปกรณ์ */
  @Post(':id/return-request')
  async requestReturn(@CurrentUser() user: Account, @Param('id') id: string) {
    const req = this.db.requests.find((r): r is BorrowRequest => (r.id === id || r.code === id) && r.type === 'borrow');
    if (!req) throw new NotFoundException('ไม่พบรายการยืม');
    if (req.requesterId !== user.id && !hasPermission(user, 'handover')) {
      throw new ForbiddenException('เฉพาะผู้ยืม หรือเจ้าหน้าที่รับมอบ–คืนอุปกรณ์เท่านั้นที่สามารถแจ้งคืนได้');
    }
    if (req.status !== 'borrowing') throw new BadRequestException('รายการนี้ไม่อยู่ในสถานะกำลังยืม');
    const now = new Date().toISOString();
    req.status = 'return_inspect';
    req.returnRequestedAt = now;
    req.updatedAt = now;
    await this.db.persistRequest(req);
    this.db.notifyRole('STAFF', `แจ้งคืนอุปกรณ์ ${req.code}`, req.requesterName, `/staff/handover?id=${req.id}`);
    return this.enrich(req);
  }

  /** เจ้าหน้าที่บันทึกเช็คลิสต์รับมอบ / รับคืน (ต้องมีลายเซ็นทั้งผู้รับมอบ/ผู้คืน และเจ้าหน้าที่) */
  @Permissions('handover')
  @Post(':id/handover')
  async handover(
    @CurrentUser() user: Account,
    @Param('id') id: string,
    @Body()
    body: {
      phase: 'before' | 'after';
      items: { label: string; ok: boolean }[];
      note?: string;
      citizenSignature?: string;
      staffSignature?: string;
    },
  ) {
    const req = this.db.requests.find((r) => r.id === id || r.code === id);
    if (!req || req.type === 'repair') throw new NotFoundException('ไม่พบคำขอ');
    if (body.phase !== 'before' && body.phase !== 'after') throw new BadRequestException('ขั้นตอนไม่ถูกต้อง');
    const allowed =
      body.phase === 'before'
        ? ['approved', 'borrowing'].includes(req.status)
        : ['approved', 'borrowing', 'return_inspect'].includes(req.status);
    if (!allowed) throw new BadRequestException('คำขอนี้ยังไม่อนุมัติครบ หรือไม่อยู่ในสถานะรับมอบ/รับคืน');
    const citizenSig = requireDrawnSignature(body.citizenSignature, 'ผู้รับมอบ/ผู้ส่งคืน');
    const staffSig = requireDrawnSignature(body.staffSignature, 'เจ้าหน้าที่ผู้ตรวจสภาพ');
    const now = new Date().toISOString();
    const handoverRecord = {
      requestId: req.id,
      phase: body.phase,
      items: (Array.isArray(body.items) ? body.items : [])
        .slice(0, 50)
        .map((i) => ({ label: String(i?.label ?? '').slice(0, 200), ok: Boolean(i?.ok) })),
      note: String(body.note ?? '').slice(0, 1000),
      at: now,
      staffId: user.id,
      staffName: user.name,
      citizenSignature: citizenSig,
      staffSignature: staffSig,
    };
    this.db.handovers.push(handoverRecord);
    if (req.type === 'borrow') {
      req.status = body.phase === 'before' ? 'borrowing' : 'returned';
      if (body.phase === 'after') req.returnedAt = now;
    }
    req.updatedAt = now;
    await this.db.persistHandover(handoverRecord);
    await this.db.persistRequest(req);
    this.db.log('request', `${body.phase === 'before' ? 'ยืนยันรับมอบ' : 'ยืนยันรับคืน'} ${req.code}`, user.name);
    return this.enrich(req);
  }

  /** อัปเดตสถานะงานซ่อม + ผู้แจ้งตรวจรับงาน (พร้อมลายเซ็นเจ้าหน้าที่และผู้แจ้งตรวจรับ) */
  @Post(':id/repair-status')
  async updateRepair(
    @CurrentUser() user: Account,
    @Param('id') id: string,
    @Body()
    body: {
      action: 'accept' | 'finish' | 'confirm' | 'reopen';
      resolution?: string;
      signature?: string;
      pin?: string;
    },
  ) {
    const req = this.db.requests.find((r): r is RepairRequest => (r.id === id || r.code === id) && r.type === 'repair');
    if (!req) throw new NotFoundException('ไม่พบรายการแจ้งซ่อม');

    if (body.action === 'accept' || body.action === 'finish') {
      if (!hasPermission(user, 'review')) {
        throw new ForbiddenException('เฉพาะเจ้าหน้าที่ผู้รับผิดชอบเท่านั้นที่สามารถรับเรื่องหรือบันทึกซ่อมเสร็จได้');
      }
      if (!user.pin) throw new BadRequestException('กรุณาตั้งค่า PIN 6 หลักก่อนลงนาม');
      const key = `pin:${user.id}`;
      assertNotLocked(key);
      if (!(await verifySecret(user.pin, String(body.pin ?? '')))) {
        recordFailure(key);
        throw new UnauthorizedException('รหัส PIN ไม่ถูกต้อง');
      }
      clearFailures(key);
    } else if (body.action === 'confirm' || body.action === 'reopen') {
      // การตรวจรับงานต้องทำโดยผู้แจ้งซ่อมเท่านั้น (เจ้าหน้าที่ตรวจรับแทนไม่ได้)
      if (req.requesterId !== user.id) {
        throw new ForbiddenException('เฉพาะผู้แจ้งซ่อมเท่านั้นที่สามารถตรวจรับงานซ่อมได้');
      }
    } else {
      throw new BadRequestException('คำสั่งไม่ถูกต้อง');
    }

    const expected: Record<typeof body.action, RepairRequest['status'][]> = {
      accept: ['repair_submitted'],
      finish: ['repair_in_progress'],
      confirm: ['repair_awaiting_acceptance'],
      reopen: ['repair_awaiting_acceptance'],
    };
    if (!expected[body.action].includes(req.status)) {
      throw new BadRequestException('สถานะงานซ่อมไม่ถูกต้องสำหรับคำสั่งนี้');
    }

    const now = new Date().toISOString();
    if (body.action === 'accept') {
      req.status = 'repair_in_progress';
      req.acceptedAt = now;
      req.staffSignature = requireDrawnSignature(body.signature, 'เจ้าหน้าที่ผู้รับเรื่อง');
      req.staffSignerName = user.name;
    } else if (body.action === 'finish') {
      const sig = requireDrawnSignature(body.signature, 'เจ้าหน้าที่ผู้ซ่อม');
      req.status = 'repair_awaiting_acceptance';
      req.finishedAt = now;
      req.resolution = String(body.resolution ?? '').slice(0, 1000) || 'ดำเนินการซ่อมเรียบร้อย';
      req.staffSignature = sig;
      req.staffSignerName = user.name;
      this.db.notify(req.requesterId, `${req.location} ซ่อมเสร็จแล้ว`, 'รอคุณตรวจรับงาน', `/repair?mode=track&id=${req.id}`);
    } else if (body.action === 'confirm') {
      const sig = requireDrawnSignature(body.signature, 'ผู้แจ้งซ่อม');
      req.status = 'repair_done';
      req.acceptanceSignature = sig;
      req.acceptedByRequesterAt = now;
    } else if (body.action === 'reopen') {
      req.status = 'repair_in_progress';
    }
    req.updatedAt = now;
    await this.db.persistRequest(req);
    this.db.log('request', `อัปเดตงานซ่อม ${req.code}`, user.name);
    return this.enrich(req);
  }
}
