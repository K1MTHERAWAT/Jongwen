import { PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/auth/secret';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Migrating existing accounts to argon2 hashes...');
  const accounts = await prisma.account.findMany();
  let updatedCount = 0;

  for (const acc of accounts) {
    const needsPasswordHash = acc.password && !acc.password.startsWith('$argon2');
    const needsPinHash = acc.pin && !acc.pin.startsWith('$argon2');

    if (!needsPasswordHash && !needsPinHash) {
      console.log(`⏩ Skipping ${acc.username} (already hashed)`);
      continue;
    }

    const newPassword = needsPasswordHash ? await hashSecret(acc.password) : acc.password;
    const newPin = needsPinHash ? await hashSecret(acc.pin!) : acc.pin;

    await prisma.account.update({
      where: { id: acc.id },
      data: {
        password: newPassword,
        pin: newPin,
      },
    });

    updatedCount += 1;
    console.log(`✅ Hashed credentials for account: ${acc.username}`);
  }

  console.log(`🎉 Finished! Updated ${updatedCount} / ${accounts.length} accounts.`);
}

main()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
