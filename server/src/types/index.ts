import { Request } from 'express';
import { UserRole } from '@prisma/client';

// JWT payload
export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
}

// Express Request with user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Unified API response
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

// Order filter
export interface OrderFilter extends PaginationQuery {
  status?: string;
  category?: string;
  priority?: string;
}
