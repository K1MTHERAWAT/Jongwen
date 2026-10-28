import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  ActivityLog,
  Account,
  AnyRequest,
  AppNotification,
  BookingRequest,
  BorrowRequest,
  DEFAULT_PERMISSIONS,
  Equipment,
  HandoverRecord,
  OfficialFormPurposeItem,
  PermissionKey,
  PublicAccount,
  RepairRequest,
  Role,
  Venue,
} from '@jongwen/shared';
import {
  mockAccounts,
  mockActivities,
  mockEquipment,
  mockNotifications,
  mockRequests,
  mockVenues,
} from '../demo-data';
import { hashSecret } from '../auth/secret';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * บริการฐานข้อมูล PostgreSQL ผ่าน Prisma ORM
 * - เมื่อเริ่มต้นระบบ (OnModuleInit) หากตารางยังว่างอยู่ จะ Seed ข้อมูลเริ่มต้นให้อัตโนมัติ
 * - โหลดข้อมูลเข้าหน่วยความจำเพื่อให้การอ่านรวดเร็ว และบันทึกทุกการเปลี่ยนแปลงลง PostgreSQL ทันที
 */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  readonly prisma = new PrismaClient();

  accounts: Account[] = [];
  venues: Venue[] = [];
  equipment: Equipment[] = [];
  requests: AnyRequest[] = [];
  notifications: AppNotification[] = [];
  activities: ActivityLog[] = [];
  handovers: HandoverRecord[] = [];

  private seq = { BK: 0, BR: 0, RP: 0, n: 0, l: 0, u: 100, v: 100, e: 100 };
  private resetCronTimer?: NodeJS.Timeout;
  private lastDemoResetDateUtc?: string;

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      const count = await this.prisma.account.count();
      if (count === 0) {
        if (process.env.DEMO_MODE === 'true' || process.env.SEED_DEMO === 'true') {
          this.logger.log('DEMO_MODE=true: Seeding demo data into PostgreSQL...');
          await this.seedDatabase();
        } else {
          this.logger.log('Seeding initial production admin account into PostgreSQL...');
          await this.seedProductionAdmin();
        }
      }
      await this.loadFromDatabase();
      if (process.env.DEMO_MODE === 'true') {
        const bkkNow = this.getBangkokTime();
        this.lastDemoResetDateUtc = new Date(bkkNow.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
        this.scheduleNightlyReset();
      }
      this.logger.log(
        `PostgreSQL connected: ${this.accounts.length} accounts, ${this.venues.length} venues, ${this.equipment.length} equipment, ${this.requests.length} requests`,
      );
    } catch (err) {
      this.logger.error('Failed to initialize PostgreSQL connection, falling back to in-memory cache', err);
      throw err;
    }
  }

  getBangkokTime(date = new Date()): Date {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000);
  }

  scheduleNightlyReset() {
    const now = new Date();
    // 03:00 น. กรุงเทพฯ (UTC+7) ตรงกับ 20:00:00 UTC
    const nextResetUtc = new Date(now);
    nextResetUtc.setUTCHours(20, 0, 0, 0);
    if (nextResetUtc.getTime() <= now.getTime()) {
      nextResetUtc.setUTCDate(nextResetUtc.getUTCDate() + 1);
    }
    const msUntilReset = nextResetUtc.getTime() - now.getTime();
    this.logger.log(
      `DEMO_MODE: Nightly reset scheduled in ${(msUntilReset / (1000 * 60)).toFixed(0)} minutes (03:00 AM Bangkok Time / 20:00 UTC)`,
    );
    this.resetCronTimer = setTimeout(async () => {
      try {
        this.logger.log('DEMO_MODE: Running nightly automatic reset (03:00 AM Bangkok)...');
        await this.reset();
        const bkkNow = this.getBangkokTime();
        this.lastDemoResetDateUtc = new Date(bkkNow.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
        this.logger.log('DEMO_MODE: Nightly reset completed.');
      } catch (err) {
        this.logger.error('DEMO_MODE: Failed to run nightly reset', err);
      }
      this.scheduleNightlyReset();
    }, msUntilReset);
  }

  /** ตรวจสอบและรีเซ็ตกรณี instance ตื่นจากการหลับ (Serverless / Free tier) */
  async checkPendingDemoReset() {
    if (process.env.DEMO_MODE !== 'true') return;
    const bkkNow = this.getBangkokTime();
    const currentDemoDay = new Date(bkkNow.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (this.lastDemoResetDateUtc && this.lastDemoResetDateUtc < currentDemoDay) {
      this.logger.log(`DEMO_MODE: Woke up after reset deadline for ${currentDemoDay}. Triggering reset now...`);
      await this.reset();
      this.lastDemoResetDateUtc = currentDemoDay;
    }
  }

  async seedProductionAdmin() {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!adminPassword || adminPassword.trim() === '') {
      throw new Error(
        'ADMIN_INITIAL_PASSWORD environment variable is required to bootstrap production admin account. Server startup aborted for security.',
      );
    }
    const hashedPassword = await hashSecret(adminPassword);
    const adminAccount: Account = {
      id: 'ad-admin',
      username: 'admin',
      password: hashedPassword,
      name: 'ผู้ดูแลระบบ',
      nickname: 'แอดมิน',
      initial: 'อ',
      role: 'ADMIN',
      position: 'ผู้ดูแลระบบ',
      department: 'ฝ่ายเทคโนโลยีสารสนเทศ',
      phone: '085-000-0000',
      permissions: { ...DEFAULT_PERMISSIONS.ADMIN },
      signature: null,
      pin: null,
      isDemo: false,
      createdAt: new Date().toISOString(),
    };
    await this.persistAccount(adminAccount);
    this.logger.log('Created initial admin account (username: admin) with password from ADMIN_INITIAL_PASSWORD');
  }

  async onModuleDestroy() {
    if (this.resetCronTimer) {
      clearTimeout(this.resetCronTimer);
    }
    await this.prisma.$disconnect().catch(() => {});
  }

  // ===================== Session Management (PostgreSQL Backed) =====================

  async createSession(accountId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        token,
        accountId,
        expiresAt,
      },
    });
    return token;
  }

  async revokeSession(token: string): Promise<void> {
    await this.prisma.session.delete({ where: { token } }).catch(() => {});
  }

  async getSession(token: string): Promise<{ accountId: string; expiresAt: Date } | null> {
    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.delete({ where: { token } }).catch(() => {});
      return null;
    }
    return session;
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }).catch(() => {});
  }

  // ===================== Sequence Management (PostgreSQL Atomic) =====================

  async nextCode(prefix: 'BK' | 'BR' | 'RP'): Promise<string> {
    const buddhistYear = 2569;
    const key = `${prefix}-${buddhistYear}`;
    const seq = await this.prisma.sequence.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    this.seq[prefix] = seq.value;
    return `${prefix}-${buddhistYear}-${String(seq.value).padStart(4, '0')}`;
  }

  async nextId(kind: 'n' | 'l' | 'u' | 'v' | 'e'): Promise<string> {
    const key = `id-${kind}`;
    const seq = await this.prisma.sequence.upsert({
      where: { key },
      create: { key, value: 101 },
      update: { value: { increment: 1 } },
    });
    return `${kind}-${seq.value}`;
  }

  async syncSequences() {
    const requests = await this.prisma.request.findMany({ select: { code: true } });
    for (const prefix of ['BK', 'BR', 'RP'] as const) {
      let maxVal = 0;
      for (const r of requests) {
        const m = new RegExp(`^${prefix}-2569-(\\d+)$`).exec(r.code);
        if (m) {
          const val = Number(m[1]);
          if (val > maxVal) maxVal = val;
        }
      }
      const key = `${prefix}-2569`;
      await this.prisma.sequence.upsert({
        where: { key },
        create: { key, value: maxVal },
        update: {},
      });
      const current = await this.prisma.sequence.findUnique({ where: { key } });
      if (current && current.value < maxVal) {
        await this.prisma.sequence.update({ where: { key }, data: { value: maxVal } });
      }
      this.seq[prefix] = Math.max(this.seq[prefix], maxVal);
    }
  }

  /** ล้างข้อมูลใน PostgreSQL และ Seed ข้อมูลตัวอย่างเริ่มต้นใหม่ทั้งหมด */
  async reset() {
    this.accounts = clone(mockAccounts);
    this.venues = clone(mockVenues);
    this.equipment = clone(mockEquipment);
    this.requests = clone(mockRequests);
    this.notifications = clone(mockNotifications);
    this.activities = clone(mockActivities);
    this.handovers = [];
    await this.seedDatabase(true);
    await this.loadFromDatabase();
  }

  /** ล้างเฉพาะข้อมูลคำขอและประวัติ (requests, handovers, notifications, activities, sessions) */
  async clearTransactions() {
    await this.prisma.$transaction([
      this.prisma.session.deleteMany(),
      this.prisma.handoverRecord.deleteMany(),
      this.prisma.signatureRecord.deleteMany(),
      this.prisma.requestItem.deleteMany(),
      this.prisma.requestPeriod.deleteMany(),
      this.prisma.requestVenue.deleteMany(),
      this.prisma.request.deleteMany(),
      this.prisma.notification.deleteMany(),
      this.prisma.activityLog.deleteMany(),
      this.prisma.sequence.deleteMany(),
    ]);
    this.requests = [];
    this.notifications = [];
    this.activities = [];
    this.handovers = [];
    this.seq = { BK: 0, BR: 0, RP: 0, n: 0, l: 0, u: this.accounts.length, v: this.venues.length, e: this.equipment.length };
  }

  toPublic(a: Account): PublicAccount {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, pin, ...rest } = a;
    return { ...rest, hasPin: !!pin };
  }

  async notify(userId: string, title: string, body: string, link?: string) {
    const id = await this.nextId('n');
    const item: AppNotification = {
      id,
      userId,
      title,
      body,
      link,
      at: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(item);
    void this.prisma.notification
      .create({
        data: {
          id: item.id,
          userId: item.userId,
          title: item.title,
          body: item.body,
          read: item.read,
          link: item.link ?? null,
          createdAt: new Date(item.at),
        },
      })
      .catch((err) => this.logger.error('Failed to persist notification', err));
  }

  notifyRole(role: Account['role'], title: string, body: string, link?: string) {
    this.accounts.filter((a) => a.role === role).forEach((a) => void this.notify(a.id, title, body, link));
  }

  markAllNotificationsRead(userId: string) {
    this.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));
    void this.prisma.notification
      .updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
      .catch((err) => this.logger.error('Failed to mark notifications read', err));
  }

  async log(
    kind: ActivityLog['kind'],
    title: string,
    detail: string,
    actor?: { id?: string; name?: string; role?: Role; ip?: string },
  ) {
    const id = await this.nextId('l');
    const entry: ActivityLog = {
      id,
      kind,
      title,
      detail,
      actorId: actor?.id,
      actorName: actor?.name,
      actorRole: actor?.role,
      ip: actor?.ip,
      at: new Date().toISOString(),
    };
    this.activities.unshift(entry);
    void this.prisma.activityLog
      .create({
        data: {
          id: entry.id,
          kind: entry.kind,
          title: entry.title,
          detail: entry.detail,
          actorId: entry.actorId ?? null,
          actorName: entry.actorName ?? null,
          actorRole: entry.actorRole ?? null,
          ip: entry.ip ?? null,
          createdAt: new Date(entry.at),
        },
      })
      .catch((err) => this.logger.error('Failed to persist activity log', err));
  }

  // ===================== Persistence Helpers =====================

  async persistAccount(a: Account) {
    await this.prisma.account.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        username: a.username,
        password: a.password,
        name: a.name,
        nickname: a.nickname,
        initial: a.initial,
        role: a.role,
        position: a.position,
        department: a.department,
        phone: a.phone,
        lineName: a.lineName ?? null,
        permissions: a.permissions as unknown as Prisma.InputJsonValue,
        signature: a.signature ?? null,
        pin: a.pin ?? null,
        isDemo: a.isDemo ?? false,
        active: a.active ?? true,
        createdAt: new Date(a.createdAt),
      },
      update: {
        username: a.username,
        password: a.password,
        name: a.name,
        nickname: a.nickname,
        initial: a.initial,
        role: a.role,
        position: a.position,
        department: a.department,
        phone: a.phone,
        lineName: a.lineName ?? null,
        permissions: a.permissions as unknown as Prisma.InputJsonValue,
        signature: a.signature ?? null,
        pin: a.pin ?? null,
        isDemo: a.isDemo ?? false,
        active: a.active ?? true,
      },
    });
  }

  async persistVenue(v: Venue) {
    await this.prisma.venue.upsert({
      where: { id: v.id },
      create: {
        id: v.id,
        name: v.name,
        type: v.type,
        building: v.building,
        floor: v.floor,
        capacity: v.capacity,
        status: v.status,
        enabled: v.enabled,
        facilities: v.facilities,
        openTime: v.openTime,
        closeTime: v.closeTime,
        openDays: v.openDays,
        advanceDays: v.advanceDays,
        formName: v.formName,
        approvalLevels: v.approvalLevels,
      },
      update: {
        name: v.name,
        type: v.type,
        building: v.building,
        floor: v.floor,
        capacity: v.capacity,
        status: v.status,
        enabled: v.enabled,
        facilities: v.facilities,
        openTime: v.openTime,
        closeTime: v.closeTime,
        openDays: v.openDays,
        advanceDays: v.advanceDays,
        formName: v.formName,
        approvalLevels: v.approvalLevels,
      },
    });
  }

  async persistEquipment(e: Equipment) {
    await this.prisma.equipment.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        name: e.name,
        category: e.category,
        stock: e.stock,
        enabled: e.enabled,
      },
      update: {
        name: e.name,
        category: e.category,
        stock: e.stock,
        enabled: e.enabled,
      },
    });
  }

  async persistRequest(r: AnyRequest) {
    const commonData = {
      code: r.code,
      type: r.type,
      status: r.status,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      organization: r.organization,
      requesterSignature: r.requesterSignature ?? null,
      writtenAt: r.writtenAt ?? null,
      requesterPosition: r.requesterPosition ?? null,
      addressHouseNo: r.addressHouseNo ?? null,
      addressMoo: r.addressMoo ?? null,
      addressSubdistrict: r.addressSubdistrict ?? null,
      addressDistrict: r.addressDistrict ?? null,
      addressProvince: r.addressProvince ?? null,
      purposeItems: r.purposeItems ? (r.purposeItems as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      purpose: r.type === 'booking' || r.type === 'borrow' ? r.purpose : null,
      activity: r.type === 'booking' ? r.activity : null,
      attendees: r.type === 'booking' ? r.attendees : null,
      attachments: r.type === 'booking' || r.type === 'borrow' ? r.attachments : [],
      pickupDate: r.type === 'borrow' ? new Date(`${r.pickupDate}T00:00:00.000Z`) : null,
      returnDate: r.type === 'borrow' ? new Date(`${r.returnDate}T00:00:00.000Z`) : null,
      returnRequestedAt: r.type === 'borrow' && r.returnRequestedAt ? new Date(r.returnRequestedAt) : null,
      returnedAt: r.type === 'borrow' && r.returnedAt ? new Date(r.returnedAt) : null,
      repairBuilding: r.type === 'repair' ? r.building : null,
      repairFloor: r.type === 'repair' ? r.floor : null,
      repairLocation: r.type === 'repair' ? r.location : null,
      repairCategory: r.type === 'repair' ? r.category : null,
      repairDetail: r.type === 'repair' ? r.detail : null,
      repairPhotos: r.type === 'repair' ? r.photos : null,
      repairResolution: r.type === 'repair' ? r.resolution ?? null : null,
      repairStaffSignature: r.type === 'repair' ? r.staffSignature ?? null : null,
      repairStaffSignerName: r.type === 'repair' ? r.staffSignerName ?? null : null,
      repairAcceptSignature: r.type === 'repair' ? r.acceptanceSignature ?? null : null,
      repairAcceptedAt: r.type === 'repair' && r.acceptedAt ? new Date(r.acceptedAt) : null,
      repairStartedAt: r.type === 'repair' && r.startedAt ? new Date(r.startedAt) : null,
      repairFinishedAt: r.type === 'repair' && r.finishedAt ? new Date(r.finishedAt) : null,
      repairAcceptedByReqAt:
        r.type === 'repair' && r.acceptedByRequesterAt ? new Date(r.acceptedByRequesterAt) : null,
      createdByStaffId: r.createdByStaffId ?? null,
      createdByStaffSignature: r.createdByStaffSignature ?? null,
      rejectReason: r.rejectReason ?? null,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.request.upsert({
        where: { id: r.id },
        create: { id: r.id, ...commonData },
        update: commonData,
      });

      if (r.type === 'booking') {
        await tx.requestVenue.deleteMany({ where: { requestId: r.id } });
        if (r.venueIds.length > 0) {
          await tx.requestVenue.createMany({
            data: r.venueIds.map((venueId) => ({ requestId: r.id, venueId })),
            skipDuplicates: true,
          });
        }

        await tx.requestPeriod.deleteMany({ where: { requestId: r.id } });
        const periodRows: Prisma.RequestPeriodCreateManyInput[] = r.periods.map((p, idx) => ({
          requestId: r.id,
          kind: 'current',
          sortOrder: idx,
          startTime: new Date(p.start),
          endTime: new Date(p.end),
        }));
        if (r.rescheduleTo?.length) {
          r.rescheduleTo.forEach((p, idx) => {
            periodRows.push({
              requestId: r.id,
              kind: 'reschedule',
              sortOrder: idx,
              startTime: new Date(p.start),
              endTime: new Date(p.end),
            });
          });
        }
        if (periodRows.length > 0) {
          await tx.requestPeriod.createMany({ data: periodRows });
        }
      }

      if (r.type === 'booking' || r.type === 'borrow') {
        await tx.requestItem.deleteMany({ where: { requestId: r.id } });
        const itemList = r.type === 'booking' ? r.extraItems : r.items;
        if (itemList.length > 0) {
          await tx.requestItem.createMany({
            data: itemList.map((it) => ({
              requestId: r.id,
              equipmentId: it.equipmentId,
              qty: it.qty,
            })),
          });
        }

        // รักษาร่องรอยและหลักฐานการลงนาม (Audit Trail) โดยไม่อนุญาตให้ deleteMany ทิ้ง
        if (r.signatures.length > 0) {
          for (const s of r.signatures) {
            await tx.signatureRecord.upsert({
              where: {
                requestId_level: {
                  requestId: r.id,
                  level: s.level,
                },
              },
              create: {
                requestId: r.id,
                level: s.level,
                signerId: s.signerId,
                signerName: s.signerName,
                title: s.title,
                decision: s.decision,
                signature: s.signature ?? null,
                note: s.note ?? null,
                signedAt: new Date(s.at),
              },
              update: {
                signerId: s.signerId,
                signerName: s.signerName,
                title: s.title,
                decision: s.decision,
                signature: s.signature ?? null,
                note: s.note ?? null,
                signedAt: new Date(s.at),
              },
            });
          }
        }
      }
    });
  }

  async persistHandover(h: HandoverRecord) {
    await this.prisma.handoverRecord.upsert({
      where: {
        requestId_phase: {
          requestId: h.requestId,
          phase: h.phase,
        },
      },
      create: {
        requestId: h.requestId,
        phase: h.phase,
        checklist: h.items as unknown as Prisma.InputJsonValue,
        note: h.note,
        staffId: h.staffId,
        staffName: h.staffName ?? null,
        citizenSignature: h.citizenSignature ?? null,
        staffSignature: h.staffSignature ?? null,
        createdAt: new Date(h.at),
      },
      update: {
        checklist: h.items as unknown as Prisma.InputJsonValue,
        note: h.note,
        staffId: h.staffId,
        staffName: h.staffName ?? null,
        citizenSignature: h.citizenSignature ?? null,
        staffSignature: h.staffSignature ?? null,
        createdAt: new Date(h.at),
      },
    });
  }

  // ===================== Seed & Hydrate =====================

  async seedDatabase(forceClear = false) {
    if (forceClear) {
      await this.prisma.$transaction([
        this.prisma.handoverRecord.deleteMany(),
        this.prisma.signatureRecord.deleteMany(),
        this.prisma.requestItem.deleteMany(),
        this.prisma.requestPeriod.deleteMany(),
        this.prisma.requestVenue.deleteMany(),
        this.prisma.request.deleteMany(),
        this.prisma.notification.deleteMany(),
        this.prisma.activityLog.deleteMany(),
        this.prisma.venue.deleteMany(),
        this.prisma.equipment.deleteMany(),
        this.prisma.account.deleteMany(),
      ]);
    }

    for (const a of mockAccounts) {
      const hashedPassword = a.password.startsWith('$argon2') ? a.password : await hashSecret(a.password);
      const hashedPin = a.pin ? (a.pin.startsWith('$argon2') ? a.pin : await hashSecret(a.pin)) : null;
      await this.persistAccount({ ...a, password: hashedPassword, pin: hashedPin });
    }
    for (const v of mockVenues) {
      await this.persistVenue(v);
    }
    for (const e of mockEquipment) {
      await this.persistEquipment(e);
    }
    for (const r of mockRequests) {
      await this.persistRequest(r);
    }
    for (const n of mockNotifications) {
      await this.prisma.notification.upsert({
        where: { id: n.id },
        create: {
          id: n.id,
          userId: n.userId,
          title: n.title,
          body: n.body,
          read: n.read,
          link: n.link ?? null,
          createdAt: new Date(n.at),
        },
        update: {
          title: n.title,
          body: n.body,
          read: n.read,
          link: n.link ?? null,
        },
      });
    }
    for (const act of mockActivities) {
      await this.prisma.activityLog.upsert({
        where: { id: act.id },
        create: {
          id: act.id,
          kind: act.kind,
          title: act.title,
          detail: act.detail,
          createdAt: new Date(act.at),
        },
        update: {
          kind: act.kind,
          title: act.title,
          detail: act.detail,
        },
      });
    }
  }

  async loadFromDatabase() {
    const [dbAccounts, dbVenues, dbEquipment, dbRequests, dbNotifications, dbActivities, dbHandovers] =
      await Promise.all([
        this.prisma.account.findMany({ orderBy: { createdAt: 'asc' } }),
        this.prisma.venue.findMany({ orderBy: { createdAt: 'asc' } }),
        this.prisma.equipment.findMany({ orderBy: { createdAt: 'asc' } }),
        this.prisma.request.findMany({
          include: {
            venues: true,
            periods: { orderBy: { sortOrder: 'asc' } },
            items: true,
            signatures: { orderBy: { signedAt: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
        this.prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' } }),
        this.prisma.handoverRecord.findMany({ orderBy: { createdAt: 'asc' } }),
      ]);

    this.accounts = dbAccounts.map((a) => ({
      id: a.id,
      username: a.username,
      password: a.password,
      name: a.name,
      nickname: a.nickname,
      initial: a.initial,
      role: a.role,
      position: a.position,
      department: a.department,
      phone: a.phone,
      lineName: a.lineName ?? undefined,
      permissions:
        a.permissions && typeof a.permissions === 'object'
          ? (a.permissions as Record<PermissionKey, boolean>)
          : { ...DEFAULT_PERMISSIONS[a.role] },
      signature: a.signature,
      pin: a.pin,
      isDemo: a.isDemo,
      active: a.active,
      createdAt: a.createdAt.toISOString(),
    }));

    this.venues = dbVenues.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      building: v.building,
      floor: v.floor,
      capacity: v.capacity,
      status: v.status,
      enabled: v.enabled,
      facilities: v.facilities,
      openTime: v.openTime,
      closeTime: v.closeTime,
      openDays: v.openDays,
      advanceDays: v.advanceDays,
      formName: v.formName,
      approvalLevels: v.approvalLevels,
    }));

    this.equipment = dbEquipment.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      stock: e.stock,
      enabled: e.enabled,
    }));

    this.requests = dbRequests.map((r): AnyRequest => {
      const base = {
        id: r.id,
        code: r.code,
        status: r.status,
        requesterId: r.requesterId,
        requesterName: r.requesterName,
        organization: r.organization,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        requesterSignature: r.requesterSignature ?? undefined,
        createdByStaffId: r.createdByStaffId ?? undefined,
        createdByStaffSignature: r.createdByStaffSignature ?? undefined,
        rejectReason: r.rejectReason ?? undefined,
        writtenAt: r.writtenAt ?? undefined,
        requesterPosition: r.requesterPosition ?? undefined,
        addressHouseNo: r.addressHouseNo ?? undefined,
        addressMoo: r.addressMoo ?? undefined,
        addressSubdistrict: r.addressSubdistrict ?? undefined,
        addressDistrict: r.addressDistrict ?? undefined,
        addressProvince: r.addressProvince ?? undefined,
        purposeItems: Array.isArray(r.purposeItems)
          ? (r.purposeItems as unknown as OfficialFormPurposeItem[])
          : undefined,
      };

      const signatures = r.signatures.map((s) => ({
        level: s.level,
        signerId: s.signerId,
        signerName: s.signerName,
        title: s.title,
        at: s.signedAt.toISOString(),
        decision: s.decision,
        signature: s.signature ?? undefined,
        note: s.note ?? undefined,
      }));

      if (r.type === 'booking') {
        const currentPeriods = r.periods
          .filter((p) => p.kind === 'current')
          .map((p) => ({ start: p.startTime.toISOString(), end: p.endTime.toISOString() }));
        const reschedulePeriods = r.periods
          .filter((p) => p.kind === 'reschedule')
          .map((p) => ({ start: p.startTime.toISOString(), end: p.endTime.toISOString() }));

        const booking: BookingRequest = {
          ...base,
          type: 'booking',
          venueIds: r.venues.map((v) => v.venueId),
          periods: currentPeriods,
          rescheduleTo: reschedulePeriods.length > 0 ? reschedulePeriods : undefined,
          attendees: r.attendees ?? 30,
          activity: r.activity ?? '',
          purpose: r.purpose ?? '',
          attachments: r.attachments,
          extraItems: r.items.map((i) => ({ equipmentId: i.equipmentId, qty: i.qty })),
          signatures,
        };
        return booking;
      }

      if (r.type === 'borrow') {
        const borrow: BorrowRequest = {
          ...base,
          type: 'borrow',
          items: r.items.map((i) => ({ equipmentId: i.equipmentId, qty: i.qty })),
          pickupDate: r.pickupDate ? r.pickupDate.toISOString().slice(0, 10) : '2026-10-22',
          returnDate: r.returnDate ? r.returnDate.toISOString().slice(0, 10) : '2026-10-25',
          purpose: r.purpose ?? '',
          attachments: r.attachments,
          signatures,
          returnRequestedAt: r.returnRequestedAt ? r.returnRequestedAt.toISOString() : undefined,
          returnedAt: r.returnedAt ? r.returnedAt.toISOString() : undefined,
        };
        return borrow;
      }

      const repair: RepairRequest = {
        ...base,
        type: 'repair',
        building: r.repairBuilding ?? 'อาคารสำนักงาน',
        floor: r.repairFloor ?? 'ชั้น 1',
        location: r.repairLocation ?? 'ทั่วไป',
        category: r.repairCategory ?? 'อื่น ๆ',
        detail: r.repairDetail ?? '',
        photos: r.repairPhotos ?? 0,
        acceptedAt: r.repairAcceptedAt ? r.repairAcceptedAt.toISOString() : undefined,
        startedAt: r.repairStartedAt ? r.repairStartedAt.toISOString() : undefined,
        finishedAt: r.repairFinishedAt ? r.repairFinishedAt.toISOString() : undefined,
        resolution: r.repairResolution ?? undefined,
        staffSignature: r.repairStaffSignature ?? undefined,
        staffSignerName: r.repairStaffSignerName ?? undefined,
        acceptanceSignature: r.repairAcceptSignature ?? undefined,
        acceptedByRequesterAt: r.repairAcceptedByReqAt ? r.repairAcceptedByReqAt.toISOString() : undefined,
      };
      return repair;
    });

    this.notifications = dbNotifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      body: n.body,
      at: n.createdAt.toISOString(),
      read: n.read,
      link: n.link ?? undefined,
    }));

    this.activities = dbActivities.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      detail: a.detail,
      actorId: a.actorId ?? undefined,
      actorName: a.actorName ?? undefined,
      actorRole: a.actorRole ?? undefined,
      ip: a.ip ?? undefined,
      at: a.createdAt.toISOString(),
    }));

    this.handovers = dbHandovers.map((h) => ({
      requestId: h.requestId,
      phase: h.phase,
      items: Array.isArray(h.checklist) ? (h.checklist as { label: string; ok: boolean }[]) : [],
      note: h.note,
      at: h.createdAt.toISOString(),
      staffId: h.staffId,
      staffName: h.staffName ?? undefined,
      citizenSignature: h.citizenSignature ?? undefined,
      staffSignature: h.staffSignature ?? undefined,
    }));

    await this.syncSequences();
    await this.cleanExpiredSessions();
  }
}
