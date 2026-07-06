import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { fail } from '../utils/response';

export function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, '未登录或 token 已过期', 401);
  }

  try {
    const token = header.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    return fail(res, 'token 无效或已过期', 401);
  }
}
