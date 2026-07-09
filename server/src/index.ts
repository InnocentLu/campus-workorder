import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import orderRoutes from './routes/orders';
import statisticsRoutes from './routes/statistics';
import notificationRoutes from './routes/notifications';
import { errorHandler } from './middleware/errorHandler';
import prisma from './utils/prisma';

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Auto-migrate on startup (safe — skips if columns exist) ── */
async function runMigrations() {
  const migrations = [
    // Task 1: Login security
    `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "login_attempts" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lock_until" TIMESTAMP(3)`,
    // Task 2: Notifications
    `ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "sender_id" INTEGER REFERENCES "user"("id")`,
    `ALTER TABLE "notification" ALTER COLUMN "user_id" DROP NOT NULL`,
    // Task 4: Confirmation flow
    `ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "completion_requested_at" TIMESTAMP(3)`,
    `ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3)`,
    `ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "confirm_status" VARCHAR(20)`,
    `ALTER TABLE "work_order" ADD COLUMN IF NOT EXISTS "reject_reason" TEXT`,
  ];
  for (const sql of migrations) {
    try { await prisma.$executeRawUnsafe(sql); } catch (e: any) {
      console.log('[Migrate] skip:', e.message?.split('\n')[0]);
    }
  }
  console.log('[Migrate] Auto-migration complete');
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/statistics', statisticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Serve frontend static files
import path from 'path';
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, message: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`[Campus WorkOrder] Server running on http://localhost:${PORT}`);
    console.log(`[Campus WorkOrder] API: http://localhost:${PORT}/api/v1`);
  });
});

export default app;
