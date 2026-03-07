'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeGridSkeleton } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

export default function SeasonPage() {
  const [anime, setAnime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadSeason();
  }, []);

  const loadSeason = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await animeApi.watchCategory('top-airing', 1);
      const data = res.data.data || res.data || {};
      setAnime(data.animes || []);
      setHasMore(data.hasNextPage || false);
      setPage(1);
    } catch (err: any) {
      setError(err.message || 'Failed to load seasonal anime');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await animeApi.watchCategory('top-airing', nextPage);
      const data = res.data.data || res.data || {};
      setAnime((prev) => [...prev, ...(data.animes || [])]);
      setHasMore(data.hasNextPage || false);
      setPage(nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const now = new Date();
  const seasonNames = ['Winter', 'Spring', 'Summer', 'Fall'];
  const currentSeason = seasonNames[Math.floor(now.getMonth() / 3)];
  const currentYear = now.getFullYear();

  if (loading) return <AnimeGridSkeleton />;
  if (error) return <ErrorDisplay message={error} onRetry={loadSeason} />;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-7 h-7 text-primary-400" />
            <h1 className="text-3xl font-bold text-white">
              {currentSeason} {currentYear}
            </h1>
          </div>
          <p className="text-dark-400">Currently airing anime this season</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {anime.map((item: any, idx: number) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.5) }}
            >
              <AnimeCard anime={item} />
            </motion.div>
          ))}
        </div>

        {anime.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No seasonal anime found</p>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center mt-8">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}

        {hasMore && !loadingMore && anime.length > 0 && (
          <div className="flex justify-center mt-10">
            <button onClick={loadMore} className="btn-secondary px-8">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
