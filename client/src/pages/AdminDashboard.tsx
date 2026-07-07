import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Users,
  RefreshCw,
  Plus,
  UserCheck,
  Download,
  TrendingUp,
  PieChart as PieChartIcon,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import client from '@/api/client';
import { cn, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import {
  ScrollReveal,
  AnimatedCounter,
  StaggerList,
  Sparkline,
  SkeletonCard,
  SkeletonTable,
} from '@/components/animations';

/* ═══════════════════════════════════════════════════
   TypeScript Types
   ═══════════════════════════════════════════════════ */

interface AdminOverview {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  todayCount?: number;
  assignedCount?: number;
}

interface TrendItem {
  month: string;
  count: number;
}

interface CategoryItem {
  name: string;
  value: number;
}

interface OrderItem {
  id: number;
  orderNo: string;
  title: string;
  status: string;
  submitterName?: string;
  createdAt: string;
}

interface TrendResponse {
  trend?: TrendItem[];
  categories?: CategoryItem[];
}

/* ═══════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════ */

const PIE_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
];

const CHART_CARD_CLASS =
  'glass-strong rounded-2xl p-4 sm:p-6 transition-colors duration-200';

const STAT_CARD_CLASS =
  'glass-strong rounded-2xl p-4 sm:p-5 transition-colors duration-200';

/* ═══════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════ */

/** Skeleton placeholder for a single chart card */
function ChartSkeleton() {
  return (
    <div className={CHART_CARD_CLASS}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer bg-[length:200%_100%]" />
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer bg-[length:200%_100%]" />
      </div>
      <div className="h-[280px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-shimmer bg-[length:200%_100%]" />
    </div>
  );
}

/** Empty-state placeholder for charts */
function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[280px] text-gray-400 dark:text-gray-500">
      <TrendingUp className="w-12 h-12 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

