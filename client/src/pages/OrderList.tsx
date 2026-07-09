import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  formatDate,
  cn,
} from '@/lib/utils';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  X,
  User,
  Clock,
  ChevronRight,
  FileText,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import {
  ScrollReveal,
  StaggerList,
  SkeletonCard,
  FlowingButton,
} from '@/components/animations';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUSES = ['PENDING', 'ASSIGNED', 'PROCESSING', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;

const PAGE_SIZE = 12;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Colored dot hex for each status */
function getStatusDotColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#F59E0B',
    ASSIGNED: '#8B5CF6',
    PROCESSING: '#1660AB',
    COMPLETED: '#10B981',
    CLOSED: '#6B7280',
    CANCELLED: '#EF4444',
  };
  return map[status] || '#6B7280';
}

/** Active chip background per status */
function getStatusChipActive(status: string): string {
  const map: Record<string, string> = {
    PENDING:
      'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    ASSIGNED:
      'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700',
    PROCESSING:
      'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
    COMPLETED:
      'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
    CLOSED:
      'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    CANCELLED:
      'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  };
  return map[status] || '';
}

/** Page number generation with ellipsis */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                           */
/* ------------------------------------------------------------------ */

function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', className)}
      style={{ backgroundColor: getStatusDotColor(status) }}
      aria-hidden="true"
    />
  );
}

function StatusTag({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
        getStatusColor(status),
      )}
    >
      <StatusDot status={status} />
      {getStatusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = getPriorityColor(priority);
  if (!cls) return <span className="text-[11px] text-gray-400">{priority || 'MEDIUM'}</span>;
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-medium border', cls)}>
      {priority || 'MEDIUM'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  canSubmit,
  hasFilters,
  onClear,
}: {
  canSubmit: boolean;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Icon circle */}
      <div className="w-24 h-24 rounded-3xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-6 shadow-sm">
        {hasFilters ? (
          <Filter className="w-12 h-12 text-blue-300 dark:text-blue-600" />
        ) : (
          <FileText className="w-12 h-12 text-blue-300 dark:text-blue-600" />
        )}
      </div>

      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {hasFilters ? '未找到匹配工单' : '暂无工单'}
      </h3>
      <p className="text-sm text-gray-400 dark:text-slate-500 mb-8 max-w-sm text-center">
        {hasFilters
          ? '当前筛选条件下没有工单记录，请尝试调整筛选条件。'
          : '还没有任何工单记录，快去提交一个新的工单吧'}
      </p>

      <div className="flex items-center justify-center gap-3">
        {hasFilters && (
          <Button variant="outline" onClick={onClear} className="gap-1.5">
            <Filter className="w-4 h-4" /> 清除筛选
          </Button>
        )}
        {canSubmit && (
          <Link to="/orders/submit" aria-label="提交新工单">
            <FlowingButton variant="primary" size="lg">
              <Plus className="w-4 h-4 mr-1.5" />
              提交工单
            </FlowingButton>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  PaginationBar                                                     */
/* ------------------------------------------------------------------ */

function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const pages = getPageNumbers(page, totalPages);

  return (
    <ScrollReveal>
      <nav
        className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2"
        aria-label="分页导航"
      >
        {/* Info */}
        <span className="text-sm text-gray-500 dark:text-slate-400 order-2 sm:order-1">
          第 {page}/{totalPages} 页，共 {total} 条
        </span>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 order-1 sm:order-2">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="第一页"
          >
            «
          </button>

          {/* Prev */}
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
              page <= 1
                ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700',
            )}
            aria-label="上一页"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            上一页
          </button>

          {/* Page numbers */}
          {pages.map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-label={`第 ${p} 页`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200',
                  p === page
                    ? 'bg-primary-600 text-white shadow-sm dark:bg-primary-500'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700',
                )}
              >
                {p}
              </button>
            ),
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
              page >= totalPages
                ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700',
            )}
            aria-label="下一页"
          >
            下一页
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="最后一页"
          >
            »
          </button>
        </div>
      </nav>
    </ScrollReveal>
  );
}

/* ================================================================== */
/*  OrderList (main component)                                        */
/* ================================================================== */

