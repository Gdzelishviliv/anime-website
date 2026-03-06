'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Film, ArrowLeft } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

export default function WatchAnimeDetailPage() {
  const params = useParams();
  const animeId = params.id as string;

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await animeApi.watchEpisodes(animeId);
      setInfo(res.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load anime info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (animeId) fetchData();
  }, [animeId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;
  if (!info) return <ErrorDisplay message="Anime not found" />;

  const imageUrl = info.image || '/placeholder.jpg';

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[200px] sm:h-[350px] overflow-hidden">
        <Image
          src={imageUrl}
          alt={info.title || ''}
          fill
          className="object-cover blur-2xl opacity-30 scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-56 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-primary-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0 mx-auto md:mx-0"
          >
            <div className="relative w-[180px] sm:w-[250px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={imageUrl}
                alt={info.title || ''}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-dark-100 mb-4">
              {info.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6">
              {info.totalEpisodes && (
                <div className="flex items-center gap-1.5 text-dark-400">
                  <Film className="w-4 h-4" />
                  <span className="text-sm">{info.totalEpisodes} episodes</span>
                </div>
              )}
            </div>

            {info.episodes?.length > 0 && (
              <Link
                href={`/watch/${animeId}/episode/${info.episodes[0].id}`}
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <Play className="w-5 h-5 fill-white" />
                Watch Episode 1
              </Link>
            )}
          </motion.div>
        </div>

        {/* Episodes List */}
        {info.episodes?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12 pb-12"
          >
            <h2 className="text-2xl font-bold text-dark-100 mb-6">Episodes</h2>
            <div className="grid gap-3">
              {info.episodes.map((ep: any) => (
                <Link
                  key={ep.id}
                  href={`/watch/${animeId}/episode/${ep.id}`}
                  className="card p-4 flex items-center justify-between hover:border-primary-500/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-dark-500 font-mono text-sm w-8">
                      {String(ep.number).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-dark-200 font-medium group-hover:text-primary-400 transition-colors">
                        {ep.title || `Episode ${ep.number}`}
                      </h3>
                      {ep.isFiller && (
                        <span className="text-xs text-yellow-400">Filler</span>
                      )}
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-dark-600 group-hover:text-primary-400 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
