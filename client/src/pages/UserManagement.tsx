import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { getRoleLabel, formatDate, cn } from '@/lib/utils';
import { ScrollReveal, GlassCard } from '@/components/animations';
import {
  Plus, X, Search, Phone, Copy, Wrench, Loader2, Shield,
  Upload, Download, FileSpreadsheet, AlertCircle,
} from 'lucide-react';

/* ── Trades list (matches TradeManagement) ── */
const TRADE_OPTIONS = [
  { value: '水电维修', label: '水电维修' },
  { value: '门窗修缮', label: '门窗修缮' },
  { value: '网络故障', label: '网络故障' },
  { value: '空调检修', label: '空调检修' },
  { value: '墙面修补', label: '墙面修补' },
  { value: '家具维修', label: '家具维修' },
];

export default function UserManagement() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    username: '', password: '', realName: '', role: 'STU' as string,
    phone: '', department: '', studentId: '', employeeId: '', trade: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    client.get('/users', { params: { page, pageSize: 10 } })
      .then((res) => {
        if (res.data.code === 200) {
          setList(res.data.data.list);
          setTotal(res.data.data.total);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const resetForm = () =>
    setForm({ username: '', password: '', realName: '', role: 'STU', phone: '', department: '', studentId: '', employeeId: '', trade: '' });

  const openCreate = () => { resetForm(); setEditing(null); setShowModal(true); };
  const openEdit = (u: any) => {
    setForm({
      username: u.username || '',
      password: '',
      realName: u.realName || '',
      role: u.role || 'STU',
      phone: u.phone || '',
      department: u.department || '',
      studentId: u.studentId || '',
      employeeId: u.employeeId || '',
      trade: u.trade || '',
    });
    setEditing(u);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.realName.trim()) { toast.error('请输入姓名'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) delete (payload as any).password;
      if (!editing && !payload.password) { toast.error('请输入密码'); setSaving(false); return; }
      if (editing) {
        await client.put(`/users/${editing.id}`, payload);
        toast.success('用户信息已更新');
      } else {
        await client.post('/users', payload);
        toast.success('用户创建成功');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该用户？')) return;
    try { await client.delete(`/users/${id}`); fetchUsers(); toast.success('用户已删除'); } catch { toast.error('删除失败'); }
  };

  const handleResetPwd = async (id: number) => {
    if (!confirm('确认重置密码为 123456？')) return;
    try { await client.put(`/users/${id}/reset-password`); toast.success('密码已重置'); } catch { toast.error('重置失败'); }
  };

  const handleToggleStatus = async (u: any) => {
    try {
      await client.put(`/users/${u.id}`, { status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      fetchUsers();
      toast.success(u.status === 'ACTIVE' ? '用户已禁用' : '用户已启用');
    } catch { toast.error('操作失败'); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await client.get('/users/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'user_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('模板下载成功');
    } catch {
      toast.error('模板下载失败');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.error('请先选择文件');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await client.post('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.code === 200) {
        setImportResult(res.data.data);
        toast.success(res.data.message || '导入完成');
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success('号码已复制')).catch(() => toast.error('复制失败'));
  };

  const roles = ['STU', 'TCH', 'WRK', 'ADM'];
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-5">
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">用户管理</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">共 {total} 个用户</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openImportModal} className="gap-1.5">
              <Upload className="w-4 h-4" /> 批量导入
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="w-4 h-4" /> 添加用户
            </Button>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Table ── */}
      <ScrollReveal>
        <div className="glass rounded-2xl overflow-hidden dark:bg-slate-800/72 dark:border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="用户列表">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50">
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">用户名</th>
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">姓名</th>
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">角色</th>
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider hidden lg:table-cell">工种</th>
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider hidden md:table-cell">联系电话</th>
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">状态</th>
                  <th scope="col" className="text-left px-4 py-3.5 font-semibold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 w-16 skeleton rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-gray-400 dark:text-slate-500">
                      暂无用户数据
                    </td>
                  </tr>
                ) : (
                  list.map((u) => (
                    <tr key={u.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                      <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-gray-100">{u.username}</td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">{u.realName}</td>
                      <td className="px-4 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {u.role === 'WRK' ? (
                          u.trade ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              <Wrench className="w-3 h-3" />
                              {u.trade}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 text-xs">未绑定</span>
                          )
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {u.phone ? (
                          <button
                            onClick={() => copyPhone(u.phone)}
                            className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
                            aria-label={`复制 ${u.realName} 的电话 ${u.phone}`}
                          >
                            <Phone className="w-3 h-3 text-gray-400 group-hover:text-primary-500" />
                            {u.phone}
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary-500" />
                          </button>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border',
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: u.status === 'ACTIVE' ? '#10B981' : '#EF4444' }} />
                          {u.status === 'ACTIVE' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                            aria-label={`编辑 ${u.realName}`}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleResetPwd(u.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors hidden sm:block"
                            aria-label={`重置 ${u.realName} 的密码`}
                          >
                            重置
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hidden sm:block',
                              u.status === 'ACTIVE'
                                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                            )}
                          >
                            {u.status === 'ACTIVE' ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label={`删除 ${u.realName}`}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 10 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-slate-700/50">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
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
            aria-label={editing ? `编辑用户 ${editing.realName}` : '添加用户'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editing ? '编辑用户' : '添加用户'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} aria-label="关闭">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {/* Username */}
                <Field label="用户名" required>
                  <input
                    placeholder="登录账号"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    disabled={!!editing}
                    className="form-input"
                  />
                </Field>

                {/* Password (create only) */}
                {!editing && (
                  <Field label="密码" required>
                    <input
                      type="password"
                      placeholder="至少6位"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="form-input"
                    />
                  </Field>
                )}

                {/* Real name + Role row */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="姓名" required>
                    <input
                      placeholder="真实姓名"
                      value={form.realName}
                      onChange={(e) => setForm({ ...form, realName: e.target.value })}
                      className="form-input"
                    />
                  </Field>
                  <Field label="角色" required>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="form-input appearance-none cursor-pointer"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{getRoleLabel(r)}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Trade binding (only for WRK) */}
                {form.role === 'WRK' && (
                  <Field label="绑定工种" required icon={<Wrench className="w-4 h-4" />}>
                    <select
                      value={form.trade}
                      onChange={(e) => setForm({ ...form, trade: e.target.value })}
                      className="form-input appearance-none cursor-pointer"
                    >
                      <option value="">请选择工种</option>
                      {TRADE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {/* Phone */}
                <Field label="联系电话" icon={<Phone className="w-4 h-4" />}>
                  <input
                    type="tel"
                    placeholder="手机号码"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="form-input"
                  />
                </Field>

                {/* Department */}
                <Field label="部门/院系">
                  <input
                    placeholder="所属部门或院系"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="form-input"
                  />
                </Field>

                {/* Student ID or Employee ID */}
                {form.role === 'STU' && (
                  <Field label="学号">
                    <input
                      placeholder="学生学号"
                      value={form.studentId}
                      onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                      className="form-input"
                    />
                  </Field>
                )}
                {(form.role === 'TCH' || form.role === 'WRK') && (
                  <Field label="工号">
                    <input
                      placeholder="教职工/员工工号"
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      className="form-input"
                    />
                  </Field>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editing ? '保存修改' : '创建用户'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import Modal ── */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowImportModal(false)}
            aria-modal="true"
            role="dialog"
            aria-label="批量导入用户"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  批量导入用户
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)} aria-label="关闭">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-5">
                {/* Step 1: Download template */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">第一步：下载模板</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        请先下载 Excel 模板，按照模板格式填写用户信息
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadTemplate}
                        className="mt-3 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> 下载模板
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Upload file */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-gray-600 dark:text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">第二步：上传文件</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        选择填写好的 Excel 文件（.xlsx），点击导入按钮
                      </p>
                      <div className="mt-3">
                        <label
                          className={cn(
                            'flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                            'border-gray-300 dark:border-slate-500 hover:border-primary-400 dark:hover:border-primary-400',
                            'bg-white dark:bg-slate-800',
                          )}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <FileSpreadsheet className={cn(
                              'w-8 h-8',
                              importFile ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500',
                            )} />
                            {importFile ? (
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                {importFile.name}
                              </span>
                            ) : (
                              <>
                                <span className="text-sm text-gray-500 dark:text-slate-400">
                                  点击选择文件或拖拽到此处
                                </span>
                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                  支持 .xlsx 格式
                                </span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept=".xlsx"
                            onChange={handleImportFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Import result */}
                {importResult && (
                  <div className="space-y-3">
                    <div className={cn(
                      'p-4 rounded-xl border',
                      importResult.errors.length > 0
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          importResult.errors.length > 0
                            ? 'bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400',
                        )}>
                          {importResult.errors.length > 0
                            ? <AlertCircle className="w-5 h-5" />
                            : <FileSpreadsheet className="w-5 h-5" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            导入完成
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            成功导入 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{importResult.imported}</span> 个用户，
                            跳过 <span className="font-semibold text-amber-600 dark:text-amber-400">{importResult.skipped}</span> 个
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Error details */}
                    {importResult.errors.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                            异常详情（{importResult.errors.length} 条）
                          </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-red-100 dark:divide-red-800/50">
                          {importResult.errors.map((err, idx) => (
                            <div key={idx} className="px-3 py-2 flex items-start gap-2 text-xs">
                              <span className="text-red-400 dark:text-red-500 font-mono shrink-0">
                                第{err.row}行
                              </span>
                              <span className="text-red-600 dark:text-red-400">
                                {err.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowImportModal(false)}>
                  {importResult ? '关闭' : '取消'}
                </Button>
                {!importResult && (
                  <Button onClick={handleImportSubmit} disabled={!importFile || importing}>
                    {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {importing ? '导入中...' : '开始导入'}
                  </Button>
                )}
                {importResult && (
                  <Button onClick={() => { setShowImportModal(false); }}>
                    完成
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Helpers ── */

function Field({
  label, required, children, icon,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
        {icon && <span className="inline-flex items-center gap-1.5">{icon}{label}</span>}
        {!icon && label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    STU: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    TCH: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    WRK: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    ADM: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border', colors[role] || 'bg-gray-50 text-gray-600')}>
      {getRoleLabel(role)}
    </span>
  );
}
