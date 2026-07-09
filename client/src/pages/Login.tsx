import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import client from '@/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Eye,
  EyeOff,
  User,
  Lock,
  ClipboardList,
  CheckCircle,
  IdCard,
  GraduationCap,
  Building2,
  Phone,
  UserCheck,
  TrendingUp,
  Star,
  Zap,
  School,
  Loader2,
} from 'lucide-react';

/* ── Animation variants ── */
const pageReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const leftPanel = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const rightPanel = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.3 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const tabSlide = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* ── Floating badge data ── */
const floatingBadges = [
  { icon: TrendingUp, label: '今日工单', value: '24 件', delay: 0, x: '-8%', y: '18%', color: '#3B82F6' },
  { icon: Star, label: '满意度', value: '98.6%', delay: 1.5, x: '72%', y: '62%', color: '#F59E0B' },
  { icon: Zap, label: '平均响应', value: '2.5min', delay: 3, x: '58%', y: '22%', color: '#10B981' },
];

/* ── Types ── */
interface RegisterForm {
  realName: string;
  username: string;
  studentId: string;
  role: 'STU' | 'TCH';
  department: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const INIT_REGISTER: RegisterForm = {
  realName: '', username: '', studentId: '', role: 'STU',
  department: '', phone: '', password: '', confirmPassword: '',
};

/* ── Shared input class ── */
const inputClass =
  'w-full h-12 pl-11 pr-4 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 ' +
  'bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 ' +
  'transition-all duration-200 text-sm';

export default function Login() {
  /* ── Mode ── */
  const [isLogin, setIsLogin] = useState(true);

  /* ── Login state ── */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ── Register state ── */
  const [regForm, setRegForm] = useState<RegisterForm>(INIT_REGISTER);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  /* ── Shared ── */
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  /* ── Helpers ── */
  const updateReg = (patch: Partial<RegisterForm>) =>
    setRegForm((prev) => ({ ...prev, ...patch }));

  const clearError = () => { if (error) setError(''); };

  /* ── Login submit ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { username, password });
      const { token, user } = res.data.data;
      login(token, user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  /* ── Register validation ── */
  const validateRegister = (): string | null => {
    const f = regForm;
    if (!f.realName.trim()) return '请输入真实姓名';
    if (!/^[a-zA-Z0-9]{4,20}$/.test(f.username)) return '用户名需为4-20位字母或数字';
    if (!f.studentId.trim()) return '请输入学号或工号';
    if (!f.department.trim()) return '请输入院系或部门名称';
    if (f.password.length < 8) return '密码至少8位';
    if (!/[a-zA-Z]/.test(f.password)) return '密码必须包含字母';
    if (!/[0-9]/.test(f.password)) return '密码必须包含数字';
    if (f.password !== f.confirmPassword) return '两次密码不一致';
    return null;
  };

  /* ── Register submit ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errMsg = validateRegister();
    if (errMsg) { setError(errMsg); return; }

    setLoading(true);
    try {
      const payload = {
        realName: regForm.realName.trim(),
        username: regForm.username.trim(),
        studentId: regForm.studentId.trim(),
        role: regForm.role,
        department: regForm.department.trim(),
        phone: regForm.phone.trim() || undefined,
        password: regForm.password,
      };
      await client.post('/auth/register', payload);
      toast.success('注册成功，请等待管理员审核！');
      setRegForm(INIT_REGISTER);
      setIsLogin(true);
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /* ── Tab switch handler ── */
  const switchTab = (toLogin: boolean) => {
    clearError();
    setIsLogin(toLogin);
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col md:flex-row overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={pageReveal}
    >
      {/* ═══════════════════════════════════════════
          LEFT — Form Panel (45%)
          ═══════════════════════════════════════════ */}
      <motion.div
        className="w-full md:w-[45%] flex items-center justify-center bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl px-4 py-8 md:py-12"
        variants={leftPanel}
      >
        <motion.div
          className="w-full max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* ── Glass card ── */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/[0.04] dark:shadow-black/30 border border-gray-100 dark:border-gray-800/60 p-6 sm:p-8">
            {/* ── Campus Logo ── */}
            <motion.div variants={staggerItem} className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-gradient-to-br from-[#1660AB] to-[#1660AB] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1660AB] dark:text-white tracking-tight leading-tight">
                  校园工单
                </h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 tracking-wide">
                  Campus Workorder System
                </p>
              </div>
            </motion.div>

            {/* ── Tab switcher (pill style) ── */}
            <motion.div
              variants={staggerItem}
              className="flex mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl"
              role="tablist"
              aria-label="登录或注册"
            >
              <button
                onClick={() => switchTab(true)}
                role="tab"
                aria-selected={isLogin}
                aria-controls="login-panel"
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-medium transition-all duration-300',
                  isLogin
                    ? 'bg-white dark:bg-gray-700 text-[#1660AB] dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                登录
              </button>
              <button
                onClick={() => switchTab(false)}
                role="tab"
                aria-selected={!isLogin}
                aria-controls="register-panel"
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-medium transition-all duration-300',
                  !isLogin
                    ? 'bg-white dark:bg-gray-700 text-[#1660AB] dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                注册
              </button>
            </motion.div>

            {/* ── Welcome text ── */}
            <motion.div variants={staggerItem} className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {isLogin ? '欢迎回来' : '创建账户'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm leading-relaxed">
                {isLogin
                  ? '进入校园服务管理后台，高效处理每一张工单。'
                  : '注册校园工单系统账号，开始报修之旅。'}
              </p>
            </motion.div>

            {/* ── Error message ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  role="alert"
                  className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm"
                >
                  <p className="leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Form content with AnimatePresence ── */}
            <AnimatePresence mode="wait">
              {isLogin ? (
                /* ═══════════ LOGIN FORM ═══════════ */
                <motion.form
                  key="login-form"
                  id="login-panel"
                  variants={tabSlide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  onSubmit={handleLogin}
                  className="space-y-4"
                  aria-label="登录表单"
                >
                  {/* Username */}
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type="text"
                      placeholder="用户名 / 学号"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); clearError(); }}
                      required
                      autoComplete="username"
                      className={inputClass}
                    />
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="密码"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      required
                      autoComplete="current-password"
                      className={cn(inputClass, 'pr-12')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Remember me + Forgot password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#1660AB] focus:ring-[#1660AB] focus:ring-offset-0 accent-[#1660AB]"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        记住我
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-sm text-[#1660AB] dark:text-blue-400 hover:text-[#1D4ED8] dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      忘记密码？
                    </button>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'w-full h-12 rounded-xl font-semibold text-white text-sm',
                      'bg-gradient-to-r from-[#1660AB] to-[#1660AB]',
                      'hover:shadow-lg hover:shadow-purple-500/25',
                      'transition-all duration-300 relative overflow-hidden',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                      'btn-shimmer',
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />
                        登录中...
                      </span>
                    ) : (
                      '登 录'
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                /* ═══════════ REGISTER FORM ═══════════ */
                <motion.form
                  key="register-form"
                  id="register-panel"
                  variants={tabSlide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  onSubmit={handleRegister}
                  className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
                  aria-label="注册表单"
                >
                  {/* Real name */}
                  <div className="relative group">
                    <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type="text"
                      placeholder="请输入真实姓名"
                      value={regForm.realName}
                      onChange={(e) => updateReg({ realName: e.target.value })}
                      required
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>

                  {/* Username */}
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type="text"
                      placeholder="请设置登录账号（4-20位字母或数字）"
                      value={regForm.username}
                      onChange={(e) => updateReg({ username: e.target.value })}
                      required
                      autoComplete="username"
                      className={inputClass}
                    />
                  </div>

                  {/* Student ID + Role row */}
                  <div className="flex gap-3">
                    <div className="relative flex-[2] group">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                      <input
                        type="text"
                        placeholder="请输入学号或工号"
                        value={regForm.studentId}
                        onChange={(e) => updateReg({ studentId: e.target.value })}
                        required
                        className={inputClass}
                      />
                    </div>
                    <div className="relative flex-1 group">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10 transition-colors group-focus-within:text-[#1660AB]" />
                      <select
                        value={regForm.role}
                        onChange={(e) => updateReg({ role: e.target.value as 'STU' | 'TCH' })}
                        className={cn(inputClass, 'pl-9 pr-3 appearance-none cursor-pointer')}
                      >
                        <option value="STU">学生</option>
                        <option value="TCH">教师</option>
                      </select>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type="text"
                      placeholder="请输入院系或部门名称"
                      value={regForm.department}
                      onChange={(e) => updateReg({ department: e.target.value })}
                      required
                      className={inputClass}
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type="tel"
                      placeholder="请输入手机号（选填）"
                      value={regForm.phone}
                      onChange={(e) => updateReg({ phone: e.target.value })}
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type={showRegPwd ? 'text' : 'password'}
                      placeholder="请设置密码（至少6位）"
                      value={regForm.password}
                      onChange={(e) => updateReg({ password: e.target.value })}
                      required
                      autoComplete="new-password"
                      className={cn(inputClass, 'pr-12')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(!showRegPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showRegPwd ? '隐藏密码' : '显示密码'}
                    >
                      {showRegPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Confirm password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-[#1660AB]" />
                    <input
                      type={showRegConfirm ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      value={regForm.confirmPassword}
                      onChange={(e) => updateReg({ confirmPassword: e.target.value })}
                      required
                      autoComplete="new-password"
                      className={cn(inputClass, 'pr-12')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm(!showRegConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showRegConfirm ? '隐藏确认密码' : '显示确认密码'}
                    >
                      {showRegConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'w-full h-12 rounded-xl font-semibold text-white text-sm',
                      'bg-gradient-to-r from-[#1660AB] to-[#1660AB]',
                      'hover:shadow-lg hover:shadow-purple-500/25',
                      'transition-all duration-300 relative overflow-hidden',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                      'btn-shimmer',
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />
                        注册中...
                      </span>
                    ) : (
                      '立即注册'
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* ── Bottom hint ── */}
            <motion.p
              variants={staggerItem}
              className="text-center text-sm text-gray-400 dark:text-gray-500 mt-5"
            >
              {isLogin ? (
                <>
                  还没有账户？{' '}
                  <button
                    type="button"
                    onClick={() => switchTab(false)}
                    className="text-[#1660AB] dark:text-blue-400 font-medium hover:text-[#1D4ED8] dark:hover:text-blue-300 transition-colors"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？{' '}
                  <button
                    type="button"
                    onClick={() => switchTab(true)}
                    className="text-[#1660AB] dark:text-blue-400 font-medium hover:text-[#1D4ED8] dark:hover:text-blue-300 transition-colors"
                  >
                    去登录
                  </button>
                </>
              )}
            </motion.p>

          </div>{/* end glass card */}
        </motion.div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          RIGHT — Immersive Brand Showcase (55%)
          ═══════════════════════════════════════════ */}
      <motion.div
        className="hidden md:flex w-full md:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#1660AB] via-[#1660AB] to-[#1660AB] items-center justify-center"
        variants={rightPanel}
      >
        {/* ── Rotating rings ── */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[420px] h-[420px] rounded-full border border-white/8"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute w-[340px] h-[340px] rounded-full border border-white/5" />

        {/* ── Dot grid pattern ── */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* ── Soft glow orbs ── */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl" />

        {/* ── Central icon composition ── */}
        <div className="relative z-10 flex flex-col items-center gap-0">
          {/* Connecting lines */}
          <svg
            className="absolute w-64 h-64 opacity-30"
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M128 40 L60 190 M128 40 L196 190 M60 190 L196 190"
              stroke="white"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          </svg>

          {/* Top icon */}
          <motion.div
            className="relative z-10 flex items-center justify-center w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-black/20"
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
          >
            <ClipboardList className="w-14 h-14 text-white/90" />
          </motion.div>

          {/* Bottom row — two icons */}
          <div className="flex items-center gap-20 -mt-4">
            <motion.div
              className="flex items-center justify-center w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-black/20"
              animate={{ y: [-3, 5, -3] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            >
              <Wrench className="w-14 h-14 text-white/90" />
            </motion.div>
            <motion.div
              className="flex items-center justify-center w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-black/20"
              animate={{ y: [-5, 3, -5] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
            >
              <CheckCircle className="w-14 h-14 text-white/90" />
            </motion.div>
          </div>

          {/* Labels */}
          <div className="flex items-center gap-16 mt-4">
            <span className="text-white/50 text-xs font-medium tracking-wider">提交工单</span>
            <span className="text-white/50 text-xs font-medium tracking-wider">维修处理</span>
            <span className="text-white/50 text-xs font-medium tracking-wider">完成确认</span>
          </div>
        </div>

        {/* ── Floating glass badges ── */}
        {floatingBadges.map((badge, i) => {
          const BadgeIcon = badge.icon;
          return (
            <motion.div
              key={i}
              className="absolute z-20 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl shadow-black/10"
              style={{ left: badge.x, top: badge.y }}
              animate={{ y: [-12, 10, -12] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: badge.delay }}
              aria-hidden="true"
            >
              <div className="flex items-center gap-3">
                <BadgeIcon className="w-5 h-5" style={{ color: badge.color }} />
                <div>
                  <p className="text-white/50 text-[10px] font-medium tracking-wide">{badge.label}</p>
                  <p className="text-white text-lg font-bold tracking-tight">{badge.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* ── Bottom brand tagline ── */}
        <div className="absolute bottom-10 left-0 right-0 text-center z-10">
          <p className="text-white/50 text-sm tracking-[0.3em] font-light">
            高效 · 透明 · 智慧校园
          </p>
          <p className="text-white/30 text-xs mt-1.5 tracking-wide">
            连接每一份报修需求
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
