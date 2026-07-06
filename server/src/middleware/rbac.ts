import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types';
import { fail } from '../utils/response';

/**
 * Role-based access control middleware factory.
 * Usage: router.get('/users', auth, rbac('ADM'), handler)
 */
export function rbac(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return fail(res, '未登录', 401);
    }
    if (!roles.includes(req.user.role)) {
      return fail(res, '权限不足', 403);
    }
    next();
  };
}
