import { motion } from 'framer-motion';

interface StaggerListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
  direction?: 'up' | 'down';
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const itemDown = {
  hidden: { opacity: 0, y: -24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function StaggerList({
  children,
  staggerDelay = 0.08,
  className = '',
  direction = 'up',
}: StaggerListProps) {
  const itemVariant = direction === 'up' ? itemUp : itemDown;

  return (
    <motion.div
      variants={{ ...container, show: { ...container.show, transition: { staggerChildren: staggerDelay } } }}
      initial="hidden"
      animate="show"
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={itemVariant}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
