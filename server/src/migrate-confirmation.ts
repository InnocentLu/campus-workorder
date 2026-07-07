import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  await p.$executeRawUnsafe(`ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "completion_requested_at" TIMESTAMP(3)`);
  await p.$executeRawUnsafe(`ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3)`);
  await p.$executeRawUnsafe(`ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "confirm_status" VARCHAR(20)`);
  await p.$executeRawUnsafe(`ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "reject_reason" TEXT`);
  console.log('Confirmation flow schema updated');
  await p.$disconnect();
}
main();
