import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const SECRET = process.env.JWT_SECRET || 'campus-workorder-jwt-secret-key-2024';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: JwtPayload): string {
  // `as any` needed because @types/jsonwebtoken expects `ms.StringValue`
  // (a branded template literal type) for expiresIn, but process.env returns `string`.
  return jwt.sign(payload as object, SECRET, { expiresIn: EXPIRES_IN as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
