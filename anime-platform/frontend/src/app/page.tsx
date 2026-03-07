'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { animeApi } from '@/lib/api';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { AnimeGridSkeleton } from '@/components/ui/Loading';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { SpotlightSlider } from '@/components/anime/SpotlightSlider';

function mapAniwatchAnime(anime: any) {
  return {
    title: anime.name || anime.title,
    imageUrl: anime.poster || anime.image,
    type: anime.type,
    episodes: anime.episodes?.sub || anime.episodes?.total || 0,
    href: `/watch/${anime.id}`,
  };
}

function TrendingRow({ animes }: { animes: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-400" />
          Trending Now
        </h2>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {animes.map((anime, i) => (
          <Link
            key={anime.id || i}
            href={`/watch/${anime.id}`}
            className="flex-shrink-0 w-[140px] sm:w-[160px] group"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
              <Image
                src={anime.poster || anime.image || '/placeholder.jpg'}
                alt={anime.name || anime.title || ''}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="160px"
              />
              <div className="absolute top-2 left-2 bg-primary-500/90 text-white text-xs font-bold px-2 py-0.5 rounded">
                #{i + 1}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-dark-200 font-medium line-clamp-2 group-hover:text-primary-400 transition-colors">
              {anime.name || anime.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [spotlightRaw, setSpotlightRaw] = useState<any[]>([]);
  const [trendingRaw, setTrendingRaw] = useState<any[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<any[]>([]);
  const [topAiring, setTopAiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const homeRes = await animeApi.watchHome();
      const home = homeRes.data?.data;

      if (home) {
        setSpotlightRaw((home.spotlightAnimes || []).slice(0, 8));
        setTrendingRaw((home.trendingAnimes || []).slice(0, 15));
        setLatestEpisodes((home.latestEpisodeAnimes || []).slice(0, 12).map(mapAniwatchAnime));
        setTopAiring((home.topAiringAnimes || []).slice(0, 12).map(mapAniwatchAnime));
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
      {/* Spotlight Slider */}
      {!loading && spotlightRaw.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
          <SpotlightSlider animes={spotlightRaw} />
        </section>
      )}

      {/* Loading skeleton for slider area */}
      {loading && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
          <div className="w-full h-[400px] sm:h-[500px] rounded-2xl bg-dark-800 animate-pulse" />
        </section>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {loading ? (
          <div className="space-y-12">
            <div>
              <div className="h-8 bg-dark-800 rounded w-48 mb-6 animate-pulse" />
              <AnimeGridSkeleton count={6} />
            </div>
          </div>
        ) : error ? (
          <ErrorDisplay message={error} onRetry={fetchData} />
        ) : (
          <>
            {/* Trending horizontal slider */}
            {trendingRaw.length > 0 && <TrendingRow animes={trendingRaw} />}

            {/* Latest Episodes grid */}
            {latestEpisodes.length > 0 && (
              <AnimeGrid anime={latestEpisodes} title="🆕 Latest Episodes" />
            )}

            {/* Top Airing grid */}
            {topAiring.length > 0 && (
              <AnimeGrid anime={topAiring} title="📺 Top Airing" />
            )}

            {trendingRaw.length === 0 && latestEpisodes.length === 0 && (
              <div className="text-center py-20">
                <p className="text-dark-400 text-lg">Anime data is temporarily unavailable.</p>
                <p className="text-dark-500 text-sm mt-2">Please try again later.</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors">Retry</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
