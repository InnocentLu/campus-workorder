import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getRoleLabel,
  getRoleBadgeClass,
  getStatusLabel,
  getStatusColor,
  formatRelativeTime,
  cn,
} from '@/lib/utils';
import {
  ScrollReveal,
  GlassCard,
  FlowingButton,
  AnimatedCounter,
  StaggerList,
} from '@/components/animations';
import AvatarUpload from '@/components/AvatarUpload';
import {
  User,
  Lock,
  Mail,
  Phone,
  Building,
  Shield,
  ClipboardList,
  Clock,
  CheckCircle,
  Star,
  TrendingUp,
  Wrench,
  PlusCircle,
  FileText,
  BarChart3,
  Settings,
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ── Types ── */
interface OrderItem {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  rating?: number;
}

interface UserStats {
  pending: number;
  processing: number;
  completed: number;
  total: number;
  ratingAvg: number;
  ratedCount: number;
  recentOrders: OrderItem[];
  trendData: { date: string; count: number }[];
  pendingAssignments?: number; // TCH
  todayPendingOrders?: number; // WRK
}

/* ── Stagger variants for right panel ── */
const rightStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const rightItem = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();

  /* ── Profile form state ── */
  const [form, setForm] = useState({
    realName: user?.realName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    department: user?.department || '',
  });
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  /* ── Stats state ── */
  const [stats, setStats] = useState<UserStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    total: 0,
    ratingAvg: 0,
    ratedCount: 0,
    recentOrders: [],
    trendData: [],
  });
  const [statsLoading, setStatsLoading] = useState(true);

  /* ── Fetch user stats ── */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ordersRes, trendRes] = await Promise.allSettled([
          client.get('/orders/my', { params: { page: 1, pageSize: 100 } }),
          client.get('/statistics/trend'),
        ]);

        let orders: OrderItem[] = [];
        if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.code === 200) {
          orders = ordersRes.value.data.data?.list || ordersRes.value.data.data || [];
        }

        let trendData: { date: string; count: number }[] = [];
        if (trendRes.status === 'fulfilled' && trendRes.value.data?.code === 200) {
          const raw = trendRes.value.data.data;
          if (Array.isArray(raw)) {
            trendData = raw.map((t: any) => ({
              date: t.date?.slice(5) || t.label || '', // MM-DD
              count: t.count || t.value || 0,
            }));
          }
        }

        // Compute from orders
        const pending = orders.filter((o) => o.status === 'PENDING' || o.status === 'ASSIGNED').length;
        const processing = orders.filter((o) => o.status === 'PROCESSING').length;
        const completed = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CLOSED').length;
        const ratedOrders = orders.filter((o) => o.rating && o.rating > 0);
        const ratingAvg =
          ratedOrders.length > 0
            ? ratedOrders.reduce((s, o) => s + (o.rating || 0), 0) / ratedOrders.length
            : 0;

        // Recent 5 orders
        const sorted = [...orders].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        const recentOrders = sorted.slice(0, 5);

        setStats({
          pending,
          processing,
          completed,
          total: orders.length,
          ratingAvg: Math.round(ratingAvg * 10) / 10,
          ratedCount: ratedOrders.length,
          recentOrders,
          trendData,
          pendingAssignments: pending, // TCH: same as pending for demo
          todayPendingOrders: pending, // WRK: same as pending for demo
        });
      } catch {
        // Fallback: empty stats
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  /* ── Save profile ── */
  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await client.put('/users/me', form);
      if (res.data.code === 200) {
        updateUser({
          realName: form.realName,
          phone: form.phone,
          email: form.email,
          department: form.department,
        } as any);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password ── */
  const handleChangePwd = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) return;
    setPwdSaving(true);
    try {
      await client.put('/users/me/password', pwdForm);
      setPwdForm({ oldPassword: '', newPassword: '' });
      setShowOldPwd(false);
      setShowNewPwd(false);
      toast.success('密码修改成功');
    } catch {
      toast.error('密码修改失败，请重试');
    } finally {
      setPwdSaving(false);
    }
  };

  /* ── Stat card config ── */
  const statCards = useMemo(() => {
    const cards = [
      {
        label: '我的工单',
        value: stats.total,
        icon: ClipboardList,
        color: '#2563EB',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        iconBg: 'bg-blue-100 dark:bg-blue-800/30',
      },
      {
        label: '待处理',
        value: stats.pending,
        icon: Clock,
        color: '#F59E0B',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        iconBg: 'bg-amber-100 dark:bg-amber-800/30',
      },
      {
        label: '已完成',
        value: stats.completed,
        icon: CheckCircle,
        color: '#10B981',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        iconBg: 'bg-emerald-100 dark:bg-emerald-800/30',
      },
      {
        label: '好评率',
        value: stats.ratingAvg,
        suffix: '%',
        icon: Star,
        color: '#EF4444',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        iconBg: 'bg-rose-100 dark:bg-rose-800/30',
        format: 'rating',
      },
    ];

    // TCH: add pending assignments
    if (user?.role === 'TCH') {
      cards.splice(2, 0, {
        label: '待审批',
        value: stats.pendingAssignments || 0,
        icon: FileText,
        color: '#7C3AED',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        iconBg: 'bg-purple-100 dark:bg-purple-800/30',
      });
    }

    return cards;
  }, [stats, user?.role]);

  const role = user?.role;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ═══════════════════════════════════════════
          LEFT — Profile, Stats, Account, Password
          ═══════════════════════════════════════════ */}
      <div className="w-full lg:w-[42%] space-y-6 flex-shrink-0">
        {/* ── Avatar Section ── */}
        <ScrollReveal>
          <GlassCard className="p-6 sm:p-8 text-center">
            {/* Avatar upload */}
            <div className="flex justify-center mb-2">
              <AvatarUpload
                currentAvatar={user?.avatar || null}
                userName={user?.realName}
                size="lg"
                onUpload={(base64) => {
                  // TODO: POST /users/me/avatar { avatar: base64 }
                  updateUser({ avatar: base64 } as any);
                }}
                onRemove={() => {
                  // TODO: DELETE /users/me/avatar
                  updateUser({ avatar: undefined } as any);
                }}
              />
            </div>

            {/* User name */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {user?.realName || '未设置姓名'}
            </h3>

            {/* Role badge + username */}
            <div className="flex items-center justify-center gap-2">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getRoleBadgeClass(role || ''),
                )}
              >
                {getRoleLabel(role || '')}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                @{user?.username || 'user'}
              </span>
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* ── Stats Mini-Cards (2x2 grid) ── */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => (
            <ScrollReveal key={card.label}>
              <GlassCard className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 truncate">
                      {card.label}
                    </p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {card.format === 'rating' ? (
                          stats.ratedCount === 0 ? (
                            '--'
                          ) : (
                            <AnimatedCounter from={0} to={card.value as number} />
                          )
                        ) : (
                          <AnimatedCounter from={0} to={card.value as number} />
                        )}
                      </span>
                      {card.suffix && (
                        <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                          {card.suffix}
                        </span>
                      )}
                    </div>
                    {card.format === 'rating' && stats.ratedCount > 0 && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        共 {stats.ratedCount} 条评价
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      card.iconBg,
                    )}
                  >
                    <card.icon className="w-4.5 h-4.5" style={{ color: card.color }} />
                  </div>
                </div>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>

        {/* ── Account Info Form ── */}
        <ScrollReveal>
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">账户信息</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <InputField
                icon={User}
                label="姓名"
                value={form.realName}
                onChange={(v) => setForm({ ...form, realName: v })}
              />
              <InputField
                icon={Phone}
                label="电话"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <InputField
                icon={Mail}
                label="邮箱"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <InputField
                icon={Building}
                label="部门"
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
              />
            </div>

            <FlowingButton
              onClick={handleUpdateProfile}
              loading={saving}
              className={
                saved
                  ? '!bg-emerald-500 !from-emerald-500 !to-emerald-600 !border-emerald-500 w-full sm:w-auto'
                  : 'w-full sm:w-auto'
              }
            >
              {saved ? '✓ 已保存' : '保存修改'}
            </FlowingButton>
          </GlassCard>
        </ScrollReveal>

        {/* ── Password Change ── */}
        <ScrollReveal>
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">修改密码</h3>
            </div>

            <div className="space-y-4">
              {/* Old password */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  原密码
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showOldPwd ? 'text' : 'password'}
                    value={pwdForm.oldPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                    placeholder="输入原密码"
                    className="w-full h-11 pl-10 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    aria-label="原密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPwd(!showOldPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showOldPwd ? '隐藏原密码' : '显示原密码'}
                  >
                    {showOldPwd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    placeholder="输入新密码"
                    className="w-full h-11 pl-10 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    aria-label="新密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showNewPwd ? '隐藏新密码' : '显示新密码'}
                  >
                    {showNewPwd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <FlowingButton
                variant="outline"
                onClick={handleChangePwd}
                loading={pwdSaving}
                disabled={!pwdForm.oldPassword || !pwdForm.newPassword}
                className="w-full sm:w-auto"
              >
                修改密码
              </FlowingButton>
            </div>
          </GlassCard>
        </ScrollReveal>
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT — Alert, Trend, Orders, Actions
          ═══════════════════════════════════════════ */}
      <motion.div
        className="w-full lg:w-[58%] space-y-5"
        variants={rightStagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── WRK: Today's pending alert ── */}
        {role === 'WRK' && !statsLoading && (
          <motion.div
            variants={rightItem}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                今日待接单：{stats.todayPendingOrders} 件
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                请及时处理待接单工单
              </p>
            </div>
            <Link
              to="/orders/pending"
              className="ml-auto text-sm text-amber-700 dark:text-amber-300 font-medium hover:text-amber-900 dark:hover:text-amber-100 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              去接单 <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* ── Mini Trend Chart ── */}
        <motion.div variants={rightItem}>
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                近7天工单趋势
              </h4>
            </div>
            {stats.trendData.length > 0 ? (
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.trendData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="profileTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={24}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#profileTrend)"
                      dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#2563EB' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                {statsLoading ? '加载中...' : '暂无工单数据'}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Recent Orders (last 3) ── */}
        <motion.div variants={rightItem}>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  最新工单动态
                </h4>
              </div>
              <Link
                to={
                  role === 'WRK'
                    ? '/orders/tasks'
                    : role === 'ADM'
                    ? '/orders/manage'
                    : '/orders/my'
                }
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                查看全部
              </Link>
            </div>

            {stats.recentOrders.length > 0 ? (
              <div className="space-y-1">
                {stats.recentOrders.slice(0, 3).map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group"
                  >
                    {/* Status dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          order.status === 'PENDING'
                            ? '#F59E0B'
                            : order.status === 'ASSIGNED'
                            ? '#8B5CF6'
                            : order.status === 'PROCESSING'
                            ? '#7C3AED'
                            : order.status === 'COMPLETED'
                            ? '#10B981'
                            : order.status === 'CLOSED'
                            ? '#6B7280'
                            : '#EF4444',
                      }}
                    />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                      {order.title}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                        getStatusColor(order.status),
                      )}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 w-16 text-right">
                      {formatRelativeTime(order.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                {statsLoading ? '加载中...' : '暂无工单记录'}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.div variants={rightItem}>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
            {(role === 'STU' || role === 'TCH') && (
              <Button
                onClick={() => navigate('/orders/submit')}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-medium text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                快速报修
              </Button>
            )}
            <Button
              onClick={() =>
                navigate(
                  role === 'WRK'
                    ? '/orders/tasks'
                    : role === 'ADM'
                    ? '/orders/manage'
                    : '/orders/my',
                )
              }
              variant="outline"
              className="flex-1 h-12 rounded-xl font-medium text-sm border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
            >
              <FileText className="w-4 h-4 mr-2" />
              我的工单
            </Button>
            {(role === 'TCH' || role === 'WRK' || role === 'ADM') && (
              <Button
                onClick={() => toast.info('功能开发中')}
                variant="outline"
                className="flex-1 h-12 rounded-xl font-medium text-sm border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                数据报告
              </Button>
            )}
            {role === 'ADM' && (
              <Button
                onClick={() => navigate('/users')}
                variant="outline"
                className="flex-1 h-12 rounded-xl font-medium text-sm border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                系统管理
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── InputField helper ── */
function InputField({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  icon: any;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
        />
      </div>
    </div>
  );
}
