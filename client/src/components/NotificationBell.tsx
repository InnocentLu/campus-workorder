import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import client from '@/api/client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Bell, CheckCheck, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

interface Notification {
  id: number;
  type: string;
  title: string;
  content?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: number; realName: string } | null;
}

export default function NotificationBell() {
  const { user } = useAuthStore();
  const [list, setList] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bcContent, setBcContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await client.get('/notifications', { params: { pageSize: 10 } });
      if (res.data.code === 200) {
        setList(res.data.data.list.slice(0, 10));
        setUnread(res.data.data.unreadCount);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Poll every 30s
  useEffect(() => {
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await client.put(`/notifications/${id}/read`);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await client.put('/notifications/read-all');
      setList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const sendBroadcast = async () => {
    if (!bcContent.trim()) { toast.error('请输入广播内容'); return; }
    setSending(true);
    try {
      await client.post('/notifications/broadcast', { title: '系统通知', content: bcContent });
      toast.success('广播已发送');
      setShowBroadcast(false);
      setBcContent('');
    } catch { toast.error('发送失败'); }
    finally { setSending(false); }
  };

  const isAdmin = user?.role === 'ADM';

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={`通知，${unread} 条未读`}
        >
          <Bell className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">通知</h3>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); setTimeout(() => setShowBroadcast(true), 100); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                        aria-label="发送广播"
                      >
                        <Megaphone className="w-4 h-4" />
                      </button>
                    )}
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="全部已读"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {list.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-500">
                      暂无通知
                    </div>
                  ) : (
                    list.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) markRead(n.id);
                          setOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-50 dark:border-slate-700/30',
                          !n.isRead && 'bg-blue-50/40 dark:bg-blue-900/10',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.isRead && (
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm line-clamp-1',
                              n.isRead ? 'text-gray-600 dark:text-slate-400' : 'text-gray-900 dark:text-gray-100 font-medium',
                            )}>
                              {n.title}
                            </p>
                            {n.content && (
                              <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-1 mt-0.5">{n.content}</p>
                            )}
                            <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">
                              {formatRelativeTime(n.createdAt)}
                              {n.sender && ` · ${n.sender.realName}`}
                            </p>
                          </div>
                          {n.link && (
                            <Link to={n.link} onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                              <span className="text-[10px] text-blue-500 hover:text-blue-700">查看</span>
                            </Link>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Broadcast Modal — rendered at fragment level to avoid parent clipping */}
      <AnimatePresence>
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowBroadcast(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[70vh] overflow-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-500" /> 发送广播
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowBroadcast(false)} aria-label="关闭">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">广播内容 *</label>
                  <textarea
                    value={bcContent} onChange={(e) => setBcContent(e.target.value)}
                    rows={4} placeholder="输入要广播给所有用户的内容..."
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={() => setShowBroadcast(false)}>取消</Button>
                <Button onClick={sendBroadcast} disabled={sending}>{sending ? '发送中...' : '发送广播'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
