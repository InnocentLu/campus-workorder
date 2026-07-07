import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { getStatusLabel, getStatusColor, getStatusBgGradient, getPriorityColor, formatDate, getRoleLabel, cn } from '@/lib/utils';
import { ScrollReveal, FlowingButton } from '@/components/animations';
import {
  ArrowLeft, User, Phone, MapPin, Calendar, Star, Wrench,
  CheckCircle2, Send, Clock, AlertCircle, FileText, MessageSquare,
  ChevronRight, Package,
} from 'lucide-react';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [repairContent, setRepairContent] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    client.get(`/orders/${id}`).then((res) => {
      if (res.data.code === 200) setOrder(res.data.data);
    });
  }, [id]);

  const handleAction = async (action: string) => {
    try {
      let body: any = {};
      if (action === 'complete') {
        body = { content: repairContent, cost: parseFloat(repairCost) || 0 };
      }
      if (action === 'rating') {
        body = { rating, feedback };
      }
      const res = await client.put(`/orders/${id}/${action}`, body);
      if (res.data.code === 200) {
        setOrder(res.data.data);
      }
    } catch (err: any) {
      // error handled silently
    }
  };

  // Loading state
  if (!order) {
    return (
      <div className="space-y-6 max-w-4xl" aria-label="加载中" role="status">
        <div className="h-48 skeleton rounded-2xl" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-10 h-10 rounded-full skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 skeleton rounded-2xl" />
          ))}
        </div>
        <span className="sr-only">正在加载工单详情...</span>
      </div>
    );
  }

  const steps = [
    { label: '提交工单', icon: Send, time: order.createdAt },
    { label: '派单', icon: User, time: order.orderLogs?.find((l: any) => l.action === 'ASSIGN')?.createdAt },
    { label: '接单', icon: CheckCircle2, time: order.acceptedAt },
    { label: '处理中', icon: Wrench, time: order.processingAt },
    { label: '完成', icon: Package, time: order.completedAt },
    { label: '评价', icon: Star, time: order.rating ? order.closedAt : null },
  ];

  const currentStepIndex = steps.reduce(
    (acc, s, i) => (s.time ? i + 1 : acc), 0,
  );

  const canAssign = user?.role === 'ADM' && order.status === 'PENDING';
  const canAccept = user?.role === 'WRK' && order.status === 'ASSIGNED';
  const canProcess = user?.role === 'WRK' && order.status === 'ASSIGNED';
  const canComplete = user?.role === 'WRK' && order.status === 'PROCESSING';
  const canRate = user?.id === order.submitterId && order.status === 'COMPLETED';
  const canCancel = user?.id === order.submitterId && ['PENDING', 'ASSIGNED'].includes(order.status);
  const showActions = canAssign || canAccept || canProcess || canComplete || canRate || canCancel;

  return (
    <div className="space-y-0 max-w-4xl">
      {/* === HERO SECTION === */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="-mx-4 lg:-mx-6 -mt-4 lg:-mt-6 px-4 lg:px-6 pt-8 pb-10 bg-gradient-to-br rounded-b-3xl mb-6"
        style={{
          background: `linear-gradient(135deg, ${getHeroBg(order.status).from}, ${getHeroBg(order.status).to})`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <p className="font-mono text-sm text-white/60 mb-2">{order.orderNo}</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">{order.title}</h1>
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border backdrop-blur-sm',
              getStatusBadgeLight(order.status),
            )}>
              <span className="status-dot active" style={{ backgroundColor: 'currentColor' }} />
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* === HORIZONTAL STEPPER (sticky) === */}
      <div className="sticky top-16 z-20 -mx-2 px-2 py-4 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-blue-100/60 dark:border-slate-700/60 mb-6" role="navigation" aria-label="工单进度">
        <div className="flex items-start gap-0 overflow-x-auto scrollbar-thin pb-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1 min-w-[72px]">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors duration-300',
                    step.time
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500',
                  )}
                  aria-current={i === currentStepIndex - 1 ? 'step' : undefined}
                >
                  {step.time ? <CheckCircle2 className="w-5 h-5" /> : <span aria-hidden="true">{i + 1}</span>}
                </motion.div>
                <p className={cn('text-xs mt-1.5 font-medium', step.time ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-slate-500')}>{step.label}</p>
                {step.time && <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">{formatDate(step.time)}</p>}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 mt-5 transition-colors duration-300',
                  steps[i + 1].time ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600',
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* === INFO CARDS (scroll-revealed) === */}
      <div className="space-y-4">
        {/* Basic Info */}
        <ScrollReveal>
          <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">基本信息</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoRow icon={User} label="提交人" value={`${order.submitter?.realName} (${getRoleLabel(order.submitter?.role)})`} />
              <InfoRow icon={User} label="维修工" value={order.assignee?.realName || '待指派'} />
              <InfoRow icon={FileText} label="类别" value={order.category} />
              <InfoRow icon={AlertCircle} label="优先级" value={order.priority} badge={getPriorityColor(order.priority)} />
              {order.location && <InfoRow icon={MapPin} label="位置" value={order.location} />}
              {order.contactPhone && <InfoRow icon={Phone} label="联系电话" value={order.contactPhone} />}
              {order.scheduledTime && <InfoRow icon={Calendar} label="预约时间" value={formatDate(order.scheduledTime)} />}
            </div>
          </div>
        </ScrollReveal>

        {/* Description */}
        <ScrollReveal>
          <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">工单描述</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{order.description || '无描述'}</p>
          </div>
        </ScrollReveal>

        {/* Repair Records */}
        {order.repairRecords?.length > 0 && (
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">维修记录</h3>
              </div>
              <div className="space-y-3">
                {order.repairRecords.map((r: any, i: number) => (
                  <div key={r.id} className="p-4 bg-gray-50/80 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-600/50">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{r.content}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
                      {r.cost > 0 && <span>费用：¥{Number(r.cost).toFixed(2)}</span>}
                      {r.usedParts && <span>配件：{r.usedParts}</span>}
                      {r.handler?.realName && <span>处理人：{r.handler.realName}</span>}
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Rating */}
        {order.rating && (
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">用户评价</h3>
              </div>
              <div className="flex items-center gap-1 mb-3" role="img" aria-label={`${order.rating} 星评价`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
                  >
                    <Star className={cn('w-6 h-6', i <= order.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-slate-600')} aria-hidden="true" />
                  </motion.div>
                ))}
              </div>
              {order.feedback && <p className="text-sm text-gray-600 dark:text-slate-400">{order.feedback}</p>}
            </div>
          </ScrollReveal>
        )}

        {/* Action Buttons */}
        {showActions && (
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-5 sticky bottom-4 z-20 shadow-lg border border-blue-100/60 dark:border-slate-700/30 dark:bg-slate-800/88" role="toolbar" aria-label="工单操作">
              <div className="flex flex-wrap items-end gap-3">
                {canAssign && (
                  <FlowingButton onClick={() => handleAction('assign')} aria-label="指派维修工处理此工单">指派维修工</FlowingButton>
                )}
                {canAccept && (
                  <FlowingButton onClick={() => handleAction('accept')} aria-label="接受此工单">接单</FlowingButton>
                )}
                {canProcess && (
                  <FlowingButton onClick={() => handleAction('process')} aria-label="开始处理此工单">开始处理</FlowingButton>
                )}
                {canComplete && (
                  <div className="flex flex-wrap items-end gap-3 w-full">
                    <div className="flex-1 min-w-[200px]">
                      <label htmlFor="repair-content" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">维修内容 *</label>
                      <textarea
                        id="repair-content"
                        value={repairContent}
                        onChange={(e) => setRepairContent(e.target.value)}
                        placeholder="请描述维修过程和结果"
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
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
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                    <FlowingButton onClick={() => handleAction('complete')} disabled={!repairContent} aria-label="确认完成维修">
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
                            aria-label={`${i} 星`}
                            role="radio"
                            aria-checked={i === rating}
                            className="cursor-pointer hover:scale-110 transition-transform"
                          >
                            <Star className={cn(
                              'w-6 h-6 transition-colors',
                              i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-slate-600 hover:text-yellow-300',
                            )} aria-hidden="true" />
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
                        placeholder="您的评价"
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                    <FlowingButton onClick={() => handleAction('rating')} disabled={!rating} aria-label="提交工单评价">
                      提交评价
                    </FlowingButton>
                  </div>
                )}
                {canCancel && (
                  <Button
                    variant="destructive"
                    onClick={() => { if (confirm('确认取消该工单？')) handleAction('cancel'); }}
                    aria-label="取消此工单"
                  >
                    取消工单
                  </Button>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Operation Logs */}
        {order.orderLogs?.length > 0 && (
          <ScrollReveal>
            <div className="glass-strong rounded-2xl p-6 dark:bg-slate-800/88 dark:border-slate-700/30">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">操作日志</h3>
              </div>
              <div className="space-y-0" role="list" aria-label="工单操作日志">
                {order.orderLogs.map((log: any, i: number) => (
                  <div key={log.id} className="flex gap-3" role="listitem">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full mt-1.5',
                        i === 0 ? 'bg-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/40' : 'bg-gray-300 dark:bg-slate-600',
                      )} />
                      {i < order.orderLogs.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-600 my-0.5" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.action}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(log.createdAt)}</span>
                      </div>
                      {log.remark && <p className="text-sm text-gray-500 dark:text-slate-400">{log.remark}</p>}
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{log.operator?.realName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Bottom spacer for sticky action bar */}
      {showActions && <div className="h-8" />}
    </div>
  );
}

/* Helper sub-components */

function InfoRow({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
      <span className="text-gray-500 dark:text-slate-400 flex-shrink-0">{label}：</span>
      {badge ? (
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', badge)}>{value || '-'}</span>
      ) : (
        <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{value || '-'}</span>
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
