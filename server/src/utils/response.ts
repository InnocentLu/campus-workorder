import { Response } from 'express';
import { ApiResponse } from '../types';

export function success<T>(res: Response, data?: T, message = 'success'): void {
  const body: ApiResponse<T> = { code: 200, message };
  if (data !== undefined) body.data = data;
  res.json(body);
}

export function fail(res: Response, message: string, code = 400): void {
  res.status(code >= 100 ? code : 400).json({ code, message } as ApiResponse);
}

export function paginated<T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number
): void {
  res.json({
    code: 200,
    message: 'success',
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
