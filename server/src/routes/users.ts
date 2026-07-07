import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import xlsx from 'xlsx';
import multer from 'multer';
import prisma from '../utils/prisma';
import { success, fail, paginated } from '../utils/response';
import { auth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { AuthRequest } from '../types';

const router = Router();

// Multer for file uploads (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

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
      newPassword: z.string().min(8, '新密码至少8位').regex(/[a-zA-Z]/, '密码必须包含字母').regex(/[0-9]/, '密码必须包含数字'),
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
          studentId: true, employeeId: true, avatar: true, trade: true, status: true,
          loginAttempts: true, lockUntil: true,
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

// GET /users/template - download Excel template (ADM only)
router.get('/template', rbac('ADM'), (_req: AuthRequest, res: Response) => {
  try {
    const headers = [
      'username', 'password', 'realName', 'role(STU/TCH/WRK)',
      'department', 'phone', 'email', 'studentId', 'employeeId',
    ];
    const exampleRow = [
      'zhangsan', '123456', '张三', 'STU',
      '计算机学院', '13800138000', 'zhangsan@example.com', '2024001', '',
    ];

    const ws = xlsx.utils.aoa_to_sheet([headers, exampleRow]);

    // Set reasonable column widths
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '用户导入模板');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=user_import_template.xlsx',
    );
    res.send(buf);
  } catch (err: any) {
    fail(res, err.message);
  }
});

// POST /users/import - batch import from Excel (ADM only)
router.post(
  '/import',
  rbac('ADM'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return fail(res, '请上传Excel文件');
      }

      const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = xlsx.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        return fail(res, 'Excel文件中没有数据');
      }

      const validRoles = ['STU', 'TCH', 'WRK'];
      const toImport: any[] = [];
      const errors: { row: number; message: string }[] = [];
      let skipped = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because row 1 is header, and data starts at row 2

        const username = String(row.username || '').trim();
        const password = String(row.password || '').trim();
        const realName = String(row.realName || '').trim();
        const role = String(row.role || '').trim().toUpperCase();

        // Validate required fields
        if (!username) {
          errors.push({ row: rowNum, message: '用户名不能为空' });
          continue;
        }
        if (!password) {
          errors.push({ row: rowNum, message: '密码不能为空' });
          continue;
        }
        if (!realName) {
          errors.push({ row: rowNum, message: '姓名不能为空' });
          continue;
        }
        if (!role || !validRoles.includes(role)) {
          errors.push({
            row: rowNum,
            message: `角色无效: "${role}", 有效值: STU/TCH/WRK`,
          });
          continue;
        }

        // Check if username already exists
        const exists = await prisma.user.findUnique({ where: { username } });
        if (exists) {
          errors.push({
            row: rowNum,
            message: `用户名 "${username}" 已存在，已跳过`,
          });
          skipped++;
          continue;
        }

        const hashed = await bcrypt.hash(password, 10);

        toImport.push({
          username,
          password: hashed,
          realName,
          role,
          department: String(row.department || '').trim() || null,
          phone: String(row.phone || '').trim() || null,
          email: String(row.email || '').trim() || null,
          studentId: String(row.studentId || '').trim() || null,
          employeeId: String(row.employeeId || '').trim() || null,
        });
      }

      if (toImport.length > 0) {
        await prisma.user.createMany({ data: toImport });
      }

      success(res, {
        imported: toImport.length,
        skipped,
        errors,
      }, `成功导入 ${toImport.length} 个用户，跳过 ${skipped} 个`);
    } catch (err: any) {
      fail(res, err.message);
    }
  },
);

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
