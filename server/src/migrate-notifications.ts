import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  await p.$executeRawUnsafe(`ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "sender_id" INTEGER REFERENCES "user"("id")`);
  await p.$executeRawUnsafe(`ALTER TABLE "notification" ALTER COLUMN "user_id" DROP NOT NULL`);
  console.log('Notification schema updated');
  await p.$disconnect();
}
main();
