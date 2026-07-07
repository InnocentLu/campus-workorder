import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  getStatusLabel, getStatusColor, getStatusBgGradient, getPriorityColor,
  formatDate, getRoleLabel, cn,
} from '@/lib/utils';
import { ScrollReveal, FlowingButton, Skeleton } from '@/components/animations';
import {
  ArrowLeft, User, Phone, MapPin, Calendar, Star, Wrench,
  CheckCircle2, Send, Clock, AlertCircle, FileText, MessageSquare,
  ChevronDown, ChevronUp, Package, Image as ImageIcon,
  X, Search, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ============================================================
   Types
   ============================================================ */

interface WorkerOption {
  id: number;
  realName: string;
  username: string;
  phone?: string;
  email?: string;
  department?: string;
}

/* ============================================================
   Helper functions (outside component)
   ============================================================ */

function InfoRow({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: any;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm text-gray-500 dark:text-slate-400 flex-shrink-0">{label}：</span>
      {badge ? (
        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', badge)}>
          {value || '-'}
        </span>
      ) : (
        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{value || '-'}</span>
      )}
    </div>
  );
}

function getStatusBadgeLight(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
    ASSIGNED: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/30',
    PROCESSING: 'bg-purple-400/20 text-purple-200 border-purple-400/30',
    COMPLETED: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30',
    CLOSED: 'bg-white/10 text-white/60 border-white/20',
    CANCELLED: 'bg-red-400/20 text-red-200 border-red-400/30',
  };
  return map[status] || 'bg-white/10 text-white/60 border-white/20';
}

function getHeroBg(status: string): { from: string; to: string } {
  const map: Record<string, { from: string; to: string }> = {
    PENDING: { from: '#F59E0B', to: '#D97706' },
    ASSIGNED: { from: '#6366F1', to: '#7C3AED' },
    PROCESSING: { from: '#7C3AED', to: '#6D28D9' },
    COMPLETED: { from: '#10B981', to: '#059669' },
    CLOSED: { from: '#6B7280', to: '#4B5563' },
    CANCELLED: { from: '#EF4444', to: '#DC2626' },
  };
  return map[status] || { from: '#2563EB', to: '#1D4ED8' };
}

function getStatusDotColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#F59E0B',
    ASSIGNED: '#8B5CF6',
    PROCESSING: '#7C3AED',
    COMPLETED: '#10B981',
    CLOSED: '#6B7280',
    CANCELLED: '#EF4444',
  };
  return map[status] || '#6B7280';
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    SUBMIT: '提交工单',
    ASSIGN: '派单',
    ACCEPT: '接单',
    PROCESS: '处理中',
    COMPLETE: '完成',
    RATE: '评价',
    CANCEL: '取消工单',
  };
  return map[action] || action;
}

function getActionSuccessMsg(action: string): string {
  const map: Record<string, string> = {
    assign: '工单已指派',
    accept: '已接单',
    process: '开始处理',
    complete: '维修完成',
    rating: '评价已提交',
    cancel: '工单已取消',
  };
  return map[action] || '操作成功';
}

const TIMELINE_STEPS = [
  { key: 'SUBMIT', label: '提交工单', icon: Send },
  { key: 'ASSIGN', label: '派单', icon: User },
  { key: 'ACCEPT', label: '接单', icon: CheckCircle2 },
  { key: 'PROCESS', label: '处理中', icon: Wrench },
  { key: 'COMPLETE', label: '完成', icon: Package },
  { key: 'RATE', label: '评价', icon: Star },
] as const;

