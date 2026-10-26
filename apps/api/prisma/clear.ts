import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing mock requests, handovers, signatures, notifications, and activity logs...');

  await prisma.$transaction([
    prisma.handoverRecord.deleteMany(),
    prisma.signatureRecord.deleteMany(),
    prisma.requestItem.deleteMany(),
    prisma.requestPeriod.deleteMany(),
    prisma.requestVenue.deleteMany(),
    prisma.request.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.activityLog.deleteMany(),
  ]);

  const [accountsCount, venuesCount, equipmentCount, requestsCount] = await Promise.all([
    prisma.account.count(),
    prisma.venue.count(),
    prisma.equipment.count(),
    prisma.request.count(),
  ]);

  console.log('✅ Cleared all request & history transactions successfully!');
  console.log(`📊 Current DB state:`);
  console.log(`   - Accounts:   ${accountsCount} (preserved for login)`);
  console.log(`   - Venues:     ${venuesCount} (preserved)`);
  console.log(`   - Equipment:  ${equipmentCount} (preserved)`);
  console.log(`   - Requests:   ${requestsCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Clear error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
