import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      role: 'ADM',
      phone: '13800000001',
      department: '信息中心',
    },
  });
  console.log('  - Admin: admin / 123456');

  // Create a worker
  await prisma.user.upsert({
    where: { username: 'worker1' },
    update: {},
    create: {
      username: 'worker1',
      password: hashedPassword,
      realName: '张师傅',
      role: 'WRK',
      phone: '13800000002',
      department: '后勤维修部',
      employeeId: 'EMP001',
    },
  });
  console.log('  - Worker: worker1 / 123456');

  // Create a teacher
  await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      password: hashedPassword,
      realName: '李老师',
      role: 'TCH',
      phone: '13800000003',
      department: '计算机学院',
      employeeId: 'TCH001',
    },
  });
  console.log('  - Teacher: teacher1 / 123456');

  // Create a student
  await prisma.user.upsert({
    where: { username: 'student1' },
    update: {},
    create: {
      username: 'student1',
      password: hashedPassword,
      realName: '王同学',
      role: 'STU',
      phone: '13800000004',
      department: '计算机学院',
      studentId: '2024001',
    },
  });
  console.log('  - Student: student1 / 123456');

  // Create some sample work orders
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  const worker = await prisma.user.findUnique({ where: { username: 'worker1' } });
  const student = await prisma.user.findUnique({ where: { username: 'student1' } });

  if (student && worker && admin) {
    const existingOrders = await prisma.workOrder.count();
    if (existingOrders === 0) {
      const orders = [
        {
          orderNo: 'WO20240701001',
          title: '宿舍空调不制冷',
          description: '3号楼501宿舍空调出风口温度不够低，需要检修',
          category: '空调',
          priority: 'HIGH' as const,
          status: 'COMPLETED' as const,
          submitterId: student.id,
          submitterRole: 'STU' as const,
          submitterName: student.realName,
          assigneeId: worker.id,
          assignerId: admin.id,
          location: '3号楼501',
          contactPhone: student.phone,
          acceptedAt: new Date('2024-07-02'),
          processingAt: new Date('2024-07-02'),
          completedAt: new Date('2024-07-02'),
          rating: 5,
          feedback: '维修很及时，师傅态度很好！',
        },
        {
          orderNo: 'WO20240705002',
          title: '教室投影仪故障',
          description: '教学楼A201教室投影仪无法正常显示',
          category: '网络',
          priority: 'URGENT' as const,
          status: 'ASSIGNED' as const,
          submitterId: student.id,
          submitterRole: 'STU' as const,
          submitterName: student.realName,
          assigneeId: worker.id,
          assignerId: admin.id,
          location: '教学楼A201',
          contactPhone: student.phone,
        },
        {
          orderNo: 'WO20240706003',
          title: '图书馆灯管损坏',
          description: '图书馆二楼阅览区3盏灯管不亮',
          category: '水电',
          priority: 'MEDIUM' as const,
          status: 'PENDING' as const,
          submitterId: student.id,
          submitterRole: 'STU' as const,
          submitterName: student.realName,
          location: '图书馆二楼',
          contactPhone: student.phone,
        },
      ];

      for (const o of orders) {
        await prisma.workOrder.create({ data: o });
      }
      console.log('  - 3 sample work orders created');
    }
  }

  console.log('\nSeeding completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
