import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { getRoleLabel, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, ClipboardList, PlusCircle, Users,
  BarChart3, User, LogOut, Menu, X,
  Bell, Wrench, FileText, CheckSquare,
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
  { label: '个人中心', icon: User, path: '/profile', roles: ['STU', 'TCH', 'WRK', 'ADM'] },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menus = allMenus.filter((m) => user && m.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full bg-white/90 backdrop-blur-xl border-r border-gray-200/60 transition-all duration-300 flex flex-col',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/25">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm">校园工单系统</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden lg:flex text-gray-400 hover:text-gray-600"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Nav menus */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
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
                    ? 'bg-primary-50/80 text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                  collapsed && 'justify-center px-0',
                  !collapsed && 'px-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-600 rounded-full" />
                  )}
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-600')} />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {user?.realName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.realName}</p>
                <p className="text-xs text-gray-400">{getRoleLabel(user?.role || '')}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors', collapsed && 'justify-center')}
            onClick={handleLogout}
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
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        {/* Top header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">校园工单管理系统</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {user?.realName?.[0] || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.realName}</span>
            </div>
          </div>
        </header>

        {/* Page content with transitions */}
        <main className="flex-1 overflow-y-auto">
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
        </main>
      </div>
    </div>
  );
}
