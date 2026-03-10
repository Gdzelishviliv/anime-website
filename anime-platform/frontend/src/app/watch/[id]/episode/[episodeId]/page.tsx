'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, List, Play, Home, Languages } from 'lucide-react';
import { animeApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

export default function WatchEpisodePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const animeId = params.id as string;
  const rawEpisodeId = params.episodeId as string;
  const epParam = searchParams.get('ep');
  const episodeId = epParam ? `${rawEpisodeId}?ep=${epParam}` : rawEpisodeId;

  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [category, setCategory] = useState<'sub' | 'dub'>('sub');
  const [activeCategory, setActiveCategory] = useState<'sub' | 'dub' | null>(null);
  const { isAuthenticated, user } = useAuthStore();

  // Get anime info (episodes list)
  const fetchAnimeInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await animeApi.watchEpisodes(animeId);
      setAnimeInfo(res.data?.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load anime');
    } finally {
      setLoading(false);
    }
  };

  // Get streaming source for the current episode
  const fetchSource = async (cat?: 'sub' | 'dub') => {
    try {
      setSourceLoading(true);
      setSourceError(null);

      const sourcesRes = await animeApi.watchSources(episodeId, undefined, cat || category);
      const sourcesData = sourcesRes.data?.data;

      if (sourcesData?.category) {
        setActiveCategory(sourcesData.category);
      }

      if (sourcesData?.sources?.length) {
        const preferredQualities = ['1080p', '720p', 'default'];
        let selected = sourcesData.sources[0];
        for (const q of preferredQualities) {
          const found = sourcesData.sources.find((s: any) => s.quality?.includes(q));
          if (found) { selected = found; break; }
        }

        const referer = sourcesData.headers?.Referer || '';
        const ANIME_URL = process.env.NEXT_PUBLIC_ANIME_URL || 'http://localhost:3003';
        const proxyUrl = `${ANIME_URL}/anime/watch/proxy?url=${encodeURIComponent(selected.url)}&referer=${encodeURIComponent(referer)}`;
        setStreamUrl(proxyUrl);
      } else {
        setSourceError('No streaming sources available');
      }

      if (sourcesData?.subtitles?.length) {
        const ANIME_URL = process.env.NEXT_PUBLIC_ANIME_URL || 'http://localhost:3003';
        setSubtitles(
          sourcesData.subtitles.map((s: any) => ({
            url: `${ANIME_URL}/anime/watch/proxy?url=${encodeURIComponent(s.url)}&referer=`,
            lang: s.lang,
          }))
        );
      } else {
        setSubtitles([]);
      }
    } catch {
      setSourceError('Failed to load streaming source');
    } finally {
      setSourceLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimeInfo();
  }, [animeId]);

  useEffect(() => {
    if (episodeId) fetchSource();
  }, [episodeId, category]);

  const handleProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (Math.floor(currentTime) % 30 !== 0) return;
      if (!isAuthenticated || !user) return;

      userApi.updateWatchProgress({
        animeId: animeInfo?.malId || 0,
        episodeId: animeInfo?.episodes?.find((ep: any) => ep.id === episodeId)?.number || 0,
        animeTitle: animeInfo?.title,
        episodeTitle: animeInfo?.episodes?.find((ep: any) => ep.id === episodeId)?.title || `Episode`,
        thumbnailUrl: animeInfo?.image,
        progressSeconds: currentTime,
        totalDurationSeconds: duration,
      }).catch(() => {});
    },
    [isAuthenticated, user, animeInfo, episodeId],
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchAnimeInfo} />;

  const episodes = animeInfo?.episodes || [];
  const currentIndex = episodes.findIndex((ep: any) => ep.id === episodeId);
  const currentEp = episodes[currentIndex];
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEp = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navigation bar */}
      <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href="/" className="text-dark-400 hover:text-primary-400 transition-colors flex-shrink-0">
              <Home className="w-5 h-5" />
            </Link>
            <Link
              href={`/watch/${animeId}`}
              className="text-dark-300 hover:text-primary-400 transition-colors text-sm font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-[320px]"
            >
              {animeInfo?.title || 'Anime'}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            {/* Sub/Dub Toggle */}
            <div className="flex items-center bg-dark-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setCategory('sub')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  category === 'sub'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                SUB
              </button>
              <button
                onClick={() => setCategory('dub')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  category === 'dub'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                DUB
              </button>
            </div>

            {prevEp && (
              <Link
                href={`/watch/${animeId}/episode/${prevEp.id}`}
                className="p-2 text-dark-400 hover:text-white bg-dark-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            )}
            <span className="text-dark-200 text-sm font-medium px-2">
              EP {currentEp?.number || '?'}
            </span>
            {nextEp && (
              <Link
                href={`/watch/${animeId}/episode/${nextEp.id}`}
                className="p-2 text-dark-400 hover:text-white bg-dark-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => setShowEpisodeList(!showEpisodeList)}
              className="p-2 text-dark-400 hover:text-white bg-dark-800 rounded-lg transition-colors ml-2"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Video area */}
        <div className="flex-1">
          <div className="w-full">
            {sourceLoading ? (
              <div className="aspect-video bg-dark-900 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : sourceError ? (
              <div className="aspect-video bg-dark-900 flex items-center justify-center">
                <ErrorDisplay message={sourceError} onRetry={fetchSource} />
              </div>
            ) : streamUrl ? (
              <VideoPlayer
                src={streamUrl}
                subtitles={subtitles}
                onProgress={handleProgress}
              />
            ) : (
              <div className="aspect-video bg-dark-900 flex items-center justify-center text-dark-400">
                Loading video...
              </div>
            )}
          </div>

          {/* Episode info */}
          <div className="p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-dark-100">
              {animeInfo?.title}
            </h1>
            <p className="text-dark-400 mt-1">
              Episode {currentEp?.number}: {currentEp?.title || `Episode ${currentEp?.number}`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {activeCategory && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  activeCategory === 'dub'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-primary-500/20 text-primary-400'
                }`}>
                  {activeCategory === 'dub' ? 'English Dub' : 'Japanese Sub'}
                </span>
              )}
              {subtitles.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300">
                  <Languages className="w-3 h-3 inline mr-1" />
                  {subtitles.length} subtitle{subtitles.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Episode list sidebar */}
        {showEpisodeList && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-80 bg-dark-900 border-l border-dark-800 max-h-[calc(100vh-57px)] overflow-y-auto"
          >
            <div className="p-4 border-b border-dark-800">
              <h3 className="text-dark-200 font-semibold">Episodes ({episodes.length})</h3>
            </div>
            <div className="divide-y divide-dark-800/50">
              {episodes.map((ep: any) => (
                <Link
                  key={ep.id}
                  href={`/watch/${animeId}/episode/${ep.id}`}
                  className={`flex items-center gap-3 p-3 hover:bg-dark-800/50 transition-colors ${
                    ep.id === episodeId ? 'bg-primary-500/10 border-l-2 border-primary-500' : ''
                  }`}
                >
                  <span className="text-dark-500 font-mono text-xs w-6 text-right">
                    {ep.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      ep.id === episodeId ? 'text-primary-400 font-medium' : 'text-dark-300'
                    }`}>
                      {ep.title || `Episode ${ep.number}`}
                    </p>
                  </div>
                  {ep.id === episodeId && (
                    <Play className="w-3 h-3 text-primary-400 fill-primary-400 flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
