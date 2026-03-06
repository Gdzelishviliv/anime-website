'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Film, ArrowLeft, Star, Clock, Tv, Calendar, Layers, ChevronRight } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

export default function WatchAnimeDetailPage() {
  const params = useParams();
  const animeId = params.id as string;

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

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
  const moreInfo = info.moreInfo || {};
  const stats = info.stats || {};
  const seasons = info.seasons || [];
  const relatedAnimes = info.relatedAnimes || [];
  const description = info.description || '';
  const isLongDesc = description.length > 300;

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[250px] sm:h-[400px] overflow-hidden">
        <Image
          src={imageUrl}
          alt={info.title || ''}
          fill
          className="object-cover blur-2xl opacity-30 scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-dark-950/20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-40 sm:-mt-64 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-primary-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
          {/* Poster */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0 mx-auto md:mx-0"
          >
            <div className="relative w-[180px] sm:w-[220px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
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
            className="flex-1 min-w-0"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
              {info.title}
            </h1>

            {/* Stats badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {moreInfo.malscore && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/20">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-300">{moreInfo.malscore}</span>
                </div>
              )}
              {stats.quality && (
                <span className="px-2.5 py-1 rounded-lg bg-primary-500/15 border border-primary-500/20 text-xs font-semibold text-primary-300">
                  {stats.quality}
                </span>
              )}
              {stats.type && (
                <span className="px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-xs font-medium text-dark-300">
                  {stats.type}
                </span>
              )}
              {stats.rating && (
                <span className="px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-xs font-medium text-dark-300">
                  {stats.rating}
                </span>
              )}
              {stats.episodes && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700">
                  <Film className="w-3 h-3 text-dark-400" />
                  <span className="text-xs font-medium text-dark-300">
                    SUB: {stats.episodes.sub}{stats.episodes.dub ? ` | DUB: ${stats.episodes.dub}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark-400 mb-4">
              {moreInfo.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {moreInfo.duration}
                </span>
              )}
              {moreInfo.aired && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {moreInfo.aired}
                </span>
              )}
              {moreInfo.studios && (
                <span>{typeof moreInfo.studios === 'string' ? moreInfo.studios : moreInfo.studios}</span>
              )}
            </div>

            {/* Genres */}
            {moreInfo.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {moreInfo.genres.map((g: string) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded-full bg-dark-800/80 border border-dark-700/50 text-xs font-medium text-dark-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Airing status */}
            {moreInfo.status === 'Currently Airing' && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 w-fit">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400/50 animate-ping" />
                </div>
                <span className="text-xs font-semibold text-green-300 uppercase tracking-wider">Currently Airing</span>
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="mb-5">
                <p className="text-sm text-dark-300 leading-relaxed">
                  {isLongDesc && !showFullDesc ? description.substring(0, 300) + '...' : description}
                </p>
                {isLongDesc && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-primary-400 hover:text-primary-300 text-sm mt-1 transition-colors"
                  >
                    {showFullDesc ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Watch button */}
            {info.episodes?.length > 0 && (
              <Link
                href={`/watch/${animeId}/episode/${info.episodes[0].id}`}
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-primary-500/20"
              >
                <Play className="w-5 h-5 fill-white" />
                Watch Episode 1
              </Link>
            )}
          </motion.div>
        </div>

        {/* Seasons */}
        {seasons.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-primary-400" />
              <h2 className="text-lg font-bold text-white">Seasons</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {seasons.map((season: any) => (
                <Link
                  key={season.id}
                  href={`/watch/${season.id}`}
                  className={`group relative rounded-xl overflow-hidden border transition-all ${
                    season.isCurrent
                      ? 'border-primary-500/50 ring-2 ring-primary-500/20'
                      : 'border-dark-700/50 hover:border-primary-500/30'
                  }`}
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={season.poster || imageUrl}
                      alt={season.title || season.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent" />
                    {season.isCurrent && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary-500 text-[10px] font-bold text-white uppercase">
                        Current
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-xs font-semibold text-white truncate">{season.title || season.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Related Anime */}
        {relatedAnimes.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Tv className="w-4 h-4 text-primary-400" />
              <h2 className="text-lg font-bold text-white">Related</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {relatedAnimes.map((rel: any) => (
                <Link
                  key={rel.id}
                  href={`/watch/${rel.id}`}
                  className="group relative rounded-xl overflow-hidden border border-dark-700/50 hover:border-primary-500/30 transition-all"
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={rel.poster || '/placeholder.jpg'}
                      alt={rel.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent" />
                    {rel.type && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-dark-900/80 text-[10px] font-semibold text-dark-200">
                        {rel.type}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-xs font-semibold text-white truncate">{rel.name}</p>
                    {rel.episodes && (
                      <p className="text-[10px] text-dark-400 mt-0.5">
                        {rel.episodes.sub || '?'} eps
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Episodes List */}
        {info.episodes?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-10 pb-12"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Film className="w-4 h-4 text-primary-400" />
              Episodes
              <span className="text-sm font-normal text-dark-500">({info.episodes.length})</span>
            </h2>
            <div className="grid gap-2">
              {info.episodes.map((ep: any) => (
                <Link
                  key={ep.id}
                  href={`/watch/${animeId}/episode/${ep.id}`}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-dark-900/60 border border-dark-800/50 hover:border-primary-500/30 hover:bg-dark-800/60 transition-all group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span className="text-dark-500 font-mono text-sm w-8 text-right shrink-0">
                      {String(ep.number).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm text-dark-200 font-medium group-hover:text-primary-400 transition-colors truncate">
                        {ep.title || `Episode ${ep.number}`}
                      </h3>
                      {ep.isFiller && (
                        <span className="text-[10px] text-yellow-400 font-medium">Filler</span>
                      )}
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-dark-600 group-hover:text-primary-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
