import prisma from '../utils/prisma';

type NotificationType = 'ORDER_STATUS' | 'ASSIGN' | 'BROADCAST' | 'CONFIRM_REQUEST';

interface CreateNotificationParams {
  userId?: number | null; // null = broadcast to all
  senderId?: number;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
}

/** Create a single notification for one user */
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId ?? null,
      senderId: params.senderId,
      type: params.type,
      title: params.title,
      content: params.content,
      link: params.link,
    },
  });
}

/** Broadcast a notification to ALL users (async, no await needed in caller) */
export async function broadcastNotification(params: Omit<CreateNotificationParams, 'userId'>) {
  const users = await prisma.user.findMany({ select: { id: true } });
  const data = users.map((u) => ({
    userId: u.id,
    senderId: params.senderId,
    type: params.type,
    title: params.title,
    content: params.content,
    link: params.link,
  }));
  if (data.length === 0) return;
  await prisma.notification.createMany({ data });
}

/** Notify specific roles */
export async function notifyByRole(
  roles: string[],
  params: Omit<CreateNotificationParams, 'userId'>,
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      senderId: params.senderId,
      type: params.type,
      title: params.title,
      content: params.content,
      link: params.link,
    })),
  });
}

/** Notify the submitter, assignee, and admins about an order event */
export async function notifyOrderStakeholders(
  orderId: number,
  params: Omit<CreateNotificationParams, 'userId'>,
) {
  const order = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { submitterId: true, assigneeId: true },
  });
  if (!order) return;
  const userIds = new Set<number>();
  if (order.submitterId) userIds.add(order.submitterId);
  if (order.assigneeId) userIds.add(order.assigneeId);

  // Also notify admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADM' },
    select: { id: true },
  });
  admins.forEach((a) => userIds.add(a.id));

  const data = [...userIds].map((uid) => ({
    userId: uid,
    senderId: params.senderId,
    type: params.type,
    title: params.title,
    content: params.content,
    link: params.link,
  }));
  if (data.length === 0) return;
  await prisma.notification.createMany({ data });
}