/* ============================================================
   Main component
   ============================================================ */

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* ---- Core state (preserved from original) ---- */
  const [order, setOrder] = useState<any>(null);
  const [repairContent, setRepairContent] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  /* ---- UI state ---- */
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  /* ---- Collapsible sections ---- */
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [descOpen, setDescOpen] = useState(true);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  const [logsOpen, setLogsOpen] = useState(true);

  /* ---- Image lightbox ---- */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  /* ---- Dispatch modal ---- */
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [workersLoading, setWorkersLoading] = useState(false);

  /* ---- Inline form toggles ---- */
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);

  /* ================================================================
     Data fetching (API calls preserved)
     ================================================================ */

  useEffect(() => {
    setLoading(true);
    client
      .get(`/orders/${id}`)
      .then((res) => {
        if (res.data.code === 200) setOrder(res.data.data);
      })
      .catch(() => {
        toast.error('加载工单详情失败');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const fetchWorkers = useCallback(async () => {
    setWorkersLoading(true);
    try {
      const res = await client.get('/users', { params: { role: 'WRK', pageSize: 100 } });
      if (res.data.code === 200) {
        setWorkers(res.data.data.list || []);
      }
    } catch {
      toast.error('获取维修工列表失败');
    } finally {
      setWorkersLoading(false);
    }
  }, []);

  /* ================================================================
     Actions (API call structure preserved, extended for dispatch)
     ================================================================ */

  const handleAction = useCallback(
    async (action: string, extraBody?: Record<string, any>) => {
      setActionLoading(true);
      try {
        let body: any = { ...extraBody };
        if (action === 'complete') {
          body = { content: repairContent, cost: parseFloat(repairCost) || 0 };
        }
        if (action === 'rating') {
          body = { rating, feedback };
        }
        const res = await client.put(`/orders/${id}/${action}`, body);
        if (res.data.code === 200) {
          setOrder(res.data.data);
          toast.success(getActionSuccessMsg(action));
          // Reset relevant UI state
          if (action === 'complete') {
            setRepairContent('');
            setRepairCost('');
            setShowCompleteForm(false);
          }
          if (action === 'rating') {
            setRating(0);
            setFeedback('');
            setShowRateForm(false);
          }
          if (action === 'assign') {
            setDispatchOpen(false);
            setSelectedWorker(null);
            setWorkerSearch('');
          }
        } else {
          toast.error(res.data.message || '操作失败');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || '操作失败，请稍后重试');
      } finally {
        setActionLoading(false);
      }
    },
    [id, repairContent, repairCost, rating, feedback]
  );

  /* ---- Open dispatch modal ---- */
  const openDispatch = useCallback(() => {
    setDispatchOpen(true);
    setSelectedWorker(null);
    setWorkerSearch('');
    fetchWorkers();
  }, [fetchWorkers]);

  /* ---- Filtered workers ---- */
  const filteredWorkers = useMemo(() => {
    if (!workerSearch.trim()) return workers;
    const q = workerSearch.toLowerCase();
    return workers.filter(
      (w) =>
        w.realName?.toLowerCase().includes(q) ||
        w.username?.toLowerCase().includes(q)
    );
  }, [workers, workerSearch]);

  /* ---- Permissions ---- */
  const canAssign = user?.role === 'ADM' && order?.status === 'PENDING';
  const canAccept = user?.role === 'WRK' && order?.status === 'ASSIGNED';
  const canProcess = user?.role === 'WRK' && order?.status === 'ASSIGNED';
  const canComplete = user?.role === 'WRK' && order?.status === 'PROCESSING';
  const canRate = user?.id === order?.submitterId && order?.status === 'COMPLETED';
  const canCancel =
    user?.id === order?.submitterId && ['PENDING', 'ASSIGNED'].includes(order?.status);
  const showActions =
    canAssign || canAccept || canProcess || canComplete || canRate || canCancel;

  /* ---- Timeline ---- */
  const timelineSteps = useMemo(() => {
    if (!order?.orderLogs) return [];
    return TIMELINE_STEPS.map((step) => {
      const log = order.orderLogs?.find(
        (l: any) => (l.action || '').toUpperCase() === step.key
      );
      return { ...step, log, done: !!log };
    });
  }, [order]);

  const currentTimelineIdx = useMemo(() => {
    const idx = timelineSteps.findIndex((s) => !s.done);
    return idx === -1 ? timelineSteps.length - 1 : idx;
  }, [timelineSteps]);

  /* ---- Derived values ---- */
  const heroBg = getHeroBg(order?.status || 'PENDING');
  const displayRating = hoverRating || rating;

  /* ================================================================
     SKELETON LOADING
     ================================================================ */
  if (loading || !order) {
    return (
      <div className="space-y-6 max-w-4xl" role="status" aria-label="加载中">
        {/* Hero skeleton */}
        <div className="-mx-4 lg:-mx-6 -mt-4 lg:-mt-6 px-4 lg:px-6 pt-8 pb-10 rounded-b-3xl mb-6 overflow-hidden bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 animate-pulse">
          <Skeleton className="h-4 w-20 bg-white/20 rounded mb-6" />
          <Skeleton className="h-4 w-48 bg-white/20 rounded mb-3" />
          <Skeleton className="h-8 w-3/4 bg-white/20 rounded mb-3" />
          <Skeleton className="h-6 w-24 bg-white/20 rounded-full" />
        </div>

        {/* Timeline skeleton */}
        <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton variant="circular" className="w-8 h-8" />
            <Skeleton className="w-24 h-5" />
          </div>
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <Skeleton variant="circular" className="w-10 h-10" />
                  {i < 5 && <div className="w-0.5 flex-1 min-h-[32px] my-1 bg-gray-200 dark:bg-slate-700 rounded" />}
                </div>
                <div className="flex-1 pb-5 space-y-2">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-32 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info cards skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60"
          >
            <div className="flex items-center gap-2 mb-5">
              <Skeleton variant="circular" className="w-8 h-8" />
              <Skeleton className="w-24 h-5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-5" />
              ))}
            </div>
          </div>
        ))}

        <span className="sr-only">正在加载工单详情...</span>
      </div>
    );
  }

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div className="space-y-6 max-w-4xl pb-28">
      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="-mx-4 lg:-mx-6 -mt-4 lg:-mt-6 px-4 lg:px-6 pt-8 pb-10 rounded-b-3xl mb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${heroBg.from}, ${heroBg.to})` }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-6 group"
            aria-label="返回上一页"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            返回列表
          </button>

          {/* Order number */}
          <p className="font-mono text-sm text-white/60 mb-2 tracking-wide">
            {order.orderNo}
          </p>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">
            {order.title}
          </h1>

          {/* Status badge with breathing dot + time */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border backdrop-blur-sm',
                getStatusBadgeLight(order.status)
              )}
            >
              {/* Breathing dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: getStatusDotColor(order.status) }}
                />
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: getStatusDotColor(order.status) }}
                />
              </span>
              {getStatusLabel(order.status)}
            </span>

            {/* Trade tag */}
            {order.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white/90 border border-white/30 backdrop-blur-sm">
                <Wrench className="w-3 h-3" />
                {order.category}
              </span>
            )}

            <span className="text-sm text-white/60 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              提交于 {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ============================================================
          IMAGE PREVIEW (above timeline if present)
          ============================================================ */}
      {order.images?.length > 0 && (
        <ScrollReveal>
          <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                现场图片
                <span className="text-sm font-normal text-gray-400 dark:text-slate-500 ml-2">
                  ({order.images.length})
                </span>
              </h3>
            </div>

            {/* Thumbnail strip */}
            <div
              className="flex gap-3 overflow-x-auto scrollbar-thin pb-2 -mx-1 px-1"
              role="list"
              aria-label="工单现场图片列表"
            >
              {order.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    setLightboxIndex(i);
                    setLightboxOpen(true);
                  }}
                  className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 hover:shadow-lg group"
                  aria-label={`查看第 ${i + 1} 张图片`}
                  role="listitem"
                >
                  <img
                    src={img}
                    alt={`工单现场图片 ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ============================================================
          VERTICAL REPAIR PROGRESS TIMELINE
          ============================================================ */}
      {timelineSteps.length > 0 && (
        <ScrollReveal>
          <div
            className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60"
            role="navigation"
            aria-label="工单进度时间线"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">处理进度</h3>
            </div>

            <div className="relative">
              {timelineSteps.map((step, i) => {
                const isDone = step.done;
                const isCurrent = i === currentTimelineIdx;
                const isFuture = !isDone && !isCurrent;

                return (
                  <div key={step.key} className="flex gap-4 relative">
                    {/* Node + line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.1 * i,
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/25 z-10"
                        >
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </motion.div>
                      ) : isCurrent ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.1 * i,
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="relative z-10"
                        >
                          {/* Pulsing blue ring */}
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 dark:bg-blue-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 dark:bg-blue-400" />
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-slate-500 z-10">
                          <step.icon className="w-5 h-5" />
                        </div>
                      )}

                      {/* Vertical connector line */}
                      {i < timelineSteps.length - 1 && (
                        <div
                          className={cn(
                            'w-0.5 flex-1 min-h-[28px]',
                            isDone && timelineSteps[i + 1]?.done
                              ? 'bg-blue-500 dark:bg-blue-600'
                              : isDone && !timelineSteps[i + 1]?.done
                              ? 'bg-gradient-to-b from-blue-500 to-gray-200 dark:from-blue-600 dark:to-slate-600'
                              : 'bg-gray-200 dark:bg-slate-600'
                          )}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div
                      className={cn(
                        'pb-6 flex-1 min-w-0',
                        i === timelineSteps.length - 1 && 'pb-0'
                      )}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            isDone
                              ? 'text-gray-900 dark:text-gray-100'
                              : isCurrent
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-gray-400 dark:text-slate-500'
                          )}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                            进行中
                          </span>
                        )}
                      </div>

                      {step.log && (
                        <>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            {formatDate(step.log.createdAt)}
                          </p>
                          {step.log.operator?.realName && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                              操作人：{step.log.operator.realName}
                            </p>
                          )}
                          {step.log.remark && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 italic">
                              {step.log.remark}
                            </p>
                          )}
                        </>
                      )}

                      {isFuture && (
                        <p className="text-xs text-gray-300 dark:text-slate-600 mt-0.5">
                          等待中
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ============================================================
          INFO CARDS (collapsible)
          ============================================================ */}

      {/* --- Basic Info --- */}
      <ScrollReveal>
        <div className="glass-strong rounded-2xl dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60 overflow-hidden">
          <button
            onClick={() => setBasicInfoOpen(!basicInfoOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
            aria-expanded={basicInfoOpen}
            aria-controls="basic-info-panel"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">基本信息</h3>
            </div>
            {basicInfoOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {basicInfoOpen && (
              <motion.div
                id="basic-info-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoRow
                    icon={User}
                    label="提交人"
                    value={`${order.submitter?.realName || '-'} (${getRoleLabel(order.submitter?.role)})`}
                  />
                  <InfoRow
                    icon={User}
                    label="维修工"
                    value={order.assignee?.realName || '待指派'}
                  />
                  <InfoRow icon={FileText} label="类别" value={order.category || '-'} />
                  <InfoRow
                    icon={AlertCircle}
                    label="优先级"
                    value={order.priority || '-'}
                    badge={getPriorityColor(order.priority)}
                  />
                  {order.location && (
                    <InfoRow icon={MapPin} label="位置" value={order.location} />
                  )}
                  {order.contactPhone && (
                    <InfoRow icon={Phone} label="联系电话" value={order.contactPhone} />
                  )}
                  {order.scheduledTime && (
                    <InfoRow
                      icon={Calendar}
                      label="预约时间"
                      value={formatDate(order.scheduledTime)}
                    />
                  )}
                  {/* Status row (not in hero context) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm text-gray-500 dark:text-slate-400 flex-shrink-0">状态：</span>
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', getStatusColor(order.status))}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollReveal>

      {/* --- Description --- */}
      <ScrollReveal>
        <div
          className={cn(
            'glass-strong rounded-2xl dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60 overflow-hidden',
            getStatusBgGradient(order.status)
          )}
        >
          <button
            onClick={() => setDescOpen(!descOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
            aria-expanded={descOpen}
            aria-controls="desc-panel"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">工单描述</h3>
            </div>
            {descOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {descOpen && (
              <motion.div
                id="desc-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {order.description || '无描述'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollReveal>

      {/* --- Repair Records (accordion) --- */}
      {order.repairRecords?.length > 0 && (
        <ScrollReveal>
          <div className="glass-strong rounded-2xl dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60 overflow-hidden">
            <button
              onClick={() => setRecordsExpanded(!recordsExpanded)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
              aria-expanded={recordsExpanded}
              aria-controls="records-panel"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  维修记录
                  <span className="text-sm font-normal text-gray-400 dark:text-slate-500 ml-2">
                    ({order.repairRecords.length} 条)
                  </span>
                </h3>
              </div>
              {recordsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              )}
            </button>

            {/* Always show first record */}
            <div className="px-6 pb-3">
              <div className="p-4 bg-gray-50/80 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-600/50">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {order.repairRecords[0].content}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
                  {order.repairRecords[0].cost > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-gray-400 dark:text-slate-500">费用：</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        ¥{Number(order.repairRecords[0].cost).toFixed(2)}
                      </span>
                    </span>
                  )}
                  {order.repairRecords[0].usedParts && (
                    <span>
                      配件：{order.repairRecords[0].usedParts}
                    </span>
                  )}
                  {order.repairRecords[0].handler?.realName && (
                    <span>处理人：{order.repairRecords[0].handler.realName}</span>
                  )}
                  <span>{formatDate(order.repairRecords[0].createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Collapsible remaining records */}
            <AnimatePresence initial={false}>
              {recordsExpanded && (
                <motion.div
                  id="records-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-3">
                    {order.repairRecords.slice(1).map((r: any, idx: number) => (
                      <div
                        key={r.id || idx}
                        className="p-4 bg-gray-50/80 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-600/50"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {r.content}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
                          {r.cost > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-gray-400 dark:text-slate-500">费用：</span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                ¥{Number(r.cost).toFixed(2)}
                              </span>
                            </span>
                          )}
                          {r.usedParts && <span>配件：{r.usedParts}</span>}
                          {r.handler?.realName && <span>处理人：{r.handler.realName}</span>}
                          <span>{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>
      )}

      {/* --- Rating (if already rated) --- */}
      {order.rating && (
        <ScrollReveal>
          <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">用户评价</h3>
            </div>

            {/* Animated stars */}
            <div className="flex items-center gap-1 mb-3" role="img" aria-label={`${order.rating} 星评价`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                >
                  <Star
                    className={cn(
                      'w-6 h-6',
                      i <= order.rating!
                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                        : 'text-gray-200 dark:text-slate-600'
                    )}
                    aria-hidden="true"
                  />
                </motion.div>
              ))}
            </div>

            {order.feedback && (
              <p className="text-sm text-gray-600 dark:text-slate-400 bg-gray-50/50 dark:bg-slate-700/30 rounded-xl p-3 italic">
                "{order.feedback}"
              </p>
            )}
          </div>
        </ScrollReveal>
      )}

      {/* --- Operation Logs --- */}
      {order.orderLogs?.length > 0 && (
        <ScrollReveal>
          <div className="glass-strong rounded-2xl dark:bg-slate-800/88 dark:border-slate-700/30 border border-blue-100/60 overflow-hidden">
            <button
              onClick={() => setLogsOpen(!logsOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
              aria-expanded={logsOpen}
              aria-controls="logs-panel"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  操作日志
                  <span className="text-sm font-normal text-gray-400 dark:text-slate-500 ml-2">
                    ({order.orderLogs.length})
                  </span>
                </h3>
              </div>
              {logsOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {logsOpen && (
                <motion.div
                  id="logs-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-0" role="list" aria-label="工单操作日志">
                    {order.orderLogs.map((log: any, i: number) => (
                      <div key={log.id || i} className="flex gap-3" role="listitem">
                        {/* Node + line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div
                            className={cn(
                              'w-2.5 h-2.5 rounded-full mt-1.5',
                              i === 0
                                ? 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/40'
                                : 'bg-gray-300 dark:bg-slate-600'
                            )}
                          />
                          {i < order.orderLogs.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-600 my-0.5" />
                          )}
                        </div>

                        {/* Log content */}
                        <div className="flex-1 pb-4 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getActionLabel(log.action)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                          {log.remark && (
                            <p className="text-sm text-gray-500 dark:text-slate-400 whitespace-pre-wrap">
                              {log.remark}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                            {log.operator?.realName || '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>
      )}

      {/* ============================================================
          IMAGE LIGHTBOX MODAL
          ============================================================ */}
      <AnimatePresence>
        {lightboxOpen && order.images?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="图片预览"
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="关闭图片预览"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Previous button */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((p) => p - 1);
                }}
                className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="上一张图片"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next button */}
            {lightboxIndex < order.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((p) => p + 1);
                }}
                className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="下一张图片"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Image with key-based animation */}
            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              src={order.images[lightboxIndex]}
              alt={`工单现场图片 ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {lightboxIndex + 1} / {order.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          DISPATCH MODAL
          ============================================================ */}
      <AnimatePresence>
        {dispatchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDispatchOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="指派维修工"
          >
            {/* Glass backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">指派维修工</h3>
                </div>
                <button
                  onClick={() => setDispatchOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                </button>
              </div>

              {/* Search bar */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    placeholder="搜索维修工姓名..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    aria-label="搜索维修工"
                  />
                </div>
              </div>

              {/* Worker list */}
              <div className="flex-1 overflow-y-auto p-2">
                {workersLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm text-gray-400 dark:text-slate-500">加载中...</span>
                  </div>
                ) : filteredWorkers.length === 0 ? (
                  <p className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">
                    {workerSearch ? '未找到匹配的维修工' : '暂无可用的维修工'}
                  </p>
                ) : (
                  <div role="listbox" aria-label="维修工列表" className="space-y-1">
                    {filteredWorkers.map((w) => (
                      <button
                        key={w.id}
                        onClick={() =>
                          setSelectedWorker(w.id === selectedWorker ? null : w.id)
                        }
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                          selectedWorker === w.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600 shadow-sm'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border-2 border-transparent'
                        )}
                        role="option"
                        aria-selected={selectedWorker === w.id}
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {w.realName?.charAt(0) || '?'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {w.realName || w.username}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            @{w.username}
                            {w.department ? ` · ${w.department}` : ''}
                          </p>
                        </div>

                        {/* Checkmark */}
                        {selectedWorker === w.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                <Button
                  variant="outline"
                  onClick={() => setDispatchOpen(false)}
                >
                  取消
                </Button>
                <FlowingButton
                  onClick={() => {
                    if (selectedWorker) {
                      handleAction('assign', { assigneeId: selectedWorker });
                    } else {
                      toast.error('请选择一位维修工');
                    }
                  }}
                  disabled={!selectedWorker || actionLoading}
                  loading={actionLoading}
                  aria-label="确认指派选中的维修工"
                >
                  确认指派
                </FlowingButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          STICKY ACTION BAR (fixed at bottom)
          ============================================================ */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-3"
          >
            <div
              className="max-w-4xl mx-auto glass-strong rounded-2xl p-4 shadow-xl border border-blue-100/60 dark:border-slate-700/30 dark:bg-slate-800/92 backdrop-blur-xl"
              role="toolbar"
              aria-label="工单操作"
            >
              <div className="flex flex-wrap items-end gap-3">
                {/* Assign - opens dispatch modal */}
                {canAssign && (
                  <FlowingButton
                    onClick={openDispatch}
                    aria-label="指派维修工处理此工单"
                  >
                    <User className="w-4 h-4" />
                    指派维修工
                  </FlowingButton>
                )}

                {/* Accept */}
                {canAccept && (
                  <FlowingButton
                    onClick={() => handleAction('accept')}
                    loading={actionLoading}
                    aria-label="接受此工单"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    接单
                  </FlowingButton>
                )}

                {/* Start processing */}
                {canProcess && (
                  <FlowingButton
                    onClick={() => handleAction('process')}
                    loading={actionLoading}
                    aria-label="开始处理此工单"
                  >
                    <Wrench className="w-4 h-4" />
                    开始处理
                  </FlowingButton>
                )}

                {/* Complete - with inline form */}
                {canComplete && (
                  <div className="flex flex-wrap items-end gap-3 w-full">
                    {!showCompleteForm ? (
                      <FlowingButton
                        onClick={() => setShowCompleteForm(true)}
                        aria-label="展开完成维修表单"
                      >
                        <Package className="w-4 h-4" />
                        完成维修
                      </FlowingButton>
                    ) : (
                      <>
                        <div className="flex-1 min-w-[180px]">
                          <label
                            htmlFor="repair-content"
                            className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
                          >
                            维修内容 <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            id="repair-content"
                            value={repairContent}
                            onChange={(e) => setRepairContent(e.target.value)}
                            placeholder="请描述维修过程和结果"
                            rows={2}
                            className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none transition-all"
                          />
                        </div>
                        <div className="w-28">
                          <label
                            htmlFor="repair-cost"
                            className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
                          >
                            费用 (元)
                          </label>
                          <input
                            id="repair-cost"
                            type="number"
                            value={repairCost}
                            onChange={(e) => setRepairCost(e.target.value)}
                            placeholder="0"
                            className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                          />
                        </div>
                        <div className="flex gap-2">
                          <FlowingButton
                            onClick={() => handleAction('complete')}
                            disabled={!repairContent.trim() || actionLoading}
                            loading={actionLoading}
                            aria-label="确认完成维修"
                          >
                            确认完成
                          </FlowingButton>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowCompleteForm(false);
                              setRepairContent('');
                              setRepairCost('');
                            }}
                            aria-label="取消完成维修"
                          >
                            取消
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Rate - with inline form */}
                {canRate && (
                  <div className="flex flex-wrap items-end gap-3 w-full">
                    {!showRateForm ? (
                      <FlowingButton
                        onClick={() => setShowRateForm(true)}
                        aria-label="展开评价工单表单"
                      >
                        <Star className="w-4 h-4" />
                        评价工单
                      </FlowingButton>
                    ) : (
                      <>
                        {/* Stars */}
                        <div>
                          <span
                            className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
                            id="action-rating-label"
                          >
                            评分
                          </span>
                          <div
                            className="flex gap-1"
                            role="radiogroup"
                            aria-labelledby="action-rating-label"
                          >
                            {[1, 2, 3, 4, 5].map((i) => (
                              <button
                                key={i}
                                onClick={() => setRating(i)}
                                onMouseEnter={() => setHoverRating(i)}
                                onMouseLeave={() => setHoverRating(0)}
                                aria-label={`${i} 星`}
                                role="radio"
                                aria-checked={i === rating}
                                className="cursor-pointer hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                              >
                                <Star
                                  className={cn(
                                    'w-7 h-7 transition-colors duration-150',
                                    i <= displayRating
                                      ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                                      : 'text-gray-300 dark:text-slate-600 hover:text-yellow-300'
                                  )}
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Feedback */}
                        <div className="flex-1 min-w-[180px]">
                          <label
                            htmlFor="rating-feedback"
                            className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
                          >
                            评价内容
                          </label>
                          <input
                            id="rating-feedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="分享您的体验..."
                            className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                          />
                        </div>

                        <div className="flex gap-2">
                          <FlowingButton
                            onClick={() => handleAction('rating')}
                            disabled={!rating || actionLoading}
                            loading={actionLoading}
                            aria-label="提交工单评价"
                          >
                            提交评价
                          </FlowingButton>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowRateForm(false);
                              setRating(0);
                              setFeedback('');
                            }}
                            aria-label="取消评价"
                          >
                            取消
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Cancel */}
                {canCancel && (
                  <Button
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={() => {
                      if (confirm('确认取消该工单？此操作不可撤销。')) {
                        handleAction('cancel');
                      }
                    }}
                    aria-label="取消此工单"
                  >
                    取消工单
                  </Button>
                )}

                {/* Spinner for non-inline actions */}
                {actionLoading &&
                  !canComplete &&
                  !canRate && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}