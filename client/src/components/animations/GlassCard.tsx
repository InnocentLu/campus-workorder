import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', hover = true, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: '0 16px 48px rgba(37, 99, 235, 0.14)' } : undefined}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-6 transition-colors duration-200',
        hover && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
