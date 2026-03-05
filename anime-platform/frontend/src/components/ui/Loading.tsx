'use client';

import { motion } from 'framer-motion';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <motion.div
        className="w-12 h-12 border-4 border-dark-700 border-t-primary-500 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-[3/4] bg-dark-800" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-dark-800 rounded w-3/4" />
        <div className="h-3 bg-dark-800 rounded w-1/2" />
      </div>
    </div>
  );
}

export function AnimeGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  );
}
