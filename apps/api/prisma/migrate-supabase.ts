import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load apps/api/.env if DATABASE_URL not set
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (m) {
        const key = m[1];
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

const prisma = new PrismaClient();

async function runSqlFile(filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = sql
    .split(/;\s*\r?\n/)
    .map((s) => s.replace(/--.*$/gm, '').trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore already exists errors if re-running
      if (msg.includes('already exists') || msg.includes('42710') || msg.includes('42P07') || msg.includes('42701')) {
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  console.log('🔌 Connecting to Supabase PostgreSQL...');
  await prisma.$connect();
  console.log('✅ Connected to Supabase!');

  const mig1 = path.resolve(__dirname, 'migrations/20261026091613_init/migration.sql');
  const mig2 = path.resolve(__dirname, 'migrations/20261028080000_add_sessions_sequences_otp_sod_audit/migration.sql');

  console.log('📦 Applying migration 1 (init)...');
  await runSqlFile(mig1);
  console.log('📦 Applying migration 2 (sessions, sequences, otp, audit)...');
  await runSqlFile(mig2);

  console.log('📦 Applying account address columns...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "accounts"
      ADD COLUMN IF NOT EXISTS "address_house_no" TEXT,
      ADD COLUMN IF NOT EXISTS "address_moo" TEXT,
      ADD COLUMN IF NOT EXISTS "address_subdistrict" TEXT,
      ADD COLUMN IF NOT EXISTS "address_district" TEXT,
      ADD COLUMN IF NOT EXISTS "address_province" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "accounts"
    SET "address_house_no" = '124/5',
        "address_moo" = '3',
        "address_subdistrict" = 'น้ำชำ',
        "address_district" = 'สูงเม่น',
        "address_province" = 'แพร่'
    WHERE "id" = 'u-somchai' AND "address_house_no" IS NULL;
  `);

  console.log('✨ Schema applied to Supabase successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

