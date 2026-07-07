import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { success, fail } from '../utils/response';

import { AuthRequest } from '../types';

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/* ── Password strength helper ── */
function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return '密码至少8位';
  if (!/[a-zA-Z]/.test(password)) return '密码必须包含字母';
  if (!/[0-9]/.test(password)) return '密码必须包含数字';
  return null;
}

/* ── Schemas ── */
const loginSchema = z.object({
  username: z.string().min(2, '用户名至少2位'),
  password: z.string().min(1, '请输入密码'),
});

const registerSchema = z.object({
  username: z.string().min(4, '用户名至少4位').max(20, '用户名最多20位').regex(/^[a-zA-Z0-9]+$/, '用户名只能包含字母和数字'),
  password: z.string().refine(
    (pwd) => validatePasswordStrength(pwd) === null,
    (pwd) => ({ message: validatePasswordStrength(pwd) || '密码不符合要求' }),
  ),
  realName: z.string().min(1, '请输入姓名'),
  role: z.enum(['STU', 'TCH']),
  phone: z.string().optional(),
  email: z.string().optional(),
  department: z.string().optional(),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
});

// POST /auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: body.username } });

    if (!user) return fail(res, '用户名或密码错误', 401);
    if (user.status === 'DISABLED') return fail(res, '账号已被禁用', 403);

    // Check if account is locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
      return fail(res, `账号已锁定，请 ${remaining} 分钟后重试`, 429);
    }

    const valid = await bcrypt.compare(body.password, user.password);

    if (!valid) {
      const newAttempts = (user.loginAttempts || 0) + 1;
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockUntil: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000),
          },
        });
        return fail(res, `密码错误次数过多，账号已锁定 ${LOCK_DURATION_MINUTES} 分钟`, 429);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts },
      });
      return fail(res, `用户名或密码错误，还剩 ${MAX_LOGIN_ATTEMPTS - newAttempts} 次尝试`, 401);
    }

    // Successful login — clear attempts
    if (user.loginAttempts > 0 || user.lockUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockUntil: null },
      });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const { password, ...userWithoutPwd } = user;
    success(res, { token, user: userWithoutPwd }, '登录成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message || '登录失败');
  }
});

// POST /auth/register (公开自注册，仅限学生/教师角色)
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists) return fail(res, '用户名已存在');

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        ...body,
        password: hashed,
      },
    });

    const { password, ...userWithoutPwd } = user;
    success(res, userWithoutPwd, '注册成功');
  } catch (err: any) {
    if (err instanceof z.ZodError) return fail(res, err.errors[0].message);
    fail(res, err.message || '注册失败');
  }
});

export default router;
