import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { getRoleLabel, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, ClipboardList, PlusCircle, Users,
  BarChart3, User, LogOut, Menu, X,
  Bell, Wrench, FileText, CheckSquare,
  Sun, Moon,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const allMenus: MenuItem[] = [
  { label: '工作台', icon: LayoutDashboard, path: '/dashboard', roles: ['STU', 'TCH', 'WRK', 'ADM'] },
  { label: '提交工单', icon: PlusCircle, path: '/orders/submit', roles: ['STU', 'TCH'] },
  { label: '我的工单', icon: ClipboardList, path: '/orders/my', roles: ['STU'] },
  { label: '部门工单', icon: FileText, path: '/orders/dept', roles: ['TCH'] },
  { label: '待接单', icon: CheckSquare, path: '/orders/pending', roles: ['WRK'] },
  { label: '我的任务', icon: Wrench, path: '/orders/tasks', roles: ['WRK'] },
  { label: '工单管理', icon: ClipboardList, path: '/orders/manage', roles: ['ADM'] },
  { label: '用户管理', icon: Users, path: '/users', roles: ['ADM'] },
  { label: '工种管理', icon: Wrench, path: '/trades', roles: ['ADM'] },
  { label: '数据仪表盘', icon: BarChart3, path: '/admin/dashboard', roles: ['ADM'] },
  { label: '个人中心', icon: User, path: '/profile', roles: ['STU', 'TCH', 'WRK', 'ADM'] },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menus = allMenus.filter((m) => user && m.roles.includes(user.role));

  /* Dark mode toggle */
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role;
  const roleSpecificBg = role === 'WRK' ? 'from-amber-50/80 to-orange-50/60' :
    role === 'ADM' ? 'from-purple-50/80 to-indigo-50/60' :
    role === 'TCH' ? 'from-blue-50/80 to-cyan-50/60' :
    'from-blue-50/80 to-emerald-50/60';

  return (
    <div className={cn('flex h-screen', darkMode ? 'dark' : '')}>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full flex flex-col transition-all duration-300',
          'bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl',
          'border-r border-blue-100/60 dark:border-slate-700/60',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="主导航侧边栏"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-blue-100/60 dark:border-slate-700/60">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/25"
                aria-hidden="true"
              >
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                校园工单系统
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden lg:flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Nav menus */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin" aria-label="导航菜单">
          {menus.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
                  isActive
                    ? 'bg-primary-50/90 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-gray-200',
                  collapsed && 'justify-center px-0',
                  !collapsed && 'px-3',
                )
              }
              aria-current="page"
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-600 rounded-full"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon
                    className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-600 dark:text-primary-400')}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info + Dark mode toggle */}
        <div className="p-3 border-t border-blue-100/60 dark:border-slate-700/60 space-y-2">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full justify-start text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors', collapsed && 'justify-center')}
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 flex-shrink-0" />
            )}
            {!collapsed && <span className="ml-2">{darkMode ? '浅色模式' : '深色模式'}</span>}
          </Button>

          {!collapsed && (
            <div className="flex items-center gap-3 px-1">
              <div
                className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                aria-hidden="true"
              >
                {user?.realName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.realName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{getRoleLabel(role || '')}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full justify-start text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors', collapsed && 'justify-center')}
            onClick={handleLogout}
            aria-label="退出登录"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="ml-2">退出登录</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        {/* Top header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-blue-100/60 dark:border-slate-700/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">
            校园工单管理系统
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="通知"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                aria-hidden="true"
              >
                {user?.realName?.[0] || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {user?.realName}
              </span>
            </div>
          </div>
        </header>

        {/* Page content — sits above seawater background */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle card backdrop for content readability */}
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[1px] pointer-events-none" aria-hidden="true" />
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-4 lg:p-6"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
