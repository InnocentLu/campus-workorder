import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { getRoleLabel, formatDate, cn } from '@/lib/utils';
import { ScrollReveal, GlassCard } from '@/components/animations';
import { Plus, X, Search } from 'lucide-react';

export default function UserManagement() {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ username: '', password: '', realName: '', role: 'STU', phone: '', department: '', studentId: '', employeeId: '' });
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    client.get('/users', { params: { page, pageSize: 10 } }).then((res) => {
      if (res.data.code === 200) {
        setList(res.data.data.list);
        setTotal(res.data.data.total);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const resetForm = () => setForm({ username: '', password: '', realName: '', role: 'STU', phone: '', department: '', studentId: '', employeeId: '' });

  const openCreate = () => { resetForm(); setEditing(null); setShowModal(true); };
  const openEdit = (u: any) => { setForm({ ...form, ...u, password: '' }); setEditing(u); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await client.put(`/users/${editing.id}`, form);
      } else {
        await client.post('/users', form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      // silent
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除？')) return;
    try { await client.delete(`/users/${id}`); fetchUsers(); } catch (err: any) {}
  };

  const handleResetPwd = async (id: number) => {
    if (!confirm('确认重置密码为 123456？')) return;
    try { await client.put(`/users/${id}/reset-password`); } catch (err: any) {}
  };

  const handleToggleStatus = async (u: any) => {
    try {
      await client.put(`/users/${u.id}`, { status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      fetchUsers();
    } catch (err: any) {}
  };

  const roles = ['STU', 'TCH', 'WRK', 'ADM'];
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
            <p className="text-sm text-gray-500 mt-1">共 {total} 个用户</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> 添加用户
          </Button>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">用户名</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">姓名</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">角色</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs hidden md:table-cell">部门</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs hidden md:table-cell">电话</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">状态</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs hidden lg:table-cell">创建时间</th>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-500 text-xs">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.username}</td>
                    <td className="px-5 py-3.5 text-gray-700">{u.realName}</td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs hidden md:table-cell">{u.department || '-'}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs hidden md:table-cell">{u.phone || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200',
                      )}>
                        <span className="status-dot" style={{ backgroundColor: u.status === 'ACTIVE' ? '#10B981' : '#EF4444' }} />
                        {u.status === 'ACTIVE' ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs hidden lg:table-cell">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(u)}>编辑</Button>
                        <Button variant="outline" size="sm" onClick={() => handleResetPwd(u.id)}>重置</Button>
                        <Button variant="outline" size="sm" onClick={() => handleToggleStatus(u)}>
                          {u.status === 'ACTIVE' ? '禁用' : '启用'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(u.id)}>删除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && !loading && (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400">暂无用户数据</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400">加载中...</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 10 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-sm text-gray-500">
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

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{editing ? '编辑用户' : '添加用户'}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <input
                placeholder="用户名"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editing}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:bg-gray-50"
              />
              {!editing && (
                <input
                  type="password"
                  placeholder="密码"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              )}
              <input
                placeholder="姓名"
                value={form.realName}
                onChange={(e) => setForm({ ...form, realName: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                {roles.map((r) => (<option key={r} value={r}>{getRoleLabel(r)}</option>))}
              </select>
              <input
                placeholder="部门/院系"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <input
                placeholder="电话"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              {form.role === 'STU' && (
                <input
                  placeholder="学号"
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              )}
              {(form.role === 'TCH' || form.role === 'WRK') && (
                <input
                  placeholder="工号"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
                <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    STU: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TCH: 'bg-blue-50 text-blue-700 border-blue-200',
    WRK: 'bg-orange-50 text-orange-700 border-orange-200',
    ADM: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', colors[role] || 'bg-gray-50 text-gray-600')}>
      {getRoleLabel(role)}
    </span>
  );
}
