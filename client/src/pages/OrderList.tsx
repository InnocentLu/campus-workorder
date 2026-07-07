import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { getStatusLabel, getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { Search, Plus, LayoutGrid, List, MapPin, Clock, User, ChevronRight, FileText } from 'lucide-react';
import { ScrollReveal, StaggerList, GlassCard, SkeletonCard } from '@/components/animations';
import { cn } from '@/lib/utils';

export default function OrderList() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    return (localStorage.getItem('orderListView') as 'card' | 'table') || 'card';
  });
  const pageSize = 12;

  const path = location.pathname;
  const isMy = path.includes('/my');
  const isDept = path.includes('/dept');
  const isTasks = path.includes('/tasks');
  const isPending = path.includes('/pending');
  const isManage = path.includes('/manage');
  const canSubmit = user?.role === 'STU' || user?.role === 'TCH';

  const title = isMy ? '我的工单' : isDept ? '部门工单' : isTasks ? '我的任务' : isPending ? '待接单' : '工单管理';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (keyword) params.keyword = keyword;
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
  }, [page, keyword, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleView = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('orderListView', mode);
  };

  const statuses = ['PENDING', 'ASSIGNED', 'PROCESSING', 'COMPLETED', 'CLOSED', 'CANCELLED'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">共 {total} 个工单</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100/80 dark:bg-slate-800/80 rounded-xl p-1" role="radiogroup" aria-label="视图模式">
              <button
                onClick={() => toggleView('card')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                  viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
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
                  viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
                )}
                role="radio"
                aria-checked={viewMode === 'table'}
                aria-label="表格视图"
              >
                <List className="w-4 h-4" /> 表格
              </button>
            </div>
            {canSubmit && (
              <Link to="/orders/submit">
                <Button>
                  <Plus className="w-4 h-4 mr-1" /> 提交工单
                </Button>
              </Link>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* Filter Bar */}
      <ScrollReveal>
        <div className="glass-strong rounded-2xl p-4 flex flex-wrap gap-3 items-center sticky top-20 z-20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="搜索工单号/标题..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                !statusFilter ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              全部
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s === statusFilter ? '' : s); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  s === statusFilter ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                )}
              >
                {getStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Content */}
      {loading ? (
        <div className={cn(
          viewMode === 'card'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-2',
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'card' ? (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block group">
              <GlassCard className="p-5 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-xs text-gray-400">{order.orderNo}</span>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    getStatusColor(order.status),
                  )}>
                    <span className={cn('status-dot', order.status === 'PENDING' || order.status === 'PROCESSING' ? 'active' : '')}
                      style={{ backgroundColor: 'currentColor' }} />
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors">
                  {order.title}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', getPriorityColor(order.priority))}>
                    {order.priority || 'MEDIUM'}
                  </span>
                  <span className="text-xs text-gray-400">{order.category}</span>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span>{order.submitter?.realName || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5 text-primary-500" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </StaggerList>
      ) : (
        /* Table view */
        <ScrollReveal>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">工单号</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">标题</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">类别</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">优先级</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">状态</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs hidden md:table-cell">提交人</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs hidden md:table-cell">时间</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{row.orderNo}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900 max-w-[200px] truncate">{row.title}</td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{row.category}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', getPriorityColor(row.priority))}>
                          {row.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border', getStatusColor(row.status))}>
                          <span className="status-dot" style={{ backgroundColor: 'currentColor' }} />
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs hidden md:table-cell">{row.submitter?.realName || '-'}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs hidden md:table-cell">{formatDate(row.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <Link to={`/orders/${row.id}`}>
                          <Button variant="outline" size="sm">查看</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <span className="text-sm text-gray-500">共 {total} 条</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
        <FileText className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-500 mb-1">暂无工单</h3>
      <p className="text-sm text-gray-400">还没有符合条件的工单记录</p>
    </div>
  );
}
