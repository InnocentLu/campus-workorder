import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { success, fail, paginated } from '../utils/response';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(auth);

// Generate unique order number
function generateOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WO${date}${rand}`;
}

// POST /orders - submit work order (STU/TCH)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      category: z.string().min(1),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      location: z.string().optional(),
      contactPhone: z.string().optional(),
      scheduledTime: z.string().optional(),
      images: z.array(z.string()).optional(),
    });
    const body = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    const order = await prisma.workOrder.create({
      data: {
        orderNo: generateOrderNo(),
        ...body,
        scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : undefined,
        submitterId: req.user!.userId,
        submitterRole: req.user!.role,
        submitterName: user?.realName || '',
        images: body.images || [],
      },
    });

    // Log
    await prisma.orderLog.create({
      data: { orderId: order.id, operatorId: req.user!.userId, action: 'SUBMIT', remark: '提交工单' },
    });

    success(res, order, '工单提交成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// GET /orders - list (role-based)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const { role, userId } = req.user!;
    const { status, category, priority, keyword } = req.query;

    const where: any = {};
    if (status) where.status = status as string;
    if (category) where.category = category as string;
    if (priority) where.priority = priority as string;
    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword as string } },
        { title: { contains: keyword as string } },
      ];
    }

    // Role-based data filtering
    switch (role) {
      case 'STU':
        where.submitterId = userId;
        break;
      case 'TCH':
        // Teachers see orders from their department
        const teacher = await prisma.user.findUnique({ where: { id: userId } });
        if (teacher?.department) {
          where.submitter = { department: teacher.department };
        }
        break;
      case 'WRK':
        // Workers see assigned + completed orders
        where.OR = [
          { assigneeId: userId },
          { status: 'PENDING' },
        ];
        // Simplify for worker: mainly assigned to them
        where.assigneeId = userId;
        break;
      // ADM sees all - no extra filter
    }

    const [list, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: { select: { id: true, realName: true, username: true, role: true } },
          assignee: { select: { id: true, realName: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    paginated(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, err.message);
  }
});

// GET /orders/:id - detail
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        submitter: { select: { id: true, realName: true, username: true, role: true, phone: true } },
        assignee: { select: { id: true, realName: true, username: true, role: true, phone: true } },
        assigner: { select: { id: true, realName: true } },
        repairRecords: {
          include: { handler: { select: { id: true, realName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        orderLogs: {
          include: { operator: { select: { id: true, realName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) return fail(res, '工单不存在', 404);
    success(res, order);
  } catch (err: any) {
    fail(res, err.message);
  }
});

// PUT /orders/:id/assign - admin assigns to worker
router.put('/:id/assign', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({ assigneeId: z.number() });
    const { assigneeId } = schema.parse(req.body);

    const order = await prisma.workOrder.update({
      where: { id },
      data: {
        assigneeId,
        assignerId: req.user!.userId,
        status: 'ASSIGNED',
      },
    });

    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'ASSIGN', remark: `派单给工人 #${assigneeId}` },
    });

    // Notify worker
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: 'ORDER_ASSIGNED',
        title: '新工单指派',
        content: `工单 #${order.orderNo} 已分配给你`,
        link: `/orders/${id}`,
      },
    });

    success(res, order, '派单成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// PUT /orders/:id/accept - worker accepts
router.put('/:id/accept', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.workOrder.update({
      where: { id },
      data: { status: 'PROCESSING', acceptedAt: new Date() },
    });
    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'ACCEPT', remark: '接单' },
    });
    success(res, order, '接单成功');
  } catch (err: any) {
    fail(res, err.message);
  }
});

// PUT /orders/:id/process - start processing
router.put('/:id/process', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.workOrder.update({
      where: { id },
      data: { status: 'PROCESSING', processingAt: new Date() },
    });
    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'PROCESS', remark: '开始处理' },
    });
    success(res, order, '开始处理');
  } catch (err: any) {
    fail(res, err.message);
  }
});

// PUT /orders/:id/complete - complete with repair record
router.put('/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({
      content: z.string().min(1),
      cost: z.number().optional(),
      usedParts: z.string().optional(),
      images: z.array(z.string()).optional(),
    });
    const body = schema.parse(req.body);

    const [order] = await Promise.all([
      prisma.workOrder.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      prisma.repairRecord.create({
        data: {
          orderId: id,
          content: body.content,
          cost: body.cost || 0,
          usedParts: body.usedParts,
          handlerId: req.user!.userId,
          images: body.images || [],
        },
      }),
      prisma.orderLog.create({
        data: { orderId: id, operatorId: req.user!.userId, action: 'COMPLETE', remark: '维修完成' },
      }),
    ]);

    // Notify submitter
    await prisma.notification.create({
      data: {
        userId: order.submitterId,
        type: 'ORDER_COMPLETED',
        title: '工单已完成',
        content: `工单 #${order.orderNo} 维修完成，请评价`,
        link: `/orders/${id}`,
      },
    });

    success(res, order, '维修完成');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// PUT /orders/:id/rating - submitter rates
router.put('/:id/rating', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({
      rating: z.number().min(1).max(5),
      feedback: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const order = await prisma.workOrder.update({
      where: { id },
      data: { rating: body.rating, feedback: body.feedback, status: 'CLOSED', closedAt: new Date() },
    });
    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'RATE', remark: `评价 ${body.rating} 星` },
    });
    success(res, order, '评价成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// PUT /orders/:id/cancel
router.put('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.workOrder.update({
      where: { id },
      data: { status: 'CANCELLED', closedAt: new Date() },
    });
    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'CANCEL', remark: '取消工单' },
    });
    success(res, order, '工单已取消');
  } catch (err: any) {
    fail(res, err.message);
  }
});

export default router;
