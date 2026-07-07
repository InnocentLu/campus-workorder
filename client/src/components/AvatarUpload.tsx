import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Upload, X, Camera, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName?: string;
  onUpload?: (base64: string) => void;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const sizeMap = {
  sm: 'w-16 h-16 text-xl',
  md: 'w-20 h-20 text-2xl',
  lg: 'w-28 h-28 text-4xl',
};

export default function AvatarUpload({
  currentAvatar,
  userName = 'U',
  onUpload,
  onRemove,
  size = 'md',
  disabled = false,
  className = '',
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displaySrc = preview || currentAvatar || null;
  const initial = (!displaySrc ? userName?.[0] || 'U' : '').toUpperCase();

  const processFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('仅支持 JPG、PNG、WebP 格式');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`图片不能超过 2MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setUploading(false);
      onUpload?.(base64);
      toast.success('头像已更新');
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error('读取图片失败');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !disabled) processFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
    toast.success('头像已移除');
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Avatar circle */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center font-bold cursor-pointer group',
          'bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/25',
          'ring-[3px] ring-primary-200 dark:ring-primary-800',
          'transition-all duration-300 hover:ring-primary-400 dark:hover:ring-primary-600',
          sizeMap[size],
          isDragging && 'ring-blue-400 scale-105',
          disabled && 'cursor-not-allowed opacity-70',
        )}
        onClick={() => !disabled && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        aria-label={displaySrc ? '更换头像' : '上传头像'}
        tabIndex={disabled ? -1 : 0}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : displaySrc ? (
          <img
            src={displaySrc}
            alt="用户头像"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="select-none">{initial}</span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          更换头像
        </button>
        {displaySrc && (
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            移除
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-[10px] text-gray-400 dark:text-slate-500">
        支持 JPG / PNG / WebP，不超过 2MB
      </p>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm pointer-events-none"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border-2 border-dashed border-blue-400 text-center">
              <Upload className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">释放文件以上传头像</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
