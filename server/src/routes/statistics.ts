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

    // All count queries in parallel for speed (OrderStatus enum: PENDING/ASSIGNED/PROCESSING/COMPLETED/CLOSED/CANCELLED)
    const [total, pending, assigned, processing, completed, closed, cancelled] = await Promise.all([
      prisma.workOrder.count({ where: baseWhere }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'PENDING' } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'ASSIGNED' } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'PROCESSING' } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'CLOSED' } }),
      prisma.workOrder.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    ]);

    // Status breakdown for charts (exclude zero-count statuses)
    const statusBreakdown = [
      { name: '待处理', value: pending },
      { name: '已派单', value: assigned },
      { name: '处理中', value: processing },
      { name: '已完成', value: completed },
      { name: '已关闭', value: closed },
      { name: '已取消', value: cancelled },
    ].filter((s) => s.value > 0);

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

    success(res, {
      total,
      pending,
      processing: processing + assigned, // backward compat
      completed,
      statusBreakdown,
      todos,
    });
  } catch (err: any) {
    fail(res, err.message);
  }
});

// GET /statistics/trend - 7 day trend + monthly trend + category distribution
router.get('/trend', async (req: AuthRequest, res: Response) => {
  try {
    const { role, userId } = req.user!;

    const baseWhere: any = {};
    if (role === 'STU') baseWhere.submitterId = userId;
    if (role === 'WRK') baseWhere.assigneeId = userId;

    /* ── 7-day daily trend (all 7 queries in parallel) ── */
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const dailyCounts = await Promise.all(
      dates.map((date) => {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        return prisma.workOrder.count({
          where: { ...baseWhere, createdAt: { gte: new Date(date), lt: next } },
        });
      })
    );
    const dailyTrend = dates.map((date, i) => ({ date, count: dailyCounts[i] }));

    /* ── 6-month monthly trend (all 6 queries in parallel) ── */
    const monthStarts: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      monthStarts.push(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    const monthlyCounts = await Promise.all(
      monthStarts.map((start) => {
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return prisma.workOrder.count({
          where: { ...baseWhere, createdAt: { gte: start, lt: end } },
        });
      })
    );
    const monthlyTrend = monthStarts.map((d, i) => ({
      month: `${d.getMonth() + 1}月`,
      count: monthlyCounts[i],
    }));

    /* ── Category distribution ── */
    const categoryRaw = await prisma.workOrder.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { category: true },
    });
    const categories = categoryRaw
      .map((c) => ({ name: c.category || '其他', value: c._count.category }))
      .sort((a, b) => b.value - a.value);

    success(res, { trend: dailyTrend, monthlyTrend, categories });
  } catch (err: any) {
    fail(res, err.message);
  }
});

export default router;
