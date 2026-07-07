import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  getStatusLabel, getStatusColor, getPriorityColor, formatDate, getRoleLabel, cn,
} from '@/lib/utils';
import { ScrollReveal, FlowingButton } from '@/components/animations';
import {
  ArrowLeft, User, Phone, MapPin, Calendar, Star, Wrench,
  CheckCircle2, Send, Clock, AlertCircle, FileText, MessageSquare,
  ChevronDown, ChevronUp, Package, Image as ImageIcon, X, Search, Loader2,
} from 'lucide-react';

/* ── Types ── */
interface WorkerOption {
  id: number;
  realName: string;
  username: string;
  department?: string;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* ── Order state ── */
  const [order, setOrder] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Complete form ── */
  const [repairContent, setRepairContent] = useState('');
  const [repairCost, setRepairCost] = useState('');

  /* ── Rating ── */
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [feedback, setFeedback] = useState('');

  /* ── Repair records collapse ── */
  const [recordsExpanded, setRecordsExpanded] = useState(false);

  /* ── Image lightbox ── */
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  /* ── Dispatch modal ── */
  const [showDispatch, setShowDispatch] = useState(false);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [workersLoading, setWorkersLoading] = useState(false);

  /* ── Fetch order ── */
  useEffect(() => {
    client.get(`/orders/${id}`).then((res) => {
      if (res.data.code === 200) setOrder(res.data.data);
    });
  }, [id]);

