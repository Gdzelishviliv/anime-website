'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, List, Play, Home } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

export default function WatchEpisodePage() {
  const params = useParams();
  const animeId = params.id as string;
  const episodeId = params.episodeId as string;

  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEpisodeList, setShowEpisodeList] = useState(false);

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
  const fetchSource = async () => {
    try {
      setSourceLoading(true);
      setSourceError(null);

      const sourcesRes = await animeApi.watchSources(episodeId);
      const sourcesData = sourcesRes.data?.data;

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
  }, [episodeId]);

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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-dark-400 hover:text-primary-400 transition-colors">
              <Home className="w-5 h-5" />
            </Link>
            <Link
              href={`/watch/${animeId}`}
              className="text-dark-300 hover:text-primary-400 transition-colors text-sm font-medium truncate max-w-[200px] sm:max-w-none"
            >
              {animeInfo?.title || 'Anime'}
            </Link>
          </div>
          <div className="flex items-center gap-2">
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
