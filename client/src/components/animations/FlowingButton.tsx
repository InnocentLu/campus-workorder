import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface FlowingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const sizeMap = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

export default function FlowingButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: FlowingButtonProps) {
  const base = cn(
    'relative overflow-hidden font-medium rounded-xl transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    sizeMap[size],
    className,
  );

  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md hover:shadow-lg btn-shimmer',
    outline:
      'border-2 border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(base, variants[variant])}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          处理中...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
