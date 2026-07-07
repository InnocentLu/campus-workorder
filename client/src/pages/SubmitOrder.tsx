import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { ScrollReveal, FlowingButton } from '@/components/animations';
import ImageUpload from '@/components/ImageUpload';
import { cn } from '@/lib/utils';
import {
  Zap, Wifi, Hammer, Wind, DoorOpen, MoreHorizontal,
  CheckCircle2, ChevronLeft, ChevronRight, FileText, MapPin, Send, X,
} from 'lucide-react';

const categories = [
  { value: '水电', label: '水电维修', icon: Zap, color: 'text-yellow-500 bg-yellow-50 border-yellow-200', trade: '水电维修' },
  { value: '网络', label: '网络故障', icon: Wifi, color: 'text-blue-500 bg-blue-50 border-blue-200', trade: '网络故障' },
  { value: '家具', label: '家具维修', icon: Hammer, color: 'text-orange-500 bg-orange-50 border-orange-200', trade: '家具维修' },
  { value: '空调', label: '空调检修', icon: Wind, color: 'text-cyan-500 bg-cyan-50 border-cyan-200', trade: '空调检修' },
  { value: '门窗', label: '门窗修缮', icon: DoorOpen, color: 'text-emerald-500 bg-emerald-50 border-emerald-200', trade: '门窗修缮' },
  { value: '其他', label: '其他', icon: MoreHorizontal, color: 'text-gray-500 bg-gray-50 border-gray-200', trade: '其他' },
];

const steps = [
  { label: '选择类别', icon: FileText },
  { label: '填写详情', icon: MapPin },
  { label: '确认提交', icon: Send },
];

export default function SubmitOrder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', category: '',
    categories: [] as string[],
    images: [] as string[],
    location: '', contactPhone: '', scheduledTime: '',
    priority: 'MEDIUM' as string,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const update = (key: string, value: string | string[]) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (value: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value],
      category: prev.categories.length === 1 && prev.categories.includes(value)
        ? ''
        : prev.categories.filter((c) => c !== value)[0] || value,
    }));
  };

  const canNext = () => {
    if (currentStep === 0) return form.categories.length > 0;
    if (currentStep === 1) return !!form.title;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await client.post('/orders', {
        ...form,
        scheduledTime: form.scheduledTime || undefined,
      });
      if (res.data.code === 200) {
        setShowSuccess(true);
        setTimeout(() => navigate(`/orders/${res.data.data.id}`), 1500);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">提交工单</h2>
      </ScrollReveal>

      {/* Step Indicator */}
      <ScrollReveal>
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300',
                i <= currentStep ? 'text-primary-700' : 'text-gray-400',
              )}>
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                  i < currentStep ? 'bg-primary-600 text-white' :
                  i === currentStep ? 'bg-primary-100 text-primary-600 border-2 border-primary-500 ring-4 ring-primary-100' :
                  'bg-gray-100 text-gray-500',
                )}>
                  {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'w-10 sm:w-16 h-0.5 transition-colors duration-300',
                  i < currentStep ? 'bg-primary-500' : 'bg-gray-200',
                )} />
              )}
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Step Content */}
      <div className="glass-strong rounded-2xl p-6 sm:p-8 min-h-[360px]">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">工单提交成功！🎉</h3>
              <p className="text-sm text-gray-500">正在跳转到工单详情...</p>
            </motion.div>
          ) : currentStep === 0 ? (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">请选择故障对应工种</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">可选多项，匹配多工种问题</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const isSelected = form.categories.includes(cat.value);
                  return (
                    <motion.button
                      key={cat.value}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleCategory(cat.value)}
                      className={cn(
                        'p-5 rounded-2xl border-2 text-center transition-all duration-200 relative',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-100 dark:shadow-primary-900/20'
                          : 'border-gray-100 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800',
                      )}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 border',
                        cat.color,
                      )}>
                        <cat.icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cat.label}</span>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{cat.trade}</p>
                    </motion.button>
                  );
                })}
              </div>
              {/* Selected trades preview */}
              {form.categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400">已选工种：</span>
                  {form.categories.map((c) => {
                    const cat = categories.find((x) => x.value === c);
                    return (
                      <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                        {cat?.label || c}
                        <button onClick={(e) => { e.stopPropagation(); toggleCategory(c); }} aria-label={`移除 ${cat?.label || c}`}>
                          <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : currentStep === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">填写工单详情</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">标题 *</label>
                <input
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="请简要描述问题"
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">详细描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={4}
                  placeholder="请详细描述问题的具体情况..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 transition-all resize-none"
                />
              </div>
              <ImageUpload
                images={form.images}
                onChange={(imgs) => update('images', imgs as any)}
                maxCount={6}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">优先级</label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <button
                      key={p}
                      onClick={() => update('priority', p)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                        form.priority === p
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      {{ LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }[p]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">确认信息</h3>

              {/* Review */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500 dark:text-slate-400">工种</span><div className="flex flex-wrap gap-1 justify-end">{form.categories.map((c) => { const cat = categories.find((x) => x.value === c); return <span key={c} className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">{cat?.label || c}</span>; })}</div></div>
                <div className="flex justify-between"><span className="text-gray-500">标题</span><span className="font-medium">{form.title}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">优先级</span><span className="font-medium">{{ LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }[form.priority]}</span></div>
                {form.description && <div className="flex justify-between"><span className="text-gray-500">描述</span><span className="font-medium text-right max-w-[60%] truncate">{form.description}</span></div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">位置</label>
                  <input
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="如：3号楼501"
                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => update('contactPhone', e.target.value)}
                    placeholder="手机号码"
                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">预约时间</label>
                <input
                  type="datetime-local"
                  value={form.scheduledTime}
                  onChange={(e) => update('scheduledTime', e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 transition-all"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {!showSuccess && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> 上一步
            </Button>
            {currentStep < 2 ? (
              <FlowingButton onClick={() => setCurrentStep((s) => s + 1)} disabled={!canNext()}>
                下一步 <ChevronRight className="w-4 h-4 ml-1" />
              </FlowingButton>
            ) : (
              <FlowingButton onClick={handleSubmit} loading={submitting}>
                提交工单
              </FlowingButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
