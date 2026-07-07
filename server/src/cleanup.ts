import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up test/demo users...');

  // Delete users whose username contains test, demo, or temp
  const testPatterns = ['test', 'demo', 'temp'];
  let deleted = 0;

  for (const pattern of testPatterns) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: pattern } },
          { email: { contains: pattern } },
        ],
      },
      select: { id: true, username: true },
    });

    for (const u of users) {
      // Delete related records first
      await prisma.orderLog.deleteMany({ where: { operatorId: u.id } });
      await prisma.notification.deleteMany({ where: { userId: u.id } });
      await prisma.repairRecord.deleteMany({ where: { handlerId: u.id } });
      await prisma.workOrder.updateMany({ where: { assigneeId: u.id }, data: { assigneeId: null } });
      await prisma.workOrder.updateMany({ where: { assignerId: u.id }, data: { assignerId: null } });
      await prisma.workOrder.deleteMany({ where: { submitterId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`  Deleted: ${u.username}`);
      deleted++;
    }
  }

  console.log(`\nCleanup complete! Deleted ${deleted} test users.`);

  // Show remaining users
  const remaining = await prisma.user.findMany({ select: { username: true, role: true } });
  console.log('\nRemaining users:');
  remaining.forEach((u) => console.log(`  ${u.username} (${u.role})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