export default function AdminDashboard() {
  /* ── State ── */
  const [overview, setOverview] = useState<AdminOverview>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    todayCount: 0,
    assignedCount: 0,
  });
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* ── Date / time ── */
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  /* ── Data fetching ── */
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    setError(null);

    try {
      const [overRes, trendRes, ordersRes] = await Promise.all([
        client.get('/statistics/overview'),
        client.get('/statistics/trend'),
        client.get('/orders', { params: { pageSize: 5 } }),
      ]);

      // Overview
      if (overRes.data.code === 200) {
        const raw = overRes.data.data || {};
        setOverview({
          total: raw.total ?? 0,
          pending: raw.pending ?? 0,
          processing: raw.processing ?? 0,
          completed: raw.completed ?? 0,
          todayCount: raw.todayCount ?? raw.total ?? 0,
          assignedCount: raw.assignedCount ?? raw.processing ?? 0,
        });
      }

      // Trend / categories
      if (trendRes.data.code === 200) {
        const raw: TrendResponse | TrendItem[] = trendRes.data.data;
        if (Array.isArray(raw)) {
          setTrendData(raw);
          setCategoryData([]);
        } else {
          setTrendData(raw.trend ?? []);
          setCategoryData(raw.categories ?? []);
        }
      }

      // Recent orders
      if (ordersRes.data.code === 200) {
        const ordersRaw = ordersRes.data.data;
        const list = ordersRaw?.records ?? ordersRaw?.list ?? ordersRaw ?? [];
        setRecentOrders(Array.isArray(list) ? list.slice(0, 5) : []);
      }
    } catch (err: any) {
      console.error('AdminDashboard fetch error:', err);
      setError(err?.message || '数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Handlers ── */
  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = () => {
    toast.info('功能开发中', { description: '报表导出功能即将上线，敬请期待' });
  };

  /* ── Computed values ── */
  const completionRate = useMemo(() => {
    if (overview.total === 0) return 0;
    return Math.round((overview.completed / overview.total) * 100);
  }, [overview.completed, overview.total]);

  const sparklineData = useMemo(
    () => trendData.map((t) => t.count),
    [trendData],
  );

  /* ── Stat card definitions ── */
  const statCards = useMemo(
    () => [
      {
        key: 'today',
        label: '今日报修工单',
        value: overview.todayCount ?? overview.total,
        icon: ClipboardList,
        color: '#2563EB',
        bgLight: 'bg-blue-50',
        bgDark: 'dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        key: 'pending',
        label: '待处理工单',
        value: overview.pending,
        icon: AlertCircle,
        color: '#F59E0B',
        bgLight: 'bg-amber-50',
        bgDark: 'dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
      },
      {
        key: 'completion',
        label: '完成率',
        value: completionRate,
        icon: CheckCircle,
        color: '#10B981',
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-900/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        suffix: '%',
      },
      {
        key: 'assigned',
        label: '维修人员接单量',
        value: overview.assignedCount ?? overview.processing,
        icon: Users,
        color: '#7C3AED',
        bgLight: 'bg-purple-50',
        bgDark: 'dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
      },
    ],
    [overview, completionRate],
  );

  /* ── Greeting ── */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  }, [timeStr]);

  /* ═══════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════
          ERROR BANNER
          ═══════════════════════════════════════════════ */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={handleRefresh}
              className="ml-auto text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              重试
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════ */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              数据仪表盘
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {greeting}，管理员 · {timeStr}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:opacity-60',
            )}
            aria-label="刷新数据"
          >
            <RefreshCw
              className={cn('w-4 h-4', refreshing && 'animate-spin')}
            />
            <span className="hidden sm:inline">
              {refreshing ? '刷新中...' : '刷新数据'}
            </span>
          </button>
        </div>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════
          STATS CARDS ROW
          ═══════════════════════════════════════════════ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.key} className={STAT_CARD_CLASS}>
              {/* Top row: icon + sparkline */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    'p-2.5 rounded-xl',
                    s.bgLight,
                    s.bgDark,
                  )}
                >
                  <s.icon className={cn('w-5 h-5', s.iconColor)} />
                </div>
                {sparklineData.length > 0 && (
                  <Sparkline
                    data={sparklineData}
                    color={s.color}
                    width={80}
                    height={28}
                  />
                )}
              </div>

              {/* Label */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {s.label}
              </p>

              {/* Value */}
              <AnimatedCounter
                to={s.value}
                suffix={'suffix' in s ? s.suffix : ''}
                className="text-3xl font-bold text-gray-900 dark:text-white"
                duration={1.5}
              />
            </div>
          ))}
        </StaggerList>
      )}

      {/* ═══════════════════════════════════════════════
          CHARTS SECTION
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart — Monthly Repair Trend */}
        <ScrollReveal>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className={CHART_CARD_CLASS}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  月度报修趋势
                </h3>
              </div>

              {trendData.length === 0 ? (
                <ChartEmpty message="暂无报修趋势数据" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trendData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient
                        id="barGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      className="dark:opacity-20"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        fontSize: '13px',
                      }}
                      cursor={{ fill: 'rgba(37,99,235,0.06)' }}
                    />
                    <Bar
                      dataKey="count"
                      name="报修数"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </ScrollReveal>

        {/* Pie Chart — Repair Type Distribution */}
        <ScrollReveal direction="right">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className={CHART_CARD_CLASS}>
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  报修类型占比
                </h3>
              </div>

              {categoryData.length === 0 ? (
                <ChartEmpty message="暂无分类统计数据" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={0}
                      animationBegin={200}
                      animationDuration={800}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        fontSize: '13px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} 单`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </ScrollReveal>
      </div>

      {/* ═══════════════════════════════════════════════
          QUICK ACTIONS ROW
          ═══════════════════════════════════════════════ */}
      <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap items-center gap-3">
          {/* New Order */}
          <Link
            to="/orders/submit"
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md hover:shadow-lg',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'dark:from-primary-500 dark:to-primary-600',
            )}
          >
            <Plus className="w-4 h-4" />
            <span>新建工单</span>
          </Link>

          {/* Batch Assign */}
          <Link
            to="/orders/manage"
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              'border-2 border-primary-200 dark:border-primary-800',
              'text-primary-700 dark:text-primary-300',
              'hover:bg-primary-50 dark:hover:bg-primary-900/20',
              'hover:border-primary-300 dark:hover:border-primary-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>批量派单</span>
          </Link>

          {/* Export Report */}
          <button
            onClick={handleExport}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'hover:text-gray-900 dark:hover:text-gray-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            )}
            aria-label="导出报表"
          >
            <Download className="w-4 h-4" />
            <span>导出报表</span>
          </button>
        </div>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════
          RECENT ORDERS TABLE
          ═══════════════════════════════════════════════ */}
      <ScrollReveal delay={0.15}>
        <div className={CHART_CARD_CLASS}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              最近工单
            </h3>
            <Link
              to="/orders/manage"
              className={cn(
                'inline-flex items-center gap-1 text-sm font-medium transition-colors duration-200',
                'text-primary-600 dark:text-primary-400',
                'hover:text-primary-700 dark:hover:text-primary-300',
              )}
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Table */}
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">暂无工单数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                <table
                  className="min-w-full text-sm"
                  role="table"
                  aria-label="最近工单列表"
                >
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700/50">
                      <th className="py-3 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        工单编号
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        标题
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        状态
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        提交人
                      </th>
                      <th className="py-3 pl-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={cn(
                          'group transition-colors duration-150',
                          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        )}
                      >
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {order.orderNo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900 dark:text-gray-100 truncate max-w-[200px] block">
                            {order.title}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                              getStatusColor(order.status),
                            )}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-gray-600 dark:text-gray-400">
                            {order.submitterName || '-'}
                          </span>
                        </td>
                        <td className="py-3 pl-4 whitespace-nowrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(order.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}