  /* ── Actions ── */
  const handleAction = async (action: string, extraBody?: Record<string, any>) => {
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
        setShowDispatch(false);
        setRepairContent('');
        setRepairCost('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '操作失败，请稍后重试');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Fetch workers for dispatch ── */
  const fetchWorkers = async () => {
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
  };

  const openDispatch = () => {
    setShowDispatch(true);
    setSelectedWorker(null);
    setWorkerSearch('');
    fetchWorkers();
  };

  const filteredWorkers = workers.filter(
    (w) =>
      !workerSearch ||
      w.realName.includes(workerSearch) ||
      w.username.includes(workerSearch),
  );

  /* ── Loading ── */
  if (!order) {
    return (
      <div className="space-y-6 max-w-4xl" role="status" aria-label="加载中">
        <div className="h-48 skeleton rounded-b-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
        <span className="sr-only">正在加载工单详情...</span>
      </div>
    );
  }

  /* ── Timeline steps ── */
  const timelineSteps = [
    { label: '提交工单', icon: Send, time: order.createdAt, actor: order.submitter?.realName, done: true },
    { label: '派单', icon: User, time: order.orderLogs?.find((l: any) => l.action === 'ASSIGN')?.createdAt, actor: order.assigner?.realName, done: !!order.assigneeId },
    { label: '接单', icon: CheckCircle2, time: order.acceptedAt, actor: order.assignee?.realName, done: !!order.acceptedAt },
    { label: '处理中', icon: Wrench, time: order.processingAt, actor: order.assignee?.realName, done: !!order.processingAt },
    { label: '完成', icon: Package, time: order.completedAt, actor: order.assignee?.realName, done: !!order.completedAt },
    { label: '评价', icon: Star, time: order.rating ? order.closedAt : null, actor: order.submitter?.realName, done: !!order.rating },
  ];

  const currentIdx = timelineSteps.findIndex((s) => !s.done);
  const activeIdx = currentIdx === -1 ? timelineSteps.length - 1 : currentIdx;

  /* ── Permissions ── */
  const canAssign = user?.role === 'ADM' && order.status === 'PENDING';
  const canAccept = user?.role === 'WRK' && order.status === 'ASSIGNED';
  const canProcess = user?.role === 'WRK' && order.status === 'ASSIGNED';
  const canComplete = user?.role === 'WRK' && order.status === 'PROCESSING';
  const canRate = user?.id === order.submitterId && order.status === 'COMPLETED';
  const canCancel = user?.id === order.submitterId && ['PENDING', 'ASSIGNED'].includes(order.status);
  const showActions = canAssign || canAccept || canProcess || canComplete || canRate || canCancel;

  const heroBg = getHeroBg(order.status);

  return (
    <div className="space-y-0 max-w-4xl">
      {/* ═══════════ HERO ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="-mx-4 lg:-mx-6 -mt-4 lg:-mt-6 px-4 lg:px-6 pt-8 pb-10 rounded-b-3xl mb-6"
        style={{ background: `linear-gradient(135deg, ${heroBg.from}, ${heroBg.to})` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-6"
          aria-label="返回工单列表"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <p className="font-mono text-sm text-white/60 mb-2">{order.orderNo}</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">{order.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border backdrop-blur-sm',
                getStatusBadgeLight(order.status),
              )}>
                <span className="status-dot active" style={{ backgroundColor: getStatusDotHex(order.status) }} />
                {getStatusLabel(order.status)}
              </span>
              <span className="text-white/50 text-sm">{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════ CONTENT GRID ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Timeline + Description */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── VERTICAL TIMELINE ── */}
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" />
                报修进度
              </h3>
              <div className="space-y-0" role="list" aria-label="工单进度时间轴">
                {timelineSteps.map((step, i) => (
                  <div key={i} className="flex gap-4" role="listitem">
                    {/* Timeline node + line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                          step.done
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                            : i === activeIdx
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-4 ring-primary-100 dark:ring-primary-900/20'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500',
                        )}
                      >
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <step.icon className="w-4 h-4" />
                        )}
                      </motion.div>
                      {i < timelineSteps.length - 1 && (
                        <div
                          className={cn(
                            'w-0.5 flex-1 min-h-[20px] my-1 transition-colors duration-300',
                            step.done && timelineSteps[i + 1]?.done
                              ? 'bg-primary-400'
                              : step.done && !timelineSteps[i + 1]?.done
                              ? 'bg-gradient-to-b from-primary-400 to-gray-200 dark:to-slate-600'
                              : 'bg-gray-200 dark:bg-slate-600',
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className={cn('pb-5 flex-1', !step.done && i >= activeIdx && 'opacity-60')}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-semibold',
                          step.done ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-slate-400',
                        )}>
                          {step.label}
                        </span>
                        {i === activeIdx && !step.done && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium">
                            进行中
                          </span>
                        )}
                      </div>
                      {step.time && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          {formatDate(step.time)}
                        </p>
                      )}
                      {step.actor && step.done && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {step.actor}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* ── Description ── */}
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                工单描述
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {order.description || '无描述'}
              </p>
            </div>
          </ScrollReveal>

          {/* ── Images ── */}
          {order.images?.length > 0 && (
            <ScrollReveal>
              <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  现场图片
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                  {order.images.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setLightboxImage(img)}
                      className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 hover:ring-2 hover:ring-primary-400 transition-all cursor-pointer group"
                      aria-label={`查看图片 ${i + 1}`}
                    >
                      <img
                        src={img}
                        alt={`工单图片 ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ── Repair Records (collapsible) ── */}
          {order.repairRecords?.length > 0 && (
            <ScrollReveal>
              <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
                <button
                  onClick={() => setRecordsExpanded(!recordsExpanded)}
                  className="w-full flex items-center justify-between mb-1"
                  aria-expanded={recordsExpanded}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-500" />
                    维修记录
                    <span className="text-xs text-gray-400 font-normal">
                      ({order.repairRecords.length} 条)
                    </span>
                  </h3>
                  {recordsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Always show first record */}
                <div className="mt-4 p-4 bg-gray-50/80 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-600/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{order.repairRecords[0].content}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
                    {order.repairRecords[0].cost > 0 && (
                      <span>费用：¥{Number(order.repairRecords[0].cost).toFixed(2)}</span>
                    )}
                    {order.repairRecords[0].usedParts && <span>配件：{order.repairRecords[0].usedParts}</span>}
                    {order.repairRecords[0].handler?.realName && <span>处理人：{order.repairRecords[0].handler.realName}</span>}
                    <span>{formatDate(order.repairRecords[0].createdAt)}</span>
                  </div>
                </div>

                {/* Collapsed records */}
                <AnimatePresence>
                  {recordsExpanded &&
                    order.repairRecords.slice(1).map((r: any) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 bg-gray-50/80 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-600/50">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{r.content}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
                            {r.cost > 0 && <span>费用：¥{Number(r.cost).toFixed(2)}</span>}
                            {r.usedParts && <span>配件：{r.usedParts}</span>}
                            {r.handler?.realName && <span>处理人：{r.handler.realName}</span>}
                            <span>{formatDate(r.createdAt)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* Right column: Info + Rating + Logs */}
        <div className="space-y-5">
          {/* ── Basic Info ── */}
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-5 dark:bg-slate-800/88 dark:border-slate-700/30">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                基本信息
              </h3>
              <div className="space-y-3 text-sm">
                <InfoRow icon={User} label="提交人" value={`${order.submitter?.realName} (${getRoleLabel(order.submitter?.role)})`} />
                <InfoRow icon={User} label="维修工" value={order.assignee?.realName || '待指派'} />
                <InfoRow icon={FileText} label="类别" value={order.category} />
                <InfoRow icon={AlertCircle} label="优先级" value={order.priority} badge={getPriorityColor(order.priority)} />
                {order.location && <InfoRow icon={MapPin} label="位置" value={order.location} />}
                {order.contactPhone && <InfoRow icon={Phone} label="电话" value={order.contactPhone} />}
                {order.scheduledTime && <InfoRow icon={Calendar} label="预约时间" value={formatDate(order.scheduledTime)} />}
              </div>
            </div>
          </ScrollReveal>

          {/* ── Rating ── */}
          {order.rating ? (
            <ScrollReveal>
              <div className="glass-strong rounded-2xl p-5 dark:bg-slate-800/88 dark:border-slate-700/30">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  用户评价
                </h3>
                <div className="flex items-center gap-1 mb-3" role="img" aria-label={`${order.rating} 星评价`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-5 h-5',
                        i <= order.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-slate-600',
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                {order.feedback && <p className="text-sm text-gray-600 dark:text-slate-400 italic">"{order.feedback}"</p>}
              </div>
            </ScrollReveal>
          ) : null}

          {/* ── Operation Logs ── */}
          {order.orderLogs?.length > 0 && (
            <ScrollReveal>
              <div className="glass-strong rounded-2xl p-5 dark:bg-slate-800/88 dark:border-slate-700/30">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  操作日志
                </h3>
                <div className="space-y-0" role="list">
                  {order.orderLogs.slice(0, 8).map((log: any, i: number) => (
                    <div key={log.id} className="flex gap-2.5" role="listitem">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5',
                          i === 0 ? 'bg-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30' : 'bg-gray-300 dark:bg-slate-600',
                        )} />
                        {i < Math.min(order.orderLogs.length, 8) - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-600 my-0.5" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{log.action}</p>
                        {log.remark && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{log.remark}</p>}
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                          {log.operator?.realName} · {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>

      {/* ═══════════ STICKY ACTION BAR ═══════════ */}
      {showActions && (
        <div className="glass-strong rounded-2xl p-5 sticky bottom-4 z-20 shadow-xl border border-blue-100/60 dark:border-slate-700/30 dark:bg-slate-800/95 mt-5" role="toolbar" aria-label="工单操作">
          <div className="flex flex-wrap items-end gap-3">
            {canAssign && (
              <FlowingButton onClick={openDispatch} aria-label="指派维修工">
                <User className="w-4 h-4" /> 指派维修工
              </FlowingButton>
            )}
            {canAccept && (
              <FlowingButton onClick={() => handleAction('accept')} aria-label="接受此工单">
                <CheckCircle2 className="w-4 h-4" /> 接单
              </FlowingButton>
            )}
            {canProcess && (
              <FlowingButton onClick={() => handleAction('process')} aria-label="开始处理此工单">
                <Wrench className="w-4 h-4" /> 开始处理
              </FlowingButton>
            )}
            {canComplete && (
              <div className="flex flex-wrap items-end gap-3 w-full">
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="repair-content" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    维修内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="repair-content"
                    value={repairContent}
                    onChange={(e) => setRepairContent(e.target.value)}
                    placeholder="请描述维修过程和结果"
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
                  />
                </div>
                <div className="w-28">
                  <label htmlFor="repair-cost" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">费用 (元)</label>
                  <input
                    id="repair-cost"
                    type="number"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
                <FlowingButton
                  onClick={() => handleAction('complete')}
                  disabled={!repairContent || actionLoading}
                  loading={actionLoading}
                  aria-label="确认完成维修"
                >
                  完成维修
                </FlowingButton>
              </div>
            )}
            {canRate && (
              <div className="flex flex-wrap items-end gap-3 w-full">
                <div>
                  <span className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1" id="rating-label">评分</span>
                  <div className="flex gap-1" role="radiogroup" aria-labelledby="rating-label">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        onClick={() => setRating(i)}
                        onMouseEnter={() => setRatingHover(i)}
                        onMouseLeave={() => setRatingHover(0)}
                        aria-label={`${i} 星`}
                        role="radio"
                        aria-checked={i === rating}
                        className="cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Star
                          className={cn(
                            'w-7 h-7 transition-colors duration-150',
                            i <= (ratingHover || rating)
                              ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                              : 'text-gray-300 dark:text-slate-600 hover:text-yellow-300',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="rating-feedback" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">评价内容</label>
                  <input
                    id="rating-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="说说您的感受..."
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
                <FlowingButton
                  onClick={() => handleAction('rating')}
                  disabled={!rating || actionLoading}
                  loading={actionLoading}
                  aria-label="提交工单评价"
                >
                  提交评价
                </FlowingButton>
              </div>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={() => {
                  if (confirm('确认取消该工单？此操作不可撤销。')) handleAction('cancel');
                }}
                aria-label="取消此工单"
              >
                取消工单
              </Button>
            )}
            {actionLoading && !canComplete && !canRate && (
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            )}
          </div>
        </div>
      )}

      {/* ═══════════ DISPATCH MODAL ═══════════ */}
      <AnimatePresence>
        {showDispatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDispatch(false)}
            aria-modal="true"
            role="dialog"
            aria-label="指派维修工"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">指派维修工</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowDispatch(false)} aria-label="关闭">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="搜索维修工姓名..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    aria-label="搜索维修工"
                  />
                </div>
              </div>

              {/* Worker list */}
              <div className="flex-1 overflow-y-auto p-2">
                {workersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : filteredWorkers.length === 0 ? (
                  <p className="text-center py-12 text-sm text-gray-400">暂无可用维修工</p>
                ) : (
                  <div className="space-y-1">
                    {filteredWorkers.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWorker(w.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                          selectedWorker === w.id
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border-2 border-transparent',
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {w.realName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{w.realName}</p>
                          <p className="text-xs text-gray-400">@{w.username}{w.department ? ` · ${w.department}` : ''}</p>
                        </div>
                        {selectedWorker === w.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary-600 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowDispatch(false)}>取消</Button>
                <Button
                  onClick={() => {
                    if (selectedWorker) {
                      handleAction('assign', { assigneeId: selectedWorker });
                    } else {
                      toast.error('请选择一位维修工');
                    }
                  }}
                  disabled={!selectedWorker || actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  确认指派
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ IMAGE LIGHTBOX ═══════════ */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLightboxImage(null)}
            aria-modal="true"
            role="dialog"
            aria-label="图片预览"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
              aria-label="关闭预览"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImage}
              alt="工单图片预览"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showActions && <div className="h-4" />}
    </div>
  );
}

/* ═══════════════════════════ HELPERS ═══════════════════════════ */

function InfoRow({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
      <span className="text-gray-500 dark:text-slate-400 flex-shrink-0 text-xs">{label}</span>
      <span className="flex-1 min-w-0" />
      {badge ? (
        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-medium border', badge)}>{value || '-'}</span>
      ) : (
        <span className="text-gray-800 dark:text-gray-200 font-medium text-xs truncate text-right">{value || '-'}</span>
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

function getStatusDotHex(status: string): string {
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
