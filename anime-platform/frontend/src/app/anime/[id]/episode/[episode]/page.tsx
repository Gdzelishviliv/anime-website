'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, List, AlertTriangle, Play, Home, Tv, Languages } from 'lucide-react';
import { animeApi, userApi } from '@/lib/api';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { LoadingSpinner } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useAuthStore } from '@/store/auth.store';
import { RelatedSeasons, AiringSchedule, useAnimeRelations } from '@/components/anime/RelatedSeasons';

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const animeId = parseInt(params.id as string, 10);
  const episodeNumber = parseInt(params.episode as string, 10);

  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [consumetEpisodes, setConsumetEpisodes] = useState<any[]>([]);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [streamHeaders, setStreamHeaders] = useState<Record<string, string>>({});
  const [subtitles, setSubtitles] = useState<{url: string; lang: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'sub' | 'dub'>('sub');
  const [activeCategory, setActiveCategory] = useState<'sub' | 'dub' | null>(null);

  // Fetch anime info and find streaming episodes
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const animeRes = await animeApi.getById(animeId);
      const animeData = animeRes.data?.data || animeRes.data;
      setAnime(animeData);

      const episodesRes = await animeApi.getEpisodes(animeId);
      setEpisodes(episodesRes.data?.data || []);

      // Search for streaming episodes by title — try multiple title variants
      const titles = [
        animeData?.title,
        animeData?.title_english,
        animeData?.title_japanese,
      ].filter(Boolean);

      let foundMatch = false;
      for (const t of titles) {
        if (foundMatch) break;
        try {
          const findRes = await animeApi.findEpisodes(t);
          const found = findRes.data?.data;
          if (found?.episodes?.length) {
            setConsumetEpisodes(found.episodes);
            setProvider(found.provider || undefined);
            foundMatch = true;
          }
        } catch {
          // Try next title variant
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load episode');
    } finally {
      setLoading(false);
    }
  };

  // Fetch streaming source for the current episode
  const fetchStreamSource = async () => {
    if (!consumetEpisodes.length) return;

    setSourceLoading(true);
    setSourceError(null);

    // Find the episode matching the current episode number by its number field
    const episode = consumetEpisodes.find((ep: any) => ep.number === episodeNumber)
      || consumetEpisodes[episodeNumber - 1]; // fallback to index if number field doesn't match

    if (!episode) {
      setSourceError(`Episode ${episodeNumber} not found in streaming sources`);
      setSourceLoading(false);
      return;
    }

    try {
      const sourcesRes = await animeApi.watchSources(episode.id, provider, category);
      const sourcesData = sourcesRes.data?.data;

      if (sourcesData?.category) {
        setActiveCategory(sourcesData.category);
      }

      // Prefer MP4 download URLs (native video playback, no HLS codec issues)
      if (sourcesData?.download?.length) {
        const preferredQualities = ['1080p', '720p', '360p'];
        let selectedDl = sourcesData.download[0];
        for (const q of preferredQualities) {
          const found = sourcesData.download.find((d: any) => d.quality?.includes(q) && !d.quality?.includes('eng'));
          if (found) { selectedDl = found; break; }
        }

        const referer = sourcesData.headers?.Referer || '';
        const ANIME_URL = process.env.NEXT_PUBLIC_ANIME_URL || 'http://localhost:3003';
        const proxyUrl = `${ANIME_URL}/anime/watch/proxy?url=${encodeURIComponent(selectedDl.url)}&referer=${encodeURIComponent(referer)}`;
        setStreamUrl(proxyUrl);
      } else if (sourcesData?.sources?.length) {
        // Fallback to HLS if no download URLs
        const preferredQualities = ['1080p', '720p', 'default'];
        let selectedSource = sourcesData.sources[0];
        for (const q of preferredQualities) {
          const found = sourcesData.sources.find((s: any) => s.quality?.includes(q));
          if (found) { selectedSource = found; break; }
        }

        const referer = sourcesData.headers?.Referer || '';
        const ANIME_URL = process.env.NEXT_PUBLIC_ANIME_URL || 'http://localhost:3003';
        const proxyUrl = `${ANIME_URL}/anime/watch/proxy?url=${encodeURIComponent(selectedSource.url)}&referer=${encodeURIComponent(referer)}`;
        setStreamUrl(proxyUrl);
      } else {
        setSourceError('No streaming sources available for this episode');
      }

      // Extract subtitles
      if (sourcesData?.subtitles?.length) {
        const ANIME_URL = process.env.NEXT_PUBLIC_ANIME_URL || 'http://localhost:3003';
        const subs = sourcesData.subtitles.map((s: any) => ({
          url: `${ANIME_URL}/anime/watch/proxy?url=${encodeURIComponent(s.url)}&referer=`,
          lang: s.lang,
        }));
        setSubtitles(subs);
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
    fetchData();
  }, [animeId]);

  useEffect(() => {
    if (consumetEpisodes.length > 0) {
      setStreamUrl('');
      setSourceError(null);
      fetchStreamSource();
    }
  }, [consumetEpisodes, episodeNumber, category]);

  const handleProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (Math.floor(currentTime) % 30 !== 0) return;
      if (!isAuthenticated || !user) return;

      userApi.updateWatchProgress({
        animeId,
        episodeId: episodeNumber,
        animeTitle: anime?.title,
        episodeTitle: episodes[episodeNumber - 1]?.title || `Episode ${episodeNumber}`,
        thumbnailUrl: anime?.images?.jpg?.image_url || anime?.imageUrl,
        progressSeconds: currentTime,
        totalDurationSeconds: duration,
      }).catch(() => {});
    },
    [isAuthenticated, user, animeId, episodeNumber, anime, episodes],
  );

  const { data: relationsData } = useAnimeRelations(animeId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

  const currentEpisode = episodes[episodeNumber - 1];
  const totalEps = consumetEpisodes.length || episodes.length;
  const hasPrev = episodeNumber > 1;
  const hasNext = episodeNumber < totalEps;
  const imageUrl = anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url || anime?.imageUrl;

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-dark-400 min-w-0">
            <Link href="/" className="hover:text-white transition-colors flex-shrink-0">
              <Home className="w-4 h-4" />
            </Link>
            <span className="text-dark-700">/</span>
            <Link href={`/anime/${animeId}`} className="hover:text-white transition-colors truncate max-w-[200px]">
              {anime?.title || 'Anime'}
            </Link>
            <span className="text-dark-700">/</span>
            <span className="text-primary-400 font-medium flex-shrink-0">EP {episodeNumber}</span>
          </div>

          {/* Episode Navigation */}
          <div className="flex items-center gap-2">
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

            <button
              onClick={() => hasPrev && router.push(`/anime/${animeId}/episode/${episodeNumber - 1}`)}
              disabled={!hasPrev}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <span className="text-dark-500 text-xs font-mono px-2">
              {episodeNumber} / {totalEps}
            </span>
            <button
              onClick={() => hasNext && router.push(`/anime/${animeId}/episode/${episodeNumber + 1}`)}
              disabled={!hasNext}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Column */}
          <div>
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {sourceLoading && !streamUrl ? (
                <div className="player-container">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-dark-400 text-sm">Loading episode sources...</p>
                    </div>
                  </div>
                </div>
              ) : streamUrl ? (
                <VideoPlayer
                  src={streamUrl}
                  poster={imageUrl}
                  title={currentEpisode?.title || `Episode ${episodeNumber}`}
                  headers={streamHeaders}
                  subtitles={subtitles}
                  onProgress={handleProgress}
                />
              ) : (
                <div className="player-container">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-500" />
                      </div>
                      <p className="text-dark-200 font-semibold mb-1">
                        {sourceError || 'No streaming source found'}
                      </p>
                      <p className="text-dark-500 text-sm max-w-sm">
                        Could not find a streaming source for this episode.
                      </p>
                      <button
                        onClick={fetchStreamSource}
                        className="mt-4 px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Episode Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Episode {episodeNumber}
                {currentEpisode?.title && (
                  <span className="text-dark-400 font-normal"> — {currentEpisode.title}</span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Link
                  href={`/anime/${animeId}`}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
                >
                  {anime?.title}
                </Link>
                {anime?.type && (
                  <span className="text-xs text-dark-500 bg-dark-800 px-2 py-0.5 rounded">{anime.type}</span>
                )}
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
            </motion.div>

            {/* Airing Schedule */}
            <AiringSchedule data={relationsData} />
          </div>

          {/* Side Panel — Episode List */}
          {totalEps > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-dark-900/80 rounded-xl border border-dark-800 overflow-hidden lg:max-h-[600px]"
            >
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-dark-800 bg-dark-900 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-semibold text-white">Episodes</span>
                  <span className="text-xs text-dark-500 bg-dark-800 px-2 py-0.5 rounded-full">{totalEps}</span>
                </div>
              </div>

              {/* Episode Grid/List */}
              <div className="overflow-y-auto max-h-[500px] p-3 custom-scrollbar">
                {totalEps <= 50 ? (
                  // Grid view for fewer episodes
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {Array.from({ length: totalEps }, (_, idx) => (
                      <Link
                        key={idx}
                        href={`/anime/${animeId}/episode/${idx + 1}`}
                        className={`relative text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                          idx + 1 === episodeNumber
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 ring-1 ring-primary-400'
                            : 'bg-dark-800 text-dark-400 hover:bg-dark-700 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                        {idx + 1 === episodeNumber && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  // Compact list for many episodes
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1">
                    {Array.from({ length: totalEps }, (_, idx) => (
                      <Link
                        key={idx}
                        href={`/anime/${animeId}/episode/${idx + 1}`}
                        className={`text-center py-2 rounded text-xs font-medium transition-all ${
                          idx + 1 === episodeNumber
                            ? 'bg-primary-600 text-white ring-1 ring-primary-400'
                            : 'bg-dark-800/60 text-dark-500 hover:bg-dark-700 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Related Seasons */}
          <RelatedSeasons data={relationsData} />
        </div>
      </div>
    </div>
  );
}
