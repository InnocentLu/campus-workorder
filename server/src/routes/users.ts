import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { success, fail, paginated } from '../utils/response';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { AuthRequest } from '../types';

const router = Router();

// All user routes require authentication
router.use(auth);

// GET /users/me
router.get('/me', (req: AuthRequest, res: Response) => {
  prisma.user.findUnique({ where: { id: req.user!.userId } })
    .then(user => {
      if (!user) return fail(res, '用户不存在');
      const { password, ...rest } = user;
      success(res, rest);
    })
    .catch(err => fail(res, err.message));
});

// PUT /users/me
router.put('/me', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      realName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      avatar: z.string().optional(),
      department: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: body,
    });
    const { password, ...rest } = user;
    success(res, rest, '更新成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// PUT /users/me/password
router.put('/me/password', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(6, '新密码至少6位'),
    });
    const { oldPassword, newPassword } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    const valid = await bcrypt.compare(oldPassword, user!.password);
    if (!valid) return fail(res, '原密码错误');

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: hashed },
    });
    success(res, null, '密码修改成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// Admin routes below
// GET /users - list all (ADM only)
router.get('/', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const keyword = (req.query.keyword as string) || '';
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { realName: { contains: keyword } },
      ];
    }
    if (role) where.role = role;

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, realName: true, role: true,
          phone: true, email: true, department: true,
          studentId: true, employeeId: true, status: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);
    paginated(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, err.message);
  }
});

// POST /users (ADM only)
router.post('/', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      username: z.string().min(2).max(50),
      password: z.string().min(6),
      realName: z.string().min(1),
      role: z.enum(['STU', 'TCH', 'WRK', 'ADM']),
      phone: z.string().optional(),
      email: z.string().optional(),
      department: z.string().optional(),
      studentId: z.string().optional(),
      employeeId: z.string().optional(),
      trade: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists) return fail(res, '用户名已存在');

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: { ...body, password: hashed },
    });

    const { password, ...rest } = user;
    success(res, rest, '创建成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// PUT /users/:id (ADM only)
router.put('/:id', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({
      realName: z.string().optional(),
      role: z.enum(['STU', 'TCH', 'WRK', 'ADM']).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      department: z.string().optional(),
      studentId: z.string().optional(),
      employeeId: z.string().optional(),
      trade: z.string().optional(),
      status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    });
    const body = schema.parse(req.body);
    const user = await prisma.user.update({ where: { id }, data: body });
    const { password, ...rest } = user;
    success(res, rest, '更新成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message);
  }
});

// DELETE /users/:id (ADM only)
router.delete('/:id', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user!.userId) return fail(res, '不能删除自己');
    await prisma.user.delete({ where: { id } });
    success(res, null, '删除成功');
  } catch (err: any) {
    fail(res, err.message);
  }
});

// PUT /users/:id/reset-password (ADM only)
router.put('/:id/reset-password', rbac('ADM'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const hashed = await bcrypt.hash('123456', 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    success(res, null, '密码已重置为 123456');
  } catch (err: any) {
    fail(res, err.message);
  }
});

export default router;
