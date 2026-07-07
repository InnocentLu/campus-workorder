import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding login security columns...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "login_attempts" INTEGER NOT NULL DEFAULT 0`);
    console.log('  ✓ login_attempts added');
  } catch (e: any) {
    if (e.message?.includes('already exists')) console.log('  (skipped) login_attempts already exists');
    else console.error('  ✗', e.message);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lock_until" TIMESTAMP(3)`);
    console.log('  ✓ lock_until added');
  } catch (e: any) {
    if (e.message?.includes('already exists')) console.log('  (skipped) lock_until already exists');
    else console.error('  ✗', e.message);
  }
  console.log('Migration complete!');
  await prisma.$disconnect();
}

main();
