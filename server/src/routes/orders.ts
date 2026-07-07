import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { success, fail, paginated } from '../utils/response';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { AuthRequest } from '../types';
import { createNotification, notifyOrderStakeholders } from '../services/notification';

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

// PUT /orders/:id/request-completion (WRK — request submitter to confirm)
router.put('/:id/request-completion', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) return fail(res, '工单不存在', 404);
    if (order.status !== 'PROCESSING') return fail(res, '当前状态不允许申请完成');
    if (order.assigneeId !== req.user!.userId) return fail(res, '只有当前维修工可以申请完成', 403);

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'PENDING_CONFIRM',
        completionRequestedAt: new Date(),
        confirmStatus: 'PENDING_CONFIRM',
      },
    });
    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'COMPLETION_REQUEST', remark: '维修完成，等待确认' },
    });
    // Notify submitter
    createNotification({
      userId: order.submitterId,
      senderId: req.user!.userId,
      type: 'CONFIRM_REQUEST',
      title: '工单待确认',
      content: `工单「${order.title}」维修已完成，请确认`,
      link: `/orders/${id}`,
    });
    success(res, updated, '已申请完成，等待确认');
  } catch (err: any) { fail(res, err.message); }
});

// PUT /orders/:id/confirm-completion (submitter — confirm or reject)
router.put('/:id/confirm-completion', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({
      action: z.enum(['confirm', 'reject']),
      rejectReason: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) return fail(res, '工单不存在', 404);
    if (order.status !== 'PENDING_CONFIRM') return fail(res, '当前状态不允许此操作');
    if (order.submitterId !== req.user!.userId) return fail(res, '只有提交人可以确认', 403);

    if (body.action === 'confirm') {
      const updated = await prisma.workOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          confirmStatus: 'CONFIRMED',
          confirmedAt: new Date(),
          completedAt: new Date(),
        },
      });
      await prisma.orderLog.create({
        data: { orderId: id, operatorId: req.user!.userId, action: 'CONFIRM', remark: '用户确认完成' },
      });
      notifyOrderStakeholders(id, {
        senderId: req.user!.userId,
        type: 'ORDER_STATUS',
        title: '工单已确认完成',
        content: `工单「${order.title}」已被确认完成`,
        link: `/orders/${id}`,
      });
      return success(res, updated, '工单已确认完成');
    } else {
      const updated = await prisma.workOrder.update({
        where: { id },
        data: {
          status: 'PROCESSING',
          confirmStatus: 'REJECTED',
          rejectReason: body.rejectReason,
        },
      });
      await prisma.orderLog.create({
        data: { orderId: id, operatorId: req.user!.userId, action: 'REJECT', remark: body.rejectReason || '用户退回，要求重新维修' },
      });
      notifyOrderStakeholders(id, {
        senderId: req.user!.userId,
        type: 'ORDER_STATUS',
        title: '工单被退回',
        content: body.rejectReason || '用户退回工单，请重新处理',
        link: `/orders/${id}`,
      });
      return success(res, updated, '工单已退回');
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// PUT /orders/:id/reassign (ADM — reassign worker)
router.put('/:id/reassign', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({ assigneeId: z.number() });
    const body = schema.parse(req.body);
    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) return fail(res, '工单不存在', 404);
    if (order.status === 'COMPLETED' || order.status === 'CLOSED' || order.status === 'CANCELLED') {
      return fail(res, '已完成/关闭的工单无法重新指派');
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: { assigneeId: body.assigneeId, assignerId: req.user!.userId, status: order.status === 'PENDING' ? 'ASSIGNED' : order.status },
    });
    await prisma.orderLog.create({
      data: { orderId: id, operatorId: req.user!.userId, action: 'REASSIGN', remark: `重新指派维修工 ID:${body.assigneeId}` },
    });
    createNotification({
      userId: body.assigneeId,
      senderId: req.user!.userId,
      type: 'ASSIGN',
      title: '您有新的工单指派',
      content: `工单「${order.title}」已指派给您处理`,
      link: `/orders/${id}`,
    });
    success(res, updated, '已重新指派');
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
