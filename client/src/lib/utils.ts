import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待处理',
    ASSIGNED: '已派单',
    PROCESSING: '处理中',
    COMPLETED: '已完成',
    CLOSED: '已关闭',
    CANCELLED: '已取消',
  };
  return map[status] || status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    ASSIGNED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    PROCESSING: 'bg-purple-100 text-purple-700 border-purple-200',
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getStatusBgGradient(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'from-amber-50 via-orange-50 to-yellow-50',
    ASSIGNED: 'from-indigo-50 via-blue-50 to-purple-50',
    PROCESSING: 'from-purple-50 via-violet-50 to-indigo-50',
    COMPLETED: 'from-emerald-50 via-green-50 to-teal-50',
    CLOSED: 'from-gray-50 via-slate-50 to-gray-100',
    CANCELLED: 'from-red-50 via-rose-50 to-pink-50',
  };
  return map[status] || 'from-gray-50 to-gray-100';
}

export function getStatusStepIndex(status: string): number {
  const order = ['PENDING', 'ASSIGNED', 'PROCESSING', 'COMPLETED', 'CLOSED'];
  const idx = order.indexOf(status);
  return idx === -1 ? 0 : idx;
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 border-gray-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    URGENT: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || '';
}

export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    STU: '学生',
    TCH: '教师',
    WRK: '维修工',
    ADM: '管理员',
  };
  return map[role] || role;
}

export function getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    STU: 'bg-emerald-100 text-emerald-700',
    TCH: 'bg-blue-100 text-blue-700',
    WRK: 'bg-orange-100 text-orange-700',
    ADM: 'bg-purple-100 text-purple-700',
  };
  return map[role] || 'bg-gray-100 text-gray-600';
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return formatDate(date);
}
