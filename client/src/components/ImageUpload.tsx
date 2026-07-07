import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxCount?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUpload({
  images,
  onChange,
  maxCount = 6,
  maxSizeMB = 5,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const maxSize = maxSizeMB * 1024 * 1024;

  const processFiles = (files: FileList) => {
    const remaining = maxCount - images.length;
    if (remaining <= 0) {
      toast.error(`最多上传 ${maxCount} 张图片`);
      return;
    }
    const fileArr = Array.from(files).slice(0, remaining);
    fileArr.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} 格式不支持，仅限 JPG/PNG/WebP`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} 超过 ${maxSizeMB}MB 限制`);
        return;
      }
    });

    setUploading(true);
    let loaded = 0;
    const results: string[] = [];
    const validFiles = fileArr.filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= maxSize);

    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        results.push(reader.result as string);
        loaded++;
        if (loaded === validFiles.length) {
          onChange([...images, ...results]);
          setUploading(false);
        }
      };
      reader.onerror = () => {
        loaded++;
        if (loaded === validFiles.length) {
          onChange([...images, ...results]);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && !disabled) processFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const remaining = maxCount - images.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          故障照片 <span className="text-gray-400 font-normal">({images.length}/{maxCount})</span>
        </span>
      </div>

      {/* Image grid */}
      <div
        className="grid grid-cols-3 sm:grid-cols-4 gap-3"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDrop}
      >
        {images.map((src, i) => (
          <motion.div
            key={`${i}-${src.slice(-20)}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 group/img"
            draggable
          >
            <img src={src} alt={`故障照片 ${i + 1}`} className="w-full h-full object-cover" />
            {/* Delete button */}
            <button
              onClick={() => handleRemove(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-500"
              aria-label={`删除第 ${i + 1} 张图片`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Index badge */}
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium">
              {i + 1}
            </span>
          </motion.div>
        ))}

        {/* Add button */}
        {remaining > 0 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            className={cn(
              'aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600',
              'flex flex-col items-center justify-center gap-1.5 transition-all duration-200',
              'hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="添加图片"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 dark:text-slate-500" />
                <span className="text-[11px] text-gray-400 dark:text-slate-500">上传图片</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Empty state */}
      {images.length === 0 && !uploading && (
        <div
          className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); }}
        >
          <ImageIcon className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-slate-500">点击或拖拽上传故障照片</p>
          <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">
            支持 JPG / PNG / WebP，单张不超过 {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  );
}
