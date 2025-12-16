import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

type EnhancedToastProps = {
  message: string;
  type?: ToastType;
  show: boolean;
  onClose: () => void;
  duration?: number;
};

export function EnhancedToast({
  message,
  type = 'success',
  show,
  onClose,
  duration = 4000,
}: EnhancedToastProps) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
    },
    error: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    },
    info: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    },
  };

  const currentStyle = styles[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-8 right-8 z-[60] max-w-md"
          role="alert"
          aria-live="polite"
        >
          <div
            className={`${currentStyle.bg} ${currentStyle.border} rounded-xl shadow-2xl border p-4 flex items-start gap-3`}
          >
            <div className={`flex-shrink-0 rounded-lg p-1.5 ${currentStyle.iconBg}`}>
              {currentStyle.icon}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-line">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
