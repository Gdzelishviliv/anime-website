'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Star, Tv } from 'lucide-react';
import { animeApi } from '@/lib/api';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { AnimeGridSkeleton } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

function mapAniwatchAnime(anime: any) {
  return {
    title: anime.name || anime.title,
    imageUrl: anime.poster || anime.image,
    type: anime.type,
    episodes: anime.episodes?.sub || anime.episodes?.total || 0,
    href: `/search?q=${encodeURIComponent(anime.name || anime.title || '')}`,
  };
}

export default function HomePage() {
  const [spotlight, setSpotlight] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [topAiring, setTopAiring] = useState<any[]>([]);
  const [mostPopular, setMostPopular] = useState<any[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const homeRes = await animeApi.watchHome();
      const home = homeRes.data?.data;

      if (home) {
        setSpotlight((home.spotlightAnimes || []).slice(0, 6).map(mapAniwatchAnime));
        setTrending((home.trendingAnimes || []).slice(0, 12).map(mapAniwatchAnime));
        setTopAiring((home.topAiringAnimes || []).slice(0, 12).map(mapAniwatchAnime));
        setMostPopular((home.mostPopularAnimes || []).slice(0, 12).map(mapAniwatchAnime));
        setLatestEpisodes((home.latestEpisodeAnimes || []).slice(0, 12).map(mapAniwatchAnime));
      } else {
        // Fallback to Jikan
        const [trendingRes, topRes] = await Promise.all([
          animeApi.getTrending(1, 12),
          animeApi.getTop(1, 12),
        ]);
        setTrending(trendingRes.data?.data || []);
        setTopAiring(topRes.data?.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load anime data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-950/50 to-dark-950 py-12 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold mb-4">
              <span className="gradient-text">AniStream</span>
            </h1>
            <p className="text-dark-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Your ultimate anime streaming experience. Discover trending shows,
              track your progress, and stream in high quality.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-dark-400">
              <div className="flex items-center space-x-2">
                <Tv className="w-5 h-5 text-primary-400" />
                <span className="text-sm">Thousands of titles</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">Top-rated content</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm">Real-time trending</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {loading ? (
          <div className="space-y-12">
            <div>
              <div className="h-8 bg-dark-800 rounded w-48 mb-6 animate-pulse" />
              <AnimeGridSkeleton count={12} />
            </div>
          </div>
        ) : error ? (
          <ErrorDisplay message={error} onRetry={fetchData} />
        ) : (
          <>
            {spotlight.length > 0 && (
              <AnimeGrid anime={spotlight} title="✨ Spotlight" />
            )}
            {trending.length > 0 && (
              <AnimeGrid anime={trending} title="🔥 Trending Now" />
            )}
            {latestEpisodes.length > 0 && (
              <AnimeGrid anime={latestEpisodes} title="🆕 Latest Episodes" />
            )}
            {topAiring.length > 0 && (
              <AnimeGrid anime={topAiring} title="📺 Top Airing" />
            )}
            {mostPopular.length > 0 && (
              <AnimeGrid anime={mostPopular} title="⭐ Most Popular" />
            )}
            {trending.length === 0 && topAiring.length === 0 && (
              <div className="text-center py-20">
                <p className="text-dark-400 text-lg">Anime data is temporarily unavailable.</p>
                <p className="text-dark-500 text-sm mt-2">The upstream API may be down. Please try again later.</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors">Retry</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Platform Info Banner */}
      <section className="bg-dark-900 border-y border-dark-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-dark-500 text-sm">
            🎓 This is a portfolio demonstration project. All anime metadata is provided by the{' '}
            <a
              href="https://jikan.moe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              Jikan API
            </a>
            . No copyrighted content is streamed — only demo/public domain videos.
          </p>
        </div>
      </section>
    </div>
  );
}
