import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { success, fail } from '../utils/response';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { AuthRequest } from '../types';
import { broadcastNotification } from '../services/notification';

const router = Router();

// All routes require auth
router.use(auth);

// GET /notifications — current user's notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const unreadOnly = req.query.unread === '1';
    const user = req.user!;

    const where: any = { userId: user.userId };
    if (unreadOnly) where.isRead = false;

    const [list, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, userId: true, type: true, title: true,
          content: true, link: true, isRead: true, createdAt: true,
          sender: { select: { id: true, realName: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.userId, isRead: false } }),
    ]);

    success(res, { list, total, unreadCount, page, pageSize });
  } catch (err: any) {
    fail(res, err.message);
  }
});

// PUT /notifications/:id/read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.userId },
      data: { isRead: true },
    });
    success(res, null, '已标记为已读');
  } catch (err: any) {
    fail(res, err.message);
  }
});

// PUT /notifications/read-all
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    success(res, null, '全部已读');
  } catch (err: any) {
    fail(res, err.message);
  }
});

// POST /notifications/broadcast (ADM only)
router.post('/broadcast', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      title: z.string().min(1, '请输入标题'),
      content: z.string().optional(),
      link: z.string().optional(),
    });
    const body = schema.parse(req.body);

    await broadcastNotification({
      senderId: req.user!.userId,
      type: 'BROADCAST',
      title: body.title,
      content: body.content,
      link: body.link,
    });

    success(res, null, '广播已发送');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

export default router;
