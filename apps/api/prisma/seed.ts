import { PrismaClient, Prisma } from '@prisma/client';
import {
  mockAccounts,
  mockActivities,
  mockEquipment,
  mockNotifications,
  mockRequests,
  mockVenues,
} from '@jongwen/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Accounts
  for (const a of mockAccounts) {
    await prisma.account.upsert({
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
        active: a.active ?? true,
      },
    });
  }
  console.log(`✅ Seeded ${mockAccounts.length} accounts`);

  // 2. Venues
  for (const v of mockVenues) {
    await prisma.venue.upsert({
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
  console.log(`✅ Seeded ${mockVenues.length} venues`);

  // 3. Equipment
  for (const e of mockEquipment) {
    await prisma.equipment.upsert({
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
  console.log(`✅ Seeded ${mockEquipment.length} equipment`);

  // 4. Requests
  for (const r of mockRequests) {
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

    await prisma.$transaction(async (tx) => {
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

        await tx.signatureRecord.deleteMany({ where: { requestId: r.id } });
        if (r.signatures.length > 0) {
          await tx.signatureRecord.createMany({
            data: r.signatures.map((s) => ({
              requestId: r.id,
              level: s.level,
              signerId: s.signerId,
              signerName: s.signerName,
              title: s.title,
              decision: s.decision,
              signature: s.signature ?? null,
              note: s.note ?? null,
              signedAt: new Date(s.at),
            })),
          });
        }
      }
    });
  }
  console.log(`✅ Seeded ${mockRequests.length} requests`);

  // 5. Notifications
  for (const n of mockNotifications) {
    await prisma.notification.upsert({
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
  console.log(`✅ Seeded ${mockNotifications.length} notifications`);

  // 6. Activities
  for (const act of mockActivities) {
    await prisma.activityLog.upsert({
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
  console.log(`✅ Seeded ${mockActivities.length} activities`);

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
