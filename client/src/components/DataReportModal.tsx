import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  FileText,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';
import client from '@/api/client';
import { cn } from '@/lib/utils';

interface DataReportModalProps {
  open: boolean;
  onClose: () => void;
}

const PIE_COLORS = [
  '#1660AB',
  '#3A85BF',
  '#D49B3E',
  '#3E9B6E',
  '#B03C3C',
  '#5C5448',
  '#8C8475',
  '#6B8FB5',
];

interface StatusBreakdownItem {
  name: string;
  value: number;
}

interface OverviewData {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  statusBreakdown: StatusBreakdownItem[];
  todos: number;
}

interface TrendData {
  trend: { date: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  categories: { name: string; value: number }[];
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export default function DataReportModal({ open, onClose }: DataReportModalProps) {
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setFetchState('loading');
    setErrorMessage('');
    try {
      const [overviewRes, trendRes] = await Promise.all([
        client.get('/statistics/overview'),
        client.get('/statistics/trend'),
      ]);
      setOverview(overviewRes.data as OverviewData);
      setTrend(trendRes.data as TrendData);
      setFetchState('success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '数据加载失败，请稍后重试';
      setErrorMessage(message);
      setFetchState('error');
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const ordersRes = await client.get('/orders', {
        params: { page: 1, pageSize: 10000 },
        timeout: 60000,
      });
      const orders = ordersRes.data?.list ?? ordersRes.data?.data ?? [];

      // Sheet 1: 概览统计
      const overviewSheet = XLSX.utils.aoa_to_sheet([
        ['指标', '数值'],
        ['工单总数', overview?.total ?? 0],
        ['待处理', overview?.pending ?? 0],
        ['处理中', overview?.processing ?? 0],
        ['已完成', overview?.completed ?? 0],
        ['待办事项', overview?.todos ?? 0],
      ]);

      // Sheet 2: 分类统计
      const categoryData =
        trend?.categories?.map((c) => ({ 类型: c.name, 数量: c.value })) ?? [];
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);

      // Sheet 3: 状态统计
      const statusData =
        overview?.statusBreakdown?.map((s) => ({
          状态: s.name,
          数量: s.value,
        })) ?? [];
      const statusSheet = XLSX.utils.json_to_sheet(statusData);

      // Orders sheet as bonus context within status sheet? Keep 3 sheets as spec.
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, overviewSheet, '概览统计');
      XLSX.utils.book_append_sheet(workbook, categorySheet, '分类统计');
      XLSX.utils.book_append_sheet(workbook, statusSheet, '状态统计');

      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `工单数据报告_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '导出失败，请稍后重试';
      setErrorMessage(message);
    } finally {
      setExporting(false);
    }
  }, [overview, trend]);

  const renderOverviewCards = () => {
    if (!overview) return null;
    const cards = [
      { label: '工单总数', value: overview.total, icon: FileText },
      { label: '待处理', value: overview.pending, icon: FileText },
      { label: '处理中', value: overview.processing, icon: FileText },
      { label: '已完成', value: overview.completed, icon: FileText },
    ];
    return cards.map((card, idx) => {
      const Icon = card.icon;
      return (
        <div
          key={card.label}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800',
          )}
        >
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{card.label}</span>
          </div>
          <span
            className="mt-2 text-2xl font-bold"
            style={{ color: PIE_COLORS[idx % PIE_COLORS.length] }}
          >
            {card.value}
          </span>
        </div>
      );
    });
  };

  const renderCharts = () => {
    if (!overview || !trend) return null;
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pie Chart - 报修类型占比 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <PieChartIcon className="h-4 w-4" style={{ color: '#1660AB' }} />
            <span className="text-sm font-medium">报修类型占比</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={trend.categories}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry: { name?: string }) => entry?.name ?? ''}
              >
                {trend.categories.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - 工单状态分布 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <BarChart3 className="h-4 w-4" style={{ color: '#1660AB' }} />
            <span className="text-sm font-medium">工单状态分布</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={overview.statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="数量">
                {overview.statusBreakdown.map((_, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - 月度趋势 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <TrendingUp className="h-4 w-4" style={{ color: '#1660AB' }} />
            <span className="text-sm font-medium">月度趋势</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="工单数"
                stroke="#1660AB"
                strokeWidth={2}
                dot={{ fill: '#1660AB' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (fetchState === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1660AB]" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            数据加载中...
          </p>
        </div>
      );
    }

    if (fetchState === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-red-500">{errorMessage}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-[#1660AB] px-4 py-2 text-sm text-white hover:bg-[#3A85BF] transition-colors"
          >
            重新加载
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {renderOverviewCards()}
        </div>
        {renderCharts()}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: '#1660AB' }} />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  数据报告
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  disabled={exporting || fetchState !== 'success'}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white transition-colors',
                    exporting || fetchState !== 'success'
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-[#1660AB] hover:bg-[#3A85BF]',
                  )}
                >
                  {exporting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>导出中...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>导出Excel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
