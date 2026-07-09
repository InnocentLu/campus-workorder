import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { getStatusLabel, getStatusColor, getPriorityColor, formatDate, getRoleLabel, getRoleBadgeClass } from '@/lib/utils';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { ScrollReveal, AnimatedCounter, StaggerList, GlassCard, Sparkline, SkeletonCard } from '@/components/animations';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState({ total: 0, pending: 0, processing: 0, completed: 0, todos: [] as any[] });
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      client.get('/statistics/overview'),
      client.get('/statistics/trend'),
    ]).then(([overRes, trendRes]) => {
      if (overRes.data.code === 200) setOverview(overRes.data.data);
      if (trendRes.data.code === 200) {
        const raw = trendRes.data.data;
        setTrend(Array.isArray(raw) ? raw : (raw?.trend ?? []));
      }
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: '工单总数', value: overview.total, icon: ClipboardList, color: '#1660AB', bg: 'bg-blue-50' },
    { label: '待处理', value: overview.pending, icon: AlertCircle, color: '#F59E0B', bg: 'bg-amber-50' },
    { label: '处理中', value: overview.processing, icon: Clock, color: '#1660AB', bg: 'bg-purple-50' },
    { label: '已完成', value: overview.completed, icon: CheckCircle2, color: '#10B981', bg: 'bg-emerald-50' },
  ];

  const trendData = useMemo(() => trend.map((t: any) => t.count), [trend]);

  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (overview.pending > 0) parts.push(`${overview.pending} 个工单等待处理`);
    if (overview.processing > 0) parts.push(`${overview.processing} 个正在处理中`);
    if (parts.length === 0) return '一切正常，暂无待处理工单';
    return `今天有 ${parts.join('，')}`;
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 p-6 lg:p-8 text-white">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/20 rounded-full translate-y-1/2" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl font-bold shadow-inner">
                {user?.realName?.[0] || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl lg:text-2xl font-bold">
                    {getGreeting()}，{user?.realName}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm bg-white/20`}>
                    {getRoleLabel(user?.role || '')}
                  </span>
                </div>
                <p className="text-white/70 text-sm">{summaryText}</p>
                <p className="text-white/50 text-xs mt-1">{timeStr}</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <GlassCard key={s.label} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <Sparkline data={trendData} color={s.color} width={80} height={28} />
              </div>
              <p className="text-sm text-gray-500 mb-1">{s.label}</p>
              <AnimatedCounter
                to={s.value}
                className="text-3xl font-bold text-gray-900"
                duration={1.5}
              />
            </GlassCard>
          ))}
        </StaggerList>
      )}

      {/* Chart + Todos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <ScrollReveal className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">近7天工单趋势</h3>
            </div>
            {loading ? (
              <div className="h-[280px] bg-gray-100 rounded-xl animate-shimmer bg-[length:200%_100%]" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1660AB" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#1660AB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                  />
                  <Area type="monotone" dataKey="count" name="工单数" stroke="#1660AB" strokeWidth={3} fill="url(#trendGradient)" dot={{ r: 5, fill: '#1660AB', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </ScrollReveal>

        {/* Todos */}
        <ScrollReveal direction="right">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">待办事项</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-shimmer bg-[length:200%_100%]" />
                ))}
              </div>
            ) : overview.todos.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">暂无待办事项</p>
                <p className="text-xs text-gray-300 mt-1">一切尽在掌握</p>
              </div>
            ) : (
              <StaggerList className="space-y-2">
                {overview.todos.map((item: any) => (
                  <Link
                    key={item.id}
                    to={`/orders/${item.id}`}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="font-mono">{item.orderNo}</span>
                        {item.priority && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        )}
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </StaggerList>
            )}
          </GlassCard>
        </ScrollReveal>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}
