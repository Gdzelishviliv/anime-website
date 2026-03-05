'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({
  message = 'Something went wrong',
  onRetry,
}: ErrorDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 space-y-4"
    >
      <AlertTriangle className="w-12 h-12 text-red-400" />
      <p className="text-dark-300 text-lg">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </motion.div>
  );
}
