import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollReveal, GlassCard } from '@/components/animations';
import {
  Plus, X, Search, Wrench, Zap, Wifi, Wind, Hammer, PaintBucket, Armchair,
  Loader2, Pencil, Trash2, Power, PowerOff,
} from 'lucide-react';

/* ── Types ── */
interface Trade {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: 'ACTIVE' | 'DISABLED';
  workerCount?: number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TRADES: Omit<Trade, 'id' | 'workerCount' | 'createdAt' | 'updatedAt'>[] = [
  { name: '水电维修', code: 'PLUMBING_ELECTRICAL', description: '水管漏水、电路故障、开关插座维修', status: 'ACTIVE' },
  { name: '门窗修缮', code: 'DOOR_WINDOW', description: '门窗损坏、锁具更换、玻璃碎裂', status: 'ACTIVE' },
  { name: '网络故障', code: 'NETWORK', description: '网络中断、WiFi故障、弱电布线', status: 'ACTIVE' },
  { name: '空调检修', code: 'HVAC', description: '空调不制冷、漏水、异响、清洗保养', status: 'ACTIVE' },
  { name: '墙面修补', code: 'WALL_REPAIR', description: '墙面开裂、涂料脱落、防水处理', status: 'ACTIVE' },
  { name: '家具维修', code: 'FURNITURE', description: '桌椅损坏、柜门脱落、床铺维修', status: 'ACTIVE' },
];

const TRADE_ICON_MAP: Record<string, React.ElementType> = {
  PLUMBING_ELECTRICAL: Zap,
  DOOR_WINDOW: Hammer,
  NETWORK: Wifi,
  HVAC: Wind,
  WALL_REPAIR: PaintBucket,
  FURNITURE: Armchair,
};

export default function TradeManagement() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  /* Modal state */
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  /* ── Fetch ── */
  const fetchTrades = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await client.get('/trades', { params });
      if (res.data.code === 200) {
        setTrades(res.data.data.list || res.data.data || []);
        setTotal(res.data.data.total || 0);
      }
    } catch {
      // TODO: Replace with real API - using defaults as fallback
      let filtered = DEFAULT_TRADES.map((t, i) => ({
        ...t,
        id: i + 1,
        workerCount: Math.floor(Math.random() * 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      if (keyword) filtered = filtered.filter((t) => t.name.includes(keyword) || t.code.includes(keyword));
      if (statusFilter !== 'ALL') filtered = filtered.filter((t) => t.status === statusFilter);
      setTrades(filtered);
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrades(); }, [keyword, statusFilter]);

  /* ── Modal helpers ── */
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (trade: Trade) => {
    setEditing(trade);
    setForm({ name: trade.name, code: trade.code, description: trade.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('请输入工种名称'); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await client.put(`/trades/${editing.id}`, form);
        if (res.data.code === 200) {
          toast.success('工种更新成功');
          setShowModal(false);
          fetchTrades();
        }
      } else {
        const res = await client.post('/trades', form);
        if (res.data.code === 200) {
          toast.success('工种创建成功');
          setShowModal(false);
          fetchTrades();
        }
      }
    } catch {
      toast.error(editing ? '更新失败，请重试' : '创建失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trade: Trade) => {
    if (!confirm(`确认删除工种「${trade.name}」？此操作不可撤销。`)) return;
    try {
      const res = await client.delete(`/trades/${trade.id}`);
      if (res.data.code === 200) {
        toast.success('工种已删除');
        fetchTrades();
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleToggle = async (trade: Trade) => {
    const newStatus = trade.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await client.put(`/trades/${trade.id}`, { status: newStatus });
      if (res.data.code === 200) {
        toast.success(newStatus === 'ACTIVE' ? '工种已启用' : '工种已禁用');
        fetchTrades();
      }
    } catch {
      toast.error('操作失败');
    }
  };

  /* ── Filtered ── */
  const filteredTrades = trades;

  return (
    <div className="space-y-5">
      {/* Header */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">工种管理</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              共 {total} 个工种
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> 新增工种
          </Button>
        </div>
      </ScrollReveal>

      {/* Filter bar */}
      <ScrollReveal>
        <div className="glass-strong rounded-2xl p-3.5 flex flex-wrap gap-3 items-center dark:bg-slate-800/88 dark:border-slate-700/30">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="search"
              placeholder="搜索工种名称..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              aria-label="搜索工种"
            />
          </div>
          <div className="flex gap-1.5">
            {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  s === statusFilter
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700',
                )}
                aria-pressed={s === statusFilter}
              >
                {s === 'ALL' ? '全部' : s === 'ACTIVE' ? '启用' : '禁用'}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Trade table */}
      <ScrollReveal>
        <div className="glass rounded-2xl overflow-hidden dark:bg-slate-800/72 dark:border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="工种列表">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
                  <th scope="col" className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">工种名称</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">编码</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider hidden md:table-cell">描述</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">维修工</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">状态</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3.5"><div className="h-4 w-24 skeleton rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-20 skeleton rounded" /></td>
                      <td className="px-5 py-3.5 hidden md:table-cell"><div className="h-4 w-40 skeleton rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-8 skeleton rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-12 skeleton rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-24 skeleton rounded" /></td>
                    </tr>
                  ))
                ) : filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-gray-400 dark:text-slate-500">
                      <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无工种数据</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const TradeIcon = TRADE_ICON_MAP[trade.code] || Wrench;
                    return (
                      <tr key={trade.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <TradeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{trade.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-[11px] bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono text-gray-500 dark:text-slate-400">
                            {trade.code}
                          </code>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 text-xs hidden md:table-cell max-w-[200px] truncate">
                          {trade.description || '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-300">
                            <Wrench className="w-3 h-3" />
                            {trade.workerCount ?? 0} 人
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border',
                            trade.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600',
                          )}>
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: trade.status === 'ACTIVE' ? '#10B981' : '#6B7280' }}
                            />
                            {trade.status === 'ACTIVE' ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(trade)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                              aria-label={`编辑 ${trade.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggle(trade)}
                              className={cn(
                                'p-1.5 rounded-lg transition-all',
                                trade.status === 'ACTIVE'
                                  ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                              )}
                              aria-label={trade.status === 'ACTIVE' ? `禁用 ${trade.name}` : `启用 ${trade.name}`}
                            >
                              {trade.status === 'ACTIVE' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDelete(trade)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              aria-label={`删除 ${trade.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Create / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
            aria-modal="true"
            role="dialog"
            aria-label={editing ? '编辑工种' : '新增工种'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editing ? '编辑工种' : '新增工种'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} aria-label="关闭">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label htmlFor="trade-name" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    工种名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="trade-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="例如：水电维修"
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="trade-code" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    工种编码 <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="trade-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                    placeholder="例如：PLUMBING_ELECTRICAL"
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 px-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="trade-desc" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    描述
                  </label>
                  <textarea
                    id="trade-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="描述该工种的维修范围..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editing ? '保存' : '创建'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
