import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, fail } from '../utils/response';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(auth);

// GET /statistics/overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const { role, userId } = req.user!;

    const baseWhere: any = {};
    if (role === 'STU') baseWhere.submitterId = userId;
    if (role === 'WRK') baseWhere.assigneeId = userId;

    const [total, pending, processing, completed] = await Promise.all([
      prisma.workOrder.count({ where: baseWhere }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'PENDING' } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: { in: ['ASSIGNED', 'PROCESSING'] } } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    ]);

    // Pending tasks for current user
    let todos: any[] = [];
    if (role === 'WRK') {
      todos = await prisma.workOrder.findMany({
        where: { assigneeId: userId, status: { in: ['ASSIGNED', 'PROCESSING'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNo: true, title: true, status: true, priority: true, createdAt: true },
      });
    } else if (role === 'ADM') {
      todos = await prisma.workOrder.findMany({
        where: { status: 'PENDING' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNo: true, title: true, status: true, priority: true, createdAt: true },
      });
    }

    success(res, { total, pending, processing, completed, todos });
  } catch (err: any) {
    fail(res, err.message);
  }
});

// GET /statistics/trend - 7 day trend
router.get('/trend', async (req: AuthRequest, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const baseWhere: any = {};
    if (role === 'STU') baseWhere.submitterId = userId;
    if (role === 'WRK') baseWhere.assigneeId = userId;

    const result = [];
    for (const date of dates) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const count = await prisma.workOrder.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(date),
            lt: next,
          },
        },
      });
      result.push({ date, count });
    }

    success(res, result);
  } catch (err: any) {
    fail(res, err.message);
  }
});

export default router;