export default function OrderList() {
  const { user } = useAuthStore();
  const location = useLocation();

  /* ---- state ---- */
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const [viewMode, setViewMode] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('orderListView') as 'card' | 'table') || 'card',
  );

  /* ---- route detection (unchanged) ---- */
  const path = location.pathname;
  const isMy = path.includes('/my');
  const isDept = path.includes('/dept');
  const isTasks = path.includes('/tasks');
  const isPending = path.includes('/pending');
  const isManage = path.includes('/manage');
  const canSubmit = user?.role === 'STU' || user?.role === 'TCH';

  const title = isMy
    ? '我的工单'
    : isDept
      ? '部门工单'
      : isTasks
        ? '我的任务'
        : isPending
          ? '待接单'
          : '工单管理';

  /* ---- mobile detection ---- */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ---- debounced search ---- */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  /* ---- data fetching (unchanged logic) ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: PAGE_SIZE };
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (statusFilter) params.status = statusFilter;
      if (isPending) params.status = 'PENDING';
      const res = await client.get('/orders', { params });
      if (res.data.code === 200) {
        setList(res.data.data.list);
        setTotal(res.data.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- handlers ---- */
  const toggleView = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('orderListView', mode);
  };

  const clearFilters = () => {
    setKeyword('');
    setStatusFilter('');
    setPage(1);
  };

  const handleStatusToggle = (s: string) => {
    setStatusFilter((prev) => (prev === s ? '' : s));
    setPage(1);
  };

  /* ---- derived ---- */
  const effectiveView = isMobile ? 'card' : viewMode;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = keyword !== '' || statusFilter !== '';
  const inactiveChip =
    'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700';

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */
  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/*  Header                                                      */}
      {/* ============================================================ */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              共{' '}
              <span className="font-semibold text-gray-700 dark:text-slate-300">{total}</span>{' '}
              个工单
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle (hidden on mobile) */}
            {!isMobile && (
              <div
                className="flex items-center gap-0.5 bg-gray-100/80 dark:bg-slate-800/80 rounded-xl p-1"
                role="radiogroup"
                aria-label="视图模式"
              >
                <button
                  onClick={() => toggleView('card')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                    viewMode === 'card'
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
                  )}
                  role="radio"
                  aria-checked={viewMode === 'card'}
                  aria-label="卡片视图"
                >
                  <LayoutGrid className="w-4 h-4" /> 卡片
                </button>
                <button
                  onClick={() => toggleView('table')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
                  )}
                  role="radio"
                  aria-checked={viewMode === 'table'}
                  aria-label="表格视图"
                >
                  <List className="w-4 h-4" /> 表格
                </button>
              </div>
            )}

            {canSubmit && (
              <Link to="/orders/submit">
                <FlowingButton variant="primary" size="md">
                  <Plus className="w-4 h-4 mr-1" />
                  提交工单
                </FlowingButton>
              </Link>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* ============================================================ */}
      {/*  Filter Bar (sticky glass-morphism)                          */}
      {/* ============================================================ */}
      <div className="sticky top-16 z-20 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/30 dark:border-slate-700/30 rounded-2xl p-3.5 shadow-glass">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input – always visible */}
          <div className="relative flex-1 min-w-[180px]">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="搜索工单号 / 标题..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="搜索工单"
              className={cn(
                'w-full h-10 pl-10 pr-4 rounded-xl border text-sm transition-all duration-200',
                'bg-white dark:bg-slate-800',
                'border-gray-200 dark:border-slate-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400',
                'dark:focus:ring-primary-500/20 dark:focus:border-primary-500',
              )}
            />
          </div>

          {/* Status chips + actions – horizontal scroll on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {/* "全部" chip */}
            <button
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              aria-label="显示全部状态"
              aria-pressed={!statusFilter}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border flex-shrink-0',
                !statusFilter
                  ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
                  : inactiveChip,
              )}
            >
              全部
            </button>

            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusToggle(s)}
                aria-label={`筛选${getStatusLabel(s)}`}
                aria-pressed={s === statusFilter}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 border flex-shrink-0 flex items-center gap-1.5',
                  s === statusFilter ? getStatusChipActive(s) : inactiveChip,
                )}
              >
                <StatusDot status={s} className="w-1.5 h-1.5" />
                {getStatusLabel(s)}
              </button>
            ))}

            {/* Divider */}
            {hasActiveFilters && (
              <span className="w-px h-6 bg-gray-200 dark:bg-slate-600 flex-shrink-0 mx-1" aria-hidden="true" />
            )}

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                aria-label="清除所有筛选条件"
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 flex-shrink-0',
                  'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
                  'dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30',
                )}
              >
                <X className="w-3.5 h-3.5" />
                清除
              </button>
            )}

            {/* Result count pill */}
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 whitespace-nowrap flex-shrink-0">
              {total} 条结果
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Content                                                     */}
      {/* ============================================================ */}

      {loading ? (
        /* ---- Loading ---- */
        effectiveView === 'card' ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="status"
            aria-label="加载中"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
            <span className="sr-only">正在加载工单列表...</span>
          </div>
        ) : (
          <ScrollReveal>
            <div
              className="glass rounded-2xl overflow-hidden border border-white/20 dark:border-slate-700/30"
              role="status"
              aria-label="加载中"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                      {['工单号', '标题', '类别', '优先级', '状态', '提交人', '时间', '操作'].map(
                        (label, i) => (
                          <th
                            key={label}
                            className={cn(
                              'text-left px-5 py-3.5 font-semibold text-gray-400 dark:text-slate-500 text-[11px] uppercase tracking-wider',
                              i === 2 && 'hidden md:table-cell',
                              i >= 5 && 'hidden lg:table-cell',
                            )}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {Array.from({ length: 6 }).map((_, rowIdx) => (
                      <tr key={rowIdx}>
                        {Array.from({ length: 8 }).map((_, colIdx) => (
                          <td
                            key={colIdx}
                            className={cn(
                              'px-5 py-3.5',
                              colIdx === 2 && 'hidden md:table-cell',
                              colIdx >= 5 && 'hidden lg:table-cell',
                            )}
                          >
                            <div
                              className="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse"
                              style={{ width: colIdx === 1 ? '80%' : '55%' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <span className="sr-only">正在加载工单列表...</span>
            </div>
          </ScrollReveal>
        )
      ) : list.length === 0 ? (
        /* ---- Empty ---- */
        <EmptyState canSubmit={canSubmit} hasFilters={hasActiveFilters} onClear={clearFilters} />
      ) : (
        <>
          {/* ======================================================== */}
          {/*  Card View                                               */}
          {/* ======================================================== */}
          {effectiveView === 'card' ? (
            <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block group relative"
                  aria-label={`查看工单 ${order.orderNo}: ${order.title}`}
                >
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={cn(
                      'glass rounded-xl p-5 h-full flex flex-col relative overflow-hidden',
                      'transition-shadow duration-300',
                      'shadow-sm hover:shadow-card-hover',
                      'border border-white/20 dark:border-slate-700/30',
                    )}
                  >
                    {/* Right edge blue accent on hover */}
                    <div className="absolute right-0 top-4 bottom-4 w-1 rounded-l-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Top row: orderNo + status tag */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-mono text-[11px] text-gray-400 dark:text-slate-500 tracking-tight tabular-nums">
                        {order.orderNo}
                      </span>
                      <StatusTag status={order.status} />
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-[15px]">
                      {order.title}
                    </h3>

                    {/* Category + Priority badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <PriorityBadge priority={order.priority} />
                      {order.category && (
                        <span className="text-[11px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                          {order.category}
                        </span>
                      )}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Footer: submitter + date */}
                    <div className="pt-3 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        <span>{order.submitter?.realName || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    {/* ChevronRight – fades + slides in on hover */}
                    <ChevronRight className="absolute bottom-5 right-5 w-5 h-5 text-primary-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                  </motion.div>
                </Link>
              ))}
            </StaggerList>
          ) : (
            /* ====================================================== */
            /*  Table View                                            */
            /* ====================================================== */
            <ScrollReveal>
              <div className="glass rounded-2xl overflow-hidden border border-white/20 dark:border-slate-700/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="工单列表">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider"
                        >
                          工单号
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider"
                        >
                          标题
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider hidden md:table-cell"
                        >
                          类别
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider"
                        >
                          优先级
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider"
                        >
                          状态
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider hidden lg:table-cell"
                        >
                          提交人
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider hidden lg:table-cell"
                        >
                          时间
                        </th>
                        <th
                          scope="col"
                          className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider"
                        >
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {list.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={cn(
                            'transition-colors duration-150',
                            'hover:bg-primary-50/30 dark:hover:bg-primary-900/10',
                            idx % 2 === 0 && 'bg-white/50 dark:bg-slate-900/20',
                          )}
                        >
                          {/* Order No */}
                          <td className="px-5 py-3.5 font-mono text-[11px] text-gray-500 dark:text-slate-400 whitespace-nowrap">
                            {row.orderNo}
                          </td>

                          {/* Title */}
                          <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100 max-w-[220px] truncate">
                            <Link
                              to={`/orders/${row.id}`}
                              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                              {row.title}
                            </Link>
                          </td>

                          {/* Category (hidden on small) */}
                          <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400 text-xs hidden md:table-cell">
                            {row.category || '-'}
                          </td>

                          {/* Priority */}
                          <td className="px-5 py-3.5">
                            <PriorityBadge priority={row.priority} />
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <StatusTag status={row.status} />
                          </td>

                          {/* Submitter (hidden below lg) */}
                          <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400 text-xs hidden lg:table-cell">
                            {row.submitter?.realName || '-'}
                          </td>

                          {/* Date (hidden below lg) */}
                          <td className="px-5 py-3.5 text-gray-500 dark:text-slate-500 text-[11px] hidden lg:table-cell whitespace-nowrap">
                            {formatDate(row.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5">
                            <Link
                              to={`/orders/${row.id}`}
                              aria-label={`查看工单 ${row.orderNo}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                            >
                              查看
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ======================================================== */}
          {/*  Shared Pagination                                       */}
          {/* ======================================================== */}
          {totalPages > 1 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
